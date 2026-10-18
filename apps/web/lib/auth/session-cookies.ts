export const SESSION_COOKIE = '__session';
export const SUB_COOKIE = '__sub';
export const ACCT_COOKIE = '__acct';
export const SESSION_ID_COOKIE = '__session_id';

export const DEV_MOCK_SESSION_TOKEN = 'mock_session_token_123';

export interface SessionProfile {
  authenticated: boolean;
  accountType: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  mode?: 'mock' | 'session' | 'dev';
}

export function encodeSubCookie(plan: string, status: string): string {
  return Buffer.from(JSON.stringify({ plan, status }), 'utf8').toString('base64');
}

export function decodeSubCookie(raw: string | undefined): { plan: string; status: string } {
  if (!raw) return { plan: 'Individual', status: 'active' };
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf8')) as {
      plan?: string;
      status?: string;
    };
    return {
      plan: parsed.plan ?? 'Individual',
      status: parsed.status ?? 'active',
    };
  } catch {
    return { plan: 'Individual', status: 'active' };
  }
}

function readCookieMap(cookieHeader?: string): Record<string, string> {
  const raw =
    cookieHeader !== undefined
      ? cookieHeader
      : typeof document !== 'undefined'
        ? document.cookie
        : '';
  const map: Record<string, string> = {};
  if (!raw) return map;
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key && val) {
      map[key] = decodeURIComponent(val);
    }
  }
  return map;
}

export function hasClientSessionCookie(cookieHeader?: string): boolean {
  const map = readCookieMap(cookieHeader);
  return Boolean(
    map[SESSION_ID_COOKIE] ||
      map[SESSION_COOKIE] ||
      map[SUB_COOKIE] ||
      map[ACCT_COOKIE],
  );
}

export function getClientSubscriptionStatus(cookieHeader?: string): string | undefined {
  const map = readCookieMap(cookieHeader);
  const subRaw = map[SUB_COOKIE];
  if (!subRaw) return undefined;
  try {
    const json =
      typeof atob === 'function'
        ? atob(subRaw)
        : Buffer.from(subRaw, 'base64').toString('utf8');
    const parsed = JSON.parse(json) as { status?: string };
    return parsed.status || 'active';
  } catch {
    return 'active';
  }
}
