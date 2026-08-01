import { trackDealActivity, filterTimelineForUser } from '@/lib/invitations/activityTimeline';
import { GET as getProjectTimeline } from '@/app/api/projects/[id]/timeline/route';
import { GET as getInvestorTimeline } from '@/app/api/investor/timeline/route';
import { NextRequest } from 'next/server';

// ─── Setup Mocks ───────────────────────────────────────
var mockVerifyIdToken = jest.fn();
var mockGet = jest.fn();
var mockSet = jest.fn().mockResolvedValue(true);
var mockUpdate = jest.fn().mockResolvedValue(true);
var mockAdd = jest.fn().mockResolvedValue({ id: 'new-activity-id' });

jest.mock('@/lib/firebase-admin/auth-guard', () => ({
  requireAuth: jest.fn().mockImplementation(async (req: NextRequest) => {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'Unauthorized', status: 401 };
    }
    const token = authHeader.substring(7);
    if (token === 'invalid-token') {
      return { error: 'Unauthorized', status: 401 };
    }
    try {
      const decoded = await mockVerifyIdToken(token);
      return { uid: decoded.uid, token: decoded };
    } catch (err) {
      return { error: 'Unauthorized', status: 401 };
    }
  }),
  isAuthError: jest.fn().mockImplementation((val: any) => {
    return val && typeof val === 'object' && 'error' in val;
  }),
}));

jest.mock('@/lib/firebase-admin/project-guard', () => ({
  verifyProjectAccessAndRole: jest.fn().mockImplementation(async (projectId, uid, email) => {
    // Return mock access based on custom project-guard mock behaviors in test
    if (uid === 'leadInvestor-uid') {
      return { project: { id: projectId }, role: 'Lead Investor' };
    }
    if (uid === 'lp-uid') {
      return { project: { id: projectId }, role: 'LP', email: 'lp@example.com' };
    }
    if (uid === 'unauthorized-uid') {
      return null;
    }
    return null;
  }),
}));

// Mock firebase admin DB
var mockTimelineDocs: any[] = [];
var mockProjectDocs: any[] = [];
var mockUserDocs: any[] = [];
var mockInvitationDocs: any[] = [];

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: jest.fn((colName) => {
      const colChain: any = {
        doc: jest.fn((docId) => {
          const docRef = {
            id: docId || 'mock-id',
            path: `${colName}/${docId}`,
            set: (payload: any) => {
              if (colName === 'dealActivityTimeline') {
                mockTimelineDocs.push({ id: docId, ...payload });
              }
              return mockSet(docRef, payload);
            },
            update: (payload: any) => mockUpdate(docRef, payload),
          };

          const docObj: any = {
            id: docId,
            path: `${colName}/${docId}`,
            get: async () => {
              if (colName === 'users') {
                const found = mockUserDocs.find((u) => u.id === docId);
                return { exists: !!found, data: () => found, ref: docRef };
              }
              if (colName === 'projects') {
                const found = mockProjectDocs.find((p) => p.id === docId);
                return { exists: !!found, data: () => found, ref: docRef };
              }
              const res = await mockGet(colName, docId);
              return { exists: !!res, data: () => res, ref: docRef };
            },
            set: (payload: any) => docRef.set(payload),
            update: (payload: any) => docRef.update(payload),
          };
          return docObj;
        }),
        get: async () => {
          let list = [];
          if (colName === 'dealActivityTimeline') {
            list = mockTimelineDocs;
          } else if (colName === 'projects') {
            list = mockProjectDocs;
          } else if (colName === 'users') {
            list = mockUserDocs;
          } else if (colName === 'dealInvitations') {
            list = mockInvitationDocs;
          }
          return {
            docs: list.map((item) => ({
              id: item.id,
              data: () => item,
              ref: { id: item.id, update: mockUpdate },
            })),
          };
        },
        where: jest.fn((field, op, val) => {
          const filterChain: any = {
            get: async () => {
              let filtered = [];
              if (colName === 'dealActivityTimeline') {
                filtered = mockTimelineDocs.filter((item) => item[field] === val);
              } else if (colName === 'projects') {
                filtered = mockProjectDocs.filter((item) => item[field] === val);
              } else if (colName === 'dealInvitations') {
                filtered = mockInvitationDocs.filter((item) => item[field] === val);
              }
              return {
                empty: filtered.length === 0,
                docs: filtered.map((item) => ({
                  id: item.id,
                  data: () => item,
                  ref: { id: item.id, update: mockUpdate },
                })),
              };
            },
            where: jest.fn((field2, op2, val2) => {
              return {
                limit: jest.fn(() => ({
                  get: async () => {
                    let filtered = [];
                    if (colName === 'dealInvitations') {
                      filtered = mockInvitationDocs.filter(
                        (item) => item[field] === val && item[field2] === val2
                      );
                    }
                    return {
                      empty: filtered.length === 0,
                      docs: filtered.map((item) => ({
                        id: item.id,
                        data: () => item,
                        ref: { id: item.id },
                      })),
                    };
                  },
                })),
              };
            }),
            limit: jest.fn((limVal) => {
              return {
                get: async () => {
                  let filtered = [];
                  if (colName === 'dealInvitations') {
                    filtered = mockInvitationDocs.filter((item) => item[field] === val);
                  }
                  const sliced = filtered.slice(0, limVal);
                  return {
                    empty: sliced.length === 0,
                    docs: sliced.map((item) => ({
                      id: item.id,
                      data: () => item,
                      ref: { id: item.id },
                    })),
                  };
                },
              };
            }),
          };
          return filterChain;
        }),
      };
      return colChain;
    }),
  },
}));

describe('DM-32: Deal Activity Timeline tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTimelineDocs = [];
    mockProjectDocs = [];
    mockUserDocs = [];
    mockInvitationDocs = [];
  });

  describe('trackDealActivity Helper', () => {
    it('successfully persists timeline event to Firestore', async () => {
      const actorUid = 'user-123';
      const projectId = 'proj-abc';
      const eventType = 'invite';
      const metadata = { inviteeEmail: 'invited@test.com' };

      const eventId = await trackDealActivity(projectId, projectId, actorUid, eventType, metadata);

      expect(mockSet).toHaveBeenCalled();
      expect(mockTimelineDocs.length).toBe(1);
      expect(mockTimelineDocs[0].projectId).toBe(projectId);
      expect(mockTimelineDocs[0].actorUid).toBe(actorUid);
      expect(mockTimelineDocs[0].type).toBe(eventType);
      expect(mockTimelineDocs[0].metadata.inviteeEmail).toBe('invited@test.com');
    });
  });

  describe('Secure Activity Timeline Gating/Filtering', () => {
    const mockActivities: any[] = [
      {
        id: 'act-1',
        projectId: 'project-1',
        actorUid: 'leadInvestor-uid',
        type: 'invite',
        metadata: { inviteeEmail: 'lp@example.com' },
        createdAt: '2026-07-20T10:00:00Z',
      },
      {
        id: 'act-2',
        projectId: 'project-1',
        actorUid: 'leadInvestor-uid',
        type: 'invite',
        metadata: { inviteeEmail: 'other-lp@example.com' },
        createdAt: '2026-07-20T10:05:00Z',
      },
      {
        id: 'act-3',
        projectId: 'project-1',
        actorUid: 'lp-uid',
        type: 'question',
        metadata: { inviteeEmail: 'lp@example.com', questionText: 'What is the ARV?' },
        createdAt: '2026-07-20T10:10:00Z',
      },
      {
        id: 'act-4',
        projectId: 'project-1',
        actorUid: 'leadInvestor-uid',
        type: 'answer',
        metadata: { inviteeEmail: 'lp@example.com', answerText: '$500k' },
        createdAt: '2026-07-20T10:15:00Z',
      },
      {
        id: 'act-5',
        projectId: 'project-1',
        actorUid: 'other-lp-uid',
        type: 'question',
        metadata: { inviteeEmail: 'other-lp@example.com', questionText: 'Any HOA fee?' },
        createdAt: '2026-07-20T10:20:00Z',
      },
      {
        id: 'act-6',
        projectId: 'project-1',
        actorUid: 'leadInvestor-uid',
        type: 'republish',
        metadata: { reason: 'Updated comps doc' },
        createdAt: '2026-07-20T10:25:00Z',
      },
    ];

    it('returns all activities if viewer is LeadInvestor/Lead Investor', async () => {
      mockUserDocs.push({ id: 'leadInvestor-uid', claimedEmails: [] });
      const result = await filterTimelineForUser(mockActivities, 'leadInvestor-uid', 'leadInvestor@test.com', true);

      expect(result.length).toBe(6);
    });

    it('filters out other invitees private events for LP viewer', async () => {
      mockUserDocs.push({ id: 'lp-uid', claimedEmails: [] });
      // LP should see:
      // - act-1 (invite sent to them)
      // - act-3 (question asked by them)
      // - act-4 (answer to their question)
      // - act-6 (republish: general event)
      // LP should NOT see:
      // - act-2 (invite to other-lp)
      // - act-5 (question asked by other-lp)
      const result = await filterTimelineForUser(mockActivities, 'lp-uid', 'lp@example.com', false);

      expect(result.length).toBe(4);
      expect(result.find((r) => r.id === 'act-2')).toBeUndefined();
      expect(result.find((r) => r.id === 'act-5')).toBeUndefined();
      expect(result.find((r) => r.id === 'act-1')).toBeDefined();
      expect(result.find((r) => r.id === 'act-3')).toBeDefined();
      expect(result.find((r) => r.id === 'act-4')).toBeDefined();
      expect(result.find((r) => r.id === 'act-6')).toBeDefined();
    });

    it('checks claimedEmails history matching to allow LP to view historical timeline', async () => {
      mockUserDocs.push({ id: 'lp-uid', claimedEmails: ['old-lp@example.com'] });
      
      const claimedActivities = [
        ...mockActivities,
        {
          id: 'act-7',
          projectId: 'project-1',
          actorUid: 'leadInvestor-uid',
          type: 'invite',
          metadata: { inviteeEmail: 'old-lp@example.com' },
          createdAt: '2026-07-20T10:30:00Z',
        }
      ];

      const result = await filterTimelineForUser(claimedActivities, 'lp-uid', 'lp@example.com', false);
      expect(result.find((r) => r.id === 'act-7')).toBeDefined();
    });
  });

  describe('GET /api/projects/[id]/timeline', () => {
    beforeEach(() => {
      mockTimelineDocs = [
        {
          id: 'act-1',
          projectId: 'proj-123',
          actorUid: 'leadInvestor-uid',
          type: 'republish',
          metadata: {},
          createdAt: '2026-07-21T12:00:00Z',
        },
        {
          id: 'act-2',
          projectId: 'proj-123',
          actorUid: 'leadInvestor-uid',
          type: 'invite',
          metadata: { inviteeEmail: 'lp@example.com' },
          createdAt: '2026-07-21T12:10:00Z',
        },
      ];
    });

    it('fails if user is unauthorized (403)', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'unauthorized-uid', email: 'intruder@test.com' });

      const request = new NextRequest('http://localhost:3000/api/projects/proj-123/timeline', {
        headers: { authorization: 'Bearer valid-token' },
      });

      const response = await getProjectTimeline(request, { params: Promise.resolve({ id: 'proj-123' }) });
      expect(response.status).toBe(403);
    });

    it('succeeds for Lead Investor and returns unfiltered timeline', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'leadInvestor-uid', email: 'leadInvestor@test.com' });
      mockUserDocs.push({ id: 'leadInvestor-uid', claimedEmails: [] });

      const request = new NextRequest('http://localhost:3000/api/projects/proj-123/timeline', {
        headers: { authorization: 'Bearer valid-token' },
      });

      const response = await getProjectTimeline(request, { params: Promise.resolve({ id: 'proj-123' }) });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.timeline.length).toBe(2);
    });
  });

  describe('GET /api/investor/timeline', () => {
    beforeEach(() => {
      mockProjectDocs = [
        { id: 'proj-owned', ownerUid: 'leadInvestor-uid', propertyName: 'Owned Deal' },
        { id: 'proj-other', ownerUid: 'other-leadInvestor-uid', propertyName: 'Other Deal' },
      ];

      mockTimelineDocs = [
        {
          id: 'act-owned',
          projectId: 'proj-owned',
          actorUid: 'leadInvestor-uid',
          type: 'republish',
          metadata: {},
          createdAt: '2026-07-21T12:00:00Z',
        },
        {
          id: 'act-sent',
          projectId: 'proj-other',
          actorUid: 'leadInvestor-uid', // leadInvestor acted here on another deal
          type: 'question',
          metadata: { inviteeEmail: 'leadInvestor@test.com' },
          createdAt: '2026-07-21T12:10:00Z',
        },
        {
          id: 'act-foreign',
          projectId: 'proj-other',
          actorUid: 'other-leadInvestor-uid',
          type: 'republish',
          metadata: {},
          createdAt: '2026-07-21T12:20:00Z',
        },
      ];
    });

    it('returns cross-deal history where the user is Lead Investor or participant', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'leadInvestor-uid', email: 'leadInvestor@test.com' });
      mockUserDocs.push({ id: 'leadInvestor-uid', claimedEmails: [] });

      const request = new NextRequest('http://localhost:3000/api/investor/timeline', {
        headers: { authorization: 'Bearer valid-token' },
      });

      const response = await getInvestorTimeline(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // Should find: act-owned (since they own the project) and act-sent (since they are the actor).
      // Should NOT find: act-foreign (no connection).
      expect(data.timeline.length).toBe(2);
      expect(data.timeline.find((t: any) => t.id === 'act-owned')).toBeDefined();
      expect(data.timeline.find((t: any) => t.id === 'act-sent')).toBeDefined();
      expect(data.timeline.find((t: any) => t.id === 'act-foreign')).toBeUndefined();
    });
  });
});
