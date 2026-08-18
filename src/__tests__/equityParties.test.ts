/** @jest-environment node */
import { usePhaseAccess } from '../hooks/usePhaseAccess';
import { GET, POST } from '../app/api/projects/[id]/equity-parties/route';
import { NextRequest } from 'next/server';

// ─── Mock Hooks / Stores ───────────────────────────────────────────
const mockUseParams = jest.fn();
const mockUseAuth = jest.fn();
const mockUseProjectStore = jest.fn();
const mockUsePermissions = jest.fn();

jest.mock('next/navigation', () => ({
  useParams: () => mockUseParams(),
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/store/projectStore', () => ({
  useProjectStore: (selector: any) => mockUseProjectStore(selector),
}));

jest.mock('../hooks/usePermissions', () => ({
  usePermissions: () => mockUsePermissions(),
}));

// ─── Setup Server-Side Mocks ──────────────────────────────────────
const mockVerifyIdToken = jest.fn();
jest.mock('@/lib/firebase-admin/auth-guard', () => ({
  requireAuth: jest.fn().mockImplementation(() => mockVerifyIdToken()),
  isAuthError: (auth: any) => auth && auth.status && auth.status !== 200,
}));

const mockProjectGet = jest.fn();
const mockProjectUpdate = jest.fn();
const mockUserGet = jest.fn();

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: jest.fn().mockImplementation((colName) => {
      if (colName === 'projects') {
        return {
          doc: jest.fn().mockImplementation((id) => ({
            get: () => mockProjectGet(id),
            update: (...args: any[]) => mockProjectUpdate(...args),
          })),
        };
      }
      if (colName === 'users') {
        return {
          doc: jest.fn().mockImplementation((id) => ({
            get: () => mockUserGet(id),
          })),
        };
      }
      return {};
    }),
  },
}));

describe('Equity Parties & Roster Management with Phase Access Gating', () => {
  const PROJECT_ID = 'project_equity_test';
  const OWNER_UID = 'user_owner';
  const LEAD_UID = 'user_lead_investor';
  const LP_UID = 'user_lp';
  const OUTSIDE_UID = 'user_outside';

  const mockProject = {
    id: PROJECT_ID,
    organizationId: 'org_test',
    ownerUid: OWNER_UID,
    completedFundCards: [],
    financials: {
      purchasePrice: 200000_00,
      capitalStack: [
        { id: 'source_1', category: 'Borrower Injection', amount: 50000_00 },
      ],
    },
    members: {
      [OWNER_UID]: { role: 'Lead Investor' },
    },
    equityParties: [
      {
        id: 'party_lp',
        projectId: PROJECT_ID,
        role: 'LP',
        name: 'LP Investor',
        email: 'lp@paperworking.io',
        entityType: 'Individual',
        memberId: LP_UID,
        ownershipPct: 15,
        phasePermissions: {
          'phase-1': { canView: true, canEdit: false },
          'phase-2': { canView: true, canEdit: false },
          'phase-3': { canView: false, canEdit: false },
          'phase-4': { canView: false, canEdit: false },
        },
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default Client-side mock states
    mockUseParams.mockReturnValue({ id: PROJECT_ID });
    mockUseAuth.mockReturnValue({ user: { uid: LP_UID, email: 'lp@paperworking.io' } });
    mockUseProjectStore.mockImplementation((selector) => {
      return mockProject;
    });
    mockUsePermissions.mockReturnValue({ isLead: false });

    // Default API mock states
    mockVerifyIdToken.mockResolvedValue({
      uid: OWNER_UID,
      email: 'lead@paperworking.io',
      name: 'Lead Investor',
    });

    mockUserGet.mockResolvedValue({
      exists: true,
      data: () => ({
        personalOrganizationId: 'org_test',
        name: 'Lead Investor',
      }),
    });

    mockProjectGet.mockResolvedValue({
      exists: true,
      data: () => mockProject,
    });
  });

  // ─── SECTION 1: usePhaseAccess client hook checks ─────────────────
  describe('Client Hook usePhaseAccess', () => {
    it('returns loading state when project, user, or params are missing', () => {
      mockUseParams.mockReturnValue(null);
      const res = usePhaseAccess('phase-2');
      expect(res.loading).toBe(true);
    });

    it('grants full view/edit access to project owner / lead investor', () => {
      mockUseAuth.mockReturnValue({ user: { uid: OWNER_UID, email: 'owner@paperworking.io' } });
      const res = usePhaseAccess('phase-2');
      expect(res.canView).toBe(true);
      expect(res.canEdit).toBe(true);
      expect(res.loading).toBe(false);
    });

    it('grants full view/edit access when user is verified lead investor role', () => {
      mockUseAuth.mockReturnValue({ user: { uid: 'some_admin', email: 'admin@paperworking.io' } });
      mockUsePermissions.mockReturnValue({ isLead: true });
      const res = usePhaseAccess('phase-3');
      expect(res.canView).toBe(true);
      expect(res.canEdit).toBe(true);
      expect(res.loading).toBe(false);
    });

    it('restricts or allows based on phasePermissions for linked equity party', () => {
      // User is LP_UID who has view-only for phase-2, but no view for phase-3
      mockUseAuth.mockReturnValue({ user: { uid: LP_UID, email: 'lp@paperworking.io' } });
      
      const rPhase2 = usePhaseAccess('phase-2');
      expect(rPhase2.canView).toBe(true);
      expect(rPhase2.canEdit).toBe(false);

      const rPhase3 = usePhaseAccess('phase-3');
      expect(rPhase3.canView).toBe(false);
      expect(rPhase3.canEdit).toBe(false);
    });

    it('denies access entirely for unlinked non-owner users', () => {
      mockUseAuth.mockReturnValue({ user: { uid: OUTSIDE_UID, email: 'stranger@paperworking.io' } });
      const res = usePhaseAccess('phase-2');
      expect(res.canView).toBe(false);
      expect(res.canEdit).toBe(false);
    });
  });

  // ─── SECTION 2: API GET Endpoint & GP Defaulting ──────────────────
  describe('GET API Endpoint', () => {
    const buildGetRequest = () =>
      new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/equity-parties`, {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

    it('should reject unauthenticated requests', async () => {
      mockVerifyIdToken.mockResolvedValue({ status: 401, error: 'Unauthorized' });
      const res = await GET(buildGetRequest(), { params: Promise.resolve({ id: PROJECT_ID }) });
      expect(res.status).toBe(401);
    });

    it('should default syndication Lead Investor to GP and sync to project', async () => {
      mockProjectGet.mockResolvedValue({
        exists: true,
        data: () => ({
          ...mockProject,
          fundingPlan: { modality: ['syndication_equity'] },
          equityParties: [], // empty roster initially
        }),
      });

      // Lead user is GET caller
      mockVerifyIdToken.mockResolvedValue({
        uid: OWNER_UID,
        email: 'owner@paperworking.io',
        name: 'Project Owner',
      });
      mockUserGet.mockResolvedValue({
        exists: true,
        data: () => ({
          personalOrganizationId: 'org_test',
          displayName: 'Project Owner',
        }),
      });

      const res = await GET(buildGetRequest(), { params: Promise.resolve({ id: PROJECT_ID }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.equityParties.length).toBe(1);
      expect(json.equityParties[0].role).toBe('GP');
      expect(json.equityParties[0].memberId).toBe(OWNER_UID);

      // Verify DB update was triggered
      expect(mockProjectUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          equityParties: expect.arrayContaining([
            expect.objectContaining({ role: 'GP', memberId: OWNER_UID }),
          ]),
        })
      );
    });
  });

  // ─── SECTION 3: API POST Endpoint & Roster Management ──────────────
  describe('POST API Endpoint', () => {
    const buildPostRequest = (body: Record<string, any>) =>
      new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/equity-parties`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(body),
      });

    it('should add/update an equity party member and trigger F2.1 completion', async () => {
      const partyData = {
        role: 'LP',
        name: 'New LP Partner',
        email: 'newlp@paperworking.io',
        entityType: 'LLC',
        ownershipPct: 20,
      };

      const res = await POST(
        buildPostRequest({ action: 'save', party: partyData }),
        { params: Promise.resolve({ id: PROJECT_ID }) }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.completedFundCards).toContain('F2.1');
      expect(mockProjectUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          completedFundCards: expect.arrayContaining(['F2.1']),
          equityParties: expect.arrayContaining([
            expect.objectContaining({
              name: 'New LP Partner',
              entityType: 'LLC',
            }),
          ]),
        })
      );
    });

    it('should synchronize GP Co-investment into project capital stack', async () => {
      const gpParty = {
        id: 'party_gp_123',
        role: 'GP',
        name: 'Syndicate GP',
        email: 'gp@paperworking.io',
        entityType: 'LLC',
      };

      const res = await POST(
        buildPostRequest({ action: 'save', party: gpParty, gpCoInvestAmount: 15000_00 }),
        { params: Promise.resolve({ id: PROJECT_ID }) }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      // Verify db update synced GP Co-investment to financials
      expect(mockProjectUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          financials: expect.objectContaining({
            capitalStack: expect.arrayContaining([
              expect.objectContaining({
                category: 'GP Co-investment',
                amount: 15000_00,
                status: 'Funded',
              }),
            ]),
          }),
        })
      );
    });

    it('should delete an equity party and remove its corresponding GP co-investment', async () => {
      // Seed with existing GP party and capital stack source
      mockProjectGet.mockResolvedValue({
        exists: true,
        data: () => ({
          ...mockProject,
          equityParties: [{ id: 'party_gp_del', role: 'GP', name: 'GP To Delete' }],
          financials: {
            capitalStack: [{ id: 'source_gp_1', category: 'GP Co-investment', amount: 10000_00 }],
          },
        }),
      });

      const res = await POST(
        buildPostRequest({ action: 'delete', partyId: 'party_gp_del' }),
        { params: Promise.resolve({ id: PROJECT_ID }) }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      // Verify GP Co-investment was removed from the capital stack
      expect(mockProjectUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          financials: expect.objectContaining({
            capitalStack: [],
          }),
        })
      );
    });
  });
});
