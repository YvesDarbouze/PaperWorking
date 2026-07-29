import {
  mapCategoryToScheduleELine,
  calculateAssetDepreciation,
  evaluateVendor1099Requirement,
  generateOneClickCPAPackage,
  exportCPAPackagePDF,
  IRS_1099_THRESHOLD,
  SCHEDULE_E_LINE_NAMES,
  type ScheduleELineKey,
} from '@/lib/reports/cpaPackageEngine';

describe('RP-3 Annual CPA Package Engine — Unit & Boundary Tests', () => {
  describe('1. Schedule E Category Mapping Invariant', () => {
    it('maps every expense category to exactly one valid IRS Schedule E line key (unmapped categories impossible)', () => {
      const testCategories = [
        'Gross Rent Income',
        'Google Ads & Marketing',
        'Auto Travel & Mileage',
        'Janitorial & Cleaning',
        'Broker Commissions',
        'Hazard Insurance',
        'Legal & CPA Fees',
        'Property Management Fees',
        'Bank Mortgage Interest',
        'Roof Repair & Maintenance',
        'Property Taxes',
        'Utilities Electric & Gas',
        'Building Depreciation',
        'Miscellaneous HOA Fee',
        'Random Unknown Expense 123', // should map to line19_other
        '', // empty string should map to line19_other
      ];

      const validKeys = Object.keys(SCHEDULE_E_LINE_NAMES) as ScheduleELineKey[];

      for (const cat of testCategories) {
        const lineKey = mapCategoryToScheduleELine(cat);

        // Assert mapped key is a valid IRS Schedule E line
        expect(validKeys).toContain(lineKey);
        expect(lineKey).toBeDefined();
        expect(typeof lineKey).toBe('string');
      }

      // Explicit boundary checks
      expect(mapCategoryToScheduleELine('Random Unknown')).toBe('line19_other');
      expect(mapCategoryToScheduleELine('')).toBe('line19_other');
      expect(mapCategoryToScheduleELine('Roof Repair')).toBe('line14_repairs');
      expect(mapCategoryToScheduleELine('Mortgage Interest')).toBe('line12_mortgage_interest');
    });
  });

  describe('2. Depreciation & Asset Schedule Boundary Math', () => {
    it('calculates full-year residential 27.5-yr MACRS depreciation for existing property', () => {
      const res = calculateAssetDepreciation(300000, 60000, '2023-01-01', 2025, 8727);
      expect(res.buildingCostBasis).toBe(240000); // 300k - 60k land
      // Annual straight-line = 240,000 / 27.5 = 8727.27
      expect(res.currentYearDepreciation).toBe(8727.27);
      expect(res.endingAccumulatedDepreciation).toBe(8727 + 8727.27);
    });

    it('calculates mid-month convention for property placed in service mid-year (July 1, 2025)', () => {
      // July 1 (Month index 6): active months = 12 - 6 - 0.5 = 5.5 months
      const res = calculateAssetDepreciation(275000, 55000, '2025-07-01', 2025, 0);
      expect(res.buildingCostBasis).toBe(220000);
      // Annual = 220,000 / 27.5 = 8,000 / year = 666.67 / month
      // First year mid-month (5.5 months) = 666.666 * 5.5 = 3666.67
      expect(res.currentYearDepreciation).toBe(3666.67);
    });

    it('handles LAND-ONLY boundary case (land value >= total basis -> zero building basis & zero depreciation)', () => {
      const res = calculateAssetDepreciation(150000, 150000, '2025-01-01', 2025, 0);
      expect(res.buildingCostBasis).toBe(0);
      expect(res.currentYearDepreciation).toBe(0);
      expect(res.remainingBasis).toBe(0);
    });
  });

  describe('3. Form 1099 Boundary Threshold Logic ($600 IRS Threshold)', () => {
    it('evaluates vendor 1099 requirement AT the exact $600 boundary', () => {
      expect(IRS_1099_THRESHOLD).toBe(600);

      // Boundary: Exactly $600 -> REQUIRED
      expect(evaluateVendor1099Requirement(600)).toBe(true);

      // Boundary: $599.99 -> EXCLUDED
      expect(evaluateVendor1099Requirement(599.99)).toBe(false);

      // Boundary: $599 -> EXCLUDED
      expect(evaluateVendor1099Requirement(599)).toBe(false);

      // Above threshold: $1500 -> REQUIRED
      expect(evaluateVendor1099Requirement(1500)).toBe(true);
    });
  });

  describe('4. One-Click CPA Package Generation & Bundle Export', () => {
    it('assembles all 5 artifacts + cover sheet in CPAPackageBundleData and exports PDF', () => {
      const sampleProjects = [
        {
          id: 'p1',
          name: 'Evergreen Terrace',
          propertyName: 'Evergreen Terrace',
          acquisitionDate: '2024-01-01',
          financials: { purchasePrice: 300000, monthlyGrossRent: 2500 },
          documents: [{ id: 'd1', type: 'HUD-1 Settlement Statement', name: 'HUD1_Evergreen.pdf', date: '2024-01-01', url: '/files/d1' }],
          vendors: [{ id: 'v1', name: 'Apex Plumbing', totalPaid: 1200, ein: '12-3456789' }],
          mileageLogs: [{ id: 'm1', date: '2025-02-10', purpose: 'Inspection', miles: 45 }],
          timeLogs: [{ id: 't1', date: '2025-01-15', activity: 'Lease Drafting', hours: 14 }],
        },
        {
          id: 'p2',
          name: 'Beachfront Villa',
          propertyName: 'Beachfront Villa',
          acquisitionDate: '2024-06-15',
          financials: { purchasePrice: 500000, monthlyGrossRent: 4000 },
        },
      ];

      const bundle = generateOneClickCPAPackage(sampleProjects, 'PaperWorking Test Account', 2025);

      expect(bundle.accountName).toBe('PaperWorking Test Account');
      expect(bundle.taxYear).toBe(2025);
      expect(bundle.propertyRosterCount).toBe(2);

      // Artifact 1: Schedule E
      expect(bundle.scheduleE).toBeDefined();
      expect(bundle.scheduleE.netIncome).toBeDefined();

      // Artifact 2: Depreciation Schedule
      expect(bundle.depreciation).toBeDefined();
      expect(bundle.depreciation.assets.length).toBe(2);

      // Artifact 3: Closing Docs Index
      expect(bundle.closingDocs).toBeDefined();
      expect(bundle.closingDocs.documents.length).toBe(1);

      // Artifact 4: Form 1099 Summary
      expect(bundle.form1099).toBeDefined();
      expect(bundle.form1099.vendors.length).toBe(1);
      expect(bundle.form1099.thresholdAmount).toBe(600);

      // Artifact 5: Log Books
      expect(bundle.logBooks).toBeDefined();
      expect(bundle.logBooks.mileageLogs.length).toBe(1);
      expect(bundle.logBooks.timeLogs.length).toBe(1);
      expect(bundle.logBooks.repsThresholdHours).toBe(750);

      // Export PDF bundle
      const pdfFilename = exportCPAPackagePDF(bundle);
      expect(pdfFilename).toContain('CPA_Package_2025');
    });
  });
});
