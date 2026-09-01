/**
 * CSRF / Origin validation for server-side API routes.
 *
 * Strategy (applied in order):
 *  1. Sec-Fetch-Site: cross-site  → immediate 403, no further checks
 *  2. Origin header              → must be in the explicit allowlist
 *  3. Referer header             → must originate from an allowlisted host
 *  4. No headers at all          → allowed in dev (curl/Postman), blocked in prod
 */

const PRODUCTION_ORIGINS: ReadonlySet<string> = new Set([
  'https://paperworking.co',
  'https://www.paperworking.co',
  'https://paperworking-97055.web.app',
  'https://paperworking-97055.firebaseapp.com',
  // Firebase App Hosting default URL (staging / preview)
  'https://paperworker--paperworking-97055.us-east4.hosted.app',
]);

/** Firebase App Hosting serves each backend at https://<backend>--<project>.<region>.hosted.app */
function isFirebaseAppHostingOrigin(origin: string): boolean {
  try {
    const { protocol, hostname } = new URL(origin);
    return protocol === 'https:' && hostname.endsWith('.hosted.app');
  } catch {
    return false;
  }
}

function extraOriginsFromEnv(): string[] {
  return (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const DEV_ORIGINS: ReadonlySet<string> = new Set([
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
]);

function allowedOrigins(isE2e: boolean): ReadonlySet<string> {
  const base = new Set([...PRODUCTION_ORIGINS, ...extraOriginsFromEnv()]);
  if (process.env.NODE_ENV !== 'production' || isE2e) {
    return new Set([...base, ...DEV_ORIGINS]);
  }
  return base;
}

function isLocalDevOrigin(origin: string): boolean {
  try {
    const { protocol, hostname } = new URL(origin);
    return protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

function isAllowedOrigin(origin: string, isE2e: boolean): boolean {
  if (allowedOrigins(isE2e).has(origin)) return true;
  if (isFirebaseAppHostingOrigin(origin)) return true;
  if ((process.env.NODE_ENV !== 'production' || isE2e) && isLocalDevOrigin(origin)) return true;
  return false;
}

function originFromUrl(raw: string): string | null {
  try {
    const { origin } = new URL(raw);
    return origin;
  } catch {
    return null;
  }
}

export type CsrfResult =
  | { ok: true }
  | { ok: false; status: 403; reason: string };

export function validateCsrf(request: Request): CsrfResult {
  const cookieHeader = request.headers.get('cookie') || '';
  const isE2e = cookieHeader.includes('__e2e_test=1');

  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite === 'cross-site') {
    console.warn('[CSRF] Rejected — Sec-Fetch-Site: cross-site');
    return { ok: false, status: 403, reason: 'Cross-site request rejected' };
  }

  const origin = request.headers.get('origin');
  if (origin) {
    if (isAllowedOrigin(origin, isE2e)) {
      return { ok: true };
    }
    console.warn('[CSRF] Rejected — unlisted Origin:', origin);
    return { ok: false, status: 403, reason: 'Origin not allowed' };
  }

  const referer = request.headers.get('referer');
  if (referer) {
    const refOrigin = originFromUrl(referer);
    if (refOrigin && isAllowedOrigin(refOrigin, isE2e)) {
      return { ok: true };
    }
    console.warn('[CSRF] Rejected — unlisted Referer:', referer);
    return { ok: false, status: 403, reason: 'Referer not allowed' };
  }

  if (process.env.NODE_ENV === 'production' && !isE2e) {
    console.warn('[CSRF] Rejected — no Origin or Referer header in production request');
    return { ok: false, status: 403, reason: 'Missing origin headers' };
  }

  return { ok: true };
}
