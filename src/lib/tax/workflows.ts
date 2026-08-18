import { ProjectTaxDatapoints } from './datapoint-schema';
import { calculate1040ES } from './calculator';

export interface QuarterlyWorkflowPrompt {
  quarter: 1 | 2 | 3 | 4;
  dueDate: string;
  estimatedAmount: number;
  promptText: string;
  status: 'pending' | 'paid' | 'scheduled';
}

export interface YearEndTaxPackageResult {
  taxYear: number;
  formsGeneratedCount: number;
  formsList: string[];
  contractor1099Count: number;
  alertText: string;
  isReady: boolean;
}

export interface TaxDocumentAuditRecord {
  docId: string;
  formType: string;
  generatedByUserId: string;
  generatedAt: string;
  projectId: string;
  retentionExpiresAt: string;
}

/**
 * Auto-detects current quarter and returns quarterly 1040-ES workflow prompt
 */
export function getCurrentQuarterWorkflow(
  datapoints: ProjectTaxDatapoints,
  currentDate: Date = new Date()
): QuarterlyWorkflowPrompt {
  const month = currentDate.getMonth() + 1; // 1 to 12
  let quarter: 1 | 2 | 3 | 4 = 1;
  let dueDate = 'April 15';

  if (month >= 4 && month <= 5) {
    quarter = 2;
    dueDate = 'June 15';
  } else if (month >= 6 && month <= 8) {
    quarter = 3;
    dueDate = 'September 15';
  } else if (month >= 9) {
    quarter = 4;
    dueDate = 'January 15';
  }

  const netIncome = datapoints.d5_1040_es.quarterly_net_income || 15000;
  const est = calculate1040ES(netIncome, 0.25);
  const amountStr = est.estimatedTaxDue.toLocaleString();

  return {
    quarter,
    dueDate,
    estimatedAmount: est.estimatedTaxDue,
    promptText: `Q${quarter} estimated tax payment of $${amountStr} due ${dueDate}. Generate 1040-ES?`,
    status: 'pending',
  };
}

/**
 * Generates Year-End Tax Package Alert & File Manifest
 */
export function generateYearEndWorkflow(
  datapoints: ProjectTaxDatapoints,
  taxYear: number = 2025
): YearEndTaxPackageResult {
  const formsList = ['Schedule E', 'Form 4562', 'Schedule D'];
  if (datapoints.d8_capital_gains.form_8825_income > 0) {
    formsList.push('Form 8825');
  }

  const contractorCount = (datapoints.d9_1099_returns.contractors_paid || []).filter(
    c => c.amount >= 600
  ).length;

  if (contractorCount > 0) {
    formsList.push('Form 1099-NEC');
  }

  return {
    taxYear,
    formsGeneratedCount: formsList.length,
    formsList,
    contractor1099Count: contractorCount,
    alertText: `Your ${taxYear} tax package is ready. ${formsList.length} forms generated, ${contractorCount} 1099s need to be sent to contractors.`,
    isReady: true,
  };
}

/**
 * Enforces 3-Year IRS Recordkeeping Retention Rule
 * Returns error if attempt is made to delete a document under 3 years old.
 */
export function enforceTaxRetention(
  docCreatedDateIso: string,
  currentDate: Date = new Date()
): { canDelete: boolean; reason?: string } {
  const created = new Date(docCreatedDateIso).getTime();
  const now = currentDate.getTime();
  const threeYearsMs = 3 * 365 * 24 * 60 * 60 * 1000; // 3 years in milliseconds

  const ageMs = now - created;
  if (ageMs < threeYearsMs) {
    const daysRemaining = Math.ceil((threeYearsMs - ageMs) / (1000 * 3600 * 24));
    return {
      canDelete: false,
      reason: `IRS compliance violation: Tax document must be retained for 3 years. ${daysRemaining} days remaining in retention lock.`,
    };
  }

  return { canDelete: true };
}
