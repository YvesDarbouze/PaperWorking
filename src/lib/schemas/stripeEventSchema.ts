/**
 * ═══════════════════════════════════════════════════════════════
 * PaperWorking — Stripe Event Schema (Zod)
 *
 * Canonical Zod schema for the Firestore `/stripe_events/{eventId}`
 * collection. This collection is the idempotency log for Stripe
 * webhook processing — every processed webhook event is recorded
 * here so duplicate deliveries are safely skipped.
 *
 * Collection name: `stripe_events` (NOT `billingEvents`)
 *
 * @architect  Schema owner
 * @billing    Feature owner
 * ═══════════════════════════════════════════════════════════════
 */

import { z } from 'zod';

// ── Main Schema ────────────────────────────────────────────

/**
 * Firestore `/stripe_events/{eventId}` document schema.
 *
 * Written by the Stripe webhook handler (`/api/webhooks/stripe/route.ts`)
 * immediately after processing an event. The document ID is the
 * Stripe event ID (e.g. "evt_1234...") for fast idempotency lookups.
 */
export const stripeEventSchema = z.object({
  /**
   * Stripe event ID (e.g. "evt_1Oa8K2...").
   * Used as the Firestore document ID for O(1) idempotency checks.
   */
  eventId: z.string().min(1),

  /**
   * Stripe event type string (e.g. "checkout.session.completed",
   * "customer.subscription.updated", "invoice.paid").
   */
  type: z.string().min(1),

  /**
   * Full Stripe event payload stored as JSON.
   * Contains the complete event object from the Stripe API.
   * Typed as `any` because the shape varies per event type.
   */
  payload: z.any(),

  /**
   * Stripe API version used when the event was created.
   * (e.g. "2025-04-30.basil")
   */
  apiVersion: z.string().optional(),

  /**
   * Whether this event was received in live mode or test mode.
   */
  livemode: z.boolean().optional(),

  /**
   * Stripe Customer ID associated with this event (denormalized for queries).
   * Not all events have a customer — optional.
   */
  stripeCustomerId: z.string().optional(),

  /**
   * PaperWorking user UID associated with this event (denormalized).
   * Resolved from the Stripe customer metadata during processing.
   */
  userId: z.string().optional(),

  /**
   * Processing status — tracks whether the webhook handler
   * successfully processed this event.
   */
  processingStatus: z.enum(['processed', 'failed', 'skipped']).optional(),

  /**
   * Error message if processing failed.
   * Stored for debugging webhook failures.
   */
  errorMessage: z.string().optional(),

  /**
   * When this event was processed by our webhook handler.
   * Firestore Timestamp or Date.
   */
  processedAt: z.any(),

  /**
   * When the event was created by Stripe (from event.created).
   * Unix timestamp (seconds).
   */
  stripeCreatedAt: z.number().int().optional(),
});

/** Inferred TypeScript type from the Zod schema */
export type StripeEvent = z.infer<typeof stripeEventSchema>;
