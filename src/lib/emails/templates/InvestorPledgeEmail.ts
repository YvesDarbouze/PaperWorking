import { renderEmailLayout } from './BaseLayout';

/**
 * InvestorPledgeEmail
 * Sent when an investor pledges capital to a project.
 */

export interface InvestorPledgeEmailProps {
  projectName: string;
  projectId: string;
  investorName: string;
  pledgeAmount: number;
  totalRaised: number;
  targetAmount: number;
  appUrl?: string;
}

export function generateInvestorPledgeEmail({
  projectName,
  projectId,
  investorName,
  pledgeAmount,
  totalRaised,
  targetAmount,
  appUrl = 'https://paperworking.co',
}: InvestorPledgeEmailProps): { subject: string; html: string } {
  const progressPercent = Math.min(Math.round((totalRaised / targetAmount) * 100), 100);
  const remaining = Math.max(targetAmount - totalRaised, 0);

  const subject = `New Capital Pledge — ${investorName} • $${pledgeAmount.toLocaleString()}`;

  const bodyHtml = `
    <h1 style="font-size:22px;font-weight:700;color:#0d0d0d;margin:0 0 8px 0;letter-spacing:-0.02em;">
      Capital Pledge Received
    </h1>
    <p style="font-size:14px;color:#7F7F7F;margin:0 0 24px 0;">
      A new investor commitment has been recorded for <strong style="color:#0d0d0d;">${projectName}</strong>.
    </p>

    <!-- Pledge Details -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:16px 20px;background-color:#F2F2F2;border-left:3px solid #0d0d0d;">
          <span style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7F7F7F;">Investor</span>
          <p style="font-size:15px;font-weight:600;color:#0d0d0d;margin:4px 0 0 0;">${investorName}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 20px;background-color:#F2F2F2;">
          <span style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7F7F7F;">Pledge Amount</span>
          <p style="font-size:24px;font-weight:700;color:#0d0d0d;margin:4px 0 0 0;">$${pledgeAmount.toLocaleString()}</p>
        </td>
      </tr>
    </table>

    <!-- Capital Progress -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:20px;background-color:#F2F2F2;">
          <span style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7F7F7F;">Capital Progress</span>
          <!-- Progress Bar -->
          <div style="margin:12px 0 8px 0;background-color:#E5E5E5;height:8px;width:100%;">
            <div style="background-color:#0d0d0d;height:8px;width:${progressPercent}%;"></div>
          </div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px;font-weight:600;color:#0d0d0d;">
                $${totalRaised.toLocaleString()} raised
              </td>
              <td align="right" style="font-size:13px;color:#7F7F7F;">
                ${progressPercent}% of $${targetAmount.toLocaleString()}
              </td>
            </tr>
          </table>
          ${remaining > 0 ? `<p style="font-size:12px;color:#7F7F7F;margin:8px 0 0 0;">$${remaining.toLocaleString()} remaining</p>` : '<p style="font-size:12px;font-weight:600;color:#0d0d0d;margin:8px 0 0 0;">🎯 Fully funded</p>'}
        </td>
      </tr>
    </table>

    <a href="${appUrl}/dashboard/projects/${projectId}" class="btn-primary" style="display:inline-block;background-color:#0d0d0d;color:#ffffff;text-decoration:none;padding:14px 28px;font-weight:600;font-size:14px;">
      View Capital Stack
    </a>
  `;

  return {
    subject,
    html: renderEmailLayout({
      title: 'Investor Pledge',
      preheader: `${investorName} pledged $${pledgeAmount.toLocaleString()} to ${projectName}`,
      bodyHtml,
      appUrl,
    }),
  };
}
