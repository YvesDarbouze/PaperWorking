export type RecType = 'REC' | 'HREC' | 'CREC' | 'De Minimis';
export type RecSeverity = 'high' | 'medium' | 'low';

export interface RecognizedEnvironmentalCondition {
  id: string;
  type: RecType;
  description: string;
  severity: RecSeverity;
  location?: string;
  recommendation: string;
  source: string;
}

interface RecPattern {
  pattern: RegExp;
  type: RecType;
  severity: RecSeverity;
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
];

export function extractRECs(text: string): RecognizedEnvironmentalCondition[] {
  if (!text?.trim()) return [];

  const found: RecognizedEnvironmentalCondition[] = [];
  const seenLabels = new Set<string>();

  for (const def of REC_PATTERNS) {
    if (!def.pattern.test(text)) continue;
    def.pattern.lastIndex = 0;

    if (seenLabels.has(def.label)) continue;
    seenLabels.add(def.label);

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

  const order = { high: 0, medium: 1, low: 2 };
  return found.sort((a, b) => order[a.severity] - order[b.severity]);
}

export function validateZoningScanBody(body: {
  zip?: unknown;
  address?: unknown;
}): { ok: true; zip: string; address: string } | { ok: false; error: string; status: number } {
  const zip = typeof body.zip === 'string' ? body.zip.trim() : '';
  const address = typeof body.address === 'string' ? body.address.trim() : '';

  if (!zip || !/^\d{5}$/.test(zip)) {
    return { ok: false, error: 'A valid 5-digit ZIP code is required.', status: 400 };
  }
  if (!address) {
    return { ok: false, error: 'Property address is required.', status: 400 };
  }

  return { ok: true, zip, address };
}

export function buildZoningScanResult(input: {
  zip: string;
  recs: RecognizedEnvironmentalCondition[];
  zoningCode?: string | null;
  zoningDescription?: string | null;
  permittedUnitDensity?: number;
  source?: string;
}): Record<string, unknown> {
  return {
    zipCode: input.zip,
    zoningCode: input.zoningCode || 'N/A — manual review required',
    zoningDescription:
      input.zoningDescription ||
      "Automated zoning lookup unavailable for this jurisdiction. Use the Playwright GIS scanner or visit your county's GIS portal directly.",
    permittedUnitDensity: input.permittedUnitDensity,
    overlayDistricts: [],
    recs: input.recs,
    scanDate: new Date().toISOString(),
    source: input.source || 'text_analysis_only',
  };
}
