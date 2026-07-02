/**
 * ═══════════════════════════════════════════════════════
 * PaperWorking — Lifecycle Alert Email Template
 *
 * Generates branded HTML email for lifecycle deadline alerts.
 * Follows the BaseLayout pattern established by SystemNotificationEmail.
 * ═══════════════════════════════════════════════════════
 */

import { renderEmailLayout } from './BaseLayout';
import type { LifecycleAlertType } from '@/lib/notifications/notificationTypes';

export interface LifecycleAlertEmailProps {
  alertType: LifecycleAlertType;
  address: string;
  daysUntil: number;
  deadlineDate?: Date;
  title: string;
  body: string;
  deepLinkUrl: string;
  appUrl?: string;
}

/** Friendly label for each lifecycle alert type */
function getLifecycleLabel(alertType: LifecycleAlertType): string {
  switch (alertType) {
    case 'LEASE_RENEWAL_DUE': return 'Lease Renewal';
    case 'PROPERTY_TAX_DUE': return 'Property Tax Payment';
    case 'INSURANCE_RENEWAL_DUE': return 'Insurance Renewal';
    case 'VALUATION_REVIEW_DUE': return 'Valuation Review';
    default: return 'Lifecycle Alert';
  }
}

/** Icon-like label for the deadline badge */
function getDeadlineBadge(daysUntil: number): { color: string; label: string } {
  if (daysUntil <= 7) return { color: '#DC2626', label: 'URGENT' };
  if (daysUntil <= 14) return { color: '#D97706', label: 'SOON' };
  if (daysUntil <= 30) return { color: '#2563EB', label: 'UPCOMING' };
  return { color: '#059669', label: 'PLANNED' };
}

export function generateLifecycleAlertEmail({
  alertType,
  address,
  daysUntil,
  deadlineDate,
  title,
  body,
  deepLinkUrl,
  appUrl = 'https://paperworking.co',
}: LifecycleAlertEmailProps): { subject: string; html: string } {
  const subject = `📅 ${title}`;
  const lifecycleLabel = getLifecycleLabel(alertType);
  const badge = getDeadlineBadge(daysUntil);

  const formattedDeadline = deadlineDate
    ? deadlineDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const deadlineRow = formattedDeadline
    ? `
      <tr>
        <td style="padding:8px 12px;font-size:13px;color:#595959;border-bottom:1px solid #E5E5E5;">Deadline</td>
        <td style="padding:8px 12px;font-size:13px;color:#0d0d0d;font-weight:600;border-bottom:1px solid #E5E5E5;text-align:right;">${formattedDeadline}</td>
      </tr>
    `
    : '';

  const bodyHtml = `
    <div style="margin:0 0 8px 0;">
      <span style="display:inline-block;background-color:${badge.color};color:#ffffff;font-size:11px;font-weight:600;padding:3px 10px;letter-spacing:0.05em;text-transform:uppercase;">
        ${badge.label}
      </span>
    </div>

    <h1 style="font-size:20px;font-weight:700;color:#0d0d0d;margin:0 0 4px 0;letter-spacing:-0.02em;">
      ${lifecycleLabel}
    </h1>
    <p style="font-size:14px;color:#7F7F7F;margin:0 0 20px 0;">
      ${address}
    </p>

    <!-- Timeline Summary -->
    <table style="width:100%;border-collapse:collapse;background-color:#FAFAFA;margin:0 0 20px 0;" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:8px 12px;font-size:13px;color:#595959;border-bottom:1px solid #E5E5E5;">Days Remaining</td>
        <td style="padding:8px 12px;font-size:22px;font-weight:700;color:${badge.color};border-bottom:1px solid #E5E5E5;text-align:right;">
          ${daysUntil}
        </td>
      </tr>
      <tr>
        <td style="padding:8px 12px;font-size:13px;color:#595959;border-bottom:1px solid #E5E5E5;">Alert Type</td>
        <td style="padding:8px 12px;font-size:13px;color:#595959;border-bottom:1px solid #E5E5E5;text-align:right;">${lifecycleLabel}</td>
      </tr>
      ${deadlineRow}
    </table>

    <p style="font-size:14px;color:#595959;margin:0 0 24px 0;line-height:1.6;">
      ${body}
    </p>

    <a href="${appUrl}${deepLinkUrl}" class="btn-primary" style="display:inline-block;background-color:#0d0d0d;color:#ffffff;text-decoration:none;padding:14px 28px;font-weight:600;font-size:14px;">
      View Property Details
    </a>
  `;

  return {
    subject,
    html: renderEmailLayout({
      title: `${lifecycleLabel} — ${address}`,
      preheader: `${lifecycleLabel} for ${address} in ${daysUntil} days`,
      bodyHtml,
      appUrl,
    }),
  };
}
