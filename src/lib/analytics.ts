/**
 * Thin client-side analytics wrapper.
 * Uses posthog-js when NEXT_PUBLIC_POSTHOG_KEY is set, otherwise no-ops.
 * Always safe to call — never throws.
 */
import posthog from 'posthog-js';

export type EventName =
  | 'esign_requested'
  | 'esign_completed'
  | 'esign_declined'
  | 'media_uploaded'
  | 'media_removed'
  | 'expense_approved'
  | 'expense_rejected'
  | 'gcal_synced'
  | 'market_data_loaded'
  | 'session_revoked'
  | 'project_created'
  | 'project_phase_advanced'
  | '2fa_enabled'
  | '2fa_disabled'
  | 'signup_started'
  | 'user_registered';

export function trackEvent(event: EventName, properties?: Record<string, unknown>): void {
  try {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    posthog.capture(event, properties);
  } catch {
    // Never let analytics break the app
  }
}
