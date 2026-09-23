/**
 * Notification preferences store — Firestore `users/{uid}.notificationPreferences`.
 *
 * Ported from the legacy Prisma-backed `TransactionNotificationService`
 * preferences helper. v1 persists the preference object on the user document
 * through the Firebase Admin SDK, with a process-local in-memory fallback so
 * tests and CI run without Firestore (`shouldAttemptFirestore()` guard).
 */

import { getAdminFirestore, shouldAttemptFirestore } from '@/lib/firebase/admin';
import type { FinancialTransactionCategory } from './templates/TransactionNotificationEmails';

export type EmailDigestMode = 'IMMEDIATE' | 'HOURLY_BATCH' | 'DAILY_DIGEST';
export type EmailAlertThreshold = 'ALL' | 'HIGH_CONFIDENCE_ONLY' | 'MANUAL_APPROVAL_ONLY';

/**
 * Financial transaction categories mirrored from the legacy Prisma enum.
 * Exposed for preference UIs and future senders that fan out by category.
 */
export const NOTIFICATION_ALERT_CATEGORIES: readonly FinancialTransactionCategory[] = [
  'RENT_INCOME',
  'LATE_FEE_INCOME',
  'PET_RENT_INCOME',
  'SECURITY_DEPOSIT_RECEIVED',
  'PARKING_INCOME',
  'LAUNDRY_VENDING_INCOME',
  'APPLICATION_FEE_INCOME',
  'LEASE_TERMINATION_FEE',
  'UTILITY_REIMBURSEMENT',
  'INSURANCE_CLAIM_INCOME',
  'INTEREST_INCOME',
  'MISC_INCOME',
  'PROPERTY_TAX',
  'PROPERTY_INSURANCE',
  'HOA_FEES',
  'MANAGEMENT_FEES',
  'LEASING_FEES',
  'MAINTENANCE_REPAIR',
  'UTILITIES',
  'LANDSCAPING_SNOW',
  'PEST_CONTROL',
  'CLEANING_TURNOVER',
  'MARKETING_ADVERTISING',
  'LEGAL_PROFESSIONAL',
  'ACCOUNTING_BOOKKEEPING',
  'TRAVEL_MILEAGE',
  'BANK_CREDIT_CARD_FEES',
  'SOFTWARE_TECHNOLOGY',
  'LICENSES_PERMITS',
  'TURNOVER_COSTS',
  'SUPPLIES',
  'MISC_EXPENSE',
  'OWNER_DISTRIBUTION',
  'MORTGAGE_PRINCIPAL',
  'MORTGAGE_INTEREST',
  'MORTGAGE_ESCROW_PAYMENT',
  'CAPITAL_EXPENDITURE',
  'SECURITY_DEPOSIT_RETURNED',
  'CAPITAL_CONTRIBUTION',
  'RESERVE_TRANSFER',
  'INTER_ACCOUNT_TRANSFER',
  'UNCATEGORIZED',
  'NEEDS_REVIEW',
];

/** Default category set — every alert category is enabled on first access. */
export const DEFAULT_ALERT_CATEGORIES: readonly string[] = NOTIFICATION_ALERT_CATEGORIES;

export interface NotificationPreferences {
  emailTransactionAlerts: boolean;
  emailAlertCategories: string[];
  emailAlertMinAmount: number;
  emailDigestMode: EmailDigestMode;
  emailAlertThreshold: EmailAlertThreshold;
  updatedAt: string;
}

export interface NotificationPreferencesUpdate {
  emailTransactionAlerts?: boolean;
  emailAlertCategories?: string[];
  emailAlertMinAmount?: number;
  emailDigestMode?: EmailDigestMode;
  emailAlertThreshold?: EmailAlertThreshold;
}

const memoryStore = new Map<string, NotificationPreferences>();

function isDigestMode(value: unknown): value is EmailDigestMode {
  return value === 'IMMEDIATE' || value === 'HOURLY_BATCH' || value === 'DAILY_DIGEST';
}

function isAlertThreshold(value: unknown): value is EmailAlertThreshold {
  return (
    value === 'ALL' || value === 'HIGH_CONFIDENCE_ONLY' || value === 'MANUAL_APPROVAL_ONLY'
  );
}

function buildDefaultPreferences(): NotificationPreferences {
  return {
    emailTransactionAlerts: true,
    emailAlertCategories: [...DEFAULT_ALERT_CATEGORIES],
    emailAlertMinAmount: 0,
    emailDigestMode: 'IMMEDIATE',
    emailAlertThreshold: 'ALL',
    updatedAt: new Date().toISOString(),
  };
}

function clonePreferences(preferences: NotificationPreferences): NotificationPreferences {
  return { ...preferences, emailAlertCategories: [...preferences.emailAlertCategories] };
}

/** Coerces an untrusted Firestore value into a complete preferences object. */
function coercePreferences(value: unknown): NotificationPreferences {
  const defaults = buildDefaultPreferences();
  if (typeof value !== 'object' || value === null) return defaults;

  const record = value as Record<string, unknown>;
  const rawCategories = record.emailAlertCategories;
  const categories = Array.isArray(rawCategories)
    ? rawCategories.filter((category): category is string => typeof category === 'string')
    : defaults.emailAlertCategories;

  const rawMinAmount = record.emailAlertMinAmount;
  const minAmount =
    typeof rawMinAmount === 'number' && Number.isFinite(rawMinAmount) && rawMinAmount >= 0
      ? rawMinAmount
      : defaults.emailAlertMinAmount;

  return {
    emailTransactionAlerts:
      typeof record.emailTransactionAlerts === 'boolean'
        ? record.emailTransactionAlerts
        : defaults.emailTransactionAlerts,
    emailAlertCategories: categories,
    emailAlertMinAmount: minAmount,
    emailDigestMode: isDigestMode(record.emailDigestMode)
      ? record.emailDigestMode
      : defaults.emailDigestMode,
    emailAlertThreshold: isAlertThreshold(record.emailAlertThreshold)
      ? record.emailAlertThreshold
      : defaults.emailAlertThreshold,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : defaults.updatedAt,
  };
}

/**
 * Loads the user's notification preferences, creating and persisting defaults
 * on first access.
 */
export async function getOrCreateNotificationPreferences(
  uid: string,
): Promise<NotificationPreferences> {
  if (shouldAttemptFirestore()) {
    try {
      const userRef = getAdminFirestore().collection('users').doc(uid);
      const snap = await userRef.get();
      const data: Record<string, unknown> = snap.exists ? (snap.data() ?? {}) : {};

      if (data.notificationPreferences === undefined) {
        const defaults = buildDefaultPreferences();
        await userRef.set({ notificationPreferences: defaults }, { merge: true });
        memoryStore.set(uid, defaults);
        return clonePreferences(defaults);
      }

      const preferences = coercePreferences(data.notificationPreferences);
      memoryStore.set(uid, preferences);
      return clonePreferences(preferences);
    } catch (error) {
      console.error(`[NotificationPreferences] Failed to load preferences for ${uid}:`, error);
    }
  }

  const cached = memoryStore.get(uid);
  if (cached) return clonePreferences(cached);

  const defaults = buildDefaultPreferences();
  memoryStore.set(uid, defaults);
  return clonePreferences(defaults);
}

/** Merges validated preference updates onto the stored preferences. */
export async function updateNotificationPreferences(
  uid: string,
  updates: NotificationPreferencesUpdate,
): Promise<NotificationPreferences> {
  const current = await getOrCreateNotificationPreferences(uid);

  const next: NotificationPreferences = {
    emailTransactionAlerts:
      updates.emailTransactionAlerts ?? current.emailTransactionAlerts,
    emailAlertCategories: updates.emailAlertCategories
      ? [...updates.emailAlertCategories]
      : [...current.emailAlertCategories],
    emailAlertMinAmount: updates.emailAlertMinAmount ?? current.emailAlertMinAmount,
    emailDigestMode: updates.emailDigestMode ?? current.emailDigestMode,
    emailAlertThreshold: updates.emailAlertThreshold ?? current.emailAlertThreshold,
    updatedAt: new Date().toISOString(),
  };

  memoryStore.set(uid, next);

  if (shouldAttemptFirestore()) {
    try {
      await getAdminFirestore()
        .collection('users')
        .doc(uid)
        .set({ notificationPreferences: next }, { merge: true });
    } catch (error) {
      console.error(`[NotificationPreferences] Failed to persist preferences for ${uid}:`, error);
    }
  }

  return clonePreferences(next);
}

/** Clears the in-memory fallback (test isolation only). */
export function __resetNotificationPreferencesForTesting(): void {
  memoryStore.clear();
}
