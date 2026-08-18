import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'paperworking_deal_invite_secret_key_2026';

export interface DealInvitePayload {
  dealId: string;
  slug: string;
  address: string;
  inviteeEmail: string;
  creatorName: string;
}

export function generateDealInviteToken(payload: DealInvitePayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '14d' });
}

export function verifyDealInviteToken(token: string): DealInvitePayload | null {
  try {
    const verified = jwt.verify(token, JWT_SECRET);
    if (!verified || typeof verified !== 'object') return null;
    const decoded = verified as Record<string, unknown>;
    if (
      typeof decoded.dealId === 'string' &&
      typeof decoded.slug === 'string' &&
      typeof decoded.address === 'string' &&
      typeof decoded.inviteeEmail === 'string'
    ) {
      return {
        dealId: decoded.dealId,
        slug: decoded.slug,
        address: decoded.address,
        inviteeEmail: decoded.inviteeEmail,
        creatorName: typeof decoded.creatorName === 'string' ? decoded.creatorName : 'An Investor',
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function renderDealInviteEmailHtml(
  payloadOrOptions: DealInvitePayload | (DealInvitePayload & { token: string }),
  tokenArg?: string
): string {
  const payload = payloadOrOptions;
  const token = tokenArg || ('token' in payloadOrOptions ? (payloadOrOptions as { token: string }).token : '') || '';
  const inviteUrl = `https://paperworking.co/deals/${payload.slug}/external?token=${token}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>You've been invited to review a real estate deal on PaperWorking</title>
</head>
<body style="background-color: #0b0f17; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 32px 16px;">
  <div style="max-width: 560px; margin: 0 auto; background: #111827; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 32px;">
    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #34d399; margin-bottom: 8px;">
      PaperWorking Deal Invitation
    </div>
    
    <h1 style="font-size: 20px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 16px;">
      ${payload.address}
    </h1>

    <p style="font-size: 14px; color: #94a3b8; line-height: 1.5; margin-bottom: 24px;">
      ${payload.creatorName} has invited you to review a high-yield real estate investment opportunity on PaperWorking.
    </p>

    <div style="margin-bottom: 32px;">
      <a href="${inviteUrl}" style="display: inline-block; background-color: #34d399; color: #022c22; font-size: 13px; font-weight: 900; text-transform: uppercase; text-decoration: none; padding: 14px 28px; border-radius: 10px;">
        View Deal
      </a>
    </div>

    <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px; font-size: 12px; color: #64748b; line-height: 1.5;">
      <p style="margin: 0;">Reply to this email to message the investor. Subscribe to view full analysis and invest.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function renderDealInviteEmailHTML(
  payloadOrOptions: DealInvitePayload | (DealInvitePayload & { token: string }),
  tokenArg?: string
): string {
  return renderDealInviteEmailHtml(payloadOrOptions, tokenArg);
}
