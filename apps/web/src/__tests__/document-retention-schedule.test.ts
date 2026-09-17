import { validateTaxComplianceDeletion } from '../../lib/storage/storage-adapter';

describe('Document Retention & Removal of Self-Imposed Locks (Review C5.1)', () => {
  const fixedNow = new Date('2026-09-14T12:00:00.000Z');

  it('1. Allows immediate deletion of private contracts (PSAs, bids, inspection reports) without 3-year lock', () => {
    const recentDate = new Date('2026-09-10T12:00:00.000Z').toISOString();

    // Purchase and Sale Agreements (PSAs) are private contracts, not statutory tax documents
    const psaCheck = validateTaxComplianceDeletion('Purchase Agreement', recentDate, fixedNow);
    expect(psaCheck.canDelete).toBe(true);
    expect(psaCheck.isTaxLocked).toBe(false);

    const psaShortCheck = validateTaxComplianceDeletion('PSA Signed', recentDate, fixedNow);
    expect(psaShortCheck.canDelete).toBe(true);
    expect(psaShortCheck.isTaxLocked).toBe(false);

    // Other non-tax project documents
    const contractorBid = validateTaxComplianceDeletion('Contractor Bid', recentDate, fixedNow);
    expect(contractorBid.canDelete).toBe(true);
    expect(contractorBid.isTaxLocked).toBe(false);

    const inspectionReport = validateTaxComplianceDeletion('Inspection Report', recentDate, fixedNow);
    expect(inspectionReport.canDelete).toBe(true);
    expect(inspectionReport.isTaxLocked).toBe(false);
  });

  it('2. Enforces statutory 3-year retention lock on official closing settlement & tax basis records citing 26 U.S.C. § 6001', () => {
    // 1 year old Closing Disclosure
    const oneYearAgo = new Date('2025-09-14T12:00:00.000Z').toISOString();

    const closingCheck = validateTaxComplianceDeletion('Closing Disclosure', oneYearAgo, fixedNow);
    expect(closingCheck.canDelete).toBe(false);
    expect(closingCheck.isTaxLocked).toBe(true);
    expect(closingCheck.reason).toContain('IRS compliance lock (26 U.S.C. § 6001)');
    expect(closingCheck.reason).toContain('remaining in statutory retention window');

    const altaCheck = validateTaxComplianceDeletion('ALTA Settlement Statement', oneYearAgo, fixedNow);
    expect(altaCheck.canDelete).toBe(false);
    expect(altaCheck.isTaxLocked).toBe(true);
    expect(altaCheck.reason).toContain('26 U.S.C. § 6001');

    const hudCheck = validateTaxComplianceDeletion('HUD-1 Settlement', oneYearAgo, fixedNow);
    expect(hudCheck.canDelete).toBe(false);
    expect(hudCheck.isTaxLocked).toBe(true);
    expect(hudCheck.reason).toContain('26 U.S.C. § 6001');

    const taxFormCheck = validateTaxComplianceDeletion('Tax Form 1099-S', oneYearAgo, fixedNow);
    expect(taxFormCheck.canDelete).toBe(false);
    expect(taxFormCheck.isTaxLocked).toBe(true);
    expect(taxFormCheck.reason).toContain('26 U.S.C. § 6001');
  });

  it('3. Permits deletion of tax basis documents once the statutory 3-year retention window has elapsed', () => {
    // 3 years and 10 days ago
    const expiredTaxDate = new Date('2023-09-01T12:00:00.000Z').toISOString();

    const check = validateTaxComplianceDeletion('ALTA Closing Disclosure', expiredTaxDate, fixedNow);
    expect(check.canDelete).toBe(true);
    expect(check.isTaxLocked).toBe(false);
  });
});
