import {
  FinancialTransactionCategory,
  FinancialTransactionDirection,
  FinancialTransactionSource,
  FinancialTransactionStatus,
  Prisma,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sseEventBus } from '@/lib/events/eventBus';

export type CustomRuleType =
  | 'REVENUE_RULE'
  | 'EXPENSE_RULE'
  | 'LIABILITY_RULE'
  | 'TRANSFER_RULE'
  | 'RECURRING_MANUAL_RULE';

export interface ConditionItem {
  field:
    | 'PAYEE_NAME'
    | 'AMOUNT'
    | 'AMOUNT_RANGE'
    | 'DESCRIPTION'
    | 'DAY_OF_MONTH'
    | 'PLAID_PERSONAL_FINANCE_CATEGORY';
  operator:
    | 'EQUALS'
    | 'NOT_EQUALS'
    | 'CONTAINS'
    | 'STARTS_WITH'
    | 'ENDS_WITH'
    | 'GREATER_THAN'
    | 'LESS_THAN'
    | 'BETWEEN'
    | 'NEAR_DAY_OF_MONTH';
  value: any;
}

export interface RuleActionData {
  category: FinancialTransactionCategory;
  autoApprove: boolean;
  assignToLeaseId?: string;
  taxTreatment?: string;
  splits?: Array<{ amount: number; category: FinancialTransactionCategory; reason: string }>;
}

export interface RuleInput {
  name: string;
  projectId: string;
  userId: string;
  ruleType: CustomRuleType;
  conditions: ConditionItem[];
  action: RuleActionData;
  isActive?: boolean;
  priority?: number;
}

export interface TransactionInput {
  id?: string;
  payee: string;
  description?: string | null;
  amount: number; // in dollars
  direction: FinancialTransactionDirection;
  date: Date;
  plaidPfc?: string | null;
}

export interface SuggestedRule {
  suggestedRuleName: string;
  ruleType: CustomRuleType;
  conditions: ConditionItem[];
  action: RuleActionData;
  historicalMatchCount: number;
}

export class TransactionRuleEngine {
  /**
   * Evaluates a single condition against a transaction input.
   */
  static evaluateCondition(condition: ConditionItem, tx: TransactionInput): boolean {
    const { field, operator, value } = condition;

    switch (field) {
      case 'PAYEE_NAME': {
        const valStr = String(value || '').toLowerCase();
        const payeeStr = (tx.payee || '').toLowerCase();
        if (operator === 'EQUALS') return payeeStr === valStr;
        if (operator === 'NOT_EQUALS') return payeeStr !== valStr;
        if (operator === 'CONTAINS') return payeeStr.includes(valStr);
        if (operator === 'STARTS_WITH') return payeeStr.startsWith(valStr);
        if (operator === 'ENDS_WITH') return payeeStr.endsWith(valStr);
        return false;
      }

      case 'DESCRIPTION': {
        const valStr = String(value || '').toLowerCase();
        const descStr = (tx.description || tx.payee || '').toLowerCase();
        if (operator === 'CONTAINS') return descStr.includes(valStr);
        if (operator === 'EQUALS') return descStr === valStr;
        return false;
      }

      case 'AMOUNT': {
        const numVal = Number(value);
        const txAmt = Math.abs(tx.amount);
        if (operator === 'EQUALS') return Math.abs(txAmt - numVal) <= 0.05;
        if (operator === 'GREATER_THAN') return txAmt > numVal;
        if (operator === 'LESS_THAN') return txAmt < numVal;
        return false;
      }

      case 'AMOUNT_RANGE': {
        const [min, max] = Array.isArray(value) ? value.map(Number) : [0, 0];
        const txAmt = Math.abs(tx.amount);
        return txAmt >= min && txAmt <= max;
      }

      case 'DAY_OF_MONTH': {
        const targetDay = Number(value) || 1;
        const txDay = new Date(tx.date).getDate();
        const diff = Math.abs(txDay - targetDay);
        return diff <= 2 || diff >= 28; // ±2 days or month wrap
      }

      case 'PLAID_PERSONAL_FINANCE_CATEGORY': {
        const valStr = String(value || '').toUpperCase();
        const txPfc = (tx.plaidPfc || '').toUpperCase();
        return txPfc.includes(valStr);
      }

      default:
        return false;
    }
  }

  /**
   * Tests a rule set against an in-memory array of transactions (Dry Run).
   */
  static testRule(
    conditions: ConditionItem[],
    transactions: TransactionInput[]
  ): { matchCount: number; matchedTransactionIds: string[] } {
    const matched = transactions.filter((tx) =>
      conditions.every((cond) => this.evaluateCondition(cond, tx))
    );

    return {
      matchCount: matched.length,
      matchedTransactionIds: matched.map((m) => m.id || '').filter(Boolean),
    };
  }

  /**
   * Applies a specific database rule to all matching PENDING_REVIEW transactions for a project.
   */
  static async applyRule(ruleId: string): Promise<{ matchedCount: number; approvedCount: number }> {
    const dbRule = await prisma.transactionRule.findUnique({
      where: { id: ruleId },
    });

    if (!dbRule || !dbRule.isActive) {
      throw new Error(`Rule ${ruleId} not found or inactive`);
    }

    const conditions = (dbRule.conditions as unknown as ConditionItem[]) ?? [];
    const action = (dbRule.action as unknown as RuleActionData) ?? {};

    // Load PENDING_REVIEW transactions for this project
    const pending = await prisma.financialTransaction.findMany({
      where: {
        projectId: dbRule.projectId,
        status: 'PENDING_REVIEW',
      },
    });

    let matchedCount = 0;
    let approvedCount = 0;

    for (const ft of pending) {
      const txInput: TransactionInput = {
        id: ft.id,
        payee: ft.payee,
        description: ft.description,
        amount: Number(ft.amount),
        direction: ft.direction,
        date: ft.transactionDate,
      };

      const matches = conditions.every((cond) => this.evaluateCondition(cond, txInput));

      if (matches) {
        matchedCount++;
        const shouldAutoApprove = action.autoApprove ?? true;

        await prisma.financialTransaction.update({
          where: { id: ft.id },
          data: {
            category: action.category ?? ft.category,
            status: shouldAutoApprove ? 'AUTO_APPROVED' : 'MANUALLY_APPROVED',
            confidenceScore: 1.0,
            recurringRuleId: dbRule.id,
            matchedLeaseId: action.assignToLeaseId ?? ft.matchedLeaseId,
            updatedAt: new Date(),
          },
        });

        if (shouldAutoApprove) approvedCount++;
      }
    }

    // Update rule metadata
    await prisma.transactionRule.update({
      where: { id: ruleId },
      data: {
        matchCount: { increment: matchedCount },
        lastMatchedAt: new Date(),
      },
    });

    if (matchedCount > 0) {
      sseEventBus.emit(`transactions:approved:${dbRule.projectId}`, {
        count: approvedCount,
        timestamp: new Date().toISOString(),
      });
      sseEventBus.emit(`kpi:updated:${dbRule.projectId}`, {
        timestamp: new Date().toISOString(),
      });
    }

    return { matchedCount, approvedCount };
  }

  /**
   * Analyzes historical transactions in a project to generate smart rule suggestions.
   */
  static async generateSuggestions(projectId: string): Promise<SuggestedRule[]> {
    const transactions = await prisma.financialTransaction.findMany({
      where: { projectId },
      orderBy: { transactionDate: 'desc' },
      take: 100,
    });

    // Group transactions by payee name
    const payeeGroups: Record<string, typeof transactions> = {};
    for (const t of transactions) {
      const key = t.payee.trim().toLowerCase();
      if (!key) continue;
      if (!payeeGroups[key]) payeeGroups[key] = [];
      payeeGroups[key].push(t);
    }

    const suggestions: SuggestedRule[] = [];

    for (const [, group] of Object.entries(payeeGroups)) {
      if (group.length >= 2) {
        const sample = group[0];
        const isCredit = sample.direction === 'CREDIT';
        const ruleType: CustomRuleType = isCredit ? 'REVENUE_RULE' : 'EXPENSE_RULE';
        const sampleAmt = Number(sample.amount);

        const conds: ConditionItem[] = [
          { field: 'PAYEE_NAME', operator: 'CONTAINS', value: sample.payee },
          { field: 'AMOUNT_RANGE', operator: 'BETWEEN', value: [Math.max(0, sampleAmt - 10), sampleAmt + 10] },
        ];

        suggestions.push({
          suggestedRuleName: `Auto-approve ${sample.payee}`,
          ruleType,
          conditions: conds,
          action: {
            category: sample.category,
            autoApprove: true,
          },
          historicalMatchCount: group.length,
        });
      }
    }

    return suggestions;
  }

  /**
   * Daily scheduler for RECURRING_MANUAL_RULE entries (runs daily at 6 AM).
   */
  static async runRecurringRuleScheduler(): Promise<number> {
    console.info('[TransactionRuleEngine] Running 6 AM recurring rule scheduler...');

    const recurringRules = await prisma.transactionRule.findMany({
      where: {
        isActive: true,
      },
    });

    let generatedCount = 0;
    for (const rule of recurringRules) {
      const action = (rule.action as unknown as RuleActionData) ?? {};
      const shouldGenerate = (action as any).generateTransaction ?? false;

      if (shouldGenerate) {
        generatedCount++;
        const category = action.category ?? FinancialTransactionCategory.UNCATEGORIZED;
        const autoApprove = action.autoApprove ?? false;
        const amount = (action as any).generateAmount ?? 1000;
        const payee = (action as any).generatePayee ?? rule.name;
        const isCredit = category === 'RENT_INCOME' || category.includes('INCOME');

        const ftStatus: FinancialTransactionStatus = autoApprove ? 'AUTO_APPROVED' : 'DRAFT';

        await prisma.financialTransaction.create({
          data: {
            projectId: rule.projectId,
            userId: rule.userId,
            source: FinancialTransactionSource.RULE_GENERATED,
            recurringRuleId: rule.id,
            amount: new Prisma.Decimal(amount),
            direction: isCredit ? 'CREDIT' : 'DEBIT',
            transactionDate: new Date(),
            payee,
            description: `Scheduled manual entry from rule: ${rule.name}`,
            category,
            status: ftStatus,
            confidenceScore: 1.0,
          },
        });

        await prisma.transactionRule.update({
          where: { id: rule.id },
          data: {
            matchCount: { increment: 1 },
            lastMatchedAt: new Date(),
          },
        });

        if (autoApprove) {
          sseEventBus.emit(`transactions:approved:${rule.projectId}`, {
            count: 1,
            timestamp: new Date().toISOString(),
          });
          sseEventBus.emit(`kpi:updated:${rule.projectId}`, {
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    console.info(`[TransactionRuleEngine] Scheduler completed. Generated ${generatedCount} recurring transactions.`);
    return generatedCount;
  }
}
