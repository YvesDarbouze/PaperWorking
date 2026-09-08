/**
 * Full responsive audit: desktop / tablet / mobile for core screens.
 * Saves screenshots + overflow report under docs/qa-responsive/
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = __dirname;
const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000';
const PROJECT_ID = '46825ef3-1b3e-441d-b422-61c181a01e4b';
const DEAL_SLUG = '900mcgmlaveaustintx78702';

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];

const PUBLIC_ROUTES = [
  { id: 'home', path: '/' },
  { id: 'login', path: '/login' },
  { id: 'signup', path: '/signup' },
  { id: 'forgot', path: '/forgot-password' },
  { id: 'pricing', path: '/pricing' },
  { id: 'how-it-works', path: '/how-it-works' },
  { id: 'support', path: '/support' },
  { id: 'privacy', path: '/privacy' },
  { id: 'terms', path: '/terms' },
];

const AUTH_ROUTES = [
  { id: 'dashboard', path: '/dashboard' },
  { id: 'projects', path: '/projects' },
  { id: 'projects-new', path: '/projects/new' },
  { id: 'project', path: `/project/${PROJECT_ID}` },
  { id: 'scorecard', path: `/project/${PROJECT_ID}/scorecard` },
  { id: 'insights', path: `/project/${PROJECT_ID}/insights` },
  { id: 'deals', path: '/deals' },
  { id: 'deal-detail', path: `/deals/${DEAL_SLUG}` },
  { id: 'inbox', path: '/dashboard/inbox' },
  { id: 'marketplace', path: '/dashboard/marketplace' },
  { id: 'profile', path: '/dashboard/settings/profile' },
  { id: 'billing', path: '/dashboard/settings/billing' },
  { id: 'reports', path: '/dashboard/reports' },
  { id: 'team', path: '/dashboard/team' },
];

async function measureOverflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const scrollW = Math.max(doc.scrollWidth, body?.scrollWidth ?? 0);
    const clientW = doc.clientWidth;
    const overflowX = scrollW - clientW;
    const offenders = [];
    for (const el of document.querySelectorAll('body *')) {
      if (!(el instanceof HTMLElement)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.right > clientW + 1 || rect.left < -1) {
        const style = getComputedStyle(el);
        if (style.position === 'fixed' || style.position === 'sticky') continue;
        offenders.push({
          tag: el.tagName.toLowerCase(),
          id: el.id || undefined,
          className: (el.className && String(el.className).slice(0, 120)) || undefined,
          right: Math.round(rect.right),
          left: Math.round(rect.left),
          text: (el.innerText || '').trim().slice(0, 60) || undefined,
        });
        if (offenders.length >= 8) break;
      }
    }
    return {
      scrollWidth: scrollW,
      clientWidth: clientW,
      overflowX,
      hasHorizontalScroll: overflowX > 2,
      title: document.title,
      h1: document.querySelector('h1')?.textContent?.trim()?.slice(0, 80) ?? null,
      offenders,
    };
  });
}

async function settle(page) {
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(700);
}

async function shot(page, viewport, routeId) {
  const file = join(OUT, `${viewport}-${routeId}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  const results = [];

  // Public routes first
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    for (const route of PUBLIC_ROUTES) {
      const url = `${BASE}${route.path}`;
      let status = 'ok';
      let metrics = null;
      let error = null;
      try {
        const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
        await settle(page);
        metrics = await measureOverflow(page);
        await shot(page, vp.name, route.id);
        if (!res || res.status() >= 400) status = `http_${res?.status() ?? 'none'}`;
        else if (metrics.hasHorizontalScroll) status = 'overflow_x';
      } catch (e) {
        status = 'error';
        error = e instanceof Error ? e.message : String(e);
      }
      results.push({
        viewport: vp.name,
        ...vp,
        route: route.id,
        path: route.path,
        auth: false,
        status,
        error,
        metrics,
      });
      console.log(`${vp.name.padEnd(8)} ${route.id.padEnd(16)} ${status}`);
    }
  }

  // Establish mock investor session
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  const sessionRes = await page.evaluate(async () => {
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        idToken: 'mock_session_token_123',
        accountType: 'investor',
      }),
    });
    return { ok: res.ok, status: res.status, body: await res.text() };
  });
  console.log('session', sessionRes.status, sessionRes.ok);

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    for (const route of AUTH_ROUTES) {
      const url = `${BASE}${route.path}`;
      let status = 'ok';
      let metrics = null;
      let error = null;
      try {
        const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
        await settle(page);
        metrics = await measureOverflow(page);
        await shot(page, vp.name, route.id);
        if (!res || res.status() >= 400) status = `http_${res?.status() ?? 'none'}`;
        else if (metrics.hasHorizontalScroll) status = 'overflow_x';
      } catch (e) {
        status = 'error';
        error = e instanceof Error ? e.message : String(e);
      }
      results.push({
        viewport: vp.name,
        ...vp,
        route: route.id,
        path: route.path,
        auth: true,
        status,
        error,
        metrics,
      });
      console.log(`${vp.name.padEnd(8)} ${route.id.padEnd(16)} ${status}`);
    }
  }

  const summary = {
    base: BASE,
    generatedAt: new Date().toISOString(),
    totals: {
      checks: results.length,
      ok: results.filter((r) => r.status === 'ok').length,
      overflow_x: results.filter((r) => r.status === 'overflow_x').length,
      http_error: results.filter((r) => r.status.startsWith('http_')).length,
      error: results.filter((r) => r.status === 'error').length,
    },
    issues: results.filter((r) => r.status !== 'ok'),
    results,
  };

  writeFileSync(join(OUT, 'responsive-report.json'), JSON.stringify(summary, null, 2));

  const md = [
    '# Responsive audit report',
    '',
    `Generated: ${summary.generatedAt}`,
    `Base: ${BASE}`,
    '',
    `**Totals:** ${summary.totals.ok}/${summary.totals.checks} OK · overflow_x ${summary.totals.overflow_x} · http ${summary.totals.http_error} · error ${summary.totals.error}`,
    '',
    '## Viewports',
    '- Desktop 1440×900',
    '- Tablet 768×1024',
    '- Mobile 390×844',
    '',
    '## Issues',
    '',
  ];

  if (summary.issues.length === 0) {
    md.push('_None — no horizontal overflow or navigation failures detected._', '');
  } else {
    for (const issue of summary.issues) {
      md.push(
        `### ${issue.viewport} — ${issue.route} (\`${issue.path}\`)`,
        `- Status: **${issue.status}**`,
        issue.error ? `- Error: ${issue.error}` : '',
        issue.metrics
          ? `- scrollWidth ${issue.metrics.scrollWidth} / clientWidth ${issue.metrics.clientWidth} (Δ ${issue.metrics.overflowX})`
          : '',
        issue.metrics?.offenders?.length
          ? `- Offenders: ${JSON.stringify(issue.metrics.offenders.slice(0, 5))}`
          : '',
        `- Screenshot: \`${issue.viewport}-${issue.route}.png\``,
        '',
      );
    }
  }

  writeFileSync(join(OUT, 'RESPONSIVE_REPORT.md'), md.filter(Boolean).join('\n'));
  await browser.close();
  console.log('\nSUMMARY', summary.totals);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
