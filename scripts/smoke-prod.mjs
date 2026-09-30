#!/usr/bin/env node
/**
 * Production runtime smoke test.
 *
 * Starts nothing itself: point it at an already running built server:
 *   SMOKE_BASE_URL=http://localhost:3000 node scripts/smoke-prod.mjs
 *
 * It fails when:
 *  - a CRITICAL route does not respond or responds 5xx
 *  - more than MAX_OTHER_5XX non-critical routes respond 5xx
 * This catches runtime-only failures (route conflicts, bootstrap crashes)
 * that build/typecheck/unit tests cannot see.
 */

const BASE = (process.env.SMOKE_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const MAX_OTHER_5XX = Number(process.env.SMOKE_MAX_5XX || '2');

const CRITICAL = ['/', '/api/health', '/login', '/pricing'];

const ROUTES = [
  '/',
  '/pricing',
  '/how-it-works',
  '/marketplaces',
  '/support',
  '/deal-calculator',
  '/login',
  '/contact',
  '/privacy',
  '/terms',
  '/about',
  '/cookies',
  '/forgot-password',
  '/dashboard',
  '/dashboard/team',
  '/projects',
  '/project/deal-lifecycle',
  '/admin',
  '/vendor-portal',
  '/deals/brickellgateway/external',
  '/api/health',
  '/api/deals',
  '/api/deals/exists?slug=brickellgateway',
  '/api/places/autocomplete?q=austin',
  '/api/marketplace/investors',
  '/api/vendors',
  '/api/insights?userId=dev-user-1',
  '/api/reports/portfolio',
];

async function check(route) {
  const url = `${BASE}${route}`;
  try {
    const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(25000) });
    return res.status;
  } catch (error) {
    return `ERR:${error instanceof Error ? error.message : String(error)}`;
  }
}

const results = [];
for (const route of ROUTES) {
  const status = await check(route);
  results.push([route, status]);
}

let failures = 0;
for (const [route, status] of results) {
  const is5xx = typeof status === 'number' && status >= 500;
  const isCritical = CRITICAL.includes(route);
  const unreachable = typeof status === 'string' && status.startsWith('ERR:');
  const flag = is5xx || unreachable ? (isCritical ? '  <-- CRITICAL' : '  <-- 5xx') : '';
  if (is5xx || unreachable) failures += 1;
  console.log(`${String(status).padEnd(6)} ${route}${flag}`);
}

const criticalFailures = results.filter(
  ([route, status]) =>
    CRITICAL.includes(route) &&
    ((typeof status === 'number' && status >= 500) ||
      (typeof status === 'string' && status.startsWith('ERR:'))),
);

if (criticalFailures.length > 0) {
  console.error(
    `\n[smoke] FAIL: critical route(s) unhealthy: ${criticalFailures
      .map(([r, s]) => `${r} (${s})`)
      .join(', ')}`,
  );
  process.exit(1);
}

if (failures > MAX_OTHER_5XX) {
  console.error(`\n[smoke] FAIL: ${failures} routes failed 5xx/unreachable (max allowed ${MAX_OTHER_5XX})`);
  process.exit(1);
}

console.log(`\n[smoke] OK: ${results.length} routes checked, ${failures} 5xx/unreachable`);
