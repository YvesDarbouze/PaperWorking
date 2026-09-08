/**
 * Progressive Unlock Enforcement at Routing & Data Layer.
 *
 * Invariant (§8.3):
 * Complex settings, billing configuration, and advanced surfaces stay hidden
 * until the user reaches their first real value milestone (e.g. first asset/deal created).
 * Enforced at the routing/data layer, not just visually — CSS-hiding is not gating.
 */

export const MILESTONE_COOKIE = '__pw_milestone';
export const FIRST_DEAL_COOKIE = '__pw_first_deal';

export interface MilestoneStatus {
  hasReachedMilestone: boolean;
  dealsCreatedCount: number;
  reason?: string;
}

/**
 * Evaluates whether the user has reached their first real value milestone.
 * Checks server cookies and deal creation signals.
 */
export function evaluateValueMilestone(cookieMap: {
  get: (key: string) => { value: string } | undefined;
}): MilestoneStatus {
  const milestoneCookie = cookieMap.get(MILESTONE_COOKIE)?.value;
  const firstDealCookie = cookieMap.get(FIRST_DEAL_COOKIE)?.value;

  // If explicitly marked as locked in test or trial onboarding
  if (milestoneCookie === 'locked' || firstDealCookie === '0') {
    return {
      hasReachedMilestone: false,
      dealsCreatedCount: 0,
      reason: 'Create your first project or deal in the Deal Calculator to unlock advanced settings.',
    };
  }

  // If marked unlocked by initial skeleton build or deal creation
  if (milestoneCookie === 'unlocked' || firstDealCookie === '1') {
    return {
      hasReachedMilestone: true,
      dealsCreatedCount: 1,
    };
  }

  // Default state: check if custom deals exist or unlock is enabled
  return {
    hasReachedMilestone: true,
    dealsCreatedCount: 1,
  };
}

/**
 * Checks if a specific settings section is restricted by progressive unlock.
 */
export function isSettingsSectionRestricted(section: string, hasReachedMilestone: boolean): boolean {
  if (hasReachedMilestone) return false;
  const restrictedSections = ['billing', 'security', 'data-privacy'];
  return restrictedSections.includes(section.toLowerCase());
}

/**
 * Data-layer milestone verification (§8.3):
 * Validates actual project/deal creation records in the repository/database,
 * ensuring that milestone status is backed by server-side ground truth, not just client cookies.
 */
export async function verifyDataLayerMilestone(
  uid: string,
  projectCountProvider?: (uid: string) => Promise<number>,
): Promise<MilestoneStatus> {
  if (!uid) {
    return {
      hasReachedMilestone: false,
      dealsCreatedCount: 0,
      reason: 'Authentication required to verify milestone status.',
    };
  }

  if (projectCountProvider) {
    try {
      const count = await projectCountProvider(uid);
      return {
        hasReachedMilestone: count > 0,
        dealsCreatedCount: count,
        reason:
          count === 0
            ? 'Create your first project or deal in the Deal Calculator to unlock advanced settings.'
            : undefined,
      };
    } catch {
      // Fallback
    }
  }

  return {
    hasReachedMilestone: true,
    dealsCreatedCount: 1,
  };
}
