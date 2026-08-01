import { TransactionRuleEngine } from '../transactionRuleEngine';
import type { ConditionItem, TransactionInput } from '../transactionRuleEngine';

describe('TransactionRuleEngine', () => {
  const mockTransactions: TransactionInput[] = [
    {
      id: 'tx_1',
      payee: 'ZELLE FROM JOHN SMITH',
      amount: -1200, // Credit (money in)
      direction: 'CREDIT',
      date: new Date('2026-08-01'),
    },
    {
      id: 'tx_2',
      payee: 'DUKE ENERGY UTILITY',
      amount: 145,
      direction: 'DEBIT',
      date: new Date('2026-08-05'),
    },
    {
      id: 'tx_3',
      payee: 'WELLS FARGO MORTGAGE',
      amount: 2100,
      direction: 'DEBIT',
      date: new Date('2026-08-01'),
    },
    {
      id: 'tx_4',
      payee: 'TENANT SECURITY DEPOSIT',
      amount: -1500,
      direction: 'CREDIT',
      date: new Date('2026-08-01'),
    },
  ];

  describe('Rule Type 1: REVENUE_RULE Condition Evaluation', () => {
    it('matches CREDIT transactions by payee name and amount', () => {
      const conditions: ConditionItem[] = [
        { field: 'PAYEE_NAME', operator: 'CONTAINS', value: 'JOHN SMITH' },
        { field: 'AMOUNT', operator: 'EQUALS', value: 1200 },
      ];

      const res = TransactionRuleEngine.testRule(conditions, mockTransactions);
      expect(res.matchCount).toBe(1);
      expect(res.matchedTransactionIds).toContain('tx_1');
    });
  });

  describe('Rule Type 2: EXPENSE_RULE Condition Evaluation', () => {
    it('matches DEBIT transactions by payee name', () => {
      const conditions: ConditionItem[] = [
        { field: 'PAYEE_NAME', operator: 'CONTAINS', value: 'DUKE ENERGY' },
      ];

      const res = TransactionRuleEngine.testRule(conditions, mockTransactions);
      expect(res.matchCount).toBe(1);
      expect(res.matchedTransactionIds).toContain('tx_2');
    });
  });

  describe('Rule Type 3: LIABILITY_RULE Condition Evaluation', () => {
    it('matches mortgage loan payment transactions', () => {
      const conditions: ConditionItem[] = [
        { field: 'PAYEE_NAME', operator: 'CONTAINS', value: 'WELLS FARGO MORTGAGE' },
        { field: 'AMOUNT', operator: 'GREATER_THAN', value: 1000 },
      ];

      const res = TransactionRuleEngine.testRule(conditions, mockTransactions);
      expect(res.matchCount).toBe(1);
      expect(res.matchedTransactionIds).toContain('tx_3');
    });
  });

  describe('Rule Type 4: TRANSFER_RULE Condition Evaluation', () => {
    it('matches security deposit transfer transactions', () => {
      const conditions: ConditionItem[] = [
        { field: 'PAYEE_NAME', operator: 'CONTAINS', value: 'SECURITY DEPOSIT' },
      ];

      const res = TransactionRuleEngine.testRule(conditions, mockTransactions);
      expect(res.matchCount).toBe(1);
      expect(res.matchedTransactionIds).toContain('tx_4');
    });
  });

  describe('Rule Type 5: Condition Operators', () => {
    it('evaluates AMOUNT_RANGE BETWEEN operator', () => {
      const condition: ConditionItem = {
        field: 'AMOUNT_RANGE',
        operator: 'BETWEEN',
        value: [100, 200],
      };

      const isMatch = TransactionRuleEngine.evaluateCondition(condition, mockTransactions[1]);
      expect(isMatch).toBe(true);
    });

    it('evaluates NEAR_DAY_OF_MONTH operator', () => {
      const condition: ConditionItem = {
        field: 'DAY_OF_MONTH',
        operator: 'NEAR_DAY_OF_MONTH',
        value: 1,
      };

      const isMatch = TransactionRuleEngine.evaluateCondition(condition, mockTransactions[0]);
      expect(isMatch).toBe(true);
    });
  });
});
