/**
 * ═══════════════════════════════════════════════════════
 * PaperWorking — Metric Alert Email Template
 *
 * Generates branded HTML email for metric threshold violations.
 * Follows the BaseLayout pattern established by SystemNotificationEmail.
 * ═══════════════════════════════════════════════════════
 */

import { renderEmailLayout } from './BaseLayout';
import type { MetricAlertType } from '@/lib/notifications/notificationTypes';

export interface MetricAlertEmailProps {
  alertType: MetricAlertType;
  address: string;
  currentValue: number;
  threshold: number;
  previousValue?: number;
  title: string;
  body: string;
  deepLinkUrl: string;
  appUrl?: string;
}

/** Friendly label for each metric alert type */
function getMetricLabel(alertType: MetricAlertType): string {
  switch (alertType) {
    case 'DSCR_BELOW_THRESHOLD': return 'Debt Service Coverage Ratio';
    case 'OCCUPANCY_LOW': return 'Occupancy Rate';
    case 'CASHFLOW_NEGATIVE': return 'Annual Cash Flow';
    case 'EXPENSE_RATIO_SPIKE': return 'Operating Expense Ratio';
    default: return 'Metric';
  }
}

/** Urgency badge color */
function getUrgencyColor(alertType: MetricAlertType): string {
  switch (alertType) {
    case 'DSCR_BELOW_THRESHOLD':
    case 'CASHFLOW_NEGATIVE':
      return '#DC2626'; // Red — critical
    case 'OCCUPANCY_LOW':
    case 'EXPENSE_RATIO_SPIKE':
      return '#D97706'; // Amber — actionable
    default:
      return '#595959';
  }
}

/** Format metric value for display */
function formatValue(alertType: MetricAlertType, value: number): string {
  switch (alertType) {
    case 'DSCR_BELOW_THRESHOLD':
      return value.toFixed(2);
    case 'OCCUPANCY_LOW':
      return `${value.toFixed(0)}%`;
    case 'CASHFLOW_NEGATIVE':
      return `$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    case 'EXPENSE_RATIO_SPIKE':
      return `${value.toFixed(1)}%`;
    default:
      return String(value);
  }
}

export function generateMetricAlertEmail({
  alertType,
  address,
  currentValue,
  threshold,
  previousValue,
  title,
  body,
  deepLinkUrl,
  appUrl = 'https://paperworking.co',
}: MetricAlertEmailProps): { subject: string; html: string } {
  const subject = `⚠️ ${title}`;
  const metricLabel = getMetricLabel(alertType);
  const urgencyColor = getUrgencyColor(alertType);

  const comparisonRow = previousValue != null
    ? `
      <tr>
        <td style="padding:8px 12px;font-size:13px;color:#595959;border-bottom:1px solid #E5E5E5;">Previous</td>
        <td style="padding:8px 12px;font-size:13px;color:#595959;border-bottom:1px solid #E5E5E5;text-align:right;">${formatValue(alertType, previousValue)}</td>
      </tr>
    `
    : '';

  const bodyHtml = `
    <div style="margin:0 0 8px 0;">
      <span style="display:inline-block;background-color:${urgencyColor};color:#ffffff;font-size:11px;font-weight:600;padding:3px 10px;letter-spacing:0.05em;text-transform:uppercase;">
        Metric Alert
      </span>
    </div>

    <h1 style="font-size:20px;font-weight:700;color:#0d0d0d;margin:0 0 4px 0;letter-spacing:-0.02em;">
      ${metricLabel}
    </h1>
    <p style="font-size:14px;color:#7F7F7F;margin:0 0 20px 0;">
      ${address}
    </p>

    <!-- Metric Summary Table -->
    <table style="width:100%;border-collapse:collapse;background-color:#FAFAFA;margin:0 0 20px 0;" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:8px 12px;font-size:13px;color:#595959;border-bottom:1px solid #E5E5E5;">Current Value</td>
        <td style="padding:8px 12px;font-size:15px;font-weight:700;color:${urgencyColor};border-bottom:1px solid #E5E5E5;text-align:right;">
          ${formatValue(alertType, currentValue)}
        </td>
      </tr>
      <tr>
        <td style="padding:8px 12px;font-size:13px;color:#595959;border-bottom:1px solid #E5E5E5;">Threshold</td>
        <td style="padding:8px 12px;font-size:13px;color:#595959;border-bottom:1px solid #E5E5E5;text-align:right;">${formatValue(alertType, threshold)}</td>
      </tr>
      ${comparisonRow}
    </table>

    <p style="font-size:14px;color:#595959;margin:0 0 24px 0;line-height:1.6;">
      ${body}
    </p>

    <a href="${appUrl}${deepLinkUrl}" class="btn-primary" style="display:inline-block;background-color:#0d0d0d;color:#ffffff;text-decoration:none;padding:14px 28px;font-weight:600;font-size:14px;">
      Review Metrics
    </a>
  `;

  return {
    subject,
    html: renderEmailLayout({
      title: `Metric Alert — ${address}`,
      preheader: `${metricLabel} alert for ${address}: ${formatValue(alertType, currentValue)}`,
      bodyHtml,
      appUrl,
    }),
  };
}
