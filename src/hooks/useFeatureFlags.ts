'use client';

import { useFeatureFlagEnabled } from 'posthog-js/react';
import type { AppFeatureFlags } from '@/lib/flags';

/**
 * Client-side hook to retrieve all feature flags with dependency enforcement.
 */
export function useFeatureFlags(): AppFeatureFlags {
  const rawFourPhases = useFeatureFlagEnabled('reil_v2_four_phases');
  const rawModality = useFeatureFlagEnabled('reil_v2_modality');
  const rawHoldCostLedger = useFeatureFlagEnabled('reil_v2_hold_cost_ledger');
  const rawOutreachEngine = useFeatureFlagEnabled('reil_v2_outreach_engine');
  const rawRehabPhase = useFeatureFlagEnabled('reil_v2_rehab_phase');
  const rawPhaseVendors = useFeatureFlagEnabled('reil_v2_phase_vendors');

  const isDev = process.env.NODE_ENV !== 'production';
  const hasPHKey = !!process.env.NEXT_PUBLIC_POSTHOG_KEY;

  const fourPhases = hasPHKey ? !!rawFourPhases : isDev;

  return {
    fourPhases,
    modality: (hasPHKey ? !!rawModality : isDev) && fourPhases,
    holdCostLedger: (hasPHKey ? !!rawHoldCostLedger : isDev) && fourPhases,
    outreachEngine: (hasPHKey ? !!rawOutreachEngine : isDev) && fourPhases,
    rehabPhase: (hasPHKey ? !!rawRehabPhase : isDev) && fourPhases,
    phaseVendors: (hasPHKey ? !!rawPhaseVendors : isDev) && fourPhases,
  };
}
