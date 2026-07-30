import {
  FinancialTransactionCategory,
  FinancialTransactionDirection,
  Prisma,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type PrimaryClassification =
  | 'REVENUE'
  | 'EXPENSE'
  | 'LIABILITY_PAYMENT'
  | 'TRANSFER'
  | 'UNCERTAIN';

export interface SplitSuggestionItem {
  amount: number; // in dollars
  category: FinancialTransactionCategory;
  reason: string;
}

export interface IdentificationResult {
  primaryClassification: PrimaryClassification;
  paperWorkingCategory: FinancialTransactionCategory;
  confidenceScore: number; // 0.0 to 1.0
  reasoning: string[]; // human-readable explanation
  suggestedLeaseId?: string;
  isRecurring: boolean;
  isSplitSuggested: boolean;
  splitSuggestion?: SplitSuggestionItem[];
}

export interface LeaseContext {
  id: string;
  tenantName: string;
  monthlyRent: number; // in dollars
  rentDueDay: number; // 1-31
  securityDeposit?: number; // in dollars
  startDate?: Date;
  endDate?: Date;
}

export interface MortgageContext {
  id: string;
  lender?: string | null;
  balance: number; // in dollars
  nextPaymentAmount?: number | null; // in dollars
  interestRatePct?: number | null;
  escrowBalance?: number | null;
}

export interface RawTransactionInput {
  name: string;
  amount: number | Prisma.Decimal;
  category?: string[];
  personalFinanceCategory?: { primary?: string; detailed?: string } | null;
  postedDate?: Date | null;
  merchantName?: string | null;
  direction?: FinancialTransactionDirection;
  paymentChannel?: string | null;
}

export class TransactionIdentificationEngine {
  /**
   * Identifies and classifies a Plaid transaction into PaperWorking's
   * investment accounting framework.
   */
  static async identify(
    transaction: RawTransactionInput,
    projectId?: string,
    contextOverride?: { leases?: LeaseContext[]; mortgage?: MortgageContext }
  ): Promise<IdentificationResult> {
    const reasoning: string[] = [];
    let primary: PrimaryClassification = 'UNCERTAIN';
    let category: FinancialTransactionCategory = FinancialTransactionCategory.UNCATEGORIZED;
    let confidence = 0.3;
    let suggestedLeaseId: string | undefined;
    let isRecurring = false;
    let isSplitSuggested = false;
    let splitSuggestion: SplitSuggestionItem[] | undefined;

    const rawAmt = typeof transaction.amount === 'number' ? transaction.amount : Number(transaction.amount);
    const amountDollar = Math.abs(rawAmt);
    const isCredit = transaction.direction === 'CREDIT' || rawAmt < 0;
    const name = transaction.name || '';
    const merchantName = transaction.merchantName || '';
    const fullName = `${name} ${merchantName}`.toLowerCase();
    const pfc = transaction.personalFinanceCategory || {};

    let leases = contextOverride?.leases ?? [];
    let mortgage = contextOverride?.mortgage;

    // Load active leases context from existing transactions if not overridden
    if (projectId && (!contextOverride || !contextOverride.leases)) {
      try {
        const pastRent = await prisma.financialTransaction.findFirst({
          where: { projectId, category: 'RENT_INCOME' },
          select: { amount: true, payee: true },
        });
        if (pastRent) {
          leases.push({
            id: `lease_${projectId}_historical`,
            tenantName: pastRent.payee || 'Tenant',
            monthlyRent: Number(pastRent.amount),
            rentDueDay: 1,
          });
        }
      } catch {
        /* fallback to in-memory context */
      }
    }

    // ── STEP 1: Plaid AI Category Mapping ──────────────────────────────────────
    const primaryPfc = (pfc.primary || '').toUpperCase();
    const detailedPfc = (pfc.detailed || '').toUpperCase();

    if (primaryPfc === 'INCOME') {
      primary = 'REVENUE';
      if (detailedPfc.includes('RENT')) {
        category = FinancialTransactionCategory.RENT_INCOME;
        confidence = 0.9;
        reasoning.push('Plaid AI classified as INCOME / RENT.');
      } else if (detailedPfc.includes('INTEREST')) {
        category = FinancialTransactionCategory.INTEREST_INCOME;
        confidence = 0.88;
        reasoning.push('Plaid AI classified as INTEREST_INCOME.');
      } else if (detailedPfc.includes('DIVIDEND')) {
        category = FinancialTransactionCategory.MISC_INCOME;
        confidence = 0.85;
        reasoning.push('Plaid AI classified as DIVIDEND income.');
      } else {
        category = FinancialTransactionCategory.MISC_INCOME;
        confidence = 0.75;
        reasoning.push(`Plaid AI classified as INCOME (${detailedPfc || 'general'}).`);
      }
    } else if (primaryPfc === 'TRANSFER_IN') {
      if (/zelle|venmo|cashapp|cash app|paypal/i.test(fullName)) {
        primary = 'REVENUE';
        category = FinancialTransactionCategory.RENT_INCOME;
        confidence = 0.8;
        reasoning.push('Incoming digital transfer (Zelle/Venmo/CashApp) matched rent income pattern.');
      } else {
        primary = 'TRANSFER';
        category = FinancialTransactionCategory.INTER_ACCOUNT_TRANSFER;
        confidence = 0.75;
        reasoning.push('Plaid AI classified as TRANSFER_IN.');
      }
    } else if (primaryPfc === 'LOAN_PAYMENTS' || /mortgage|loan payment/i.test(fullName)) {
      primary = 'LIABILITY_PAYMENT';
      category = FinancialTransactionCategory.MORTGAGE_INTEREST;
      confidence = 0.9;
      reasoning.push('Matched mortgage/loan payment classification.');
    } else if (primaryPfc === 'RENT_AND_UTILITIES') {
      if (isCredit) {
        primary = 'REVENUE';
        category = FinancialTransactionCategory.RENT_INCOME;
        confidence = 0.85;
        reasoning.push('Reimbursement under RENT_AND_UTILITIES mapped to REVENUE.');
      } else {
        primary = 'EXPENSE';
        if (detailedPfc.includes('ELECTRIC')) category = FinancialTransactionCategory.UTILITIES;
        else if (detailedPfc.includes('GAS')) category = FinancialTransactionCategory.UTILITIES;
        else if (detailedPfc.includes('WATER')) category = FinancialTransactionCategory.UTILITIES;
        else if (detailedPfc.includes('SEWER')) category = FinancialTransactionCategory.UTILITIES;
        else if (detailedPfc.includes('TRASH')) category = FinancialTransactionCategory.UTILITIES;
        else if (detailedPfc.includes('HOA')) category = FinancialTransactionCategory.HOA_FEES;
        else category = FinancialTransactionCategory.UTILITIES;
        confidence = 0.85;
        reasoning.push(`Plaid AI classified as RENT_AND_UTILITIES (${detailedPfc}).`);
      }
    } else if (primaryPfc === 'HOME_IMPROVEMENT') {
      if (amountDollar >= 2500) {
        primary = 'EXPENSE';
        category = FinancialTransactionCategory.CAPITAL_EXPENDITURE;
        confidence = 0.92;
        reasoning.push(`Home improvement >= $2,500 threshold ($${amountDollar.toLocaleString()}) classified as CapEx.`);
      } else {
        primary = 'EXPENSE';
        category = FinancialTransactionCategory.MAINTENANCE_REPAIR;
        confidence = 0.85;
        reasoning.push(`Home improvement < $2,500 threshold ($${amountDollar.toLocaleString()}) classified as Maintenance & Repair.`);
      }
    } else if (primaryPfc === 'GENERAL_SERVICES') {
      primary = 'EXPENSE';
      if (detailedPfc.includes('REPAIR') || detailedPfc.includes('LOCKSMITH')) category = FinancialTransactionCategory.MAINTENANCE_REPAIR;
      else if (detailedPfc.includes('CLEANING')) category = FinancialTransactionCategory.CLEANING_TURNOVER;
      else if (detailedPfc.includes('LANDSCAPING')) category = FinancialTransactionCategory.LANDSCAPING_SNOW;
      else if (detailedPfc.includes('PEST')) category = FinancialTransactionCategory.PEST_CONTROL;
      else category = FinancialTransactionCategory.MAINTENANCE_REPAIR;
      confidence = 0.82;
      reasoning.push(`Plaid AI classified as GENERAL_SERVICES (${detailedPfc}).`);
    } else if (primaryPfc === 'INSURANCE') {
      primary = 'EXPENSE';
      category = FinancialTransactionCategory.PROPERTY_INSURANCE;
      confidence = 0.88;
      reasoning.push('Plaid AI classified as INSURANCE.');
    } else if (primaryPfc === 'TAX') {
      primary = 'EXPENSE';
      category = FinancialTransactionCategory.PROPERTY_TAX;
      confidence = 0.9;
      reasoning.push('Plaid AI classified as TAX.');
    } else if (primaryPfc === 'BANK_FEES') {
      primary = 'EXPENSE';
      category = FinancialTransactionCategory.BANK_CREDIT_CARD_FEES;
      confidence = 0.9;
      reasoning.push('Plaid AI classified as BANK_FEES.');
    } else if (primaryPfc === 'LEGAL') {
      primary = 'EXPENSE';
      category = FinancialTransactionCategory.LEGAL_PROFESSIONAL;
      confidence = 0.88;
      reasoning.push('Plaid AI classified as LEGAL.');
    } else if (primaryPfc === 'ACCOUNTING') {
      primary = 'EXPENSE';
      category = FinancialTransactionCategory.ACCOUNTING_BOOKKEEPING;
      confidence = 0.88;
      reasoning.push('Plaid AI classified as ACCOUNTING.');
    } else if (primaryPfc === 'ADVERTISING') {
      primary = 'EXPENSE';
      category = FinancialTransactionCategory.MARKETING_ADVERTISING;
      confidence = 0.88;
      reasoning.push('Plaid AI classified as ADVERTISING.');
    } else if (primaryPfc === 'SOFTWARE') {
      primary = 'EXPENSE';
      category = FinancialTransactionCategory.SOFTWARE_TECHNOLOGY;
      confidence = 0.88;
      reasoning.push('Plaid AI classified as SOFTWARE.');
    }

    // ── STEP 2: Revenue Identification (Rent & Income Heuristics) ─────────────
    if (isCredit) {
      if (/hud|section 8|section8|housing authority|pha\b/i.test(fullName)) {
        primary = 'REVENUE';
        category = FinancialTransactionCategory.RENT_INCOME;
        confidence = 0.96;
        reasoning.push('Government housing / Section 8 payment identified.');
      } else if (/appfolio|buildium|rentmanager|rent manager|cozy|tenantease|stessa/i.test(fullName)) {
        primary = 'REVENUE';
        category = FinancialTransactionCategory.RENT_INCOME;
        confidence = 0.90;
        reasoning.push('Property management software rent deposit identified.');
      }

      for (const lease of leases) {
        if (!lease.monthlyRent) continue;
        const diff = Math.abs(amountDollar - lease.monthlyRent);

        if (diff <= 1.0) {
          primary = 'REVENUE';
          category = FinancialTransactionCategory.RENT_INCOME;
          confidence = Math.max(confidence, 0.92);
          suggestedLeaseId = lease.id;
          reasoning.push(`Exact rent amount match ($${amountDollar}) for tenant ${lease.tenantName}.`);

          if (fullName.includes(lease.tenantName.toLowerCase())) {
            confidence = Math.min(1.0, confidence + 0.08);
            reasoning.push(`Tenant name '${lease.tenantName}' matched payee.`);
          }
          break;
        } else if (amountDollar >= lease.monthlyRent * 0.5 && amountDollar < lease.monthlyRent * 0.99) {
          primary = 'REVENUE';
          category = FinancialTransactionCategory.RENT_INCOME;
          confidence = Math.max(confidence, 0.78);
          suggestedLeaseId = lease.id;
          reasoning.push(`Partial rent payment ($${amountDollar} of $${lease.monthlyRent}) for tenant ${lease.tenantName}.`);
          break;
        } else if (amountDollar > lease.monthlyRent * 1.3) {
          primary = 'REVENUE';
          category = FinancialTransactionCategory.RENT_INCOME;
          confidence = Math.max(confidence, 0.85);
          suggestedLeaseId = lease.id;
          isSplitSuggested = true;
          const remainder = Math.round((amountDollar - lease.monthlyRent) * 100) / 100;
          splitSuggestion = [
            {
              amount: lease.monthlyRent,
              category: FinancialTransactionCategory.RENT_INCOME,
              reason: `Monthly rent for ${lease.tenantName}`,
            },
            {
              amount: remainder,
              category: FinancialTransactionCategory.LATE_FEE_INCOME,
              reason: `Overpayment balance (suggested late fee or deposit)`,
            },
          ];
          reasoning.push(`Rent overpayment detected ($${amountDollar} vs $${lease.monthlyRent} rent). Split suggested.`);
          break;
        }
      }
    }

    // ── STEP 3: Expense Identification & CapEx Threshold ──────────────────────
    if (!isCredit && primary !== 'LIABILITY_PAYMENT') {
      const capexKeywords = /roof|hvac|foundation|renovation|rehab|construction|lumber|decking|boiler/i;
      if (capexKeywords.test(fullName)) {
        if (amountDollar >= 2500) {
          primary = 'EXPENSE';
          category = FinancialTransactionCategory.CAPITAL_EXPENDITURE;
          confidence = 0.92;
          reasoning.push(`CapEx keyword & amount >= $2,500 threshold ($${amountDollar.toLocaleString()}).`);
        } else {
          primary = 'EXPENSE';
          category = FinancialTransactionCategory.MAINTENANCE_REPAIR;
          confidence = 0.85;
          reasoning.push(`CapEx keyword & amount < $2,500 threshold ($${amountDollar.toLocaleString()}) → Maintenance.`);
        }
      }

      if (/state farm|allstate|liberty mutual|farmers insurance|nationwide/i.test(fullName)) {
        primary = 'EXPENSE';
        category = FinancialTransactionCategory.PROPERTY_INSURANCE;
        confidence = 0.92;
        reasoning.push('Enriched counterparty matched Property Insurance provider.');
      } else if (/duke energy|con edison|peco|pg&e|national grid|eversource/i.test(fullName)) {
        primary = 'EXPENSE';
        category = FinancialTransactionCategory.UTILITIES;
        confidence = 0.92;
        reasoning.push('Enriched counterparty matched Utility provider.');
      } else if (/home depot|lowe's|lowes|ace hardware|menards/i.test(fullName)) {
        primary = 'EXPENSE';
        category = amountDollar >= 2500 ? FinancialTransactionCategory.CAPITAL_EXPENDITURE : FinancialTransactionCategory.SUPPLIES;
        confidence = 0.85;
        reasoning.push(`Building material supplier match ($${amountDollar}).`);
      }
    }

    // ── STEP 4: Liability Payment Identification (Mortgage/Debt) ─────────────
    if (!isCredit && (/mortgage|wells fargo home|chase mortgage|quicken loans|rocket mortgage|piti/i.test(fullName) || primary === 'LIABILITY_PAYMENT')) {
      primary = 'LIABILITY_PAYMENT';
      category = FinancialTransactionCategory.MORTGAGE_INTEREST;
      confidence = 0.94;
      reasoning.push('Mortgage servicer / loan payment identified.');

      if (mortgage?.nextPaymentAmount || amountDollar > 500) {
        isSplitSuggested = true;
        const estInterest = Math.round(amountDollar * 0.55 * 100) / 100;
        const estPrincipal = Math.round(amountDollar * 0.30 * 100) / 100;
        const estEscrow = Math.round((amountDollar - estInterest - estPrincipal) * 100) / 100;

        splitSuggestion = [
          {
            amount: estInterest,
            category: FinancialTransactionCategory.MORTGAGE_INTEREST,
            reason: 'Estimated mortgage interest portion',
          },
          {
            amount: estPrincipal,
            category: FinancialTransactionCategory.MORTGAGE_PRINCIPAL,
            reason: 'Estimated principal reduction portion',
          },
          {
            amount: estEscrow,
            category: FinancialTransactionCategory.MORTGAGE_ESCROW_PAYMENT,
            reason: 'Estimated escrow portion (taxes & insurance)',
          },
        ];
        reasoning.push('Suggested 3-way PITI mortgage split (Interest / Principal / Escrow).');
      } else {
        reasoning.push('Connect mortgage account to calculate exact PITI principal/interest split.');
      }
    }

    // ── STEP 5: Transfer Identification (Non-P&L) ────────────────────────────
    if (/owner draw|owner distribution|capital draw/i.test(fullName)) {
      primary = 'TRANSFER';
      category = FinancialTransactionCategory.OWNER_DISTRIBUTION;
      confidence = 0.95;
      reasoning.push('Matched owner distribution / draw pattern.');
    } else if (/capital contribution|capital injection|owner investment/i.test(fullName)) {
      primary = 'TRANSFER';
      category = FinancialTransactionCategory.CAPITAL_CONTRIBUTION;
      confidence = 0.95;
      reasoning.push('Matched capital contribution pattern.');
    } else if (/security deposit|sec dep/i.test(fullName)) {
      primary = 'TRANSFER';
      category = isCredit ? FinancialTransactionCategory.SECURITY_DEPOSIT_RECEIVED : FinancialTransactionCategory.SECURITY_DEPOSIT_RETURNED;
      confidence = 0.94;
      reasoning.push(`Security deposit ${isCredit ? 'received' : 'returned'} pattern matched.`);
    }

    // ── STEP 7: Recurring Pattern Detection ──────────────────────────────────
    if (primary !== 'UNCERTAIN' && (amountDollar > 0 || name.length > 0)) {
      if (
        category === FinancialTransactionCategory.RENT_INCOME ||
        category === FinancialTransactionCategory.MORTGAGE_INTEREST ||
        category === FinancialTransactionCategory.PROPERTY_INSURANCE ||
        category === FinancialTransactionCategory.PROPERTY_TAX ||
        category === FinancialTransactionCategory.HOA_FEES ||
        category === FinancialTransactionCategory.SOFTWARE_TECHNOLOGY
      ) {
        isRecurring = true;
        reasoning.push('Marked as recurring based on financial category characteristics.');
      }
    }

    if (primary === 'UNCERTAIN') {
      if (isCredit) {
        primary = 'REVENUE';
        category = FinancialTransactionCategory.MISC_INCOME;
        confidence = 0.45;
        reasoning.push('Fallback credit mapped to MISC_INCOME.');
      } else {
        primary = 'EXPENSE';
        category = FinancialTransactionCategory.UNCATEGORIZED;
        confidence = 0.35;
        reasoning.push('Unrecognized debit transaction. Marked PENDING_REVIEW.');
      }
    }

    return {
      primaryClassification: primary,
      paperWorkingCategory: category,
      confidenceScore: Math.min(1.0, Math.max(0.0, Math.round(confidence * 100) / 100)),
      reasoning,
      suggestedLeaseId,
      isRecurring,
      isSplitSuggested,
      splitSuggestion,
    };
  }
}
