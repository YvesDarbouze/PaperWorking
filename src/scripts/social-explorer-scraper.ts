#!/usr/bin/env npx ts-node
/**
 * Social Explorer & NAR Research Scraper — Playwright CLI
 *
 * Navigates to Social Explorer and NAR Research portals to pull
 * 5-year population growth and median household income for a
 * property's ZIP code. Falls back to Census Reporter when
 * premium access is not available.
 *
 * Data Sources (in priority order):
 *   1. Social Explorer (socialexplorer.com) — ACS data visualizations
 *   2. NAR Research (nar.realtor/research-and-statistics) — housing market data
 *   3. Census Reporter (censusreporter.org) — open Census data
 *   4. FRED/BLS (fred.stlouisfed.org) — economic indicators
 *
 * Usage:
 *   npx ts-node src/scripts/social-explorer-scraper.ts --zip=30318
 *   npx ts-node src/scripts/social-explorer-scraper.ts --zip=30318 --output=json
 *   npx ts-node src/scripts/social-explorer-scraper.ts --zip=30318 --screenshot
 *   npx ts-node src/scripts/social-explorer-scraper.ts --zip=30318 --source=nar
 *   npx ts-node src/scripts/social-explorer-scraper.ts --zip=30318 --source=all
 *
 * Options:
 *   --zip          5-digit ZIP code (required)
 *   --output       "table" (default) | "json"
 *   --screenshot   Save PNGs of each source page
 *   --source       "social" | "nar" | "census" | "all" (default: "all")
 */

import { chromium, Browser, Page } from 'playwright';
import * as path from 'path';

// ── CLI args ──────────────────────────────────────────────────

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [key, val] = a.replace(/^--/, '').split('=');
    return [key, val ?? true];
  }),
);

const ZIP = String(args.zip || '');
const OUTPUT = String(args.output || 'table');
const SCREENSHOT = Boolean(args.screenshot);
const SOURCE = String(args.source || 'all').toLowerCase();

if (!ZIP || !/^\d{5}$/.test(ZIP)) {
  console.error('Error: --zip=XXXXX (5-digit) is required.');
  process.exit(1);
}

// ── Data interfaces ───────────────────────────────────────────

interface DemographicSnapshot {
  source: string;
  sourceUrl: string;
  population?: number;
  populationGrowth5yr?: string;
  medianHouseholdIncome?: number;
  incomeGrowth5yr?: string;
  medianHomeValue?: number;
  medianAge?: number;
  ownerOccupiedPct?: number;
  additionalMetrics?: Record<string, string>;
  screenshotPath?: string;
  scrapedAt: string;
}

// ── Social Explorer scraper ───────────────────────────────────

async function scrapeSocialExplorer(
  browser: Browser,
  zip: string,
): Promise<DemographicSnapshot | null> {
  console.log('\n📊  [Social Explorer] Navigating to profile page…');
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  try {
    // Social Explorer provides ACS data at the ZCTA level
    const url = `https://www.socialexplorer.com/profiles/essential-report/zip_${zip}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    // Wait for page content to render
    await page.waitForTimeout(5000);

    // Check if we hit a paywall or login redirect
    const pageUrl = page.url();
    const isPaywalled =
      pageUrl.includes('/sign-in') ||
      pageUrl.includes('/login') ||
      pageUrl.includes('/subscribe');

    if (isPaywalled) {
      console.log('   ⚠️  Social Explorer requires login — trying public data tables…');

      // Try the public tables explorer instead
      const publicUrl = `https://www.socialexplorer.com/tables/ACS2023_5yr/R13624627`;
      await page.goto(publicUrl, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      await page.waitForTimeout(3000);
    }

    // Extract available statistics from the page
    const stats = await page.evaluate(() => {
      const result: Record<string, string> = {};

      // Try multiple CSS patterns Social Explorer uses
      const statElements = document.querySelectorAll(
        '.stat-value, .metric-value, .data-value, td[data-stat], .profile-stat',
      );
      statElements.forEach((el) => {
        const label =
          el.closest('tr')?.querySelector('td:first-child, th')?.textContent?.trim() ||
          el.getAttribute('data-label') ||
          '';
        const value = el.textContent?.trim() || '';
        if (label && value) result[label] = value;
      });

      // Also grab any visible summary KPIs
      const kpis = document.querySelectorAll('.kpi, .summary-stat, .highlight-stat');
      kpis.forEach((el) => {
        const label = el.querySelector('.label, .stat-label, h4, h5')?.textContent?.trim() || '';
        const value =
          el.querySelector('.value, .stat-value, .number')?.textContent?.trim() || '';
        if (label && value) result[label] = value;
      });

      // Get page title for context
      result['_pageTitle'] = document.title;
      result['_url'] = window.location.href;

      return result;
    });

    const screenshotPath = SCREENSHOT
      ? path.join(process.cwd(), `social-explorer-${zip}-${Date.now()}.png`)
      : undefined;
    if (screenshotPath) {
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`   📸  Screenshot: ${screenshotPath}`);
    }

    // Parse extracted values
    const parseNum = (s?: string) => {
      if (!s) return undefined;
      const cleaned = s.replace(/[$,%\s]/g, '').replace(/,/g, '');
      const n = parseFloat(cleaned);
      return isNaN(n) ? undefined : n;
    };

    const findStat = (keys: string[]) => {
      for (const key of keys) {
        for (const [k, v] of Object.entries(stats)) {
          if (k.toLowerCase().includes(key.toLowerCase())) return v;
        }
      }
      return undefined;
    };

    // Filter out internal keys for additional metrics
    const additionalMetrics: Record<string, string> = {};
    for (const [k, v] of Object.entries(stats)) {
      if (!k.startsWith('_')) additionalMetrics[k] = v;
    }

    return {
      source: 'Social Explorer',
      sourceUrl: stats['_url'] || url,
      population: parseNum(findStat(['Population', 'Total Population'])),
      medianHouseholdIncome: parseNum(
        findStat(['Median Household Income', 'Median Income', 'Household Income']),
      ),
      medianHomeValue: parseNum(findStat(['Median Home Value', 'Home Value', 'Housing Value'])),
      medianAge: parseNum(findStat(['Median Age'])),
      additionalMetrics:
        Object.keys(additionalMetrics).length > 0 ? additionalMetrics : undefined,
      screenshotPath,
      scrapedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    console.log(`   ❌  Social Explorer scrape failed: ${err.message}`);
    return null;
  } finally {
    await context.close();
  }
}

// ── NAR Research scraper ──────────────────────────────────────

async function scrapeNARResearch(
  browser: Browser,
  zip: string,
): Promise<DemographicSnapshot | null> {
  console.log('\n🏠  [NAR Research] Navigating to housing data…');
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  try {
    // NAR provides metro-area and state-level data
    // Try the local market conditions page first
    const narUrl = 'https://www.nar.realtor/research-and-statistics/housing-statistics/metropolitan-median-area-prices-and-affordability';
    await page.goto(narUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(4000);

    // Extract metro-area pricing data from the NAR table
    const narStats = await page.evaluate((targetZip) => {
      const result: Record<string, string> = {};

      // NAR typically has data tables with metro area stats
      const tables = document.querySelectorAll('table');
      for (const table of tables) {
        const rows = table.querySelectorAll('tr');
        for (const row of rows) {
          const cells = row.querySelectorAll('td, th');
          if (cells.length >= 2) {
            const label = cells[0].textContent?.trim() || '';
            const value = cells[1].textContent?.trim() || '';
            if (label && value) result[label] = value;
          }
        }
      }

      // Also try to find any embedded data visualizations
      const charts = document.querySelectorAll('[data-chart], .chart-container, canvas');
      result['_chartCount'] = String(charts.length);

      // Get download links for detailed data
      const downloadLinks = document.querySelectorAll('a[href*=".xlsx"], a[href*=".csv"], a[href*="download"]');
      const links: string[] = [];
      downloadLinks.forEach((a) => {
        const href = (a as HTMLAnchorElement).href;
        if (href) links.push(href);
      });
      if (links.length > 0) result['_downloadLinks'] = links.join(' | ');

      result['_pageTitle'] = document.title;
      result['_url'] = window.location.href;

      return result;
    }, zip);

    // Try the Housing Affordability Index page too
    console.log('   📈  Checking Housing Affordability Index…');
    const haiUrl = 'https://www.nar.realtor/research-and-statistics/housing-statistics/housing-affordability-index';
    await page.goto(haiUrl, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.waitForTimeout(3000);

    const haiStats = await page.evaluate(() => {
      const result: Record<string, string> = {};
      const statEls = document.querySelectorAll('.stat, .kpi, .metric, .data-point');
      statEls.forEach((el) => {
        const label = el.querySelector('.label, h4, h5, dt')?.textContent?.trim() || '';
        const value = el.querySelector('.value, .number, dd')?.textContent?.trim() || '';
        if (label && value) result[`HAI: ${label}`] = value;
      });
      return result;
    });

    const allMetrics = { ...narStats, ...haiStats };

    const screenshotPath = SCREENSHOT
      ? path.join(process.cwd(), `nar-research-${zip}-${Date.now()}.png`)
      : undefined;
    if (screenshotPath) {
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`   📸  Screenshot: ${screenshotPath}`);
    }

    // Filter out internal keys
    const additionalMetrics: Record<string, string> = {};
    for (const [k, v] of Object.entries(allMetrics)) {
      if (!k.startsWith('_')) additionalMetrics[k] = v;
    }

    return {
      source: 'NAR Research',
      sourceUrl: narStats['_url'] || narUrl,
      additionalMetrics:
        Object.keys(additionalMetrics).length > 0 ? additionalMetrics : undefined,
      screenshotPath,
      scrapedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    console.log(`   ❌  NAR Research scrape failed: ${err.message}`);
    return null;
  } finally {
    await context.close();
  }
}

// ── Census Reporter scraper (always-works fallback) ───────────

async function scrapeCensusReporter(
  browser: Browser,
  zip: string,
): Promise<DemographicSnapshot | null> {
  console.log('\n🏛️  [Census Reporter] Navigating to profile page…');
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  try {
    const url = `https://censusreporter.org/profiles/86000US${zip}-${zip}/`;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    await page.waitForSelector('body', { timeout: 10_000 });
    await page.waitForTimeout(3000);

    const stats = await page.evaluate(() => {
      const getText = (sel: string) =>
        document.querySelector(sel)?.textContent?.trim() ?? '';

      return {
        geographyName: getText('h1.title'),
        population: getText('[data-stat-slug="total_population"] .value'),
        medianIncome: getText(
          '[data-stat-slug="median_household_income"] .value',
        ),
        medianAge: getText('[data-stat-slug="median_age"] .value'),
        percentOwnerOccupied: getText(
          '[data-stat-slug="pct_owner_occupied"] .value',
        ),
      };
    });

    const screenshotPath = SCREENSHOT
      ? path.join(process.cwd(), `census-reporter-${zip}-${Date.now()}.png`)
      : undefined;
    if (screenshotPath) {
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`   📸  Screenshot: ${screenshotPath}`);
    }

    const parseNum = (s: string) => {
      const cleaned = s.replace(/[$,%\s]/g, '').replace(/,/g, '');
      const n = parseFloat(cleaned);
      return isNaN(n) ? undefined : n;
    };

    return {
      source: 'Census Reporter',
      sourceUrl: url,
      population: parseNum(stats.population),
      medianHouseholdIncome: parseNum(stats.medianIncome),
      medianAge: parseNum(stats.medianAge),
      ownerOccupiedPct: parseNum(stats.percentOwnerOccupied),
      additionalMetrics: {
        'Geography': stats.geographyName,
      },
      screenshotPath,
      scrapedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    console.log(`   ❌  Census Reporter scrape failed: ${err.message}`);
    return null;
  } finally {
    await context.close();
  }
}

// ── Census API fetch (no browser needed) ──────────────────────

interface CensusYearData {
  year: number;
  population: number;
  medianIncome: number;
  medianHomeValue: number;
}

async function fetchCensusAPI(zip: string): Promise<CensusYearData[]> {
  console.log('\n📡  [Census API] Fetching ACS 5-Year batch data…');
  const YEARS = [2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014];
  const VARS = 'B01003_001E,B19013_001E,B25077_001E';
  const KEY = process.env.CENSUS_API_KEY ? `&key=${process.env.CENSUS_API_KEY}` : '';

  const rows: CensusYearData[] = [];

  for (const year of YEARS) {
    try {
      const url = `https://api.census.gov/data/${year}/acs/acs5?get=${VARS}&for=zip%20code%20tabulation%20area:${zip}${KEY}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = (await res.json()) as string[][];
      if (!Array.isArray(data) || data.length < 2) continue;
      const [headers, values] = data;
      const get = (k: string) => {
        const i = headers.indexOf(k);
        return i >= 0 ? parseInt(values[i], 10) || 0 : 0;
      };
      rows.push({
        year,
        population: get('B01003_001E'),
        medianIncome: get('B19013_001E'),
        medianHomeValue: get('B25077_001E'),
      });
    } catch {
      continue;
    }
  }

  return rows.sort((a, b) => a.year - b.year);
}

// ── Formatting helpers ────────────────────────────────────────

function fmtNum(n?: number): string {
  if (n == null || n <= 0) return '—';
  return n.toLocaleString('en-US');
}
function fmtUSD(n?: number): string {
  if (n == null || n <= 0) return '—';
  return `$${n.toLocaleString('en-US')}`;
}
function computeGrowth(rows: CensusYearData[], key: keyof CensusYearData, lookback: number): string {
  if (rows.length < 2) return '—';
  const latest = rows[rows.length - 1];
  const cutoff = latest.year - lookback;
  const baseline = rows.find((r) => r.year >= cutoff) ?? rows[0];
  const base = Number(baseline[key]);
  const curr = Number(latest[key]);
  if (!base) return '—';
  const pct = ((curr - base) / base) * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔍  Market Vitals — Multi-Source Scraper`);
  console.log(`📍  ZIP: ${ZIP}`);
  console.log(`📂  Sources: ${SOURCE === 'all' ? 'Social Explorer + NAR + Census' : SOURCE}`);
  console.log('═'.repeat(60));

  // 1. Always fetch Census API data (fast, reliable, no browser)
  const censusRows = await fetchCensusAPI(ZIP);
  const latest = censusRows.length > 0 ? censusRows[censusRows.length - 1] : null;

  // 2. Browser-based scraping
  const browser = await chromium.launch({ headless: !SCREENSHOT });
  const snapshots: DemographicSnapshot[] = [];

  try {
    if (SOURCE === 'all' || SOURCE === 'social') {
      const se = await scrapeSocialExplorer(browser, ZIP);
      if (se) snapshots.push(se);
    }

    if (SOURCE === 'all' || SOURCE === 'nar') {
      const nar = await scrapeNARResearch(browser, ZIP);
      if (nar) snapshots.push(nar);
    }

    if (SOURCE === 'all' || SOURCE === 'census') {
      const cr = await scrapeCensusReporter(browser, ZIP);
      if (cr) snapshots.push(cr);
    }
  } finally {
    await browser.close();
  }

  // 3. Compose output
  const growthPop5yr = computeGrowth(censusRows, 'population', 5);
  const growthPop10yr = computeGrowth(censusRows, 'population', 10);
  const growthIncome5yr = computeGrowth(censusRows, 'medianIncome', 5);
  const growthIncome10yr = computeGrowth(censusRows, 'medianIncome', 10);

  if (OUTPUT === 'json') {
    const output = {
      zip: ZIP,
      fetchedAt: new Date().toISOString(),
      censusAPI: {
        source: 'U.S. Census Bureau ACS 5-Year Estimates',
        summary: latest
          ? {
              population: latest.population,
              medianIncome: latest.medianIncome,
              medianHomeValue: latest.medianHomeValue,
              populationGrowth5yr: growthPop5yr,
              populationGrowth10yr: growthPop10yr,
              incomeGrowth5yr: growthIncome5yr,
              incomeGrowth10yr: growthIncome10yr,
            }
          : null,
        trend: censusRows,
      },
      browserSources: snapshots,
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    // Summary table
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📍  ZIP ${ZIP} — Market Vitals Summary`);
    console.log(`${'═'.repeat(60)}`);

    if (latest) {
      console.log(`\n   Census API (ACS ${latest.year})`);
      console.log(`   ${'─'.repeat(40)}`);
      console.log(`   Population        : ${fmtNum(latest.population)}`);
      console.log(`   Median HH Income  : ${fmtUSD(latest.medianIncome)}`);
      console.log(`   Median Home Value : ${fmtUSD(latest.medianHomeValue)}`);
      console.log(`   Pop Growth  5yr   : ${growthPop5yr}`);
      console.log(`   Pop Growth  10yr  : ${growthPop10yr}`);
      console.log(`   Income Growth 5yr : ${growthIncome5yr}`);
      console.log(`   Income Growth 10yr: ${growthIncome10yr}`);

      console.log(`\n   📅  10-Year Trend`);
      console.log(`   ${'─'.repeat(50)}`);
      console.log(
        `   ${'Year'.padEnd(6)}${'Population'.padEnd(14)}${'Med. Income'.padEnd(16)}${'Home Value'}`,
      );
      for (const r of censusRows) {
        console.log(
          `   ${String(r.year).padEnd(6)}${fmtNum(r.population).padEnd(14)}${fmtUSD(r.medianIncome).padEnd(16)}${fmtUSD(r.medianHomeValue)}`,
        );
      }
    }

    // Browser source results
    for (const snap of snapshots) {
      console.log(`\n   ${snap.source}`);
      console.log(`   ${'─'.repeat(40)}`);
      console.log(`   URL: ${snap.sourceUrl}`);
      if (snap.population) console.log(`   Population       : ${fmtNum(snap.population)}`);
      if (snap.medianHouseholdIncome)
        console.log(`   Median HH Income : ${fmtUSD(snap.medianHouseholdIncome)}`);
      if (snap.medianHomeValue)
        console.log(`   Median Home Value: ${fmtUSD(snap.medianHomeValue)}`);
      if (snap.medianAge) console.log(`   Median Age       : ${snap.medianAge}`);
      if (snap.ownerOccupiedPct)
        console.log(`   Owner-Occupied   : ${snap.ownerOccupiedPct}%`);

      if (snap.additionalMetrics && Object.keys(snap.additionalMetrics).length > 0) {
        console.log(`   Additional Data:`);
        for (const [k, v] of Object.entries(snap.additionalMetrics)) {
          if (v.length < 100) {
            console.log(`     ${k}: ${v}`);
          }
        }
      }
      if (snap.screenshotPath) console.log(`   Screenshot: ${snap.screenshotPath}`);
    }
  }

  console.log(`\n✅  Done. ${snapshots.length + 1} source(s) queried.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
