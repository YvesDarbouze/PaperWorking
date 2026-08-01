import { TransactionIdentificationEngine } from '../transactionIdentificationEngine';
import { FinancialTransactionCategory } from '@prisma/client';

describe('TransactionIdentificationEngine', () => {
  describe('Step 1: Plaid AI Category Mapping', () => {
    it('maps INCOME / RENT to REVENUE and RENT_INCOME', async () => {
      const res = await TransactionIdentificationEngine.identify({
        name: 'Tenant Rent Deposit',
        amount: -1500, // Credit
        direction: 'CREDIT',
        personalFinanceCategory: { primary: 'INCOME', detailed: 'RENT' },
      });

      expect(res.primaryClassification).toBe('REVENUE');
      expect(res.paperWorkingCategory).toBe(FinancialTransactionCategory.RENT_INCOME);
      expect(res.confidenceScore).toBeGreaterThanOrEqual(0.9);
    });

    it('maps GENERAL_SERVICES / REPAIR to EXPENSE and MAINTENANCE_REPAIR', async () => {
      const res = await TransactionIdentificationEngine.identify({
        name: 'Plumbing Service Call',
        amount: 350,
        direction: 'DEBIT',
        personalFinanceCategory: { primary: 'GENERAL_SERVICES', detailed: 'REPAIR' },
      });

      expect(res.primaryClassification).toBe('EXPENSE');
      expect(res.paperWorkingCategory).toBe(FinancialTransactionCategory.MAINTENANCE_REPAIR);
      expect(res.confidenceScore).toBeGreaterThanOrEqual(0.8);
    });

    it('maps TAX / PROPERTY_TAX to EXPENSE and PROPERTY_TAX', async () => {
      const res = await TransactionIdentificationEngine.identify({
        name: 'County Tax Collector',
        amount: 2100,
        direction: 'DEBIT',
        personalFinanceCategory: { primary: 'TAX', detailed: 'PROPERTY_TAX' },
      });

      expect(res.primaryClassification).toBe('EXPENSE');
      expect(res.paperWorkingCategory).toBe(FinancialTransactionCategory.PROPERTY_TAX);
    });
  });

  describe('Step 2: Revenue Identification & Lease Matching', () => {
    const mockLease = {
      id: 'lease_123',
      tenantName: 'John Doe',
      monthlyRent: 1800,
      rentDueDay: 1,
    };

    it('matches exact rent amount within ±$1.00 with high confidence', async () => {
      const res = await TransactionIdentificationEngine.identify(
        {
          name: 'Zelle transfer from John Doe',
          amount: -1800,
          direction: 'CREDIT',
        },
        'proj_1',
        { leases: [mockLease] }
      );

      expect(res.primaryClassification).toBe('REVENUE');
      expect(res.paperWorkingCategory).toBe(FinancialTransactionCategory.RENT_INCOME);
      expect(res.suggestedLeaseId).toBe('lease_123');
      expect(res.confidenceScore).toBeGreaterThanOrEqual(0.92);
    });

    it('identifies partial rent payment (50%-99%)', async () => {
      const res = await TransactionIdentificationEngine.identify(
        {
          name: 'Transfer from John Doe',
          amount: -1000,
          direction: 'CREDIT',
        },
        'proj_1',
        { leases: [mockLease] }
      );

      expect(res.primaryClassification).toBe('REVENUE');
      expect(res.paperWorkingCategory).toBe(FinancialTransactionCategory.RENT_INCOME);
      expect(res.suggestedLeaseId).toBe('lease_123');
      expect(res.confidenceScore).toBeGreaterThanOrEqual(0.78);
    });

    it('suggests multi-line split for rent overpayment > 130%', async () => {
      const res = await TransactionIdentificationEngine.identify(
        {
          name: 'Transfer from John Doe',
          amount: -2400, // $1800 rent + $600 overpayment
          direction: 'CREDIT',
        },
        'proj_1',
        { leases: [mockLease] }
      );

      expect(res.primaryClassification).toBe('REVENUE');
      expect(res.isSplitSuggested).toBe(true);
      expect(res.splitSuggestion).toHaveLength(2);
      expect(res.splitSuggestion?.[0].amount).toBe(1800);
      expect(res.splitSuggestion?.[0].category).toBe(FinancialTransactionCategory.RENT_INCOME);
      expect(res.splitSuggestion?.[1].amount).toBe(600);
      expect(res.splitSuggestion?.[1].category).toBe(FinancialTransactionCategory.LATE_FEE_INCOME);
    });

    it('identifies Section 8 / HUD deposits with 0.96 confidence', async () => {
      const res = await TransactionIdentificationEngine.identify({
        name: 'CITY HOUSING AUTHORITY PHA HUD ACH',
        amount: -1250,
        direction: 'CREDIT',
      });

      expect(res.primaryClassification).toBe('REVENUE');
      expect(res.paperWorkingCategory).toBe(FinancialTransactionCategory.RENT_INCOME);
      expect(res.confidenceScore).toBe(0.96);
    });

    it('identifies Property Management Software deposits (AppFolio/Buildium)', async () => {
      const res = await TransactionIdentificationEngine.identify({
        name: 'APPFOLIO RENT PAYMENTS LLC',
        amount: -3200,
        direction: 'CREDIT',
      });

      expect(res.primaryClassification).toBe('REVENUE');
      expect(res.paperWorkingCategory).toBe(FinancialTransactionCategory.RENT_INCOME);
      expect(res.confidenceScore).toBe(0.9);
    });
  });

  describe('Step 3: Expense Identification & CapEx Threshold', () => {
    it('classifies renovation expenditure >= $2,500 as CAPITAL_EXPENDITURE', async () => {
      const res = await TransactionIdentificationEngine.identify({
        name: 'ABC Roofing & HVAC Repair',
        amount: 4500,
        direction: 'DEBIT',
        personalFinanceCategory: { primary: 'HOME_IMPROVEMENT', detailed: 'REPAIR' },
      });

      expect(res.primaryClassification).toBe('EXPENSE');
      expect(res.paperWorkingCategory).toBe(FinancialTransactionCategory.CAPITAL_EXPENDITURE);
      expect(res.confidenceScore).toBeGreaterThanOrEqual(0.9);
    });

    it('classifies repair expenditure < $2,500 as MAINTENANCE_REPAIR', async () => {
      const res = await TransactionIdentificationEngine.identify({
        name: 'HVAC Filter & Small Repair',
        amount: 450,
        direction: 'DEBIT',
        personalFinanceCategory: { primary: 'HOME_IMPROVEMENT', detailed: 'REPAIR' },
      });

      expect(res.primaryClassification).toBe('EXPENSE');
      expect(res.paperWorkingCategory).toBe(FinancialTransactionCategory.MAINTENANCE_REPAIR);
    });

    it('enriches insurance counterparties (State Farm)', async () => {
      const res = await TransactionIdentificationEngine.identify({
        name: 'STATE FARM INSURANCE ACH',
        amount: 180,
        direction: 'DEBIT',
      });

      expect(res.primaryClassification).toBe('EXPENSE');
      expect(res.paperWorkingCategory).toBe(FinancialTransactionCategory.PROPERTY_INSURANCE);
      expect(res.confidenceScore).toBeGreaterThanOrEqual(0.9);
    });

    it('enriches utility counterparties (Duke Energy)', async () => {
      const res = await TransactionIdentificationEngine.identify({
        name: 'DUKE ENERGY ELECTRIC BILL',
        amount: 145,
        direction: 'DEBIT',
      });

      expect(res.primaryClassification).toBe('EXPENSE');
      expect(res.paperWorkingCategory).toBe(FinancialTransactionCategory.UTILITIES);
    });
  });

  describe('Step 4: Liability Payment & Mortgage Split', () => {
    it('identifies mortgage payment and suggests 3-way PITI split', async () => {
      const res = await TransactionIdentificationEngine.identify({
        name: 'WELLS FARGO HOME MORTGAGE PITI',
        amount: 2100,
        direction: 'DEBIT',
      });

      expect(res.primaryClassification).toBe('LIABILITY_PAYMENT');
      expect(res.isSplitSuggested).toBe(true);
      expect(res.splitSuggestion).toHaveLength(3);
      expect(res.splitSuggestion?.[0].category).toBe(FinancialTransactionCategory.MORTGAGE_INTEREST);
      expect(res.splitSuggestion?.[1].category).toBe(FinancialTransactionCategory.MORTGAGE_PRINCIPAL);
      expect(res.splitSuggestion?.[2].category).toBe(FinancialTransactionCategory.MORTGAGE_ESCROW_PAYMENT);
    });
  });

  describe('Step 5: Transfer Identification (Non-P&L)', () => {
    it('classifies owner draws as OWNER_DISTRIBUTION', async () => {
      const res = await TransactionIdentificationEngine.identify({
        name: 'OWNER DRAW DISTRIBUTION TO PERSONAL ACCT',
        amount: 3000,
        direction: 'DEBIT',
      });

      expect(res.primaryClassification).toBe('TRANSFER');
      expect(res.paperWorkingCategory).toBe(FinancialTransactionCategory.OWNER_DISTRIBUTION);
    });

    it('classifies security deposit received as SECURITY_DEPOSIT_RECEIVED', async () => {
      const res = await TransactionIdentificationEngine.identify({
        name: 'TENANT SECURITY DEPOSIT UNIT 101',
        amount: -1500,
        direction: 'CREDIT',
      });

      expect(res.primaryClassification).toBe('TRANSFER');
      expect(res.paperWorkingCategory).toBe(FinancialTransactionCategory.SECURITY_DEPOSIT_RECEIVED);
    });
  });

  describe('Step 7: Recurring Detection', () => {
    it('detects recurring status for rent and mortgage transactions', async () => {
      const res = await TransactionIdentificationEngine.identify({
        name: 'STATE FARM INSURANCE',
        amount: 120,
        direction: 'DEBIT',
      });

      expect(res.isRecurring).toBe(true);
    });
  });
});
