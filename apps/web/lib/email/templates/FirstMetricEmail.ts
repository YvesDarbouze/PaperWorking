import { renderEmailLayout } from './BaseLayout';

/* ═══════════════════════════════════════════════════════
   FirstMetricEmail — Phase C (Reinforce)
   
   Sent when the user's first metric goes live.
   Celebrates the milestone and encourages deeper usage.
   ═══════════════════════════════════════════════════════ */

export interface FirstMetricEmailProps {
  displayName: string;
  projectName: string;
  metricName: string;
  metricValue: string;
  projectUrl: string;
  appUrl?: string;
}

export function generateFirstMetricEmail({
  displayName,
  projectName,
  metricName,
  metricValue,
  projectUrl,
  appUrl = 'https://paperworking.co',
}: FirstMetricEmailProps): { subject: string; html: string } {
  const firstName = displayName.split(' ')[0] || 'there';

  const bodyHtml = `
    <h1 style="font-size:24px;font-weight:700;color:#0d0d0d;margin:0 0 8px 0;letter-spacing:-0.02em;">
      🎉 Your first metric is live!
    </h1>
    <p style="font-size:15px;font-weight:500;color:#0d0d0d;margin:0 0 16px 0;">
      ${firstName}, your workspace is officially working for you.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 24px 0;">
      <tr>
        <td style="background-color:#F8F8F8;padding:20px 24px;border:1px solid #E5E5E5;">
          <p style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7F7F7F;margin:0 0 8px 0;">
            ${projectName}
          </p>
          <p style="font-size:13px;color:#595959;margin:0 0 4px 0;">
            ${metricName}
          </p>
          <p style="font-size:28px;font-weight:700;color:#0d0d0d;margin:0;font-variant-numeric:tabular-nums;letter-spacing:-0.02em;">
            ${metricValue}
          </p>
        </td>
      </tr>
    </table>

    <p style="font-size:14px;color:#595959;margin:0 0 24px 0;line-height:1.6;">
      This metric updates automatically as you add more deal data or market conditions change.
      Add more financials to unlock additional insights like NOI, DSCR, and equity multiples.
    </p>

    <a href="${appUrl}${projectUrl}" class="btn-primary" style="display:inline-block;background-color:#0d0d0d;color:#ffffff;text-decoration:none;padding:14px 28px;font-weight:600;font-size:14px;">
      View Your Metrics
    </a>
  `;

  return {
    subject: `🎉 Your first metric is live — ${projectName}`,
    html: renderEmailLayout({
      title: 'First Metric',
      preheader: `Your ${metricName} for ${projectName} is now tracking live.`,
      bodyHtml,
      appUrl,
    }),
  };
}
