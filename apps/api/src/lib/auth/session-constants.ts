export const SESSION_COOKIE = '__session';
export const SUB_COOKIE = '__sub';
export const ACCT_COOKIE = '__acct';
export const SESSION_ID_COOKIE = '__session_id';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 14; // 14 days in seconds

export function hasAdminCredentials(): boolean {
  const hasExplicit = !!(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
  const hasAdc = !!(process.env.GOOGLE_CLOUD_PROJECT || process.env.K_SERVICE);
  return hasExplicit || hasAdc;
}

export function encodeSubCookie(plan: string, status: string): string {
  return Buffer.from(JSON.stringify({ plan, status }), 'utf8').toString('base64');
}

export function parseDeviceFromUserAgent(userAgent: string): string {
  if (userAgent.includes('Mac OS')) return 'Mac';
  if (userAgent.includes('Windows')) return 'Windows PC';
  if (userAgent.includes('iPhone')) return 'iPhone';
  if (userAgent.includes('iPad')) return 'iPad';
  if (userAgent.includes('Android')) return 'Android Device';
  if (userAgent.includes('Linux')) return 'Linux PC';
  return 'Unknown Device';
}
