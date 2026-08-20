/**
 * Attorney-close state configuration.
 *
 * Config-driven list stored in Firestore `systemConfig/attorneyStates`.
 * The list is founder-editable data — the platform organizes eligibility,
 * it never makes a legal determination.
 *
 * Seeded with the commonly recognized attorney-close / attorney-customary set.
 */

// ── Default seed list ─────────────────────────────────────────────────────
// States where attorney involvement at closing is customary or required.
// This is NOT a legal determination — confirm with your title contact.
export const ATTORNEY_CLOSE_STATES_SEED: readonly string[] = [
  'AL', // Alabama
  'CT', // Connecticut
  'DE', // Delaware
  'GA', // Georgia
  'IL', // Illinois (Chicago-area especially)
  'KY', // Kentucky
  'MA', // Massachusetts
  'ME', // Maine
  'MS', // Mississippi
  'NH', // New Hampshire
  'NJ', // New Jersey
  'NY', // New York
  'NC', // North Carolina
  'ND', // North Dakota
  'RI', // Rhode Island
  'SC', // South Carolina
  'VT', // Vermont
  'WV', // West Virginia
] as const;

/** Firestore document path for the attorney-close state list */
export const ATTORNEY_STATES_DOC_PATH = 'systemConfig/attorneyStates';

/**
 * Check whether a state code is in the given attorney-close list.
 * Case-insensitive comparison.
 */
export function isAttorneyCloseState(
  stateCode: string | undefined | null,
  stateList: readonly string[]
): boolean {
  if (!stateCode) return false;
  const upper = stateCode.toUpperCase().trim();
  return stateList.some((s) => s.toUpperCase() === upper);
}
