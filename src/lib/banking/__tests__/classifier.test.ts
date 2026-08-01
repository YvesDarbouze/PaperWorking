import { classifyTransaction } from '../classifier';

describe('classifyTransaction — 4-Bucket Taxonomy', () => {
  // ─── TRANSFER ──────────────────────────────────────────────────────────────
  describe('TRANSFER bucket', () => {
    it('classifies security deposit as TRANSFER', () => {
      const result = classifyTransaction('SECURITY DEPOSIT - TENANT LLC');
      expect(result.bucket).toBe('TRANSFER');
      expect(result.reiCategory).toBe('security_deposit');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('classifies owner draw as TRANSFER', () => {
      const result = classifyTransaction('OWNER DRAW - CHECK #5001');
      expect(result.bucket).toBe('TRANSFER');
      expect(result.reiCategory).toBe('owner_draw');
    });

    it('classifies capex reserve as TRANSFER', () => {
      const result = classifyTransaction('CAPEX RESERVE TRANSFER');
      expect(result.bucket).toBe('TRANSFER');
      expect(result.reiCategory).toBe('capex_reserve');
    });

    it('classifies ACH bank transfer as TRANSFER', () => {
      const result = classifyTransaction('ACH TRANSFER TO SAVINGS');
      expect(result.bucket).toBe('TRANSFER');
      expect(result.reiCategory).toBe('bank_transfer');
    });
  });

  // ─── LIABILITY ─────────────────────────────────────────────────────────────
  describe('LIABILITY bucket', () => {
    it('classifies mortgage payment as LIABILITY', () => {
      const result = classifyTransaction('MORTGAGE PAYMENT - WELLS FARGO');
      expect(result.bucket).toBe('LIABILITY');
      expect(result.reiCategory).toBe('debt_service');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('classifies loan payment as LIABILITY', () => {
      const result = classifyTransaction('LOAN PAYMENT - CHASE HOME LENDING');
      expect(result.bucket).toBe('LIABILITY');
      expect(result.reiCategory).toBe('debt_service');
    });

    it('classifies escrow payment as LIABILITY', () => {
      const result = classifyTransaction('ESCROW PAYMENT - TITLE CO');
      expect(result.bucket).toBe('LIABILITY');
      expect(result.reiCategory).toBe('escrow');
    });
  });

  // ─── REVENUE ───────────────────────────────────────────────────────────────
  describe('REVENUE bucket', () => {
    it('classifies rental income as REVENUE', () => {
      const result = classifyTransaction('RENT PAYMENT - UNIT 3A');
      expect(result.bucket).toBe('REVENUE');
      expect(result.reiCategory).toBe('rental_income');
    });

    it('classifies late fee as REVENUE', () => {
      const result = classifyTransaction('LATE FEE - TENANT JONES');
      expect(result.bucket).toBe('REVENUE');
      expect(result.reiCategory).toBe('late_fees');
    });

    it('classifies pet rent as REVENUE', () => {
      const result = classifyTransaction('PET RENT - UNIT 2B');
      expect(result.bucket).toBe('REVENUE');
      expect(result.reiCategory).toBe('pet_rent');
    });

    it('classifies parking fee as REVENUE', () => {
      const result = classifyTransaction('PARKING FEE - LOT 5');
      expect(result.bucket).toBe('REVENUE');
      expect(result.reiCategory).toBe('parking');
    });

    it('classifies application fee as REVENUE', () => {
      const result = classifyTransaction('APPLICATION FEE - NEW TENANT');
      expect(result.bucket).toBe('REVENUE');
      expect(result.reiCategory).toBe('application_fees');
    });

    it('classifies laundry income as REVENUE', () => {
      const result = classifyTransaction('COIN LAUNDRY INCOME');
      expect(result.bucket).toBe('REVENUE');
      expect(result.reiCategory).toBe('laundry_vending');
    });

    it('does NOT classify security deposit as rental_income (TRANSFER wins)', () => {
      const result = classifyTransaction('SECURITY DEPOSIT - RENT');
      expect(result.bucket).toBe('TRANSFER');
      expect(result.reiCategory).toBe('security_deposit');
    });
  });

  // ─── EXPENSE ───────────────────────────────────────────────────────────────
  describe('EXPENSE bucket', () => {
    it('classifies HOA fee as EXPENSE', () => {
      const result = classifyTransaction('HOA FEE - OAKWOOD ASSOCIATION');
      expect(result.bucket).toBe('EXPENSE');
      expect(result.reiCategory).toBe('hoa_fees');
    });

    it('classifies insurance as EXPENSE', () => {
      const result = classifyTransaction('STATE FARM INSURANCE PAYMENT');
      expect(result.bucket).toBe('EXPENSE');
      expect(result.reiCategory).toBe('insurance');
    });

    it('classifies property tax as EXPENSE', () => {
      const result = classifyTransaction('PROPERTY TAX - COUNTY ASSESSOR');
      expect(result.bucket).toBe('EXPENSE');
      expect(result.reiCategory).toBe('property_tax');
    });

    it('classifies plumbing repair as EXPENSE', () => {
      const result = classifyTransaction('REPAIR - ABC PLUMBING LLC');
      expect(result.bucket).toBe('EXPENSE');
      expect(result.reiCategory).toBe('maintenance');
    });

    it('classifies utility bill as EXPENSE', () => {
      const result = classifyTransaction('ELECTRIC BILL - CON EDISON');
      expect(result.bucket).toBe('EXPENSE');
      expect(result.reiCategory).toBe('utilities');
    });

    it('classifies property management fee as EXPENSE', () => {
      const result = classifyTransaction('PROPERTY MANAGEMENT FEE - MGR CO');
      expect(result.bucket).toBe('EXPENSE');
      expect(result.reiCategory).toBe('property_management');
    });

    it('classifies legal/professional fee as EXPENSE', () => {
      const result = classifyTransaction('LEGAL FEE - SMITH & PARTNERS LLP');
      expect(result.bucket).toBe('EXPENSE');
      expect(result.reiCategory).toBe('legal_professional');
    });

    it('classifies CPA fee as EXPENSE legal_professional', () => {
      const result = classifyTransaction('CPA QUARTERLY ACCOUNTING FEE');
      expect(result.bucket).toBe('EXPENSE');
      expect(result.reiCategory).toBe('legal_professional');
    });

    it('classifies staging as EXPENSE', () => {
      const result = classifyTransaction('STAGING FURNITURE RENTAL CO');
      expect(result.bucket).toBe('EXPENSE');
      expect(result.reiCategory).toBe('rehab_staging');
    });
  });

  // ─── Edge cases ────────────────────────────────────────────────────────────
  describe('Edge cases', () => {
    it('returns unknown/EXPENSE for unrecognized transactions', () => {
      const result = classifyTransaction('CHECK #9876');
      expect(result.reiCategory).toBe('unknown');
      expect(result.bucket).toBe('EXPENSE');
      expect(result.confidence).toBe(0.0);
    });

    it('handles empty string gracefully', () => {
      const result = classifyTransaction('');
      expect(result.reiCategory).toBe('unknown');
      expect(result.bucket).toBe('EXPENSE');
      expect(result.confidence).toBe(0.0);
    });
  });
});
