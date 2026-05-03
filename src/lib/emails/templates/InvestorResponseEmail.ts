import { renderEmailLayout } from './BaseLayout';

export interface InvestorResponseEmailProps {
  action: 'accepted' | 'declined';
  investorName: string;
  investorEmail: string;
  projectName: string;
  projectId: string;
  proposedEquityPercent: number;
  proposedAmount: number;
  appUrl?: string;
}

export function generateInvestorResponseEmail({
  action,
  investorName,
  investorEmail,
  projectName,
  projectId,
  proposedEquityPercent,
  proposedAmount,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://paperworking.co',
}: InvestorResponseEmailProps): { subject: string; html: string; text: string } {
  const isAccepted = action === 'accepted';
  const accentColor = isAccepted ? '#16A34A' : '#DC2626';
  const accentBg = isAccepted ? '#F0FDF4' : '#FEF2F2';
  const actionLabel = isAccepted ? 'Accepted' : 'Declined';

  const subject = isAccepted
    ? `✅ Investor Commitment Received — ${investorName} joined ${projectName}`
    : `Investor Declined — ${investorName} passed on ${projectName}`;

  const bodyHtml = `
    <h1 style="font-size:22px;font-weight:700;color:#0d0d0d;margin:0 0 8px 0;letter-spacing:-0.02em;">
      Invitation ${actionLabel}
    </h1>
    <p style="font-size:14px;color:#7F7F7F;margin:0 0 24px 0;">
      ${investorName} has <strong style="color:${accentColor};">${action}</strong> their invitation to invest in
      <strong style="color:#0d0d0d;">${projectName}</strong>.
    </p>

    <!-- Status Badge -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:16px 20px;background-color:${accentBg};border-left:3px solid ${accentColor};">
          <span style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${accentColor};">
            ${actionLabel}
          </span>
        </td>
      </tr>
    </table>

    <!-- Investor Details -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:16px 20px;background-color:#F2F2F2;border-bottom:1px solid #E5E5E5;">
          <span style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7F7F7F;">Investor</span>
          <p style="font-size:15px;font-weight:600;color:#0d0d0d;margin:4px 0 0 0;">${investorName}</p>
          <p style="font-size:13px;color:#7F7F7F;margin:2px 0 0 0;">${investorEmail}</p>
        </td>
      </tr>
      ${proposedAmount > 0 ? `
      <tr>
        <td style="padding:16px 20px;background-color:#F2F2F2;border-bottom:1px solid #E5E5E5;">
          <span style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7F7F7F;">Proposed Amount</span>
          <p style="font-size:20px;font-weight:700;color:#0d0d0d;margin:4px 0 0 0;">$${proposedAmount.toLocaleString()}</p>
        </td>
      </tr>` : ''}
      <tr>
        <td style="padding:16px 20px;background-color:#F2F2F2;">
          <span style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7F7F7F;">Proposed Equity</span>
          <p style="font-size:20px;font-weight:700;color:#0d0d0d;margin:4px 0 0 0;">${proposedEquityPercent}%</p>
        </td>
      </tr>
    </table>

    ${isAccepted ? `
    <p style="font-size:13px;color:#7F7F7F;margin:0 0 24px 0;">
      A digital signature was captured at the time of acceptance. View the deal dashboard to review the commitment and update the capital stack.
    </p>` : `
    <p style="font-size:13px;color:#7F7F7F;margin:0 0 24px 0;">
      You may send a revised offer or invite another investor to take their place.
    </p>`}

    <a href="${appUrl}/dashboard/projects/${projectId}"
       style="display:inline-block;background-color:#0d0d0d;color:#ffffff;text-decoration:none;padding:14px 28px;font-weight:600;font-size:14px;letter-spacing:0.02em;">
      View Deal Dashboard
    </a>
  `;

  const text = [
    `Invitation ${actionLabel}`,
    '',
    `${investorName} (${investorEmail}) has ${action} their invitation to invest in ${projectName}.`,
    proposedAmount > 0 ? `Proposed amount: $${proposedAmount.toLocaleString()}` : '',
    `Proposed equity: ${proposedEquityPercent}%`,
    '',
    `View the deal: ${appUrl}/dashboard/projects/${projectId}`,
  ].filter(Boolean).join('\n');

  return { subject, html: renderEmailLayout({ title: `Investor ${actionLabel}`, preheader: subject, bodyHtml }), text };
}
