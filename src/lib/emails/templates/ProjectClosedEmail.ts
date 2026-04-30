import { renderEmailLayout } from './BaseLayout';

/**
 * ProjectClosedEmail
 * Sent when a project reaches final disposition — closed_won or closed_lost.
 */

export interface ProjectClosedEmailProps {
  projectName: string;
  projectId: string;
  outcome: 'closed_won' | 'closed_lost';
  netProfit?: number;
  roi?: number;
  daysHeld?: number;
  closedBy: string;
  appUrl?: string;
}

export function generateProjectClosedEmail({
  projectName,
  projectId,
  outcome,
  netProfit,
  roi,
  daysHeld,
  closedBy,
  appUrl = 'https://paperworking.co',
}: ProjectClosedEmailProps): { subject: string; html: string } {
  const isWon = outcome === 'closed_won';
  const outcomeLabel = isWon ? 'Closed — Won' : 'Closed — Lost';
  const outcomeColor = isWon ? '#0d0d0d' : '#7F7F7F';

  const subject = `${projectName} — ${outcomeLabel}`;

  const metricsRows = [
    netProfit !== undefined
      ? `<tr>
          <td style="padding:12px 20px;border-bottom:1px solid #E5E5E5;">
            <span style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7F7F7F;">Net Profit</span>
            <p style="font-size:20px;font-weight:700;color:${netProfit >= 0 ? '#0d0d0d' : '#595959'};margin:4px 0 0 0;">
              ${netProfit >= 0 ? '+' : ''}$${netProfit.toLocaleString()}
            </p>
          </td>
        </tr>`
      : '',
    roi !== undefined
      ? `<tr>
          <td style="padding:12px 20px;border-bottom:1px solid #E5E5E5;">
            <span style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7F7F7F;">Return on Investment</span>
            <p style="font-size:20px;font-weight:700;color:#0d0d0d;margin:4px 0 0 0;">${roi.toFixed(1)}%</p>
          </td>
        </tr>`
      : '',
    daysHeld !== undefined
      ? `<tr>
          <td style="padding:12px 20px;">
            <span style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7F7F7F;">Days Held</span>
            <p style="font-size:20px;font-weight:700;color:#0d0d0d;margin:4px 0 0 0;">${daysHeld}</p>
          </td>
        </tr>`
      : '',
  ]
    .filter(Boolean)
    .join('');

  const bodyHtml = `
    <h1 style="font-size:22px;font-weight:700;color:#0d0d0d;margin:0 0 8px 0;letter-spacing:-0.02em;">
      Project ${outcomeLabel}
    </h1>
    <p style="font-size:14px;color:#7F7F7F;margin:0 0 24px 0;">
      ${closedBy} has finalized the disposition for <strong style="color:#0d0d0d;">${projectName}</strong>.
    </p>

    <!-- Outcome Badge -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:8px 16px;background-color:${outcomeColor};font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#ffffff;">
          ${outcomeLabel}
        </td>
      </tr>
    </table>

    ${metricsRows ? `
    <!-- Performance Metrics -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;background-color:#F2F2F2;">
      ${metricsRows}
    </table>` : ''}

    <p style="margin:0 0 24px 0;font-size:14px;color:#595959;">
      This project is now locked. Historical data and documents remain accessible in read-only mode.
    </p>

    <a href="${appUrl}/dashboard/projects/${projectId}" class="btn-primary" style="display:inline-block;background-color:#0d0d0d;color:#ffffff;text-decoration:none;padding:14px 28px;font-weight:600;font-size:14px;">
      View Final Report
    </a>
  `;

  return {
    subject,
    html: renderEmailLayout({
      title: outcomeLabel,
      preheader: `${projectName} has been ${outcomeLabel.toLowerCase()}${roi !== undefined ? ` • ${roi.toFixed(1)}% ROI` : ''}`,
      bodyHtml,
      appUrl,
    }),
  };
}
