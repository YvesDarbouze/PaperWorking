import { openTitleOrderAction } from '@/actions/titleWorkflow';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

// ── Shared Mocks ──────────────────────────────────────────────────────────
const mockVerifyIdToken = jest.fn();
const mockGet = jest.fn();
const mockUpdate = jest.fn();

const mockCollection = {
  doc: jest.fn().mockImplementation(() => ({
    get: mockGet,
    update: mockUpdate,
  })),
};

jest.mock('@/lib/firebase/admin', () => ({
  __esModule: true,
  adminAuth: {
    verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
  },
  adminDb: {
    collection: (_name: string) => mockCollection,
  },
}));

jest.mock('@/lib/providers/title', () => ({
  getTitleProvider: () => ({
    openOrder: jest.fn().mockResolvedValue({ status: 'order_opened' }),
  }),
}));

describe('FD-28: Title/Escrow Vendor Counterpart Visibility & Access Control', () => {
  const PROJECT_ID = 'proj_title_28';
  const INVESTOR_UID = 'investor_123';
  const VENDOR_UID = 'title_vendor_456';
  const STRANGER_UID = 'stranger_789';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows access to the project owner', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: INVESTOR_UID });
    
    // First get: User profile
    mockGet.mockImplementationOnce(() => Promise.resolve({
      exists: true,
      data: () => ({
        uid: INVESTOR_UID,
        organizationId: 'org_123',
      }),
    }));

    // Second get: Project document
    mockGet.mockImplementationOnce(() => Promise.resolve({
      exists: true,
      data: () => ({
        ownerUid: INVESTOR_UID,
        organizationId: 'org_123',
        financials: {},
      }),
    }));

    const result = await openTitleOrderAction('valid-token', PROJECT_ID);
    expect(result.status).toBe('order_opened');
  });

  it('allows access to the assigned Title/Escrow vendor (counterpart visibility)', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: VENDOR_UID });
    
    // First get: User profile (vendor)
    mockGet.mockImplementationOnce(() => Promise.resolve({
      exists: true,
      data: () => ({
        uid: VENDOR_UID,
        role: 'vendor',
      }),
    }));

    // Second get: Project document
    mockGet.mockImplementationOnce(() => Promise.resolve({
      exists: true,
      data: () => ({
        ownerUid: INVESTOR_UID,
        organizationId: 'org_123',
        financials: {
          f4TitleEscrowVendor: {
            marketplaceVendorId: VENDOR_UID, // Assigned vendor UID
            source: 'marketplace',
          },
        },
      }),
    }));

    const result = await openTitleOrderAction('valid-token', PROJECT_ID);
    expect(result.status).toBe('order_opened');
  });

  it('denies access to an unassigned stranger user', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: STRANGER_UID });
    
    // First get: User profile (stranger)
    mockGet.mockImplementationOnce(() => Promise.resolve({
      exists: true,
      data: () => ({
        uid: STRANGER_UID,
      }),
    }));

    // Second get: Project document
    mockGet.mockImplementationOnce(() => Promise.resolve({
      exists: true,
      data: () => ({
        ownerUid: INVESTOR_UID,
        organizationId: 'org_123',
        financials: {
          f4TitleEscrowVendor: {
            marketplaceVendorId: VENDOR_UID, // Different vendor UID
            source: 'marketplace',
          },
        },
      }),
    }));

    await expect(openTitleOrderAction('valid-token', PROJECT_ID)).rejects.toThrow(
      'You do not have access to this project.'
    );
  });
});
