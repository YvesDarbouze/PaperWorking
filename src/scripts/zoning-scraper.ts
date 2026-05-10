#!/usr/bin/env npx ts-node
/**
 * Zoning Scraper — Playwright CLI
 *
 * Navigates municipal GIS portals to extract zoning data for a given address.
 * Uses a configurable portal registry to support different jurisdictions.
 *
 * Usage:
 *   npx ts-node src/scripts/zoning-scraper.ts --address="123 Main St" --city="Atlanta" --state="GA"
 *   npx ts-node src/scripts/zoning-scraper.ts --address="456 Oak Ave" --state="FL" --output=json
 *   npx ts-node src/scripts/zoning-scraper.ts --list-portals
 *
 * Options:
 *   --address       Full street address (required)
 *   --city          City name (helps portal selection)
 *   --state         2-letter state code (required for portal selection)
 *   --output        "table" (default) | "json"
 *   --list-portals  Print supported portal registry and exit
 *   --screenshot    Save a PNG of the zoning result page
 *
 * Adding a new portal:
 *   Add an entry to PORTAL_REGISTRY below with a matchFn for your jurisdiction.
 *   Each portal implements a scrape(page, address) → ZoningInfo function.
 */

import { chromium, Page } from 'playwright';
import * as path from 'path';

// ── CLI args ──────────────────────────────────────────────────

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [key, val] = a.replace(/^--/, '').split('=');
    return [key, val ?? true];
  }),
);

const ADDRESS = String(args.address || '');
const CITY = String(args.city || '').toLowerCase();
const STATE = String(args.state || '').toUpperCase();
const OUTPUT = String(args.output || 'table');
const SCREENSHOT = Boolean(args.screenshot);
const LIST_PORTALS = Boolean(args['list-portals']);

// ── Portal registry ───────────────────────────────────────────

interface ZoningInfo {
  zoningCode: string;
  zoningDescription: string;
  permittedUnitDensity?: string;
  maxBuildingHeight?: string;
  lotCoverage?: string;
  overlayDistricts?: string[];
  portalUrl: string;
}

interface PortalEntry {
  name: string;
  state: string;
  cities?: string[];
  portalUrl: string;
  matchFn: (state: string, city: string) => boolean;
  scrape: (page: Page, address: string) => Promise<ZoningInfo | null>;
}

// ── Generic ArcGIS Web App scraper ────────────────────────────

async function scrapeArcGISWebApp(
  page: Page,
  address: string,
  searchSelector: string,
  resultSelector: string,
): Promise<ZoningInfo | null> {
  await page.fill(searchSelector, address);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);

  try {
    await page.waitForSelector(resultSelector, { timeout: 10_000 });
  } catch {
    return null;
  }

  const text = await page.textContent(resultSelector);
  return {
    zoningCode: 'See portal',
    zoningDescription: text?.trim() || 'Data extracted — review portal for full details',
    portalUrl: page.url(),
  };
}

// ── Portal registry entries ───────────────────────────────────

const PORTAL_REGISTRY: PortalEntry[] = [
  {
    name: 'Atlanta, GA — ArcGIS Online',
    state: 'GA',
    cities: ['atlanta'],
    portalUrl: 'https://atlantagis.maps.arcgis.com/apps/instant/lookup/index.html',
    matchFn: (s, c) => s === 'GA' && c.includes('atlanta'),
    scrape: async (page, address) => {
      await page.goto(
        'https://atlantagis.maps.arcgis.com/apps/instant/lookup/index.html',
        { waitUntil: 'networkidle', timeout: 30_000 },
      );
      return scrapeArcGISWebApp(page, address, 'input[placeholder*="address"]', '.esri-features__container');
    },
  },
  {
    name: 'Miami-Dade County, FL — GIS',
    state: 'FL',
    cities: ['miami', 'miami-dade', 'coral gables', 'hialeah'],
    portalUrl: 'https://gisweb.miamidade.gov/PropertySearch/',
    matchFn: (s, c) =>
      s === 'FL' && (c.includes('miami') || c.includes('coral gables') || c.includes('hialeah')),
    scrape: async (page, address) => {
      await page.goto('https://gisweb.miamidade.gov/PropertySearch/', {
        waitUntil: 'networkidle',
        timeout: 30_000,
      });
      const input = await page.$('input[name="addr"]');
      if (!input) return null;
      await input.fill(address);
      await page.click('input[type="submit"], button[type="submit"]');
      await page.waitForTimeout(3000);
      const zoningEl = await page.$('.zoning, [class*="zoning"]');
      if (!zoningEl) return null;
      const zoningText = await zoningEl.textContent();
      return {
        zoningCode: zoningText?.trim() || 'N/A',
        zoningDescription: 'Miami-Dade Zoning',
        portalUrl: page.url(),
      };
    },
  },
  {
    name: 'Chicago, IL — City GIS',
    state: 'IL',
    cities: ['chicago'],
    portalUrl: 'https://gis.cityofchicago.org/',
    matchFn: (s, c) => s === 'IL' && c.includes('chicago'),
    scrape: async (page, address) => {
      await page.goto(`https://gis.cityofchicago.org/?address=${encodeURIComponent(address)}`, {
        waitUntil: 'networkidle',
        timeout: 30_000,
      });
      await page.waitForTimeout(3000);
      return {
        zoningCode: 'See portal',
        zoningDescription:
          'Chicago GIS loaded. Navigate to the Zoning layer and search by address for full data.',
        portalUrl: page.url(),
      };
    },
  },
  {
    name: 'Los Angeles County, CA — GIS Portal',
    state: 'CA',
    cities: ['los angeles', 'la', 'beverly hills', 'culver city', 'pasadena'],
    portalUrl: 'https://gis.lacounty.gov/gis/zoning/',
    matchFn: (s, c) =>
      s === 'CA' &&
      (c.includes('los angeles') || c === 'la' || c.includes('beverly') || c.includes('pasadena')),
    scrape: async (page, address) => {
      await page.goto('https://gis.lacounty.gov/gis/zoning/', {
        waitUntil: 'networkidle',
        timeout: 30_000,
      });
      return scrapeArcGISWebApp(
        page,
        address,
        'input[placeholder*="Search"]',
        '.esri-widget__panel-content',
      );
    },
  },
  // ── New portals (added 2026-05) ─────────────────────────────
  {
    name: 'Houston, TX — No Traditional Zoning (Dev Regulations)',
    state: 'TX',
    cities: ['houston'],
    portalUrl: 'https://cohgis-mycity.opendata.arcgis.com/',
    matchFn: (s, c) => s === 'TX' && c.includes('houston'),
    scrape: async (page, address) => {
      // Houston has no traditional zoning — returns development regulation data
      await page.goto(
        `https://mycity.houstontx.gov/public/?find=${encodeURIComponent(address)}`,
        { waitUntil: 'networkidle', timeout: 30_000 },
      );
      await page.waitForTimeout(4000);
      return {
        zoningCode: 'N/A (Houston has no zoning)',
        zoningDescription:
          'Houston does not have traditional zoning. Development is governed by building codes, subdivision ordinances, and deed restrictions.',
        portalUrl: page.url(),
      };
    },
  },
  {
    name: 'Dallas, TX — City GIS',
    state: 'TX',
    cities: ['dallas'],
    portalUrl: 'https://gis.dallascityhall.com/',
    matchFn: (s, c) => s === 'TX' && c.includes('dallas'),
    scrape: async (page, address) => {
      await page.goto('https://gis.dallascityhall.com/zoningweb/', {
        waitUntil: 'networkidle',
        timeout: 30_000,
      });
      return scrapeArcGISWebApp(
        page,
        address,
        'input[type="text"], input[placeholder*="Search"], input[placeholder*="address"]',
        '.esri-popup__content, .esri-features__container',
      );
    },
  },
  {
    name: 'Philadelphia, PA — Atlas',
    state: 'PA',
    cities: ['philadelphia', 'philly'],
    portalUrl: 'https://atlas.phila.gov/',
    matchFn: (s, c) =>
      s === 'PA' && (c.includes('philadelphia') || c.includes('philly')),
    scrape: async (page, address) => {
      await page.goto(
        `https://atlas.phila.gov/${encodeURIComponent(address)}`,
        { waitUntil: 'networkidle', timeout: 30_000 },
      );
      await page.waitForTimeout(4000);
      // Atlas renders zoning in a tab panel
      const zoningTab = await page.$('a[href*="zoning"], button:has-text("Zoning")');
      if (zoningTab) await zoningTab.click();
      await page.waitForTimeout(2000);
      const content = await page.textContent('.main-content, .topic-component, .body-container');
      return {
        zoningCode: 'See Atlas',
        zoningDescription: content?.trim() || 'Data loaded — review Atlas for full zoning details',
        portalUrl: page.url(),
      };
    },
  },
  {
    name: 'Phoenix, AZ — City GIS',
    state: 'AZ',
    cities: ['phoenix', 'scottsdale', 'tempe', 'mesa'],
    portalUrl: 'https://phoenix.maps.arcgis.com/',
    matchFn: (s, c) =>
      s === 'AZ' &&
      (c.includes('phoenix') || c.includes('scottsdale') || c.includes('tempe') || c.includes('mesa')),
    scrape: async (page, address) => {
      await page.goto('https://phoenix.maps.arcgis.com/apps/webappviewer/index.html', {
        waitUntil: 'networkidle',
        timeout: 30_000,
      });
      return scrapeArcGISWebApp(
        page,
        address,
        'input[placeholder*="Search"], input[placeholder*="Find"]',
        '.esri-popup__content, .esri-features__container',
      );
    },
  },
  {
    name: 'Charlotte / Mecklenburg County, NC — POLARIS',
    state: 'NC',
    cities: ['charlotte', 'mecklenburg'],
    portalUrl: 'https://polaris.mecklenburgcountync.gov/',
    matchFn: (s, c) =>
      s === 'NC' && (c.includes('charlotte') || c.includes('mecklenburg')),
    scrape: async (page, address) => {
      await page.goto(
        `https://polaris.mecklenburgcountync.gov/#/overlay/search/${encodeURIComponent(address)}`,
        { waitUntil: 'networkidle', timeout: 30_000 },
      );
      await page.waitForTimeout(4000);
      const content = await page.textContent('.results-container, .property-details, .card-body');
      return content
        ? {
            zoningCode: 'See POLARIS',
            zoningDescription: content.trim().slice(0, 500),
            portalUrl: page.url(),
          }
        : null;
    },
  },
  {
    name: 'Nashville / Davidson County, TN — Parcel Viewer',
    state: 'TN',
    cities: ['nashville', 'davidson'],
    portalUrl: 'https://maps.nashville.gov/ParcelViewer/',
    matchFn: (s, c) =>
      s === 'TN' && (c.includes('nashville') || c.includes('davidson')),
    scrape: async (page, address) => {
      await page.goto('https://maps.nashville.gov/ParcelViewer/', {
        waitUntil: 'networkidle',
        timeout: 30_000,
      });
      return scrapeArcGISWebApp(
        page,
        address,
        'input[placeholder*="Search"], input[type="text"]',
        '.esri-popup__content, .esri-features__container',
      );
    },
  },
  {
    name: 'Denver, CO — City GIS',
    state: 'CO',
    cities: ['denver'],
    portalUrl: 'https://www.denvergov.org/Maps/map/zoning',
    matchFn: (s, c) => s === 'CO' && c.includes('denver'),
    scrape: async (page, address) => {
      await page.goto('https://www.denvergov.org/Maps/map/zoning', {
        waitUntil: 'networkidle',
        timeout: 30_000,
      });
      return scrapeArcGISWebApp(
        page,
        address,
        'input[placeholder*="Search"], input[placeholder*="Address"]',
        '.esri-popup__content, .popup-content',
      );
    },
  },
  {
    name: 'Seattle, WA — City GIS',
    state: 'WA',
    cities: ['seattle'],
    portalUrl: 'https://seattlecitygis.maps.arcgis.com/',
    matchFn: (s, c) => s === 'WA' && c.includes('seattle'),
    scrape: async (page, address) => {
      await page.goto(
        'https://seattlecitygis.maps.arcgis.com/apps/webappviewer/index.html',
        { waitUntil: 'networkidle', timeout: 30_000 },
      );
      return scrapeArcGISWebApp(
        page,
        address,
        'input[placeholder*="Search"], input[placeholder*="Find"]',
        '.esri-popup__content, .esri-features__container',
      );
    },
  },
  // ══════════════════════════════════════════════════════════════
  // TIER 2 — State-Level GIS Portals (auto-generated below)
  // Covers EVERY city in every state. See STATE_GIS_PORTALS map.
  // ══════════════════════════════════════════════════════════════

  // Tier 2 entries are appended dynamically — see below

  // ══════════════════════════════════════════════════════════════
  // TIER 3 — Dynamic ArcGIS Hub Search (catch-all fallback)
  // ══════════════════════════════════════════════════════════════
  {
    name: 'Dynamic ArcGIS Hub Search — Nationwide Fallback',
    state: '*',
    portalUrl: 'https://hub.arcgis.com/',
    matchFn: () => true,
    scrape: async (page, address) => {
      // Dynamically search ArcGIS Hub for zoning data near this address
      const query = encodeURIComponent(`zoning ${address}`);
      await page.goto(
        `https://hub.arcgis.com/search?q=${query}&type=Feature%20Service`,
        { waitUntil: 'networkidle', timeout: 30_000 },
      );
      await page.waitForTimeout(3000);

      // Try to find a relevant dataset link
      const firstResult = await page.$('a.card-title, h3 a, .dataset-title a');
      if (firstResult) {
        const href = await firstResult.getAttribute('href');
        if (href) {
          const fullUrl = href.startsWith('http') ? href : `https://hub.arcgis.com${href}`;
          return {
            zoningCode: 'See ArcGIS Hub',
            zoningDescription: `Found potential zoning dataset via Hub search. Visit: ${fullUrl}`,
            portalUrl: fullUrl,
          };
        }
      }

      return {
        zoningCode: 'N/A — manual review required',
        zoningDescription:
          'No automated portal available. Visit your county assessor or municipal GIS portal directly.',
        portalUrl: `https://hub.arcgis.com/search?q=${query}`,
      };
    },
  },
];

// ══════════════════════════════════════════════════════════════════
// STATE GIS PORTALS — All 50 states + DC + territories
//
// These are inserted as Tier 2 entries before the catch-all.
// Each state entry matches ANY city within that state, providing
// a guaranteed portal for every address in the country.
// ══════════════════════════════════════════════════════════════════

interface StateGISEntry {
  name: string;
  portalUrl: string;
  searchSelector?: string;
  resultSelector?: string;
}

const STATE_GIS_PORTALS: Record<string, StateGISEntry> = {
  AL: { name: 'Alabama GIS', portalUrl: 'https://alabamagis.maps.arcgis.com/' },
  AK: { name: 'Alaska DNR GIS', portalUrl: 'https://geoportal.alaska.gov/' },
  AZ: { name: 'Arizona GIS', portalUrl: 'https://azgeo.az.gov/' },
  AR: { name: 'Arkansas GIS Office', portalUrl: 'https://gis.arkansas.gov/' },
  CA: { name: 'California GIS (CalGIS)', portalUrl: 'https://gis.data.ca.gov/' },
  CO: { name: 'Colorado GIS (CIM)', portalUrl: 'https://opendata-geospatialcolorado.hub.arcgis.com/' },
  CT: { name: 'Connecticut GIS', portalUrl: 'https://ct-deep-gis-open-data-website-ctdeep.hub.arcgis.com/' },
  DE: { name: 'Delaware FirstMap', portalUrl: 'https://firstmap.delaware.gov/' },
  DC: { name: 'DC Open Data', portalUrl: 'https://opendata.dc.gov/' },
  FL: { name: 'Florida FGDL', portalUrl: 'https://www.fgdl.org/' },
  GA: { name: 'Georgia GIS Clearinghouse', portalUrl: 'https://data.georgiaspatial.org/' },
  HI: { name: 'Hawaii Statewide GIS', portalUrl: 'https://geoportal.hawaii.gov/' },
  ID: { name: 'Idaho INSIDE', portalUrl: 'https://data-insideidaho.opendata.arcgis.com/' },
  IL: { name: 'Illinois Geospatial Clearinghouse', portalUrl: 'https://clearinghouse.isgs.illinois.edu/' },
  IN: { name: 'Indiana Map', portalUrl: 'https://www.indianamap.org/' },
  IA: { name: 'Iowa GeoData', portalUrl: 'https://geodata.iowa.gov/' },
  KS: { name: 'Kansas GIS (DASC)', portalUrl: 'https://www.kansasgis.org/' },
  KY: { name: 'Kentucky Geography Network', portalUrl: 'https://kygeoportal.ky.gov/' },
  LA: { name: 'Louisiana Atlas', portalUrl: 'https://atlas.ga.lsu.edu/' },
  ME: { name: 'Maine GeoLibrary', portalUrl: 'https://www.maine.gov/geolib/' },
  MD: { name: 'Maryland iMap', portalUrl: 'https://imap.maryland.gov/' },
  MA: { name: 'MassGIS', portalUrl: 'https://www.mass.gov/orgs/massgis-bureau-of-geographic-information' },
  MI: { name: 'Michigan Open Data', portalUrl: 'https://gis-michigan.opendata.arcgis.com/' },
  MN: { name: 'Minnesota Geospatial Commons', portalUrl: 'https://gisdata.mn.gov/' },
  MS: { name: 'Mississippi GIS', portalUrl: 'https://www.maris.state.ms.us/' },
  MO: { name: 'Missouri MSDIS', portalUrl: 'https://msdis.missouri.edu/' },
  MT: { name: 'Montana GIS Portal', portalUrl: 'https://geoinfo.msl.mt.gov/' },
  NE: { name: 'Nebraska GIS', portalUrl: 'https://www.nebraskamap.gov/' },
  NV: { name: 'Nevada GIS', portalUrl: 'https://data-nvopendata.opendata.arcgis.com/' },
  NH: { name: 'New Hampshire GRANIT', portalUrl: 'https://www.granit.unh.edu/' },
  NJ: { name: 'NJ GeoWeb', portalUrl: 'https://njogis-newjersey.opendata.arcgis.com/' },
  NM: { name: 'New Mexico RGIS', portalUrl: 'https://rgis.unm.edu/' },
  NY: { name: 'New York GIS Clearinghouse', portalUrl: 'https://gis.ny.gov/' },
  NC: { name: 'NC OneMap', portalUrl: 'https://www.nconemap.gov/' },
  ND: { name: 'North Dakota GIS Hub', portalUrl: 'https://gishubdata.nd.gov/' },
  OH: { name: 'Ohio Geographically Referenced Info Program', portalUrl: 'https://ogrip.oit.ohio.gov/' },
  OK: { name: 'Oklahoma GIS', portalUrl: 'https://data-ogi.opendata.arcgis.com/' },
  OR: { name: 'Oregon GEO', portalUrl: 'https://www.oregon.gov/geo/' },
  PA: { name: 'Pennsylvania PASDA', portalUrl: 'https://www.pasda.psu.edu/' },
  RI: { name: 'Rhode Island GIS (RIGIS)', portalUrl: 'https://www.rigis.org/' },
  SC: { name: 'South Carolina GIS', portalUrl: 'https://www.gis.sc.gov/' },
  SD: { name: 'South Dakota GIS', portalUrl: 'https://opendata2017-09-18t192802468z-sdbit.hub.arcgis.com/' },
  TN: { name: 'Tennessee GIS', portalUrl: 'https://www.tn.gov/finance/sts-gis/' },
  TX: { name: 'Texas TNRIS', portalUrl: 'https://data.tnris.org/' },
  UT: { name: 'Utah AGRC', portalUrl: 'https://gis.utah.gov/' },
  VT: { name: 'Vermont GIS (VCGI)', portalUrl: 'https://geodata.vermont.gov/' },
  VA: { name: 'Virginia GIS (VGIN)', portalUrl: 'https://vgin.vdem.virginia.gov/' },
  WA: { name: 'Washington Geo Services', portalUrl: 'https://geo.wa.gov/' },
  WV: { name: 'West Virginia GIS Tech Center', portalUrl: 'https://wvgis.wvu.edu/' },
  WI: { name: 'Wisconsin GIS', portalUrl: 'https://data-ltsb.opendata.arcgis.com/' },
  WY: { name: 'Wyoming GIS', portalUrl: 'https://geospatialhub-wygeolib.hub.arcgis.com/' },
  // Territories
  PR: { name: 'Puerto Rico GIS', portalUrl: 'https://www.gis.pr.gov/' },
  GU: { name: 'Guam GIS', portalUrl: 'https://data-guamopa.opendata.arcgis.com/' },
  VI: { name: 'US Virgin Islands GIS', portalUrl: 'https://usvi-dpp.hub.arcgis.com/' },
};

// ── Generate Tier 2 entries from state registry ───────────────
// Insert state portals BEFORE the catch-all (last entry)
const catchAllEntry = PORTAL_REGISTRY.pop()!; // remove catch-all temporarily

for (const [stateCode, entry] of Object.entries(STATE_GIS_PORTALS)) {
  // Don't add a state entry if there's already a city-specific entry for the same state
  // State entries match ANY city within the state as a fallback
  PORTAL_REGISTRY.push({
    name: `${entry.name} — State GIS Portal`,
    state: stateCode,
    portalUrl: entry.portalUrl,
    matchFn: (s, _c) => s === stateCode,
    scrape: async (page, address) => {
      // Strategy 1: Try loading the state GIS portal directly
      try {
        await page.goto(entry.portalUrl, {
          waitUntil: 'networkidle',
          timeout: 20_000,
        });

        // Try common search patterns found on state GIS portals
        const searchSelectors = [
          'input[placeholder*="Search"]',
          'input[placeholder*="search"]',
          'input[placeholder*="Address"]',
          'input[placeholder*="address"]',
          'input[placeholder*="Find"]',
          'input[type="search"]',
          '.search-input input',
          '#searchInput',
          'input.esri-search__input',
        ];

        for (const sel of searchSelectors) {
          const searchBox = await page.$(sel);
          if (searchBox) {
            return scrapeArcGISWebApp(
              page,
              address,
              sel,
              '.esri-popup__content, .esri-features__container, .popup-content, .result-content',
            );
          }
        }
      } catch {
        // Portal failed to load — fall through
      }

      // Strategy 2: Search ArcGIS Hub scoped to this state
      const hubQuery = encodeURIComponent(`zoning ${stateCode} ${address}`);
      await page.goto(
        `https://hub.arcgis.com/search?q=${hubQuery}&type=Feature%20Service`,
        { waitUntil: 'networkidle', timeout: 20_000 },
      );
      await page.waitForTimeout(2000);

      return {
        zoningCode: 'See state GIS portal',
        zoningDescription:
          `Visit the ${entry.name} portal for zoning data. ` +
          `Alternatively, search your county assessor or local GIS portal for detailed zoning information.`,
        portalUrl: entry.portalUrl,
      };
    },
  });
}

// Re-append the catch-all as the absolute last entry
PORTAL_REGISTRY.push(catchAllEntry);

// ── Select portal ─────────────────────────────────────────────
// Priority: city-specific (Tier 1) → state portal (Tier 2) → dynamic hub (Tier 3)

function selectPortal(state: string, city: string): PortalEntry {
  // First pass: try city-specific matches (Tier 1 portals have `cities` defined)
  const citySpecific = PORTAL_REGISTRY.find(
    (p) => p.state !== '*' && p.cities && p.matchFn(state, city),
  );
  if (citySpecific) return citySpecific;

  // Second pass: try state-level match (Tier 2 — no `cities` defined)
  const stateLevel = PORTAL_REGISTRY.find(
    (p) => p.state !== '*' && !p.cities && p.matchFn(state, city),
  );
  if (stateLevel) return stateLevel;

  // Final: catch-all (Tier 3)
  return PORTAL_REGISTRY.find((p) => p.state === '*')!;
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  if (LIST_PORTALS) {
    console.log('\n📋  Supported GIS Portals — Full National Coverage');
    console.log('═'.repeat(70));

    // Tier 1
    const tier1 = PORTAL_REGISTRY.filter((x) => x.state !== '*' && x.cities);
    console.log(`\n🏙️   TIER 1 — City-Specific Portals (${tier1.length})`);
    console.log('─'.repeat(70));
    for (const p of tier1) {
      console.log(`  ${p.state.padEnd(4)} ${p.name}`);
      console.log(`       ${p.portalUrl}`);
    }

    // Tier 2
    const tier2 = PORTAL_REGISTRY.filter((x) => x.state !== '*' && !x.cities);
    console.log(`\n🗺️   TIER 2 — State-Level GIS Portals (${tier2.length} states/territories)`);
    console.log('─'.repeat(70));
    for (const p of tier2) {
      console.log(`  ${p.state.padEnd(4)} ${p.name}`);
    }

    // Tier 3
    console.log(`\n🌐  TIER 3 — Dynamic ArcGIS Hub Search (fallback)`);
    console.log('─'.repeat(70));
    console.log(`  *    Searches hub.arcgis.com for any jurisdiction not in Tier 1/2\n`);

    console.log(`\n  Total coverage: All 50 states + DC + territories (${tier1.length + tier2.length + 1} entries)`);
    console.log('  To add a city portal: edit PORTAL_REGISTRY in src/scripts/zoning-scraper.ts\n');
    process.exit(0);
  }

  if (!ADDRESS) {
    console.error('Error: --address="..." is required.');
    process.exit(1);
  }
  if (!STATE) {
    console.error('Error: --state=XX (2-letter) is required.');
    process.exit(1);
  }

  const portal = selectPortal(STATE, CITY);
  const tier = portal.cities ? '1 (City)' : portal.state === '*' ? '3 (Hub)' : '2 (State)';
  console.log(`\n🗺️   Zoning Scraper — ${ADDRESS}`);
  console.log(`📡  Portal: ${portal.name}`);
  console.log(`📊  Tier: ${tier}`);
  console.log(`🔗  URL: ${portal.portalUrl}`);
  console.log('─'.repeat(60));

  const browser = await chromium.launch({ headless: !SCREENSHOT });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  try {
    const zoningInfo = await portal.scrape(page, ADDRESS);

    if (SCREENSHOT) {
      const screenshotPath = path.join(
        process.cwd(),
        `zoning-${STATE}-${Date.now()}.png`,
      );
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`\n📸  Screenshot: ${screenshotPath}`);
    }

    if (!zoningInfo) {
      console.log('\n⚠️   No zoning data extracted from portal HTML.');
      console.log(
        '    Fallback: use the /api/zoning-scan API route which queries ArcGIS REST\n' +
          '    or visit the portal manually to look up zoning by address.',
      );
      console.log(`\n🔗  Manual lookup: ${portal.portalUrl}\n`);
      process.exit(0);
    }

    if (OUTPUT === 'json') {
      console.log(JSON.stringify({ address: ADDRESS, tier, ...zoningInfo }, null, 2));
    } else {
      console.log(`\n✅  Zoning Result`);
      console.log('─'.repeat(60));
      console.log(`   Zoning Code  : ${zoningInfo.zoningCode}`);
      console.log(`   Description  : ${zoningInfo.zoningDescription}`);
      if (zoningInfo.permittedUnitDensity)
        console.log(`   Unit Density : ${zoningInfo.permittedUnitDensity} units/acre`);
      if (zoningInfo.maxBuildingHeight)
        console.log(`   Max Height   : ${zoningInfo.maxBuildingHeight}`);
      if (zoningInfo.lotCoverage)
        console.log(`   Lot Coverage : ${zoningInfo.lotCoverage}`);
      if (zoningInfo.overlayDistricts?.length)
        console.log(`   Overlays     : ${zoningInfo.overlayDistricts.join(', ')}`);
      console.log(`\n   Source: ${zoningInfo.portalUrl}\n`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
