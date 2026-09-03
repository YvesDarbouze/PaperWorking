import {
  ACCT_COOKIE,
  SESSION_COOKIE,
  SESSION_ID_COOKIE,
  SUB_COOKIE,
  type CookieDescriptor,
  type SessionCookieOptions,
  type SessionCookiePolicyKind,
} from './types.js';

/** Nest session cookies expire after 5 days (matches legacy AuthService). */
export const NEST_SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 5;

/** Next session cookies expire after 14 days (matches SESSION_MAX_AGE). */
export const NEXT_SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 14;

/**
 * Vercel (FE) → Cloud Run (API) is cross-site. Browsers only send credentials
 * cookies when SameSite=None; Secure. Use COOKIE_SAMESITE=lax only if FE and
 * API share a registrable domain (e.g. paperworking.co + api.paperworking.co).
 */
export function nestCookieBaseOptions(env: {
  nodeEnv?: string;
  cookieSameSite?: string;
} = {}): SessionCookieOptions {
  const nodeEnv = env.nodeEnv ?? process.env.NODE_ENV ?? 'development';
  const sameSiteEnv = (env.cookieSameSite ?? process.env.COOKIE_SAMESITE ?? '')
    .trim()
    .toLowerCase();
  const production = nodeEnv === 'production';
  const sameSite: 'lax' | 'none' =
    sameSiteEnv === 'lax'
      ? 'lax'
      : sameSiteEnv === 'none' || production
        ? 'none'
        : 'lax';
  return {
    path: '/',
    secure: production || sameSite === 'none',
    sameSite,
    maxAge: NEST_SESSION_MAX_AGE_MS,
  };
}

export function nextCookieBaseOptions(nodeEnv: string): SessionCookieOptions {
  const production = nodeEnv === 'production';
  return {
    httpOnly: true,
    secure: production,
    sameSite: 'lax',
    path: '/',
    maxAge: NEXT_SESSION_MAX_AGE_SEC,
  };
}

/** Nest uses base64url for __sub (legacy AuthService). */
export function encodeNestSubCookie(plan: string, status: string): string {
  return Buffer.from(JSON.stringify({ plan, status }), 'utf8').toString('base64url');
}

/** Next route handler uses standard base64 for __sub (legacy handleSessionPost). */
export function encodeNextSubCookie(plan: string, status: string): string {
  return Buffer.from(JSON.stringify({ plan, status }), 'utf8').toString('base64');
}

export function buildSessionCookieDescriptors(input: {
  policy: SessionCookiePolicyKind;
  sessionValue: string;
  authUserAccountType: string;
  subscription: { plan: string; status: string } | null;
  nodeEnv?: string;
  cookieSameSite?: string;
  sessionId?: string;
}): CookieDescriptor[] {
  const base =
    input.policy === 'nest'
      ? nestCookieBaseOptions({ nodeEnv: input.nodeEnv, cookieSameSite: input.cookieSameSite })
      : nextCookieBaseOptions(input.nodeEnv ?? process.env.NODE_ENV ?? 'development');

  const encodeSub = input.policy === 'nest' ? encodeNestSubCookie : encodeNextSubCookie;
  const subPlan = input.subscription?.plan ?? (input.policy === 'nest' ? 'Individual' : 'Individual');
  const subStatus =
    input.subscription?.status ?? (input.policy === 'nest' ? 'active' : 'inactive');

  const cookies: CookieDescriptor[] = [
    {
      name: SESSION_COOKIE,
      value: input.sessionValue,
      options: { ...base, httpOnly: true },
    },
    {
      name: ACCT_COOKIE,
      value: input.authUserAccountType,
      options: {
        ...base,
        httpOnly: input.policy === 'nest' ? false : true,
      },
    },
    {
      name: SUB_COOKIE,
      value: encodeSub(subPlan, subStatus),
      options: { ...base, httpOnly: false },
    },
  ];

  if (input.policy === 'next' && input.sessionId) {
    cookies.push({
      name: SESSION_ID_COOKIE,
      value: input.sessionId,
      options: { ...base, httpOnly: false },
    });
  }

  return cookies;
}

export function buildClearSessionCookieDescriptors(input: {
  policy: SessionCookiePolicyKind;
  nodeEnv?: string;
  cookieSameSite?: string;
}): CookieDescriptor[] {
  const nodeEnv = input.nodeEnv ?? process.env.NODE_ENV ?? 'development';
  const clearBase: SessionCookieOptions =
    input.policy === 'nest'
      ? { ...nestCookieBaseOptions({ nodeEnv, cookieSameSite: input.cookieSameSite }), maxAge: 0 }
      : {
          httpOnly: true,
          secure: nodeEnv === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 0,
        };

  const cookies: CookieDescriptor[] = [
    { name: SESSION_COOKIE, value: '', options: { ...clearBase, httpOnly: true } },
    { name: SUB_COOKIE, value: '', options: { ...clearBase, httpOnly: false } },
    { name: ACCT_COOKIE, value: '', options: clearBase },
  ];

  if (input.policy === 'next') {
    cookies.push({
      name: SESSION_ID_COOKIE,
      value: '',
      options: { ...clearBase, httpOnly: false },
    });
  }

  return cookies;
}
