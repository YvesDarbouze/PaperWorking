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
