#!/usr/bin/env npx ts-node
/**
 * Market Vitals Scraper — Playwright CLI
 *
 * Fetches Census ACS demographic data for a ZIP code via:
 *   1. Census Bureau API (primary — no browser needed)
 *   2. Census Reporter HTML (browser fallback for rendered charts)
 *
 * Usage:
 *   npx ts-node src/scripts/market-vitals-scraper.ts --zip=30318
 *   npx ts-node src/scripts/market-vitals-scraper.ts --zip=30318 --output=json
 *   npx ts-node src/scripts/market-vitals-scraper.ts --zip=30318 --screenshot
 *
 * Options:
 *   --zip          5-digit ZIP code (required)
 *   --output       "table" (default) | "json"
 *   --screenshot   Save a PNG of the Census Reporter profile page
 */

import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

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

if (!ZIP || !/^\d{5}$/.test(ZIP)) {
  console.error('Error: --zip=XXXXX (5-digit) is required.');
  process.exit(1);
}

// ── Census API fetch ──────────────────────────────────────────

const CENSUS_BASE = 'https://api.census.gov/data';
const ACS_VARS = [
  'B01003_001E', // Population
  'B19013_001E', // Median HH Income
  'B25077_001E', // Median Home Value
  'B17001_002E', // Below Poverty Level
  'B01002_001E', // Median Age
  'B25003_002E', // Owner-Occupied Units
  'B25003_003E', // Renter-Occupied Units
].join(',');

const AVAILABLE_YEARS = [2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014];

interface YearRow {
  year: number;
  population: number;
  medianIncome: number;
  medianHomeValue: number;
  povertyCount: number;
  medianAge: number;
  ownerUnits: number;
  renterUnits: number;
}

async function fetchCensusYear(year: number, zip: string): Promise<YearRow | null> {
  const url = `${CENSUS_BASE}/${year}/acs/acs5?get=${ACS_VARS}&for=zip%20code%20tabulation%20area:${zip}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json() as string[][];
    if (!Array.isArray(data) || data.length < 2) return null;
    const [headers, values] = data;
    const get = (key: string) => {
      const i = headers.indexOf(key);
      return i >= 0 ? parseInt(values[i], 10) || 0 : 0;
    };
    return {
      year,
      population: get('B01003_001E'),
      medianIncome: get('B19013_001E'),
      medianHomeValue: get('B25077_001E'),
      povertyCount: get('B17001_002E'),
      medianAge: get('B01002_001E'),
      ownerUnits: get('B25003_002E'),
      renterUnits: get('B25003_003E'),
    };
  } catch {
    return null;
  }
}

// ── Census Reporter browser scrape (fallback) ─────────────────

async function scrapeWithBrowser(zip: string, screenshotPath?: string): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const url = `https://censusreporter.org/profiles/86000US${zip}-${zip}/`;
  console.log(`\n🌐  Navigating to Census Reporter: ${url}`);

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });

    // Wait for the summary statistics to render
    await page.waitForSelector('.stat-callout', { timeout: 15_000 }).catch(() => null);

    // Extract key stats from rendered HTML
    const stats = await page.evaluate(() => {
      const getText = (sel: string) =>
        document.querySelector(sel)?.textContent?.trim() ?? '—';

      return {
        population: getText('[data-stat-slug="total_population"] .value'),
        medianIncome: getText('[data-stat-slug="median_household_income"] .value'),
        medianAge: getText('[data-stat-slug="median_age"] .value'),
        geographyName: getText('h1.title'),
      };
    });

    console.log('\n📊  Census Reporter — Live Stats');
    console.log(`   Geography : ${stats.geographyName}`);
    console.log(`   Population: ${stats.population}`);
    console.log(`   Median HH Income: ${stats.medianIncome}`);
    console.log(`   Median Age: ${stats.medianAge}`);

    if (screenshotPath) {
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`\n📸  Screenshot saved: ${screenshotPath}`);
    }
  } finally {
    await browser.close();
  }
}

// ── Formatting helpers ────────────────────────────────────────

function fmtNum(n: number): string {
  return n > 0 ? n.toLocaleString('en-US') : '—';
}
function fmtUSD(n: number): string {
  return n > 0 ? `$${n.toLocaleString('en-US')}` : '—';
}
function growth(rows: YearRow[], key: keyof YearRow, lookback: number): string {
  const sorted = [...rows].sort((a, b) => a.year - b.year);
  const latest = sorted[sorted.length - 1];
  if (!latest) return '—';
  const cutoff = latest.year - lookback;
  const baseline = sorted.find((r) => r.year >= cutoff) ?? sorted[0];
  const base = Number(baseline[key]);
  const curr = Number(latest[key]);
  if (!base) return '—';
  const pct = ((curr - base) / base) * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔍  Market Vitals Scraper — ZIP ${ZIP}`);
  console.log('─'.repeat(50));

  // 1. Census API batch fetch
  console.log(`\n📡  Fetching Census ACS data for ${AVAILABLE_YEARS.length} years…`);
  const rows = (
    await Promise.all(AVAILABLE_YEARS.map((y) => fetchCensusYear(y, ZIP)))
  ).filter(Boolean) as YearRow[];

  if (!rows.length) {
    console.error(`\n❌  No Census ACS data found for ZIP ${ZIP}.`);
    console.error(`    Verify the ZCTA exists at: https://censusreporter.org/profiles/86000US${ZIP}-${ZIP}/`);
    process.exit(1);
  }

  rows.sort((a, b) => a.year - b.year);
  const latest = rows[rows.length - 1];

  if (OUTPUT === 'json') {
    const output = {
      zip: ZIP,
      fetchedAt: new Date().toISOString(),
      source: 'Census ACS 5-Year Estimates',
      summary: {
        populationCurrent: latest.population,
        medianIncomeCurrent: latest.medianIncome,
        medianHomeValue: latest.medianHomeValue,
        medianAge: latest.medianAge,
        ownerPct: Math.round((latest.ownerUnits / (latest.ownerUnits + latest.renterUnits)) * 1000) / 10,
        populationGrowth5yr: growth(rows, 'population', 5),
        incomeGrowth5yr: growth(rows, 'medianIncome', 5),
        populationGrowth10yr: growth(rows, 'population', 10),
        incomeGrowth10yr: growth(rows, 'medianIncome', 10),
      },
      trend: rows.map((r) => ({
        year: r.year,
        population: r.population,
        medianIncome: r.medianIncome,
        medianHomeValue: r.medianHomeValue,
      })),
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    // Table output
    console.log(`\n📍  ZIP ${ZIP} — Latest ACS Year: ${latest.year}`);
    console.log('─'.repeat(50));
    console.log(`   Population       : ${fmtNum(latest.population)}`);
    console.log(`   Median HH Income : ${fmtUSD(latest.medianIncome)}`);
    console.log(`   Median Home Value: ${fmtUSD(latest.medianHomeValue)}`);
    console.log(`   Median Age       : ${latest.medianAge > 0 ? latest.medianAge : '—'}`);
    const ownerPct =
      latest.ownerUnits + latest.renterUnits > 0
        ? Math.round((latest.ownerUnits / (latest.ownerUnits + latest.renterUnits)) * 100)
        : 0;
    console.log(`   Owner-Occupied   : ${ownerPct}%`);

    console.log('\n📈  Growth Trends');
    console.log('─'.repeat(50));
    console.log(`   Population  5yr  : ${growth(rows, 'population', 5)}`);
    console.log(`   Population  10yr : ${growth(rows, 'population', 10)}`);
    console.log(`   Median Income 5yr: ${growth(rows, 'medianIncome', 5)}`);
    console.log(`   Median Income 10yr: ${growth(rows, 'medianIncome', 10)}`);

    console.log('\n📅  Year-by-Year Trend');
    console.log('─'.repeat(50));
    console.log(
      `${'Year'.padEnd(6)}${'Population'.padEnd(14)}${'Med. Income'.padEnd(16)}${'Med. Home Value'}`,
    );
    for (const r of rows) {
      console.log(
        `${String(r.year).padEnd(6)}${fmtNum(r.population).padEnd(14)}${fmtUSD(r.medianIncome).padEnd(16)}${fmtUSD(r.medianHomeValue)}`,
      );
    }
  }

  // 2. Browser scrape with Census Reporter (optional, for screenshot or JS-rendered data)
  if (SCREENSHOT || rows.length < 3) {
    const screenshotPath = SCREENSHOT
      ? path.join(process.cwd(), `market-vitals-${ZIP}-${Date.now()}.png`)
      : undefined;
    await scrapeWithBrowser(ZIP, screenshotPath);
  }

  console.log(`\n✅  Done. Source: U.S. Census Bureau ACS 5-Year Estimates\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
