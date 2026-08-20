import { z } from 'zod';
import { EXPENSE_CATEGORIES, REVENUE_CATEGORIES, LIABILITY_CATEGORIES, TRANSFER_CATEGORIES } from '../financial-transactions/categories.js';

export const VALID_NOTIFICATION_CATEGORIES = [
  ...REVENUE_CATEGORIES,
  ...EXPENSE_CATEGORIES,
  ...LIABILITY_CATEGORIES,
  ...TRANSFER_CATEGORIES,
] as const;

export const notificationPreferencesSchema = z.object({
  emailTransactionAlerts: z.boolean().optional(),
  emailAlertCategories: z
    .array(z.string())
    .refine((cats) => cats.every((c) => (VALID_NOTIFICATION_CATEGORIES as readonly string[]).includes(c)), {
      message: 'Invalid category in emailAlertCategories',
    })
    .optional(),
  emailAlertMinAmount: z.number().min(0).optional(),
  emailDigestMode: z.enum(['IMMEDIATE', 'HOURLY_BATCH', 'DAILY_DIGEST']).optional(),
  emailAlertThreshold: z.enum(['ALL', 'HIGH_CONFIDENCE_ONLY', 'MANUAL_APPROVAL_ONLY']).optional(),
});

export type NotificationPreferencesPatch = z.infer<typeof notificationPreferencesSchema>;

export function normalizeNotificationPreferences<T extends { emailAlertMinAmount?: number | bigint }>(
  prefs: T,
): T & { emailAlertMinAmount: number } {
  return {
    ...prefs,
    emailAlertMinAmount: Number(prefs.emailAlertMinAmount ?? 0),
  };
}
