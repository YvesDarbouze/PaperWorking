/**
 * ═══════════════════════════════════════════════════════════════
 * PaperWorking — Vendor Request Schema (Zod)
 *
 * Canonical Zod schema for the Firestore subcollection:
 * `/projects/{projectId}/vendorRequests/{requestId}`
 *
 * Vendor requests are the marketplace pipeline — an investor
 * requests a service, a vendor quotes and fulfills it.
 *
 * NOTE: This is a SUBCOLLECTION under projects, NOT a top-level
 * collection. The codebase also uses collectionGroup queries
 * to aggregate vendorRequests across all projects for vendor
 * portal views.
 *
 * Mirrors: src/types/schema.ts (VendorRequest, RequestStatus)
 *
 * @architect  Schema owner
 * @marketplace  Feature owner
 * ═══════════════════════════════════════════════════════════════
 */

import { z } from 'zod';

// ── Enums ──────────────────────────────────────────────────

/**
 * Vendor request status lifecycle:
 *
 * ```
 * PENDING → QUOTED → ACCEPTED → COMPLETED
 *              ↘                  ↗
 *            DECLINED ←─── CANCELLED
 * ```
 */
export const requestStatusEnum = z.enum([
  'PENDING',
  'QUOTED',
  'ACCEPTED',
  'COMPLETED',
  'DECLINED',
  'CANCELLED',
]);

/** Type of vendor service — maps to VendorType in schema.ts */
export const vendorTypeEnum = z.enum([
  'Lawyer',
  'Appraiser',
  'Lender',
  'Inspector',
  'Title',
  'Insurance',
  'Contractor',
  'Property Manager',
  'Listing Agent',
]);

// ── Main Schema ────────────────────────────────────────────

/**
 * Firestore `/projects/{projectId}/vendorRequests/{requestId}` document.
 *
 * Created when an investor requests a service from the marketplace.
 * Progresses through the PENDING → QUOTED → ACCEPTED → COMPLETED pipeline.
 */
export const vendorRequestSchema = z.object({
  /** Firestore document ID */
  id: z.string().min(1),

  /** Parent project ID (redundant with path, but needed for collectionGroup queries) */
  projectId: z.string().min(1),

  /** Firebase UID of the vendor assigned to this request */
  vendorUid: z.string().min(1),

  /**
   * Current request status.
   * State machine: PENDING → QUOTED → ACCEPTED → COMPLETED
   * Side exits: DECLINED, CANCELLED
   */
  status: requestStatusEnum,

  /** When the request was created */
  requestedAt: z.any(),

  /**
   * Fee quoted by the vendor in USD dollars (float).
   * Populated when status transitions from PENDING → QUOTED.
   * NOTE: Planned migration to cents.
   */
  quotedFee: z.number().nonnegative().optional(),

  /** When the vendor completed the work */
  completedAt: z.any().optional(),

  /** Google Drive shared folder URL for deliverables */
  sharedFolderUrl: z.string().url().optional(),

  /** Optional context message from the investor */
  message: z.string().optional(),

  /** How quickly the investor needs the service */
  urgency: z.enum(['standard', 'rush', 'asap']).optional(),

  /** Freeform timeline text from the investor, e.g. "Within 5 days" */
  desiredTimeline: z.string().nullable().optional(),

  // ── Extended Fields (for marketplace enrichment) ──

  /** Firebase UID of the investor who created this request */
  requestedBy: z.string().optional(),

  /** Display name of the requesting investor (denormalized) */
  requestedByName: z.string().optional(),

  /** Vendor display name (denormalized for inbox/notification display) */
  vendorName: z.string().optional(),

  /** Vendor company name (denormalized) */
  vendorCompanyName: z.string().optional(),

  /** Type of service being requested */
  serviceType: vendorTypeEnum.optional(),

  /** When the vendor quoted a fee */
  quotedAt: z.any().optional(),

  /** When the vendor responded (accepted/declined) */
  respondedAt: z.any().optional(),

  /** Vendor notes or response message */
  responseMessage: z.string().optional(),

  // ── Timestamps ──

  /** Document creation timestamp */
  createdAt: z.any().optional(),

  /** Last update timestamp */
  updatedAt: z.any().optional(),
});

/** Inferred TypeScript type from the Zod schema */
export type VendorRequest = z.infer<typeof vendorRequestSchema>;

/**
 * Schema for creating a new vendor request (required fields only).
 */
export const createVendorRequestSchema = z.object({
  projectId: z.string().min(1),
  vendorUid: z.string().min(1),
  message: z.string().optional(),
  urgency: z.enum(['standard', 'rush', 'asap']).default('standard'),
  desiredTimeline: z.string().optional(),
  serviceType: vendorTypeEnum.optional(),
  requestedBy: z.string().min(1),
  requestedByName: z.string().optional(),
});

export type CreateVendorRequestInput = z.infer<typeof createVendorRequestSchema>;
