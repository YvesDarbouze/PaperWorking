/* ═══════════════════════════════════════════════════════
   PaperWorking — Deal Status Contract Single Source of Truth (BUG-006)

   Defines the canonical status values and normalization mappings
   between UI labels/filter values and database-stored status values.
   ═══════════════════════════════════════════════════════ */

export type CanonicalDealStatus = 'draft' | 'published' | 'funding' | 'closed' | 'archived';

/**
 * Single source of truth array for Deal Marketplace UI filters and status lists.
 */
export const STATUSES = ['All', 'Draft', 'Listed', 'Under review', 'Funded', 'Closed'] as const;

export const DEAL_STATUS_OPTIONS = [
  { value: 'All', label: 'All Statuses' },
  { value: 'published', label: 'Listed' },
  { value: 'draft', label: 'Draft' },
  { value: 'funding', label: 'Under Review' },
  { value: 'closed', label: 'Closed' },
] as const;

/**
 * Normalizes any incoming deal status string (e.g., 'Listed', 'listed', 'published', 'PUBLISHED', 'funding', 'Under review')
 * to its canonical deal status stored in the database.
 * Returns null if the status is unrecognized or empty.
 */
export function normalizeDealStatus(status: string | null | undefined): CanonicalDealStatus | null {
  if (!status) return null;
  const s = status.trim().toLowerCase();

  switch (s) {
    case 'listed':
    case 'published':
    case 'active':
      return 'published';

    case 'draft':
      return 'draft';

    case 'under review':
    case 'under_review':
    case 'under-review':
    case 'funding':
    case 'review':
      return 'funding';

    case 'closed':
    case 'funded':
    case 'sold':
      return 'closed';

    case 'archived':
    case 'withdrawn':
    case 'takedown_review':
      return 'archived';

    default:
      return null;
  }
}

/**
 * Compares two deal status strings for equivalence after normalizing both values.
 * Returns true if both map to the same canonical status, or if either status is 'All'.
 */
export function matchesDealStatus(statusA: string | null | undefined, statusB: string | null | undefined): boolean {
  if (!statusA || !statusB) return false;
  
  const cleanA = statusA.trim().toLowerCase();
  const cleanB = statusB.trim().toLowerCase();

  if (cleanA === 'all' || cleanB === 'all') return true;

  const normA = normalizeDealStatus(statusA);
  const normB = normalizeDealStatus(statusB);

  if (normA && normB) {
    return normA === normB;
  }

  // Fallback to exact case-insensitive match for unrecognized custom status values
  return cleanA === cleanB;
}
