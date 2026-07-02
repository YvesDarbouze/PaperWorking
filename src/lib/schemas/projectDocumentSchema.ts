/**
 * ═══════════════════════════════════════════════════════════════
 * PaperWorking — Project Document Schema (Zod)
 *
 * Canonical Zod schema for the Firestore document filing cabinet:
 * - `/projectFolders/{folderId}` — phase-based folder containers
 * - `/projectFiles/{fileId}`     — individual uploaded documents
 *
 * Mirrors: src/types/documents.ts (ProjectFolder, ProjectFile)
 *
 * NOTE: Document uploads are currently simulated (DocumentVault,
 * PhotographyUploadManager, ProjectCreationWizard all stub the
 * actual upload). The schema is ready for when the real upload
 * pipeline is connected via Firebase Storage + Document AI.
 *
 * @architect  Schema owner
 * @docs       Upload pipeline implementation pending
 * ═══════════════════════════════════════════════════════════════
 */

import { z } from 'zod';

// ── Enums ──────────────────────────────────────────────────

/** Document categories accepted by the filing cabinet */
export const documentCategoryEnum = z.enum([
  'LOI',
  'Purchase Agreement',
  'Lawyer Draft',
  'Appraisal',
  'Contractor Bid',
  'HUD-1 Settlement Statement',
  'Title Report',
  'Inspection Report',
  'Permit',
  'Other',
]);

/** Folder phases — one auto-provisioned per phase on project creation */
export const folderPhaseEnum = z.enum([
  'Find & Fund',
  'Under Contract',
  'Rehab',
  'Listed',
  'Sold',
]);

/** OCR processing status — for future Document AI integration */
export const ocrStatusEnum = z.enum([
  'pending',
  'processing',
  'complete',
  'failed',
  'not_applicable',
]);

// ── Folder Schema ──────────────────────────────────────────

/**
 * Firestore `/projectFolders/{folderId}` document schema.
 *
 * Five folders are auto-provisioned on project creation (one per phase).
 * Additional custom folders can be created by the account owner.
 */
export const projectFolderSchema = z.object({
  /** Firestore document ID */
  id: z.string().min(1),

  /** Parent project ID */
  projectId: z.string().min(1),

  /** Organization ID for multi-tenant isolation */
  organizationId: z.string().min(1),

  /** Display name — defaults to phase name but can be renamed */
  name: z.string().min(1),

  /** Which deal phase this folder corresponds to */
  phase: folderPhaseEnum,

  /** Firebase UID of the folder creator */
  ownerUid: z.string().min(1),

  /**
   * Denormalized count kept in sync by foldersService.addFile.
   * Used for fast UI rendering without counting subcollection docs.
   */
  fileCount: z.number().int().nonnegative(),

  /** Document creation timestamp */
  createdAt: z.any(),
});

/** Inferred TypeScript type */
export type ProjectFolder = z.infer<typeof projectFolderSchema>;

// ── File Schema ────────────────────────────────────────────

/**
 * Firestore `/projectFiles/{fileId}` document schema.
 *
 * A single uploaded document inside a ProjectFolder.
 * `storageUrl` is a Firebase Storage download URL.
 */
export const projectFileSchema = z.object({
  /** Firestore document ID */
  id: z.string().min(1),

  /** Parent folder ID */
  folderId: z.string().min(1),

  /** Parent project ID */
  projectId: z.string().min(1),

  /** Organization ID for multi-tenant isolation */
  organizationId: z.string().min(1),

  /** Original filename shown in the UI */
  name: z.string().min(1),

  /** Document category for classification and filtering */
  category: documentCategoryEnum,

  /** Firebase Storage public/signed download URL */
  storageUrl: z.string().url(),

  /** MIME type, e.g. 'application/pdf' or 'image/jpeg' */
  fileType: z.string(),

  /** File size in bytes — used for storage quota tracking */
  sizeBytes: z.number().int().nonnegative().optional(),

  /** Firebase UID of the uploader */
  uploadedByUid: z.string().min(1),

  /** Email of the uploader (denormalized for display) */
  uploadedByEmail: z.string().email().optional(),

  /** Whether a Lead Investor / Admin has reviewed and approved the document */
  isVerified: z.boolean(),

  /** UID of the verifier */
  verifiedByUid: z.string().optional(),

  /** When the document was verified */
  verifiedAt: z.any().optional(),

  /** When the document was uploaded */
  uploadedAt: z.any(),

  // ── Future: Document AI OCR Fields ──

  /** OCR processing status — defaults to 'not_applicable' for non-OCR docs */
  ocrStatus: ocrStatusEnum.optional(),

  /**
   * Fields extracted by Document AI OCR.
   * Shape depends on document type — stored as a flexible record.
   * @docs Pending — Google Document AI pipeline not yet implemented.
   */
  extractedFields: z.record(z.string(), z.any()).optional(),

  /** Confidence score from Document AI (0-1) */
  ocrConfidence: z.number().min(0).max(1).optional(),
});

/** Inferred TypeScript type */
export type ProjectFile = z.infer<typeof projectFileSchema>;
