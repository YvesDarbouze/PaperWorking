import { adminDb } from '@/lib/firebase/admin';
import type { EntitlementPlanId, FeatureKey, PlanEntitlements } from './index';
import { getEntitlements, PLAN_LEVEL } from './index';

// ── Firestore plan name → EntitlementPlanId resolution ──
const CANONICAL_TO_ID: Record<string, EntitlementPlanId> = {
  'none': 'none',
  'individual': 'individual',
  'team': 'team',
  'vendor network': 'vendor',
  'vendor': 'vendor',
};

function resolveEntitlementPlanId(firestorePlan: string): EntitlementPlanId {
  return CANONICAL_TO_ID[firestorePlan.toLowerCase()] ?? 'none';
}

/**
 * Reads the user's current plan from Firestore.
 */
export async function getCurrentPlan(userId: string): Promise<{
  id: EntitlementPlanId;
  canonicalName: string;
  status: string;
}> {
  const userDoc = await adminDb.collection('users').doc(userId).get();
  const data = userDoc.data();
  const canonicalName = data?.subscriptionPlan || 'None';
  const id = resolveEntitlementPlanId(canonicalName);
  const status = data?.subscriptionStatus || 'inactive';
  return { id, canonicalName, status };
}

/**
 * Checks if a user has access to a specific feature.
 * Also checks the entitlementOverrides collection for support-granted exceptions.
 */
export async function hasFeature(userId: string, featureKey: FeatureKey): Promise<boolean> {
  const plan = await getCurrentPlan(userId);
  const entitlements = getEntitlements(plan.id);

  // Check entitlementOverrides first (support-granted exceptions)
  try {
    const overrideDoc = await adminDb.collection('entitlementOverrides').doc(userId).get();
    if (overrideDoc.exists) {
      const overrides = overrideDoc.data();
      if (overrides?.features?.includes(featureKey)) return true;
    }
  } catch {
    // Non-fatal — fall through to plan-based check
  }

  return entitlements.features.has(featureKey);
}

/**
 * Checks if a user can create a new project within their plan limits.
 */
export async function canCreateProject(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  limit: number;
  current: number;
  planId: EntitlementPlanId;
  upgradeTo?: EntitlementPlanId;
}> {
  const plan = await getCurrentPlan(userId);
  const entitlements = getEntitlements(plan.id);

  // Unlimited plans always pass
  if (entitlements.maxProjects === Infinity) {
    // Count is expensive for unlimited; skip it
    return { allowed: true, limit: Infinity, current: 0, planId: plan.id };
  }

  // Count existing non-archived projects owned by this user
  const projectsSnap = await adminDb
    .collection('projects')
    .where('ownerUid', '==', userId)
    .where('status', '!=', 'archived')
    .get();

  const count = projectsSnap.size;

  if (count >= entitlements.maxProjects) {
    return {
      allowed: false,
      reason: `Your ${plan.canonicalName} plan allows up to ${entitlements.maxProjects} active project${entitlements.maxProjects === 1 ? '' : 's'}. Upgrade to create more.`,
      limit: entitlements.maxProjects,
      current: count,
      planId: plan.id,
      upgradeTo: 'individual', // First plan with unlimited projects
    };
  }

  return {
    allowed: true,
    limit: entitlements.maxProjects,
    current: count,
    planId: plan.id,
  };
}

/**
 * Enforces project limits on downgrade by marking excess projects as readOnly.
 * Marks the OLDEST projects beyond the new limit.
 * NEVER deletes projects — they remain visible and exportable.
 */
export async function enforceProjectLimitsOnDowngrade(
  userId: string,
  newPlanId: EntitlementPlanId
): Promise<{ markedReadOnly: string[] }> {
  const entitlements = getEntitlements(newPlanId);
  const maxProjects = entitlements.maxProjects;

  // Unlimited means no enforcement needed
  if (maxProjects === Infinity) {
    return { markedReadOnly: [] };
  }

  // Get all active (non-archived) projects ordered by creation date
  const projectsSnap = await adminDb
    .collection('projects')
    .where('ownerUid', '==', userId)
    .where('status', '!=', 'archived')
    .orderBy('createdAt', 'asc')
    .get();

  const totalProjects = projectsSnap.size;
  if (totalProjects <= maxProjects) {
    return { markedReadOnly: [] };
  }

  // Mark the oldest projects (beyond the limit) as readOnly
  // Keep the NEWEST `maxProjects` count of projects writable
  const projectsToMark = projectsSnap.docs.slice(0, totalProjects - maxProjects);
  const markedReadOnly: string[] = [];

  const batch = adminDb.batch();
  for (const projectDoc of projectsToMark) {
    batch.update(projectDoc.ref, {
      readOnly: true,
      readOnlyReason: 'plan_downgrade',
      readOnlyAt: new Date(),
    });
    markedReadOnly.push(projectDoc.id);
  }

  if (markedReadOnly.length > 0) {
    await batch.commit();
    console.log(
      `[Entitlements] Marked ${markedReadOnly.length} projects as readOnly for user ${userId} (downgraded to ${newPlanId})`
    );
  }

  return { markedReadOnly };
}
