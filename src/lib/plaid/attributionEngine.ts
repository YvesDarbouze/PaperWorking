/**
 * ═══════════════════════════════════════════════════════════════
 * PaperWorking — Plaid Transaction Attribution Engine (Doc & Bridge)
 *
 * Exposes utility functions and structural explanations of how Plaid
 * bank transaction entries map to target properties/projects.
 *
 * DESIGN PREREQUISITE:
 *   - No ML or external AI processor is used.
 *   - Matches are evaluated sequentially using date proximity,
 *     merchant keyword matching, and amount tolerances.
 *
 * Core runner lives in src/lib/banking/attributor.ts.
 * ═══════════════════════════════════════════════════════════════
 */

import { attributeTransaction, TransactionInput, AttributionResult } from '../banking/attributor';
import { DETERMINISTIC_ATTRIBUTION_RULES, normalizeMerchantName } from './attributionRules';

export { attributeTransaction, type TransactionInput, type AttributionResult };

/**
 * Explanatory helper demonstrating how the rules-based matching engine
 * evaluates if a transaction fits a project's acquisition/rehab parameters.
 */
export function explainAttributionLogic(
  txName: string,
  txAmount: number,
  txDate: Date,
  projectAddress: string
): string {
  const cleanTx = normalizeMerchantName(txName);
  const cleanAddr = normalizeMerchantName(projectAddress);

  // Address-to-merchant string check
  if (cleanTx.includes(cleanAddr) || cleanAddr.includes(cleanTx)) {
    return 'DIRECT_ADDRESS_MATCH: Transaction name matches target property address.';
  }

  // Check categories
  for (const rule of DETERMINISTIC_ATTRIBUTION_RULES) {
    if (rule.patterns.some(pattern => cleanTx.includes(pattern))) {
      return `RULE_MATCH (${rule.category}): Transaction matched pattern "${rule.patterns.find(p => cleanTx.includes(p))}"`;
    }
  }

  return 'NO_MATCH: Transaction requires manual team review and assignment.';
}
