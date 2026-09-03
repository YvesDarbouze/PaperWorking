/**
 * Client-side broadcast token payload decode for external deal page display.
 * Signing happens server-side only (packages/services broadcast-token.ts).
 */
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
  invitationId?: string;
  broadcastId?: string;
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
