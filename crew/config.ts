/**
 * PaperWorking Synthetic Investor Crew — Configuration & Tier Mapping
 *
 * Provides target environment configuration, base URLs, DB connection settings,
 * and resolves synthetic investor persona tiers to actual subscription plan IDs
 * found in the codebase billing catalog (`src/lib/stripe/plans.ts`).
 */

import { PLAN_CATALOG, type PlanId } from '../src/lib/stripe/plans';
import { PERSONA_ROSTER, type PersonaKey, type PersonaTierKey } from './personas';

export const CREW_TARGET_ENV = process.env.CREW_TARGET_ENV || 'local';
export const CREW_BASE_URL = process.env.CREW_BASE_URL || 'http://localhost:3000';

/**
 * Direct mapping of persona keys to canonical subscription plan IDs in PLAN_CATALOG.
 *
 * Ensures all three catalog tiers ('individual', 'team', 'vendor') are represented
 * across the 9 persona accounts:
 *   - Entry tier: wholesaler, fix_flipper -> 'individual' ($59/mo Investor)
 *   - Entry tier passive: reit_investor -> 'vendor' ($39/mo Vendor Network)
 *   - Mid tier: buy_hold, multifamily_landlord, brrrr_investor -> 'team' ($99/mo Investment Team)
 *   - Top tier: land_developer, commercial_investor, syndicator -> 'team' ($99/mo Investment Team)
 */
export const PERSONA_PLAN_MAP: Record<PersonaKey, PlanId> = {
  wholesaler: 'individual',
  fix_flipper: 'individual',
  buy_hold: 'team',
  multifamily_landlord: 'team',
  land_developer: 'team',
  commercial_investor: 'team',
  brrrr_investor: 'team',
  reit_investor: 'vendor',
  syndicator: 'team',
};

/**
 * Mapping fallback by persona tier key ('entry' | 'mid' | 'top').
 */
export const TIER_KEY_TO_PLAN_ID: Record<PersonaTierKey, PlanId> = {
  entry: 'individual',
  mid: 'team',
  top: 'team',
};

/**
 * Resolves a persona key to its actual subscription PlanConfig and canonical plan name.
 */
export function resolvePersonaPlan(personaKey: PersonaKey) {
  const planId = PERSONA_PLAN_MAP[personaKey] || TIER_KEY_TO_PLAN_ID[PERSONA_ROSTER[personaKey]?.tierKey || 'entry'];
  const config = PLAN_CATALOG[planId];
  return {
    planId,
    canonicalName: config.canonicalName,
    displayName: config.displayName,
    monthlyPrice: config.monthlyPrice,
    config,
  };
}

/**
 * Checks whether an email belongs to the synthetic crew.
 */
export function isCrewEmail(email?: string | null): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  return lower.includes('+crew@') || lower.endsWith('@paperworking.co');
}

/**
 * Governance helper: Checks if a user record is a test or synthetic crew account.
 */
export function isTestAccount(userDoc: Record<string, any>): boolean {
  if (!userDoc) return false;
  if (userDoc.is_test_account === true) return true;
  if (userDoc.persona_key) return true;
  if (isCrewEmail(userDoc.email)) return true;
  return false;
}
