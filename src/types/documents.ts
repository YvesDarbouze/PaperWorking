// ── Digital Filing Cabinet — Type Definitions ────────────────
//
// Every Project has one Folder per deal phase.
// Every Folder holds Files (uploaded documents).
//
// Firestore collections:
//   projectFolders/{folderId}
//   projectFiles/{fileId}

/** Canonical document types accepted by the filing cabinet. */
export type DocumentCategory =
  | 'LOI'
  | 'Purchase Agreement'
  | 'Lawyer Draft'
  | 'Appraisal'
  | 'Contractor Bid'
  | 'HUD-1 Settlement Statement'
  | 'Title Report'
  | 'Inspection Report'
  | 'Permit'
  | 'Other';

/** One folder is auto-provisioned for each phase when a project is created. */
export type FolderPhase =
  | 'Find & Fund'
  | 'Under Contract'
  | 'Rehab'
  | 'Listed'
  | 'Sold';

/**
 * ProjectFolder
 *
 * Container document in the `projectFolders` collection.
 * Five folders are provisioned automatically on project creation (one per phase).
 * Additional custom folders can be created by the account owner.
 */
export interface ProjectFolder {
  id: string;
  projectId: string;
  organizationId: string;
  /** Display name — defaults to phase name but can be renamed. */
  name: string;
  phase: FolderPhase;
  ownerUid: string;
  /** Denormalized count kept in sync by foldersService.addFile for fast UI rendering. */
  fileCount: number;
  createdAt: Date;
}

/**
 * ProjectFile
 *
 * A single uploaded document inside a ProjectFolder.
 * `storageUrl` is a Firebase Storage download URL.
 */
export interface ProjectFile {
  id: string;
  folderId: string;
  projectId: string;
  organizationId: string;
  /** Original filename shown in the UI. */
  name: string;
  category: DocumentCategory;
  /** Firebase Storage public/signed download URL. */
  storageUrl: string;
  /** MIME type, e.g. 'application/pdf' or 'image/jpeg'. */
  fileType: string;
  sizeBytes?: number;
  uploadedByUid: string;
  uploadedByEmail?: string;
  /** Set by a Lead Investor / Admin after reviewing the document. */
  isVerified: boolean;
  verifiedByUid?: string;
  verifiedAt?: Date;
  uploadedAt: Date;
}
