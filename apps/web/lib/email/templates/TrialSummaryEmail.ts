import { renderEmailLayout } from './BaseLayout';

/* ═══════════════════════════════════════════════════════
   TrialSummaryEmail — Phase C (Reinforce)
   
   Sent near the end of a trial period summarizing
   what the user has accomplished and encouraging upgrade.
   ═══════════════════════════════════════════════════════ */

export interface TrialSummaryEmailProps {
  displayName: string;
  daysRemaining: number;
  projectCount: number;
  metricsTracked: number;
  topMetric?: { name: string; value: string; projectName: string };
  appUrl?: string;
}

export function generateTrialSummaryEmail({
  displayName,
  daysRemaining,
  projectCount,
  metricsTracked,
  topMetric,
  appUrl = 'https://paperworking.co',
}: TrialSummaryEmailProps): { subject: string; html: string } {
  const firstName = displayName.split(' ')[0] || 'there';

  const statsHtml = `
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 24px 0;">
      <tr>
        <td style="background-color:#F8F8F8;padding:20px 24px;border:1px solid #E5E5E5;">
          <p style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7F7F7F;margin:0 0 16px 0;">
            Your Trial Summary
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #E5E5E5;">
                <span style="font-size:14px;color:#595959;">Projects created</span>
              </td>
              <td align="right" style="padding:8px 0;border-bottom:1px solid #E5E5E5;">
                <span style="font-size:18px;font-weight:700;color:#0d0d0d;font-variant-numeric:tabular-nums;">${projectCount}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #E5E5E5;">
                <span style="font-size:14px;color:#595959;">Metrics tracked</span>
              </td>
              <td align="right" style="padding:8px 0;border-bottom:1px solid #E5E5E5;">
                <span style="font-size:18px;font-weight:700;color:#0d0d0d;font-variant-numeric:tabular-nums;">${metricsTracked}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;">
                <span style="font-size:14px;color:#595959;">Days remaining</span>
              </td>
              <td align="right" style="padding:8px 0;">
                <span style="font-size:18px;font-weight:700;color:#0d0d0d;font-variant-numeric:tabular-nums;">${daysRemaining}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  const topMetricHtml = topMetric ? `
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 24px 0;">
      <tr>
        <td style="background-color:#F8F8F8;padding:16px 24px;border:1px solid #E5E5E5;">
          <p style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7F7F7F;margin:0 0 6px 0;">
            Top metric — ${topMetric.projectName}
          </p>
          <p style="font-size:13px;color:#595959;margin:0 0 2px 0;">${topMetric.name}</p>
          <p style="font-size:24px;font-weight:700;color:#0d0d0d;margin:0;font-variant-numeric:tabular-nums;">${topMetric.value}</p>
        </td>
      </tr>
    </table>
  ` : '';

  const bodyHtml = `
    <h1 style="font-size:24px;font-weight:700;color:#0d0d0d;margin:0 0 8px 0;letter-spacing:-0.02em;">
      Your trial ends in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}
    </h1>
    <p style="font-size:15px;color:#595959;margin:0 0 24px 0;line-height:1.7;">
      ${firstName}, here's what you've built during your trial — keep the momentum going
      by upgrading to maintain access to all your deal analytics.
    </p>

    ${statsHtml}
    ${topMetricHtml}

    <a href="${appUrl}/dashboard/settings/billing" class="btn-primary" style="display:inline-block;background-color:#0d0d0d;color:#ffffff;text-decoration:none;padding:14px 28px;font-weight:600;font-size:14px;">
      Upgrade Now
    </a>

    <p style="font-size:14px;color:#595959;margin:24px 0 0 0;line-height:1.6;">
      Your data is safe regardless — even on the free tier, your projects
      and metrics are preserved. Upgrading unlocks unlimited projects,
      team collaboration, and priority support.
    </p>
  `;

  return {
    subject: `${firstName}, your trial summary — ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left`,
    html: renderEmailLayout({
      title: 'Trial Summary',
      preheader: `${projectCount} project${projectCount !== 1 ? 's' : ''}, ${metricsTracked} metric${metricsTracked !== 1 ? 's' : ''} — ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining.`,
      bodyHtml,
      appUrl,
    }),
  };
}
