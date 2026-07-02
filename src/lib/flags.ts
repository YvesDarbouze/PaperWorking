import { PostHog } from 'posthog-node';

let posthogClient: PostHog | null = null;

export function getPostHogServer(): PostHog | null {
  if (!posthogClient && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthogClient = new PostHog(
      process.env.NEXT_PUBLIC_POSTHOG_KEY,
      { 
        host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
        flushAt: 1,
        flushInterval: 0
      }
    );
  }
  return posthogClient;
}

/**
 * Server-side helper to check if a feature flag is enabled for a specific user.
 */
export async function isFeatureEnabled(userId: string, flag: string): Promise<boolean> {
  const ph = getPostHogServer();
  if (!ph) {
    // Fallback: if PostHog key isn't set, return true for dev or false
    return process.env.NODE_ENV !== 'production';
  }
  try {
    return (await ph.isFeatureEnabled(flag, userId)) ?? false;
  } catch (e) {
    console.error(`[PostHog Server] Feature flag check error for ${flag}:`, e);
    return false;
  }
}

export interface AppFeatureFlags {
  fourPhases: boolean;
  modality: boolean;
  holdCostLedger: boolean;
  outreachEngine: boolean;
  rehabPhase: boolean;
  phaseVendors: boolean;
}

/**
 * Server-side helper to retrieve all feature flags with dependency enforcement.
 */
export async function getFeatureFlags(userId: string): Promise<AppFeatureFlags> {
  const ph = getPostHogServer();
  const isDev = process.env.NODE_ENV !== 'production';

  if (!ph) {
    const fourPhases = isDev;
    return {
      fourPhases,
      modality: isDev && fourPhases,
      holdCostLedger: isDev && fourPhases,
      outreachEngine: isDev && fourPhases,
      rehabPhase: isDev && fourPhases,
      phaseVendors: isDev && fourPhases,
    };
  }

  try {
    const rawFourPhases = (await ph.isFeatureEnabled('reil_v2_four_phases', userId)) ?? false;
    const rawModality = (await ph.isFeatureEnabled('reil_v2_modality', userId)) ?? false;
    const rawHoldCostLedger = (await ph.isFeatureEnabled('reil_v2_hold_cost_ledger', userId)) ?? false;
    const rawOutreachEngine = (await ph.isFeatureEnabled('reil_v2_outreach_engine', userId)) ?? false;
    const rawRehabPhase = (await ph.isFeatureEnabled('reil_v2_rehab_phase', userId)) ?? false;
    const rawPhaseVendors = (await ph.isFeatureEnabled('reil_v2_phase_vendors', userId)) ?? false;

    const fourPhases = !!rawFourPhases;

    return {
      fourPhases,
      modality: !!rawModality && fourPhases,
      holdCostLedger: !!rawHoldCostLedger && fourPhases,
      outreachEngine: !!rawOutreachEngine && fourPhases,
      rehabPhase: !!rawRehabPhase && fourPhases,
      phaseVendors: !!rawPhaseVendors && fourPhases,
    };
  } catch (e) {
    console.error(`[PostHog Server] Feature flags extraction failed for user ${userId}:`, e);
    return {
      fourPhases: false,
      modality: false,
      holdCostLedger: false,
      outreachEngine: false,
      rehabPhase: false,
      phaseVendors: false,
    };
  }
}
