import { RulesEngine } from '../rulesEngine';
import type { ConditionRule } from '../rulesEngine';

describe('RulesEngine', () => {
  const mockTransaction = {
    id: 'tx_test_100',
    payee: 'ZELLE FROM JANE DOE',
    description: 'Monthly rent for Unit 201',
    amount: 1500,
    direction: 'CREDIT',
    transactionDate: new Date('2026-08-01'),
    merchantName: 'ZELLE',
  };

  describe('evaluateCondition', () => {
    it('evaluates PAYEE_NAME CONTAINS operator', () => {
      const cond: ConditionRule = {
        field: 'PAYEE_NAME',
        operator: 'CONTAINS',
        value: 'JANE DOE',
      };
      expect(RulesEngine.evaluateCondition(cond, mockTransaction)).toBe(true);
    });

    it('evaluates AMOUNT RANGE operator', () => {
      const cond: ConditionRule = {
        field: 'AMOUNT',
        operator: 'RANGE',
        value: [1400, 1600],
      };
      expect(RulesEngine.evaluateCondition(cond, mockTransaction)).toBe(true);
    });

    it('evaluates DAY_OF_MONTH NEAR operator', () => {
      const cond: ConditionRule = {
        field: 'DAY_OF_MONTH',
        operator: 'NEAR_DAY_OF_MONTH',
        value: 1,
      };
      expect(RulesEngine.evaluateCondition(cond, mockTransaction)).toBe(true);
    });

    it('evaluates TRANSACTION_TYPE operator', () => {
      const cond: ConditionRule = {
        field: 'TRANSACTION_TYPE',
        operator: 'EQUALS',
        value: 'CREDIT',
      };
      expect(RulesEngine.evaluateCondition(cond, mockTransaction)).toBe(true);
    });
  });
});
