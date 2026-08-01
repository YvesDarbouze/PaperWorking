import type { ProjectFinancials, F4VendorAssignment } from '@/types/schema';
import { isAttorneyCloseState } from '@/lib/config/attorneyStates';
import { reconcileProjectCapital } from '@/lib/math/reconciliation';

/**
 * F6 Phase Gate — Blocking-line evaluators
 *
 * Each function returns { blocked: boolean; reason: string }.
 * Collect all blocking lines and prevent phase advancement when
 * any line is blocked.
 */

export interface GateBlockingLine {
  key: string;
  label: string;
  blocked: boolean;
  reason: string;
}

/**
 * Attorney blocking line:
 * If the deal's state is in the attorney-close config list,
 * a closing attorney MUST be assigned before the fund phase gate can advance.
 */
export function evaluateAttorneyBlockingLine(
  projectState: string | undefined | null,
  financials: Partial<ProjectFinancials>,
  attorneyStateList: readonly string[]
): GateBlockingLine {
  const isRequired = isAttorneyCloseState(projectState, attorneyStateList);

  if (!isRequired) {
    return {
      key: 'attorney',
      label: 'Closing Attorney Assigned',
      blocked: false,
      reason: 'Not required — property is not in an attorney-close state.',
    };
  }

  const slot = financials.f4ClosingAttorneyVendor;
  const isAssigned = !!slot && (
    typeof slot === 'string'
      ? slot.trim().length > 0
      : !!(slot as F4VendorAssignment).name?.trim()
  );

  return {
    key: 'attorney',
    label: 'Closing Attorney Assigned',
    blocked: !isAssigned,
    reason: isAssigned
      ? `Attorney assigned: ${typeof slot === 'string' ? slot : (slot as F4VendorAssignment).name}`
      : 'This property is in an attorney-close state — assign your closing attorney before proceeding.',
  };
}

/**
 * Evaluate all F6 gate blocking lines.
 */
export function evaluateF6GateLines(
  project: any,
  attorneyStateList: readonly string[]
): GateBlockingLine[] {
  const f = project.financials || {};
  const cr = project.closingRoom || {};
  const isFinanced = (f.capitalStack || []).some(
    (source: any) =>
      (source.category === 'Conventional Financing' || source.category === 'Hard Money Loans') &&
      (source.status === 'Approved' || source.status === 'Funded')
  );

  // 1. Purchase Price recorded
  const isPurchasePriceRecorded = !!f.purchasePrice && f.purchasePrice > 0;
  const purchasePriceLine: GateBlockingLine = {
    key: 'purchasePrice',
    label: 'Actual Purchase Price Recorded',
    blocked: !isPurchasePriceRecorded,
    reason: isPurchasePriceRecorded
      ? `Purchase price recorded: $${f.purchasePrice.toLocaleString()}`
      : 'Actual purchase price must be recorded before closing.',
  };

  // 2. Total Cash Invested fully actualized
  const isTotalCashActualized = (!!f.totalCashInvested && f.totalCashInvested > 0) || (!!f.finalCashToClose && f.finalCashToClose > 0);
  const totalCashLine: GateBlockingLine = {
    key: 'totalCash',
    label: 'Total Cash Invested Actualized',
    blocked: !isTotalCashActualized,
    reason: isTotalCashActualized
      ? `Total cash invested actualized: $${((f.totalCashInvested || f.finalCashToClose || 0)).toLocaleString()}`
      : 'Total cash invested must be actualized and non-zero.',
  };

  // 3. Loan Terms Actual (financed routes)
  const isLoanTermsActual = !isFinanced || (
    !!f.loanAmount && f.loanAmount > 0 &&
    !!f.loanInterestRate && f.loanInterestRate > 0
  );
  const loanTermsLine: GateBlockingLine = {
    key: 'loanTerms',
    label: 'Loan Terms Actualized (Financed)',
    blocked: !isLoanTermsActual,
    reason: isLoanTermsActual
      ? (isFinanced ? `Loan amount: $${f.loanAmount.toLocaleString()} at ${f.loanInterestRate}%` : 'Not financed — cash route')
      : 'Financed deals require actual loan amount and interest rate to be recorded.',
  };

  // 4. Closing Date recorded
  const isClosingDateRecorded = !!cr.actualClosingDate;
  const closingDateLine: GateBlockingLine = {
    key: 'closingDate',
    label: 'Closing Date Recorded',
    blocked: !isClosingDateRecorded,
    reason: isClosingDateRecorded
      ? `Closing date recorded: ${cr.actualClosingDate}`
      : 'Actual closing date must be recorded.',
  };

  // 5. Deed Recording confirmed
  const isDeedRecordingConfirmed = !!cr.deedRecordingCounty && !!cr.deedRecordingDate && !!cr.deedRecordingInstrumentNumber;
  const deedRecordingLine: GateBlockingLine = {
    key: 'deedRecording',
    label: 'Deed Recording Confirmed',
    blocked: !isDeedRecordingConfirmed,
    reason: isDeedRecordingConfirmed
      ? `Deed recorded in ${cr.deedRecordingCounty} on ${cr.deedRecordingDate} (${cr.deedRecordingInstrumentNumber})`
      : 'Deed recording details (county, date, instrument number) must be recorded.',
  };

  // 6. Required Closing Documents archived
  const docs = cr.executedDocs || {};
  const isDocsChecklistComplete =
    !!(docs.deedUrl && docs.deedSigned) &&
    (!isFinanced || !!(docs.noteUrl && docs.noteSigned)) &&
    !!(docs.settlementStatementUrl && docs.settlementStatementSigned) &&
    !!(docs.titlePolicyUrl && docs.titlePolicySigned) &&
    !!(docs.entityDocsUrl && docs.entityDocsSigned);

  const docsLine: GateBlockingLine = {
    key: 'closingDocs',
    label: 'Required Closing Documents Archived',
    blocked: !isDocsChecklistComplete,
    reason: isDocsChecklistComplete
      ? 'All five executed documents are uploaded, signed, and verified.'
      : `Missing executed documents or signatures. Required: Deed, Settlement Statement, Title Policy, Entity Docs${isFinanced ? ', Promissory Note' : ''}.`,
  };

  // 7. Cash-to-Close reconciled
  const reconciliation = reconcileProjectCapital(project);
  const isReconciled = reconciliation.isReconciled || !!cr.isReconciliationOverridden;
  const reconciliationLine: GateBlockingLine = {
    key: 'reconciliation',
    label: 'Cash-to-Close Reconciled',
    blocked: !isReconciled,
    reason: isReconciled
      ? (reconciliation.isReconciled ? 'Sources and uses match exactly ($0 variance).' : `Overridden: ${cr.reconciliationOverrideReason || 'LeadInvestor override'}`)
      : `Cash-to-close has a variance of $${reconciliation.variance.toLocaleString()}. Reconcile sources/uses or record a closing override.`,
  };

  // 8. Attorney requirement satisfied
  const attorneyLine = evaluateAttorneyBlockingLine(project.state, f, attorneyStateList);

  return [
    purchasePriceLine,
    totalCashLine,
    loanTermsLine,
    closingDateLine,
    deedRecordingLine,
    docsLine,
    reconciliationLine,
    attorneyLine,
  ];
}

