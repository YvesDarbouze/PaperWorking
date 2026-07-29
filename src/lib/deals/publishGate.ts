import type { Project } from '@/types/schema';
import type { DealListing, PublishGateResult, VisibilityMode, PublishGateCriterion } from '@/types/listing';

/**
 * Pure evaluation function that assesses whether a Project/Listing meets the
 * criteria to be published or transitioned to a loosen visibility mode.
 */
export function evaluatePublishGate(
  project: Project,
  listing: Partial<DealListing>,
  targetMode: VisibilityMode
): PublishGateResult {
  const criteria: PublishGateCriterion[] = [];
  const financials = project.financials || {};

  // 1. Control Status Set
  // "control status set" -> Owned, Under Contract, Option, or Exclusive Right
  const validControlStatuses = ['owned', 'under-contract', 'option', 'exclusive_right'];
  const controlStatus = project.controlStatus || (project as any).control_status || (listing as any).controlStatus;
  const isControlStatusSet = !!controlStatus && validControlStatuses.includes(controlStatus.toLowerCase());
  
  criteria.push({
    key: 'control_status_set',
    label: 'Control status set (Owned, Under Contract, Option, or Exclusive Right)',
    status: isControlStatusSet,
    isRed: true,
    detail: isControlStatusSet ? `Set to: ${controlStatus}` : 'Control status is not set or invalid',
  });

  // 2. Required Inputs Present
  // "required inputs present for every metric the target visibility will display"
  // Check if financed
  const modality = project.fundingPlan?.modality || [];
  const isFinanced =
    modality.some((m: string) =>
      ['conventional_loan', 'sba_504', 'hard_money', 'bridge'].includes(m)
    ) ||
    (project.loans && project.loans.length > 0) ||
    (financials.capitalStack || []).some((s: any) =>
      [
        'Conventional Financing',
        'Hard Money Loans',
        'SBA 504 Bank First Lien',
        'SBA 504 CDC Debenture',
        'Bridge Loans',
      ].includes(s.category)
    );

  const missingInputs: string[] = [];

  // Purchase Price
  const purchasePrice = financials.purchasePrice || financials.targetPurchasePrice;
  if (!purchasePrice || purchasePrice <= 0) missingInputs.push('Purchase Price');

  // Gross Rent
  const grossRent = (financials as any).grossRent || financials.gross_rent_per_unit || financials.actualRentalIncome || financials.monthlyGrossRent;
  if (!grossRent || grossRent <= 0) missingInputs.push('Monthly Gross Rent');

  // Vacancy Rate
  if (financials.vacancy_pct === undefined || financials.vacancy_pct === null) missingInputs.push('Vacancy Rate %');

  // Operating Expenses (Tax & Insurance)
  if (financials.tax === undefined || financials.tax === null) missingInputs.push('Taxes');
  if (financials.insurance === undefined || financials.insurance === null) missingInputs.push('Insurance');
  if (financials.utilities === undefined || financials.utilities === null) missingInputs.push('Utilities');
  if (financials.management_pct === undefined || financials.management_pct === null) missingInputs.push('Property Mgmt Fee');
  if (financials.maintenance === undefined && financials.maintenance_pct === undefined) missingInputs.push('Maintenance Reserve');

  // Funding Target
  const fundingTarget = (project as any).equityTerms?.funding_target || (project as any).equityTerms?.fundingTarget || (financials as any).equityTarget || financials.capitalRaiseTarget;
  if (!fundingTarget || fundingTarget <= 0) missingInputs.push('Funding Target');

  // Loan terms if financed
  if (isFinanced) {
    const loanAmount = financials.loanAmount || financials.targetLoanAmount || (project.loans && project.loans.length > 0);
    if (!loanAmount) missingInputs.push('Loan Amount');

    const interestRate = financials.loanInterestRate || financials.targetLoanInterestRate || (project.loans && project.loans.length > 0);
    if (!interestRate) missingInputs.push('Loan Interest Rate');

    const term = financials.loanTermYears || financials.targetLoanTermYears || (project.loans && project.loans.length > 0);
    if (!term) missingInputs.push('Loan Term');
  }

  const isUnderwritingInputsComplete = missingInputs.length === 0;
  criteria.push({
    key: 'underwriting_inputs_complete',
    label: 'Underwriting inputs complete for target visibility metrics',
    status: isUnderwritingInputsComplete,
    isRed: true,
    detail: isUnderwritingInputsComplete 
      ? 'All required metrics fields populated' 
      : `Missing fields: ${missingInputs.join(', ')}`,
  });

  // 3. Disclosure Acknowledged
  // "disclosure acknowledged for the chosen mode"
  const isDisclosureAcknowledged = listing.disclosureAcknowledgedForMode === targetMode || (listing as any).disclosureAcknowledgedModes?.includes(targetMode);
  criteria.push({
    key: 'disclosure_acknowledged',
    label: `Disclosure acknowledged for visibility mode: ${targetMode}`,
    status: !!isDisclosureAcknowledged,
    isRed: true,
    detail: isDisclosureAcknowledged 
      ? 'Disclosure acknowledged successfully' 
      : `Disclosure for ${targetMode} has not been acknowledged`,
  });

  // 4. Scope Tier and Disposition Type Set
  // "scope tier and disposition_type set"
  const dispositionType = project.dispositionType || (project as any).disposition_type || (project as any).strategyType;
  const isDispositionTypeSet = !!dispositionType && ['RENT', 'SALE', 'LEASE'].includes(dispositionType.toUpperCase());

  const rawTier = project.rehabTier || (project as any).renovationTier || (project as any).scopeTier;
  const isScopeTierSet = !!rawTier && ['STAGE', 'REFURBISH', 'RENOVATE', 'GUT', 'DEVELOP'].includes(rawTier.toUpperCase());

  const isStrategyAndScopeSet = isDispositionTypeSet && isScopeTierSet;
  let strategyDetail = '';
  if (!isDispositionTypeSet) strategyDetail += 'Disposition type not set. ';
  if (!isScopeTierSet) strategyDetail += 'Scope tier not set. ';
  if (isStrategyAndScopeSet) strategyDetail = `Disposition: ${dispositionType}, Scope: ${rawTier}`;

  criteria.push({
    key: 'scope_tier_and_strategy_set',
    label: 'Scope tier and disposition type strategy set',
    status: isStrategyAndScopeSet,
    isRed: true,
    detail: strategyDetail || 'Both scope tier and strategy are configured',
  });

  const passed = criteria.every((c) => c.status);

  return {
    passed,
    evaluatedAt: new Date().toISOString(),
    criteria,
  };
}
