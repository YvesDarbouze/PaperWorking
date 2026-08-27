export interface BroadcastTokenPayload {
  dealId: string;
  email?: string;
  broadcast?: boolean;
  invite?: boolean;
  type?: string;
  senderId?: string;
  senderName?: string;
  senderEmail?: string;
  subject?: string;
  message?: string;
  dealName?: string;
  address?: string;
  purchasePrice?: number;
  projectedRoi?: number;
  businessCard?: {
    name: string;
    email: string;
    company?: string;
    phone?: string;
    investmentCriteria?: string;
  } | null;
  exp?: number;
}

export function createBroadcastToken(payload: BroadcastTokenPayload): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodeBase64Url = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const encodedHeader = encodeBase64Url(header);
  const encodedPayload = encodeBase64Url({
    ...payload,
    exp: payload.exp || Math.floor(Date.now() / 1000) + 14 * 86400,
  });
  const signature = Buffer.from(`${encodedHeader}.${encodedPayload}.paperworking_secret`).toString(
    'base64url',
  );
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function decodeBroadcastToken(token: string): BroadcastTokenPayload | null {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length >= 2) {
      let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4 !== 0) {
        base64 += '=';
      }
      if (typeof window === 'undefined') {
        const json = Buffer.from(base64, 'base64').toString('utf-8');
        return JSON.parse(json);
      } else {
        const binString = window.atob(base64);
        const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!);
        const json = new TextDecoder().decode(bytes);
        return JSON.parse(json);
      }
    }
    return null;
  } catch {
    return null;
  }
}
