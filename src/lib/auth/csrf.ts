/**
 * CSRF / Origin validation for server-side API routes.
 *
 * Strategy (applied in order):
 *  1. Sec-Fetch-Site: cross-site  → immediate 403, no further checks
 *  2. Origin header              → must be in the explicit allowlist
 *  3. Referer header             → must originate from an allowlisted host
 *  4. No headers at all          → allowed in dev (curl/Postman), blocked in prod
 *
 * The allowlist contains no wildcards. Every trusted origin is enumerated
 * explicitly so a misconfigured staging deploy cannot silently pass.
 */

// ── Allowlists ────────────────────────────────────────────────────────────────

const PRODUCTION_ORIGINS: ReadonlySet<string> = new Set([
  'https://paperworking.co',
  'https://www.paperworking.co',
  'https://paperworking-97055.web.app',         // Firebase Hosting (this project only)
  'https://paperworking-97055.firebaseapp.com', // Firebase legacy hosting domain
]);

const DEV_ORIGINS: ReadonlySet<string> = new Set([
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
]);

// ── Helpers ───────────────────────────────────────────────────────────────────

function allowedOrigins(): ReadonlySet<string> {
  if (process.env.NODE_ENV !== 'production') {
    // Union of dev + prod so local code can call prod-domain preview builds
    return new Set([...PRODUCTION_ORIGINS, ...DEV_ORIGINS]);
  }
  return PRODUCTION_ORIGINS;
}

function originFromUrl(raw: string): string | null {
  try {
    const { origin } = new URL(raw);
    return origin; // e.g. "https://paperworking.co"
  } catch {
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export type CsrfResult =
  | { ok: true }
  | { ok: false; status: 403; reason: string };

/**
 * Validates that a request originates from a trusted domain.
 * Call this at the top of every mutating API route handler.
 *
 * @example
 * const csrf = validateCsrf(request);
 * if (!csrf.ok) return NextResponse.json({ error: csrf.reason }, { status: csrf.status });
 */
export function validateCsrf(request: Request): CsrfResult {
  // ── 1. Sec-Fetch-Site — fastest signal, set by all modern browsers ─────────
  // "cross-site" means the request originates from a different registrable
  // domain. There is no legitimate scenario where a third-party site should
  // be able to set our session cookies, so reject immediately.
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite === 'cross-site') {
    console.warn('[CSRF] Rejected — Sec-Fetch-Site: cross-site');
    return { ok: false, status: 403, reason: 'Cross-site request rejected' };
  }

  // ── 2. Origin header ───────────────────────────────────────────────────────
  const origin = request.headers.get('origin');
  if (origin) {
    if (allowedOrigins().has(origin)) {
      return { ok: true };
    }
    console.warn('[CSRF] Rejected — unlisted Origin:', origin);
    return { ok: false, status: 403, reason: 'Origin not allowed' };
  }

  // ── 3. Referer fallback (Safari omits Origin on some navigations) ──────────
  const referer = request.headers.get('referer');
  if (referer) {
    const refOrigin = originFromUrl(referer);
    if (refOrigin && allowedOrigins().has(refOrigin)) {
      return { ok: true };
    }
    console.warn('[CSRF] Rejected — unlisted Referer:', referer);
    return { ok: false, status: 403, reason: 'Referer not allowed' };
  }

  // ── 4. No identifying headers ─────────────────────────────────────────────
  // Browsers always send Origin for cross-origin fetch(). A missing Origin in
  // production means a non-browser client (curl, server-to-server). Reject in
  // production; allow in dev for tooling convenience.
  if (process.env.NODE_ENV === 'production') {
    console.warn('[CSRF] Rejected — no Origin or Referer header in production request');
    return { ok: false, status: 403, reason: 'Missing origin headers' };
  }

  return { ok: true }; // dev-only pass-through
}
