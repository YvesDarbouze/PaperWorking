/**
 * ═══════════════════════════════════════════════════════
 * PaperWorking — Notification Type Registry (Metric + Lifecycle Alerts)
 *
 * Extends the existing NOTIFICATION_METADATA in types/notification.ts
 * with new metric alert and lifecycle alert notification types.
 *
 * This file provides:
 * - New NotificationType literals for metric/lifecycle alerts
 * - Title/body template generators
 * - Deep link URL builders
 * - Alert type → urgency/channel mappings
 * ═══════════════════════════════════════════════════════
 */

import type { NotificationChannel, NotificationUrgency } from '@/types/notification';

// ── Metric Alert Types ────────────────────────────────────────────────────────

export type MetricAlertType =
  | 'DSCR_BELOW_THRESHOLD'
  | 'OCCUPANCY_LOW'
  | 'CASHFLOW_NEGATIVE'
  | 'EXPENSE_RATIO_SPIKE';

// ── Lifecycle Alert Types ─────────────────────────────────────────────────────

export type LifecycleAlertType =
  | 'LEASE_RENEWAL_DUE'
  | 'PROPERTY_TAX_DUE'
  | 'INSURANCE_RENEWAL_DUE'
  | 'VALUATION_REVIEW_DUE';

// ── Combined Alert Type ───────────────────────────────────────────────────────

export type AlertType = MetricAlertType | LifecycleAlertType;

// ── Alert Metadata Registry ───────────────────────────────────────────────────

export interface AlertMetadata {
  urgency: NotificationUrgency;
  channels: NotificationChannel[];
  /** Notification type to use when creating via NotificationService */
  notificationType: 'BURN_RATE_WARNING' | 'DEADLINE_ALERT' | 'OVER_IMPROVEMENT_ALERT';
  /** Category for user preference resolution */
  category: 'alerts' | 'deadlines';
  /** Debounce window in hours (per project per alert type) */
  debounceHours: number;
}

export const ALERT_METADATA: Record<AlertType, AlertMetadata> = {
  // ── Metric Alerts ─────────────────────────────────────
  DSCR_BELOW_THRESHOLD: {
    urgency: 'critical',
    channels: ['in-app', 'email', 'push'],
    notificationType: 'BURN_RATE_WARNING',
    category: 'alerts',
    debounceHours: 24,
  },
  OCCUPANCY_LOW: {
    urgency: 'actionable',
    channels: ['in-app', 'email'],
    notificationType: 'BURN_RATE_WARNING',
    category: 'alerts',
    debounceHours: 24,
  },
  CASHFLOW_NEGATIVE: {
    urgency: 'critical',
    channels: ['in-app', 'email', 'push'],
    notificationType: 'BURN_RATE_WARNING',
    category: 'alerts',
    debounceHours: 24,
  },
  EXPENSE_RATIO_SPIKE: {
    urgency: 'actionable',
    channels: ['in-app', 'email'],
    notificationType: 'OVER_IMPROVEMENT_ALERT',
    category: 'alerts',
    debounceHours: 24,
  },

  // ── Lifecycle Alerts ──────────────────────────────────
  LEASE_RENEWAL_DUE: {
    urgency: 'actionable',
    channels: ['in-app', 'email'],
    notificationType: 'DEADLINE_ALERT',
    category: 'deadlines',
    debounceHours: 168, // 7 days
  },
  PROPERTY_TAX_DUE: {
    urgency: 'critical',
    channels: ['in-app', 'email', 'push'],
    notificationType: 'DEADLINE_ALERT',
    category: 'deadlines',
    debounceHours: 168, // 7 days
  },
  INSURANCE_RENEWAL_DUE: {
    urgency: 'actionable',
    channels: ['in-app', 'email'],
    notificationType: 'DEADLINE_ALERT',
    category: 'deadlines',
    debounceHours: 168, // 7 days
  },
  VALUATION_REVIEW_DUE: {
    urgency: 'informational',
    channels: ['in-app'],
    notificationType: 'DEADLINE_ALERT',
    category: 'alerts',
    debounceHours: 720, // 30 days
  },
};

// ── Title/Body Generators ─────────────────────────────────────────────────────

export interface AlertContentParams {
  address: string;
  /** The metric value that triggered the alert */
  currentValue?: number;
  /** The threshold that was violated */
  threshold?: number;
  /** Previous value (for comparison alerts like OER spike) */
  previousValue?: number;
  /** Days until deadline (for lifecycle alerts) */
  daysUntil?: number;
}

export function buildAlertTitle(alertType: AlertType, params: AlertContentParams): string {
  switch (alertType) {
    case 'DSCR_BELOW_THRESHOLD':
      return `DSCR Alert: ${params.address} at ${params.currentValue?.toFixed(2) ?? 'N/A'}`;
    case 'OCCUPANCY_LOW':
      return `Low Occupancy: ${params.address} at ${params.currentValue?.toFixed(0) ?? 'N/A'}%`;
    case 'CASHFLOW_NEGATIVE':
      return `Negative Cash Flow: ${params.address}`;
    case 'EXPENSE_RATIO_SPIKE':
      return `Expense Ratio Jump: ${params.address} OER up ${((params.currentValue ?? 0) - (params.previousValue ?? 0)).toFixed(1)} pts`;
    case 'LEASE_RENEWAL_DUE':
      return `Lease Renewal Due: ${params.address} in ${params.daysUntil ?? 60} days`;
    case 'PROPERTY_TAX_DUE':
      return `Property Tax Due: ${params.address} in ${params.daysUntil ?? 30} days`;
    case 'INSURANCE_RENEWAL_DUE':
      return `Insurance Renewal: ${params.address} in ${params.daysUntil ?? 30} days`;
    case 'VALUATION_REVIEW_DUE':
      return `Valuation Review: ${params.address} — 6-month checkup due`;
    default:
      return `Alert: ${params.address}`;
  }
}

export function buildAlertBody(alertType: AlertType, params: AlertContentParams): string {
  switch (alertType) {
    case 'DSCR_BELOW_THRESHOLD':
      return `The Debt Service Coverage Ratio for ${params.address} has dropped to ${params.currentValue?.toFixed(2) ?? 'N/A'}, below the safe threshold of ${params.threshold?.toFixed(2) ?? '1.00'}. This means the property's income may not cover its debt obligations. Review your rental income and operating expenses to identify corrective actions.`;
    case 'OCCUPANCY_LOW':
      return `Occupancy at ${params.address} is at ${params.currentValue?.toFixed(0) ?? 'N/A'}%, below the ${params.threshold?.toFixed(0) ?? '80'}% threshold. Low occupancy directly impacts NOI and cash flow. Consider reviewing your marketing strategy, rental rates, or tenant retention efforts.`;
    case 'CASHFLOW_NEGATIVE':
      return `The property at ${params.address} is generating negative annual cash flow of $${Math.abs(params.currentValue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}. Expenses and debt service exceed rental income. Immediate attention is required to avoid sustained losses.`;
    case 'EXPENSE_RATIO_SPIKE':
      return `The Operating Expense Ratio for ${params.address} jumped from ${params.previousValue?.toFixed(1) ?? 'N/A'}% to ${params.currentValue?.toFixed(1) ?? 'N/A'}%, a ${((params.currentValue ?? 0) - (params.previousValue ?? 0)).toFixed(1)} percentage point increase. Investigate which expense categories drove the spike — property taxes, insurance, or maintenance costs may need review.`;
    case 'LEASE_RENEWAL_DUE':
      return `One or more leases at ${params.address} are due for renewal within ${params.daysUntil ?? 60} days. Begin tenant outreach and market rent analysis now to minimize vacancy risk. Navigate to the property details to review lease terms.`;
    case 'PROPERTY_TAX_DUE':
      return `Property taxes for ${params.address} are due within ${params.daysUntil ?? 30} days. Ensure funds are allocated and payment is scheduled to avoid penalties and interest charges.`;
    case 'INSURANCE_RENEWAL_DUE':
      return `The insurance policy for ${params.address} is up for renewal within ${params.daysUntil ?? 30} days. Review coverage levels and shop for competitive rates before the renewal deadline.`;
    case 'VALUATION_REVIEW_DUE':
      return `It's been 6 months since the last valuation review for ${params.address}. Update the estimated current value in your project details to keep your portfolio metrics accurate and track appreciation trends.`;
    default:
      return `A system alert has been triggered for ${params.address}. Please check your authenticated inbox for details.`;
  }
}

// ── Deep Link Builder ─────────────────────────────────────────────────────────

export function buildAlertDeepLink(projectId: string, alertType: AlertType): string {
  // Metric alerts → project metrics tab; lifecycle → project overview
  const isMetric: boolean = [
    'DSCR_BELOW_THRESHOLD',
    'OCCUPANCY_LOW',
    'CASHFLOW_NEGATIVE',
    'EXPENSE_RATIO_SPIKE',
  ].includes(alertType);

  return isMetric
    ? `/dashboard/projects/${projectId}?tab=metrics&alert=${alertType}`
    : `/dashboard/projects/${projectId}?alert=${alertType}`;
}
