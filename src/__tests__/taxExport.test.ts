import { computeScheduleE, getPropertyTypeCode } from '@/lib/tax/scheduleE';
import { computeProjectProfitAndLoss } from '@/lib/tax/profitAndLoss';
import { POST as sharePOST } from '@/app/api/tax/share/route';
import { POST as revokePOST } from '@/app/api/tax/share/revoke/route';
import { Project, LedgerItem } from '@/types/schema';
import { NextRequest } from 'next/server';

// ── Mock Firebase Admin SDK ───────────────────────────────────────
var mockVerifyIdToken = jest.fn();
var mockGet = jest.fn();
var mockSet = jest.fn();
var mockUpdate = jest.fn();

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
  },
  adminDb: {
    collection: jest.fn().mockImplementation(() => ({
      doc: jest.fn().mockImplementation((docId) => ({
        get: (...args: any[]) => mockGet(...args),
        set: (...args: any[]) => mockSet(docId, ...args),
        update: (...args: any[]) => mockUpdate(docId, ...args),
      })),
      where: jest.fn().mockImplementation(() => ({
        orderBy: jest.fn().mockImplementation(() => ({
          get: (...args: any[]) => mockGet(...args),
        })),
      })),
    })),
  },
}));

describe('Tax Export Pipeline & Previews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock project data
  const mockProject: Project = {
    id: 'proj_123',
    propertyName: 'Sunnyvale duplex',
    address: '123 Main St, Sunnyvale, CA',
    assetClass: 'Residential',
    dispositionType: 'RENT',
    subStrategy: 'LONG_TERM',
    status: 'acquisition',
    organizationId: 'org_abc',
    members: {},
    createdAt: new Date(2024, 0, 1),
    updatedAt: new Date(2024, 0, 1),
    ownerUid: 'owner_123',
    financials: {
      acquisitionDate: new Date(2024, 0, 1),
      purchasePrice: 500000,
      fixedAcquisitionCosts: 10000,
      actualRentalIncome: 3500,
      holdingCostTaxes: 400,
      holdingCostInsurance: 150,
      holdingCostUtilities: 100,
      propertyManagementFeePercent: 10,
      loanAmount: 400000,
      loanInterestRate: 6.0,
      loanTermYears: 30,
      estimatedARV: 550000,
      costs: [],
    },
  };

  // Mock ledger items (Approved only)
  const mockLedgerItems: LedgerItem[] = [
    {
      id: 'led_1',
      projectId: 'proj_123',
      organizationId: 'org_abc',
      amount: 1200,
      category: 'Plumbing',
      description: 'Fixed broken water main in kitchen',
      status: 'Approved',
      type: 'expense',
      submittedByUid: 'owner_123',
      createdAt: new Date(2024, 2, 15),
    },
    {
      id: 'led_2',
      projectId: 'proj_123',
      organizationId: 'org_abc',
      amount: 450,
      category: 'Other',
      description: 'Lawn cleanup & gardening services',
      status: 'Approved',
      type: 'expense',
      submittedByUid: 'owner_123',
      createdAt: new Date(2024, 5, 20),
    },
    {
      id: 'led_3',
      projectId: 'proj_123',
      organizationId: 'org_abc',
      amount: 2500,
      category: 'General',
      description: 'Legal retainer for zoning disputes',
      status: 'Approved',
      type: 'expense',
      submittedByUid: 'owner_123',
      createdAt: new Date(2024, 7, 1),
    },
    {
      id: 'led_4',
      projectId: 'proj_123',
      organizationId: 'org_abc',
      amount: 500,
      category: 'Electrical',
      description: 'Draft repair (Rejected)',
      status: 'Pending',
      type: 'expense',
      submittedByUid: 'owner_123',
      createdAt: new Date(2024, 8, 1),
    },
  ];

  describe('Schedule E Previews (computeScheduleE)', () => {
    it('properly maps asset classes to property type codes', () => {
      expect(getPropertyTypeCode({ ...mockProject, assetClass: 'Multi-Family' })).toBe(2);
      expect(getPropertyTypeCode({ ...mockProject, assetClass: 'Commercial' })).toBe(4);
      expect(getPropertyTypeCode({ ...mockProject, assetClass: 'Land' })).toBe(5);
      expect(getPropertyTypeCode({ ...mockProject, dispositionType: 'RENT', subStrategy: 'LONG_TERM' })).toBe(1);
      expect(getPropertyTypeCode(mockProject)).toBe(1);
    });

    it('calculates straight-line depreciation at 27.5-years on 80% improvement value', () => {
      // purchasePrice (500k) + fixedAcquisitionCosts (10k) = 510,000 basis
      // Depreciable basis = 510,000 * 0.8 = 408,000
      // Annual depreciation = 408,000 / 27.5 = 14,836.36
      // For 12 active months in leap-year 2024, depreciation scale yields 14,866.83
      const schedE = computeScheduleE(mockProject, [], 2024);
      expect(schedE.depreciation).toBeCloseTo(14866.83, 1);
    });

    it('maps approved ledger items to corresponding Schedule E fields via categories/keywords', () => {
      const schedE = computeScheduleE(mockProject, mockLedgerItems, 2024);

      // led_1 is plumbing -> repairs. Flat maintenance is reserves ($0 here). So repairs should equal 1200
      expect(schedE.repairs).toBe(1200);

      // led_2 is "lawn cleanup" -> maps to cleaning
      expect(schedE.cleaning).toBe(450);

      // led_3 is "legal retainer" -> maps to legal/professional
      expect(schedE.legalProfessional).toBe(2500);

      // led_4 is Pending status -> should be ignored
      expect(mockLedgerItems.find(i => i.id === 'led_4')?.status).toBe('Pending');
    });

    it('handles holding periods that do not overlap with the tax year by returning zeroed preview', () => {
      const schedE = computeScheduleE(mockProject, mockLedgerItems, 2023);
      expect(schedE.activeMonths).toBe(0);
      expect(schedE.grossRents).toBe(0);
      expect(schedE.totalExpenses).toBe(0);
    });
  });

  describe('Project Profit and Loss Statements (computeProjectProfitAndLoss)', () => {
    it('properly distinguishes operating vs capital expenses', () => {
      const pl = computeProjectProfitAndLoss(mockProject, mockLedgerItems, 2024);

      // Total operating expenses should exclude capitalized/financing items (interest, depreciation, principal)
      // Revenues: Rental (3500 * 12.02... = 42,086.13)
      // Flat expenses: Taxes, Insurance, Utilities, Management scaled by 12.02...
      // Ledger items mapping to operating expenses: plumbing repair (1200), cleaning (450), legal professional (2500)
      // Total operating expenses = 4809.84 + 1803.69 + 1202.46 + 4208.61 + 1200 + 450 + 2500 = 16,174.64
      expect(pl.totalOperatingExpenses).toBe(16174.64);

      // Net Operating Income (NOI) = Gross Revenue (42086.13) - Total Opex (16174.64) = 25,911.6
      expect(pl.netOperatingIncome).toBe(25911.6);
    });

    it('accurately computes net taxable income and net cash flow', () => {
      const pl = computeProjectProfitAndLoss(mockProject, mockLedgerItems, 2024);

      // Net Taxable Income = NOI - Mortgage Interest - Depreciation
      // Net Cash Flow = NOI - Mortgage Interest - Mortgage Principal - Capitalized Improvements
      expect(pl.netTaxableIncome).toBeCloseTo(pl.netOperatingIncome - pl.mortgageInterest - pl.depreciation, 1);
      expect(pl.netCashFlow).toBeCloseTo(pl.netOperatingIncome - pl.mortgageInterest - pl.mortgagePrincipal - pl.capitalizedImprovements, 1);
    });
  });

  describe('CPA Link Sharing Route Handlers', () => {
    describe('POST /api/tax/share', () => {
      it('creates and returns a signed 30-day token link', async () => {
        mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user_123' });
        mockGet.mockResolvedValueOnce({
          exists: true,
          data: () => ({ personalOrganizationId: 'org_abc' }),
        });

        const req = new NextRequest('http://localhost/api/tax/share', {
          method: 'POST',
          headers: { Authorization: 'Bearer token_123' },
          body: JSON.stringify({
            taxYear: 2024,
            projectIds: ['proj_123'],
          }),
        });

        const res = await sharePOST(req);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.token).toBeDefined();
        expect(data.shareUrl).toBe(`/share/${data.token}`);

        // Verify set doc call parameters
        expect(mockSet).toHaveBeenCalledTimes(1);
        const savedDocId = mockSet.mock.calls[0][0];
        const savedData = mockSet.mock.calls[0][1];
        expect(savedDocId).toBe(data.token);
        expect(savedData.taxYear).toBe(2024);
        expect(savedData.projectIds).toEqual(['proj_123']);
        expect(savedData.revoked).toBe(false);
        
        // Expiry should be roughly 30 days out
        const expiry = new Date(savedData.expiresAt).getTime();
        const expectedExpiry = Date.now() + 30 * 24 * 60 * 60 * 1000;
        expect(Math.abs(expiry - expectedExpiry)).toBeLessThan(10000); // within 10 seconds
      });
    });

    describe('POST /api/tax/share/revoke', () => {
      it('flags an active share link as revoked', async () => {
        mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user_123' });
        
        mockGet.mockResolvedValueOnce({
          exists: true,
          data: () => ({ userId: 'user_123' }),
        });

        const req = new NextRequest('http://localhost/api/tax/share/revoke', {
          method: 'POST',
          headers: { Authorization: 'Bearer token_123' },
          body: JSON.stringify({
            token: 'share_token_123',
          }),
        });

        const res = await revokePOST(req);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.success).toBe(true);

        expect(mockUpdate).toHaveBeenCalledTimes(1);
        expect(mockUpdate.mock.calls[0][0]).toBe('share_token_123');
        expect(mockUpdate.mock.calls[0][1].revoked).toBe(true);
        expect(mockUpdate.mock.calls[0][1].revokedAt).toBeInstanceOf(Date);
      });
    });
  });
});
