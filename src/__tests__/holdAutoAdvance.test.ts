import { NextRequest } from 'next/server';

/* ──────────────────────────────────────────────────────────────────────────
   Shared mock vars
   ────────────────────────────────────────────────────────────────────────── */
var mockProjectDocGet = jest.fn();
var mockProjectDocUpdate = jest.fn();
var mockUserDocGet = jest.fn();
var mockCreateNotification = jest.fn();

/* ──────────────────────────────────────────────────────────────────────────
   Firebase Admin mock
   ────────────────────────────────────────────────────────────────────────── */
jest.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: (colName: string) => {
      if (colName === 'users') {
        return {
          doc: (uid: string) => ({
            get: () => mockUserDocGet(uid),
          }),
        };
      }
      // projects
      return {
        doc: (docId?: string) => ({
          get: (...args: any[]) => mockProjectDocGet(...args),
          update: (...args: any[]) => mockProjectDocUpdate(...args),
        }),
      };
    },
  },
}));

jest.mock('@/lib/services/notificationService', () => ({
  NotificationService: {
    createNotification: (...args: any[]) => mockCreateNotification(...args),
  },
}));

/* ──────────────────────────────────────────────────────────────────────────
   Import under test
   ────────────────────────────────────────────────────────────────────────── */
import { POST } from '@/app/api/projects/[id]/hold/auto-advance/route';

describe('POST /api/projects/[id]/hold/auto-advance', () => {
  const PROJECT_ID = 'proj_hold_advance_001';
  const USER_UID = 'user_lead_investor_seed';

  const buildRequest = (body: Record<string, any>, token: string = 'mock-token') =>
    new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/hold/auto-advance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unauthorized requests with no token', async () => {
    const req = buildRequest({
      costBasis: 15000000,
      capitalizedImprovements: 2500000,
      holdingCosts: 120000,
      outcome: 'Rent trigger'
    }, '');

    const res = await POST(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('successfully transitions phase and writes baseline with valid token and access', async () => {
    // Mock user profile (Lead Investigator)
    mockUserDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        personalOrganizationId: 'org_123',
        displayName: 'Marcus Aurelius',
        email: 'marcus@apexcapital.io'
      })
    });

    // Mock project document in hold phase
    mockProjectDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        id: PROJECT_ID,
        organizationId: 'org_123',
        propertyName: '123 Main St',
        currentPhase: 3,
        status: 'hold',
        ownerUid: USER_UID,
        financials: {
          purchasePrice: 15000000,
          costs: []
        }
      })
    });

    mockProjectDocUpdate.mockResolvedValue(undefined);
    mockCreateNotification.mockResolvedValue('notif_001');

    const req = buildRequest({
      costBasis: 15200000,
      capitalizedImprovements: 3500000,
      holdingCosts: 500000,
      outcome: 'Confirmed Rent payment of $2,500.00'
    });

    const res = await POST(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);

    // Verify Firestore project update payload
    expect(mockProjectDocUpdate).toHaveBeenCalledTimes(1);
    const updates = mockProjectDocUpdate.mock.calls[0][0];
    expect(updates.currentPhase).toBe(4);
    expect(updates.status).toBe('exit');
    expect(updates.phaseStatus).toBe('Phase 4: Exit');
    expect(updates.financials.exit_cost_basis).toBe(15200000);
    expect(updates.financials.exit_capitalized_improvements).toBe(3500000);
    expect(updates.financials.exit_holding_cost_total).toBe(500000);
    expect(updates.financials.exit_marketing_outcome).toBe('Confirmed Rent payment of $2,500.00');

    // Verify notification was sent
    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
    const notifParams = mockCreateNotification.mock.calls[0][0];
    expect(notifParams.recipientId).toBe(USER_UID);
    expect(notifParams.type).toBe('PHASE_TRANSITION');
    expect(notifParams.objectReference.projectId).toBe(PROJECT_ID);
    expect(notifParams.objectReference.dealAddress).toBe('123 Main St');
    expect(notifParams.objectReference.phase).toBe('Exit');
  });

  it('rejects access if user is not in org or members list', async () => {
    mockUserDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        personalOrganizationId: 'org_different',
        displayName: 'Marcus Aurelius',
        email: 'marcus@apexcapital.io'
      })
    });

    mockProjectDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        id: PROJECT_ID,
        organizationId: 'org_123',
        propertyName: '123 Main St',
        currentPhase: 3,
        status: 'hold',
        ownerUid: 'another_user',
        members: {}
      })
    });

    const req = buildRequest({
      costBasis: 15200000,
      capitalizedImprovements: 3500000,
      holdingCosts: 500000,
      outcome: 'Confirmed Rent payment of $2,500.00'
    });

    const res = await POST(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe('Access denied');
  });
});
