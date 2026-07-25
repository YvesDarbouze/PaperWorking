// Mock the admin auth and admin db
let lastRequestedCollection = '';

const mockDocVal: any = {
  get: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  collection: jest.fn((colName) => {
    lastRequestedCollection = colName;
    return mockCollectionVal;
  }),
};

const mockCollectionVal: any = {
  doc: jest.fn(() => mockDocVal),
  where: jest.fn(() => mockCollectionVal),
  get: jest.fn(() => Promise.resolve({ docs: [] })),
  add: jest.fn(),
};

jest.mock('@/lib/firebase/admin', () => {
  return {
    adminAuth: {
      verifyIdToken: jest.fn(),
    },
    adminDb: {
      collection: jest.fn((colName) => {
        lastRequestedCollection = colName;
        return mockCollectionVal;
      }),
      batch: jest.fn(() => ({
        set: jest.fn(),
        commit: jest.fn(() => Promise.resolve()),
      })),
    },
  };
});

// Mock closeListing
jest.mock('@/actions/listings', () => {
  return {
    closeListing: jest.fn(() => Promise.resolve({ success: true })),
  };
});

// Mock next/headers for cookies()
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({
    get: jest.fn(() => null),
  })),
}));

import { adminAuth } from '@/lib/firebase/admin';
import { advanceProjectPhaseGate } from '@/actions/gate';
import { closeListing } from '@/actions/listings';
import { getScorecardInputsHash } from '@/lib/utils/scorecardHash';

describe('Acquisition Phase Gate Server Actions', () => {
  let mockUserDoc: any;
  let mockProjectDoc: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserDoc = {
      exists: true,
      data: () => ({
        role: 'Lead Investor',
        accountType: 'investor',
        displayName: 'Investor Guy',
        email: 'investor@example.com',
      }),
    };

    mockProjectDoc = {
      exists: true,
      data: () => {
        const p = {
          id: 'project_123',
          address: '123 Main St',
          propertyType: 'Single Family',
          entryPath: 'new_acquisition',
          dispositionType: 'SALE',
          condition: 'turnkey',
          units: 10,
          occupiedUnits: 9,
          activeListingId: 'listing_999',
          financials: {
            purchasePrice: 20000000, // $200k
            dscr: 1.35,
            yoyGrowth: 3.5,
            psaDocumentUrl: 'http://example.com/psa.pdf',
            emdVerified: true,
            emdReceiptUrl: 'http://example.com/emd.pdf',
            grossRent: 2000,
            tax: 150,
            insurance: 80,
            scorecardAcknowledged: true,
            acknowledgedInputsHash: '',
          },
        };
        p.financials.acknowledgedInputsHash = getScorecardInputsHash(p);
        return p;
      },
    };

    mockDocVal.get.mockImplementation(async () => {
      if (lastRequestedCollection === 'projects') {
        return mockProjectDoc;
      }
      return mockUserDoc;
    });
  });

  it('rejects action if token is missing', async () => {
    await expect(
      advanceProjectPhaseGate('', 'project_123', 'Override reason')
    ).rejects.toThrow('Missing authentication token.');
  });

  it('advances project phase to Fund (Phase 2) with override reason, calculates risk score, and bundles dossier', async () => {
    (adminAuth.verifyIdToken as jest.Mock).mockResolvedValue({ uid: 'investor_123' });

    const result = await advanceProjectPhaseGate('token_123', 'project_123', 'Bypassing survey and HOA check for deal speed.');

    expect(result.success).toBe(true);
    expect(result.riskScore).toBeDefined();
    // Risk Score:
    // DSCR 1.35 -> band score 2
    // yoyGrowth 3.5% -> band score 2
    // occupancy 90% -> band score 2
    // compliance -> score 1
    // composite: (2+2+2+1)/4 = 1.75
    expect(result.riskScore).toBe(1.75);

    // Verify closeListing was called on activeListingId
    expect(closeListing).toHaveBeenCalledWith('token_123', 'listing_999', 'auto_phase_advance');

    // Verify project update includes overrideReason and currentPhase = 2
    expect(mockDocVal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPhase: 2,
        phaseStatus: 'Phase 2: Fund',
        riskScore: 1.75,
        overrideReason: 'Bypassing survey and HOA check for deal speed.',
      })
    );
  });

  it('fails the gate and throws blocking criteria error if requirements are not met and no override is provided', async () => {
    (adminAuth.verifyIdToken as jest.Mock).mockResolvedValue({ uid: 'investor_123' });

    // Modify default mockProjectDoc to fail criteria
    mockProjectDoc.data = () => {
      const p = {
        id: 'project_123',
        address: '123 Main St',
        propertyType: 'Single Family',
        entryPath: 'new_acquisition',
        dispositionType: 'SALE',
        condition: 'turnkey',
        contingencies: [{ isSatisfied: false, isWaived: false }], // Failing DD contingencies
        financials: {
          offerStatus: 'Draft', // Failing offer status
          purchasePrice: 200000,
          capitalPlan: 'raise interest',
          equityTarget: 10000000,
          grossRent: 2000,
          tax: 150,
          insurance: 80,
          scorecardAcknowledged: true,
          acknowledgedInputsHash: '',
          emdAmount: 5000,
          emdVerified: true,
          emdReceiptUrl: 'http://example.com/emd.pdf',
          titleDocumentUrl: 'http://example.com/title.pdf',
          titleDocumentName: 'title.pdf',
          psaDocumentUrl: 'http://example.com/psa.pdf',
          psaDocumentName: 'psa.pdf',
        },
      };
      p.financials.acknowledgedInputsHash = getScorecardInputsHash(p);
      return p;
    };

    await expect(
      advanceProjectPhaseGate('token_123', 'project_123')
    ).rejects.toThrow('Blocking criteria not met: Offer accepted at known terms: purchase price and executed contract recorded, All contingencies satisfied/waived with proceed go-decision, Capital plan set: solo confirmed or LOIs logged to equity target');
  });

  it('passes the gate without override reason when all criteria are met from live data', async () => {
    (adminAuth.verifyIdToken as jest.Mock).mockResolvedValue({ uid: 'investor_123' });

    // Modify default mockProjectDoc where all criteria are successfully met
    mockProjectDoc.data = () => {
      const p = {
        id: 'project_123',
        address: '123 Main St',
        propertyType: 'Single Family',
        entryPath: 'new_acquisition',
        dispositionType: 'SALE',
        condition: 'turnkey',
        contingencies: [{ isSatisfied: true, isWaived: false }], // DD satisfied
        financials: {
          offerStatus: 'Accepted',
          purchasePrice: 200000, // Offer accepted at known terms
          psaDocumentUrl: 'http://example.com/psa.pdf',
          psaDocumentName: 'psa.pdf',
          titleDocumentUrl: 'http://example.com/title.pdf',
          titleDocumentName: 'title.pdf',
          emdAmount: 5000,
          emdVerified: true,
          emdReceiptUrl: 'http://example.com/emd.pdf',
          capitalPlan: 'all-cash solo', // Solo modality confirmed
          decision: 'proceed',
          grossRent: 2000,
          tax: 150,
          insurance: 80,
          scorecardAcknowledged: true,
          acknowledgedInputsHash: '',
        },
      };
      p.financials.acknowledgedInputsHash = getScorecardInputsHash(p);
      return p;
    };

    const result = await advanceProjectPhaseGate('token_123', 'project_123');
    expect(result.success).toBe(true);
  });
});
