import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import type {
  ZoningScanResult,
  RecognizedEnvironmentalCondition,
} from '@/types/marketVitals';

/* ═══════════════════════════════════════════════════════════════
   Zoning Scan API — POST /api/zoning-scan

   Two capabilities:
   1. Phase I ESA text analysis — extract RECs via pattern matching
   2. Zoning lookup — Census geocoding → ArcGIS REST attempt

   Body: {
     zip: string;
     address: string;
     projectId?: string;
     phaseIReportText?: string;   // paste or copied text from Phase I ESA
   }
   ═══════════════════════════════════════════════════════════════ */

// ── REC extraction patterns ───────────────────────────────────

interface RecPattern {
  pattern: RegExp;
  type: RecognizedEnvironmentalCondition['type'];
  severity: RecognizedEnvironmentalCondition['severity'];
  label: string;
  recommendation: string;
}

const REC_PATTERNS: RecPattern[] = [
  {
    pattern: /underground storage tank|UST\b|aboveground storage tank|AST\b|petroleum storage/gi,
    type: 'REC',
    severity: 'high',
    label: 'Storage Tank (UST/AST)',
    recommendation: 'Phase II ESA required. Soil and groundwater sampling near tank locations.',
  },
  {
    pattern: /dry clean|perc\b|perchloroethylene|tetrachloroethylene|\bPCE\b|\bTCE\b|chlorinated solvent/gi,
    type: 'REC',
    severity: 'high',
    label: 'Chlorinated Solvents (Dry Cleaner)',
    recommendation: 'Phase II ESA recommended. Vapor intrusion assessment may be required.',
  },
  {
    pattern: /gas station|service station|filling station|petroleum dispensing|fueling operation/gi,
    type: 'HREC',
    severity: 'high',
    label: 'Former Gas Station / Fueling Operation',
    recommendation: 'Review regulatory database for NFA letters. Phase II ESA if no closure documentation.',
  },
  {
    pattern: /\brecognized environmental condition\b(?!\s+identified|s were not)/gi,
    type: 'REC',
    severity: 'medium',
    label: 'Recognized Environmental Condition (REC)',
    recommendation: 'Phase II ESA recommended to characterize the nature and extent.',
  },
  {
    pattern: /controlled recognized environmental condition|\bCREC\b/gi,
    type: 'CREC',
    severity: 'medium',
    label: 'Controlled REC (CREC)',
    recommendation:
      'Review institutional or engineering controls. Confirm controls remain in place and appropriate.',
  },
  {
    pattern: /historical recognized environmental condition|\bHREC\b/gi,
    type: 'HREC',
    severity: 'low',
    label: 'Historical REC (HREC)',
    recommendation: 'Review regulatory closure documentation to confirm no residual contamination.',
  },
  {
    pattern: /de minimis condition|insignificant quantities|minimal risk|negligible risk/gi,
    type: 'De Minimis',
    severity: 'low',
    label: 'De Minimis Condition',
    recommendation: 'Document in files. No further action typically required.',
  },
  {
    pattern: /solid waste|municipal landfill|illegal dump|illegal discard/gi,
    type: 'REC',
    severity: 'medium',
    label: 'Solid Waste / Landfill',
    recommendation: 'Phase II ESA to evaluate for methane migration and leachate impacts.',
  },
  {
    pattern: /auto repair|automobile service|paint shop|body shop|radiator shop/gi,
    type: 'HREC',
    severity: 'medium',
    label: 'Former Auto Repair / Body Shop',
    recommendation: 'Review regulatory records. Phase II ESA for soil/groundwater if no documented closure.',
  },
  {
    pattern: /hydraulic lift|floor drain|oil\/water separator|clarifier|sump pit/gi,
    type: 'REC',
    severity: 'low',
    label: 'Staining / Hydraulic Equipment',
    recommendation: 'Limited Phase II soil sampling recommended in affected areas.',
  },
  {
    pattern: /electroplating|metal finishing|chrome plating|\bhexavalent chromium\b/gi,
    type: 'REC',
    severity: 'high',
    label: 'Electroplating / Metal Finishing',
    recommendation: 'Phase II ESA required. Hex chrome and heavy metals are priority analytes.',
  },
  {
    pattern: /railroad|rail yard|rail right.of.way/gi,
    type: 'HREC',
    severity: 'medium',
    label: 'Railroad / Rail Yard Proximity',
    recommendation: 'Evaluate for PAHs and heavy metals from historic rail operations.',
  },
];

function extractRECs(text: string): RecognizedEnvironmentalCondition[] {
  if (!text?.trim()) return [];

  const found: RecognizedEnvironmentalCondition[] = [];
  const seenLabels = new Set<string>();

  for (const def of REC_PATTERNS) {
    if (!def.pattern.test(text)) continue;
    def.pattern.lastIndex = 0; // reset stateful regex

    if (seenLabels.has(def.label)) continue;
    seenLabels.add(def.label);

    // Grab surrounding context for the location field
    const match = def.pattern.exec(text);
    def.pattern.lastIndex = 0;
    let location: string | undefined;
    if (match) {
      const start = Math.max(0, match.index - 80);
      const end = Math.min(text.length, match.index + match[0].length + 80);
      const excerpt = text.slice(start, end).replace(/\s+/g, ' ').trim();
      location = `"…${excerpt}…"`;
    }

    found.push({
      id: crypto.randomUUID(),
      type: def.type,
      description: def.label,
      severity: def.severity,
      location,
      recommendation: def.recommendation,
      source: 'Phase I ESA — automated text analysis',
    });
  }

  // Sort high → medium → low
  const order = { high: 0, medium: 1, low: 2 };
  return found.sort((a, b) => order[a.severity] - order[b.severity]);
}

// ── Census Geocoding → coordinates ───────────────────────────

async function geocodeAddress(
  address: string,
): Promise<{ lat: number; lng: number; fips?: string } | null> {
  try {
    const encoded = encodeURIComponent(address);
    const url = `https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=${encoded}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const json = await res.json();
    const match = json?.result?.addressMatches?.[0];
    if (!match) return null;
    const coords = match.coordinates;
    const geo = match.geographies?.['Census Tracts']?.[0];
    const stateFips = geo?.STATE || '';
    const countyFips = geo?.COUNTY || '';
    return {
      lat: coords.y,
      lng: coords.x,
      fips: stateFips && countyFips ? `${stateFips}${countyFips}` : undefined,
    };
  } catch {
    return null;
  }
}

// ── ArcGIS REST zoning query ──────────────────────────────────
// Structured endpoint registry keyed by county FIPS code.
// Falls back to generic national endpoints when no local match.

interface ArcGISFeature {
  attributes: Record<string, string | number | null>;
}

// County FIPS → list of known ArcGIS REST zoning endpoints
// Source: official municipal GIS portals (researched 2026-05)
const FIPS_ENDPOINTS: Record<string, string[]> = {
  // Atlanta / Fulton County, GA (FIPS 13121)
  '13121': [
    'https://services.arcgis.com/qsPYEmpbSe2PnRwp/arcgis/rest/services/ATLZoning/FeatureServer/0',
  ],
  // Miami-Dade County, FL (FIPS 12086)
  '12086': [
    'https://gisweb.miamidade.gov/arcgis/rest/services/LandManagement/MD_Zoning/FeatureServer/0',
  ],
  // Cook County (Chicago), IL (FIPS 17031)
  '17031': [
    'https://gisapps.cityofchicago.org/arcgis/rest/services/ExternalApps/Zoning_update/MapServer/0',
  ],
  // Philadelphia County, PA (FIPS 42101)
  '42101': [
    'https://services.arcgis.com/fLeGjb7u4uXqeF9q/arcgis/rest/services/Zoning_BaseDistricts/FeatureServer/0',
  ],
  // Mecklenburg County (Charlotte), NC (FIPS 37119)
  '37119': [
    'https://gis.charlottenc.gov/arcgis/rest/services/PLN/Zoning/MapServer/0',
  ],
  // Davidson County (Nashville), TN (FIPS 47037)
  '47037': [
    'https://services2.arcgis.com/HdTo6HJqh92wn4IA/arcgis/rest/services/Zoning/FeatureServer/0',
  ],
  // Denver County, CO (FIPS 08031)
  '08031': [
    'https://services1.arcgis.com/zdB7qR0BtYrg0Xpl/arcgis/rest/services/Zoning/FeatureServer/0',
  ],
  // Maricopa County (Phoenix), AZ (FIPS 04013)
  '04013': [
    'https://gis.phoenix.gov/arcgis/rest/services/Public/Zoning/MapServer/0',
  ],
  // Los Angeles County, CA (FIPS 06037)
  '06037': [
    'https://services5.arcgis.com/7nsPwEMP38bSkCjy/arcgis/rest/services/Zoning/FeatureServer/0',
  ],
};

// Generic national zoning layers — used as fallback
const NATIONAL_ENDPOINTS = [
  'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Zoning/FeatureServer/0',
  'https://services2.arcgis.com/FiaFA886gKEQ8r1M/arcgis/rest/services/US_Zoning/FeatureServer/0',
];

// Common attribute name variants for zoning data across different portals
const ZONING_CODE_FIELDS = ['ZONING_CODE', 'ZONE_CODE', 'ZONE', 'ZONING', 'ZONE_TYPE', 'ZONEDIST', 'ZONE_NAME', 'CODE'];
const ZONING_DESC_FIELDS = ['ZONING_DESCRIPTION', 'ZONE_DESCRIPTION', 'DESCRIPTION', 'ZONE_DESC', 'LONG_CODE', 'LABEL'];
const DENSITY_FIELDS = ['MAX_DENSITY', 'UNITS_PER_ACRE', 'MAX_DU_AC', 'DENSITY'];

function findAttr(attrs: Record<string, string | number | null>, fields: string[]): string {
  for (const f of fields) {
    const val = attrs[f] ?? attrs[f.toLowerCase()] ?? attrs[f.toUpperCase()];
    if (val != null && String(val).trim()) return String(val).trim();
  }
  return '';
}

async function queryArcGIS(
  lat: number,
  lng: number,
  fips?: string,
): Promise<{ zoningCode: string; description: string; density?: number; source: string } | null> {
  // Build prioritized endpoint list: local FIPS match first, then national fallbacks
  const endpoints: string[] = [];
  if (fips && FIPS_ENDPOINTS[fips]) {
    endpoints.push(...FIPS_ENDPOINTS[fips]);
  }
  endpoints.push(...NATIONAL_ENDPOINTS);

  const geom = encodeURIComponent(JSON.stringify({ x: lng, y: lat }));
  const params = new URLSearchParams({
    geometryType: 'esriGeometryPoint',
    geometry: geom,
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: '*',
    returnGeometry: 'false',
    f: 'json',
  });

  for (const base of endpoints) {
    try {
      const res = await fetch(`${base}/query?${params.toString()}`, {
        next: { revalidate: 3600 },
      });
      if (!res.ok) continue;
      const json = await res.json();
      const features: ArcGISFeature[] = json?.features || [];
      if (!features.length) continue;

      const attrs = features[0].attributes;
      const zoningCode = findAttr(attrs, ZONING_CODE_FIELDS);
      const description = findAttr(attrs, ZONING_DESC_FIELDS);

      if (zoningCode) {
        const densityStr = findAttr(attrs, DENSITY_FIELDS);
        return {
          zoningCode,
          description: description || zoningCode,
          density: densityStr ? Number(densityStr) || undefined : undefined,
          source: base,
        };
      }
    } catch {
      continue;
    }
  }
  return null;
}

// ── Route handler ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  let body: {
    zip?: string;
    address?: string;
    projectId?: string;
    phaseIReportText?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { zip, address, phaseIReportText } = body;

  if (!zip || !/^\d{5}$/.test(zip)) {
    return NextResponse.json({ error: 'A valid 5-digit ZIP code is required.' }, { status: 400 });
  }
  if (!address?.trim()) {
    return NextResponse.json({ error: 'Property address is required.' }, { status: 400 });
  }

  // 1. Extract RECs from Phase I text (always fast, no external calls)
  const recs = extractRECs(phaseIReportText || '');

  // 2. Geocode address
  const geo = await geocodeAddress(address);

  // 3. Attempt ArcGIS zoning lookup if we have coordinates
  let zoningData: Awaited<ReturnType<typeof queryArcGIS>> = null;
  if (geo) {
    zoningData = await queryArcGIS(geo.lat, geo.lng, geo.fips);
  }

  const result: ZoningScanResult = {
    zipCode: zip,
    zoningCode: zoningData?.zoningCode || 'N/A — manual review required',
    zoningDescription:
      zoningData?.description ||
      'Automated zoning lookup unavailable for this jurisdiction. Use the Playwright GIS scanner or visit your county\'s GIS portal directly.',
    permittedUnitDensity: zoningData?.density,
    overlayDistricts: [],
    recs,
    scanDate: new Date().toISOString(),
    source: zoningData?.source || (geo ? 'census_geocoder (coordinates only)' : 'text_analysis_only'),
  };

  return NextResponse.json({ result });
}
