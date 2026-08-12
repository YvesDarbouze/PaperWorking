import jwt from 'jsonwebtoken';
import { BusinessCard } from '@/types/deals';

const JWT_SECRET = process.env.JWT_SECRET || 'paperworking_deal_invite_secret_key_2026';

export interface DealBroadcastPayload {
  dealId: string;
  slug: string;
  address: string;
  senderName: string;
  recipientEmail: string;
  subject: string;
  message: string;
  includeBusinessCard?: boolean;
  businessCard?: BusinessCard | null;
  type: 'broadcast';
}

export function generateDealBroadcastToken(payload: DealBroadcastPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '14d' });
}

export function verifyDealBroadcastToken(token: string): DealBroadcastPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded && decoded.type === 'broadcast') {
      return decoded as DealBroadcastPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export function renderDealBroadcastEmailHtml(
  payloadOrOptions: DealBroadcastPayload | (DealBroadcastPayload & { token: string }),
  tokenArg?: string
): string {
  const payload = payloadOrOptions;
  const token = tokenArg || (payloadOrOptions as any).token || '';
  const inviteUrl = `https://paperworking.co/deals/${payload.slug}/external?token=${token}&broadcast=true`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${payload.subject || 'Deal Analysis Broadcast from PaperWorking'}</title>
</head>
<body style="background-color: #0b0f17; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 32px 16px;">
  <div style="max-width: 560px; margin: 0 auto; background: #111827; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 32px;">
    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #34d399; margin-bottom: 8px;">
      PaperWorking Deal Broadcast
    </div>
    
    <h1 style="font-size: 20px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 16px;">
      ${payload.address}
    </h1>

    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 16px; margin-bottom: 24px; font-size: 14px; color: #cbd5e1; white-space: pre-wrap;">
      ${payload.message}
    </div>

    <div style="margin-bottom: 32px;">
      <a href="${inviteUrl}" style="display: inline-block; background-color: #34d399; color: #022c22; font-size: 13px; font-weight: 900; text-transform: uppercase; text-decoration: none; padding: 14px 28px; border-radius: 10px;">
        View Deal
      </a>
    </div>

    <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px; font-size: 12px; color: #64748b; line-height: 1.5;">
      <p style="margin: 0;">Reply to this email to message ${payload.senderName}. Subscribe to view full analysis.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
