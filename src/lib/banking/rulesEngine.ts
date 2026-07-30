import {
  FinancialTransactionCategory,
  FinancialTransactionDirection,
  FinancialTransactionSource,
  FinancialTransactionStatus,
  Prisma,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { KpiAutoReporter } from '@/lib/analytics/kpiAutoReporter';

export interface ConditionRule {
  field:
    | 'AMOUNT'
    | 'PAYEE_NAME'
    | 'DESCRIPTION'
    | 'MERCHANT_NAME'
    | 'ACCOUNT_ID'
    | 'DATE_RANGE'
    | 'DAY_OF_MONTH'
    | 'TRANSACTION_TYPE'
    | 'PLAID_PERSONAL_FINANCE_CATEGORY'
    | 'PLAID_COUNTERPARTY_NAME';
  operator:
    | 'EQUALS'
    | 'NOT_EQUALS'
    | 'CONTAINS'
    | 'STARTS_WITH'
    | 'ENDS_WITH'
    | 'GREATER_THAN'
    | 'LESS_THAN'
    | 'RANGE'
    | 'NEAR_DAY_OF_MONTH'
    | 'REGEX';
  value: any;
}

export interface RuleActionConfig {
  category: FinancialTransactionCategory;
  subCategory?: string;
  autoApprove: boolean;
  assignToLeaseId?: string;
  taxTreatment?: string;
}

export interface RuleMatch {
  ruleId: string;
  category: FinancialTransactionCategory;
  subCategory?: string;
  autoApprove: boolean;
  assignToLeaseId?: string;
  taxTreatment?: string;
}

export interface SmartSuggestion {
  suggestedRuleName: string;
  ruleType: string;
  conditions: ConditionRule[];
  action: RuleActionConfig;
  historicalMatchCount: number;
  explanation: string;
}

export class RulesEngine {
  /**
   * Evaluates a single condition against a transaction across all 10 fields and operators.
   */
  static evaluateCondition(cond: ConditionRule, tx: any): boolean {
    const { field, operator, value } = cond;

    switch (field) {
      case 'PAYEE_NAME': {
        const valStr = String(value || '').toLowerCase();
        const payeeStr = (tx.payee || '').toLowerCase();
        if (operator === 'EQUALS') return payeeStr === valStr;
        if (operator === 'CONTAINS') return payeeStr.includes(valStr);
        if (operator === 'STARTS_WITH') return payeeStr.startsWith(valStr);
        if (operator === 'ENDS_WITH') return payeeStr.endsWith(valStr);
        if (operator === 'REGEX') {
          try {
            return new RegExp(String(value), 'i').test(payeeStr);
          } catch {
            return false;
          }
        }
        return false;
      }

      case 'DESCRIPTION': {
        const valStr = String(value || '').toLowerCase();
        const descStr = (tx.description || tx.payee || '').toLowerCase();
        if (operator === 'CONTAINS') return descStr.includes(valStr);
        if (operator === 'EQUALS') return descStr === valStr;
        return false;
      }

      case 'MERCHANT_NAME': {
        const valStr = String(value || '').toLowerCase();
        const merchStr = (tx.merchantName || tx.payee || '').toLowerCase();
        if (operator === 'CONTAINS') return merchStr.includes(valStr);
        if (operator === 'EQUALS') return merchStr === valStr;
        return false;
      }

      case 'ACCOUNT_ID': {
        const valStr = String(value || '');
        const accId = String(tx.plaidAccountId || tx.accountId || '');
        return accId === valStr;
      }

      case 'AMOUNT': {
        const numVal = Number(value);
        const txAmt = Math.abs(Number(tx.amount));
        if (operator === 'EQUALS') return Math.abs(txAmt - numVal) <= 0.05;
        if (operator === 'GREATER_THAN') return txAmt > numVal;
        if (operator === 'LESS_THAN') return txAmt < numVal;
        if (operator === 'RANGE') {
          const [min, max] = Array.isArray(value) ? value.map(Number) : [0, 0];
          return txAmt >= min && txAmt <= max;
        }
        return false;
      }

      case 'DATE_RANGE': {
        const [start, end] = Array.isArray(value) ? value.map((v) => new Date(v)) : [new Date(0), new Date()];
        const txDate = new Date(tx.transactionDate || tx.date);
        return txDate >= start && txDate <= end;
      }

      case 'DAY_OF_MONTH': {
        const targetDay = Number(value) || 1;
        const txDay = new Date(tx.transactionDate || tx.date).getDate();
        if (operator === 'EQUALS') return txDay === targetDay;
        const diff = Math.abs(txDay - targetDay);
        return diff <= 2 || diff >= 28; // ±2 days
      }

      case 'TRANSACTION_TYPE': {
        const targetDir = String(value).toUpperCase();
        const txDir = String(tx.direction).toUpperCase();
        return txDir === targetDir;
      }

      case 'PLAID_PERSONAL_FINANCE_CATEGORY': {
        const valStr = String(value || '').toUpperCase();
        const pfc = JSON.stringify(tx.plaidPersonalFinanceCategory || '').toUpperCase();
        return pfc.includes(valStr);
      }

      case 'PLAID_COUNTERPARTY_NAME': {
        const valStr = String(value || '').toLowerCase();
        const counterparty = (tx.plaidCounterpartyName || tx.payee || '').toLowerCase();
        if (operator === 'CONTAINS') return counterparty.includes(valStr);
        if (operator === 'EQUALS') return counterparty === valStr;
        return false;
      }

      default:
        return false;
    }
  }

  /**
   * Evaluates a transaction against active project rules ordered by priority ASC.
   * First matching rule wins.
   */
  static async evaluate(tx: any, projectId: string): Promise<RuleMatch | null> {
    const rules = await prisma.transactionRule.findMany({
      where: { projectId, isActive: true },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });

    for (const rule of rules) {
      const conditions = (rule.conditions as unknown as ConditionRule[]) ?? [];
      const action = (rule.action as unknown as RuleActionConfig) ?? {};

      const matches = conditions.every((cond) => this.evaluateCondition(cond, tx));
      if (matches) {
        return {
          ruleId: rule.id,
          category: action.category ?? (rule.action as any)?.category,
          subCategory: action.subCategory,
          autoApprove: action.autoApprove ?? false,
          assignToLeaseId: action.assignToLeaseId,
          taxTreatment: action.taxTreatment,
        };
      }
    }

    return null;
  }

  /**
   * Generates a pre-populated rule from an approved transaction.
   * autoApprove defaults to false until 3 manual confirmations.
   */
  static async createRuleFromTransaction(transactionId: string, userId: string): Promise<any> {
    const tx = await prisma.financialTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!tx) throw new Error(`Transaction ${transactionId} not found`);

    const amt = Math.abs(Number(tx.amount));
    const isRent = tx.category === 'RENT_INCOME';

    const conditions: ConditionRule[] = [
      { field: 'PAYEE_NAME', operator: 'CONTAINS', value: tx.payee },
      { field: 'AMOUNT', operator: 'RANGE', value: [Math.max(0, amt - 5), amt + 5] },
    ];

    if (isRent) {
      const day = new Date(tx.transactionDate).getDate();
      conditions.push({ field: 'DAY_OF_MONTH', operator: 'NEAR_DAY_OF_MONTH', value: day });
    }

    if (tx.plaidPersonalFinanceCategory) {
      conditions.push({
        field: 'PLAID_PERSONAL_FINANCE_CATEGORY',
        operator: 'CONTAINS',
        value: (tx.plaidPersonalFinanceCategory as any).detailed || 'RENT',
      });
    }

    const action: RuleActionConfig = {
      category: tx.category,
      autoApprove: false, // User must explicitly enable after 3 confirmations
      assignToLeaseId: tx.matchedLeaseId || undefined,
    };

    return prisma.transactionRule.create({
      data: {
        userId,
        projectId: tx.projectId,
        name: `Auto-categorize ${tx.payee}`,
        ruleType: 'PLAID_AUTO_CATEGORIZE',
        priority: 100,
        conditions: conditions as any,
        action: action as any,
      },
    });
  }

  /**
   * Applies a specific rule to all PENDING_REVIEW transactions in the project.
   */
  static async applyRule(ruleId: string): Promise<{ affectedCount: number; autoApprovedCount: number }> {
    const rule = await prisma.transactionRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule || !rule.isActive) {
      throw new Error(`Rule ${ruleId} not found or inactive`);
    }

    const conditions = (rule.conditions as unknown as ConditionRule[]) ?? [];
    const action = (rule.action as unknown as RuleActionConfig) ?? {};

    const pending = await prisma.financialTransaction.findMany({
      where: { projectId: rule.projectId, status: 'PENDING_REVIEW' },
    });

    let affectedCount = 0;
    let autoApprovedCount = 0;

    for (const tx of pending) {
      const matches = conditions.every((cond) => this.evaluateCondition(cond, tx));

      if (matches) {
        affectedCount++;
        const shouldAutoApprove = action.autoApprove ?? false;
        const newStatus: FinancialTransactionStatus = shouldAutoApprove
          ? 'AUTO_APPROVED'
          : 'MANUALLY_APPROVED';

        await prisma.financialTransaction.update({
          where: { id: tx.id },
          data: {
            category: action.category || tx.category,
            status: newStatus,
            recurringRuleId: rule.id,
            matchedLeaseId: action.assignToLeaseId || tx.matchedLeaseId,
            updatedAt: new Date(),
          },
        });

        if (shouldAutoApprove) {
          autoApprovedCount++;
          await KpiAutoReporter.processApprovedTransaction(tx.id);
        }
      }
    }

    await prisma.transactionRule.update({
      where: { id: ruleId },
      data: {
        matchCount: { increment: affectedCount },
        lastMatchedAt: new Date(),
      },
    });

    return { affectedCount, autoApprovedCount };
  }

  /**
   * Analyzes historical transactions in a project to generate smart rule suggestions (3+ pattern occurrences).
   */
  static async getSmartSuggestions(projectId: string): Promise<SmartSuggestion[]> {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const approved = await prisma.financialTransaction.findMany({
      where: {
        projectId,
        status: { in: ['AUTO_APPROVED', 'MANUALLY_APPROVED'] },
        transactionDate: { gte: ninetyDaysAgo },
      },
    });

    const payeeGroups: Record<string, typeof approved> = {};
    for (const t of approved) {
      const key = t.payee.trim().toLowerCase();
      if (!key) continue;
      if (!payeeGroups[key]) payeeGroups[key] = [];
      payeeGroups[key].push(t);
    }

    const suggestions: SmartSuggestion[] = [];

    for (const [, group] of Object.entries(payeeGroups)) {
      if (group.length >= 3) {
        const sample = group[0];
        const amt = Math.abs(Number(sample.amount));
        const isRent = sample.category === 'RENT_INCOME';

        const conds: ConditionRule[] = [
          { field: 'PAYEE_NAME', operator: 'CONTAINS', value: sample.payee },
          { field: 'AMOUNT', operator: 'RANGE', value: [Math.max(0, amt - 10), amt + 10] },
        ];

        suggestions.push({
          suggestedRuleName: `Auto-approve ${sample.payee}`,
          ruleType: isRent ? 'REVENUE_RULE' : 'EXPENSE_RULE',
          conditions: conds,
          action: {
            category: sample.category,
            autoApprove: true,
          },
          historicalMatchCount: group.length,
          explanation: `Appeared ${group.length} times in the last 90 days with consistent amount ~$${amt}. Would have matched ${group.length} transactions last month.`,
        });
      }
    }

    return suggestions;
  }
}
