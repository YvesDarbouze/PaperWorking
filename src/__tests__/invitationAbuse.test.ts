import { POST as reportSpam } from '@/app/api/identity/report-spam/route';
import { POST as appealSuspension } from '@/app/api/identity/appeal/route';
import { POST as sendgridWebhook } from '@/app/api/webhooks/sendgrid/route';
import { inviteSubscribers } from '@/actions/dealInvitations';
import { NextRequest } from 'next/server';

// Mocks
var mockVerifyIdToken = jest.fn();
var mockGet = jest.fn();
var mockSet = jest.fn().mockResolvedValue(true);
var mockUpdate = jest.fn().mockResolvedValue(true);
var mockDelete = jest.fn().mockResolvedValue(true);
var mockAdd = jest.fn().mockResolvedValue({ id: 'new-alert-id' });
var mockEmailLogFindMany = jest.fn();
var mockEmailLogUpdateMany = jest.fn().mockResolvedValue({ count: 1 });

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

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: jest.fn().mockImplementation(async (token: string) => {
      return mockVerifyIdToken(token);
    }),
  },
  adminDb: {
    batch: jest.fn(() => ({
      set: jest.fn(),
      update: jest.fn(),
      commit: jest.fn().mockResolvedValue(true),
    })),
    collection: jest.fn((colName) => {
      const colChain: any = {
        doc: jest.fn((docId) => {
          const docRef = {
            id: docId,
            path: `${colName}/${docId}`,
            update: (payload: any) => mockUpdate(docRef, payload),
            delete: () => mockDelete(docRef),
            set: (payload: any) => mockSet(docRef, payload),
          };
          
          const docObj: any = {
            id: docId,
            path: `${colName}/${docId}`,
            get: async () => {
              const res = await mockGet(colName, docId);
              return {
                exists: !!res,
                data: () => res,
                ref: docRef,
              };
            },
            set: (payload: any) => mockSet(docRef, payload),
            update: (payload: any) => mockUpdate(docRef, payload),
          };

          docObj.collection = jest.fn((subColName) => {
            const subColChain: any = {
              doc: jest.fn((subDocId) => {
                const subDocRef = {
                  id: subDocId,
                  path: `${colName}/${docId}/${subColName}/${subDocId}`,
                  update: (payload: any) => mockUpdate(subDocRef, payload),
                  delete: () => mockDelete(subDocRef),
                  set: (payload: any) => mockSet(subDocRef, payload),
                };
                return {
                  id: subDocId,
                  path: `${colName}/${docId}/${subColName}/${subDocId}`,
                  get: async () => {
                    const res = await mockGet(`${colName}_${subColName}`, subDocId);
                    return {
                      exists: !!res,
                      data: () => res,
                      ref: subDocRef,
                    };
                  },
                  set: (payload: any) => mockSet(subDocRef, payload),
                  update: (payload: any) => mockUpdate(subDocRef, payload),
                };
              }),
              where: jest.fn((field, op, val) => {
                const chain: any = {
                  limit: jest.fn(() => chain),
                  get: async () => {
                    const res = await mockGet(`${colName}_${subColName}`, `query_${field}_${op}_${val}`);
                    const docs = (res || []).map((docData: any) => ({
                      id: docData.id || 'mock-doc-id',
                      ref: {
                        update: (payload: any) => mockUpdate({ id: docData.id || 'mock-doc-id' }, payload),
                        delete: () => mockDelete({ id: docData.id || 'mock-doc-id' }),
                      },
                      data: () => docData,
                    }));
                    return {
                      empty: docs.length === 0,
                      size: docs.length,
                      docs,
                      forEach: (cb: any) => docs.forEach(cb),
                    };
                  },
                };
                return chain;
              }),
              get: async () => {
                const res = await mockGet(`${colName}_${subColName}`, 'all');
                const docs = (res || []).map((docData: any) => ({
                  id: docData.id || 'mock-doc-id',
                  ref: {
                    update: (payload: any) => mockUpdate({ id: docData.id || 'mock-doc-id' }, payload),
                    delete: () => mockDelete({ id: docData.id || 'mock-doc-id' }),
                  },
                  data: () => docData,
                }));
                return {
                  empty: docs.length === 0,
                  size: docs.length,
                  docs,
                  forEach: (cb: any) => docs.forEach(cb),
                };
              },
              add: (...args: any[]) => mockAdd(...args),
            };
            return subColChain;
          });

          return docObj;
        }),
        where: jest.fn((field, op, val) => {
          const chain: any = {
            limit: jest.fn(() => chain),
            get: async () => {
              const res = await mockGet(colName, `query_${field}_${op}_${val}`);
              const docs = (res || []).map((docData: any) => ({
                id: docData.id || 'mock-doc-id',
                ref: {
                  update: (payload: any) => mockUpdate({ id: docData.id || 'mock-doc-id' }, payload),
                  delete: () => mockDelete({ id: docData.id || 'mock-doc-id' }),
                },
                data: () => docData,
              }));
              return {
                empty: docs.length === 0,
                size: docs.length,
                docs,
                forEach: (cb: any) => docs.forEach(cb),
              };
            },
          };
          return chain;
        }),
        get: async () => {
          const res = await mockGet(colName, 'all');
          const docs = (res || []).map((docData: any) => ({
            id: docData.id || 'mock-doc-id',
            ref: {
              update: (payload: any) => mockUpdate({ id: docData.id || 'mock-doc-id' }, payload),
              delete: () => mockDelete({ id: docData.id || 'mock-doc-id' }),
            },
            data: () => docData,
          }));
          return {
            empty: docs.length === 0,
            size: docs.length,
            docs,
            forEach: (cb: any) => docs.forEach(cb),
          };
        },
        add: (...args: any[]) => mockAdd(...args),
      };
      return colChain;
    }),
    collectionGroup: jest.fn((colName) => ({
      where: jest.fn((field, op, val) => {
        const chain: any = {
          limit: jest.fn(() => chain),
          get: async () => {
            const res = await mockGet(colName, `queryGroup_${field}_${op}_${val}`);
            return {
              empty: !res || res.length === 0,
              docs: (res || []).map((docData: any) => ({
                id: docData.id || 'mock-doc-id',
                ref: {
                  update: (payload: any) => mockUpdate({ id: docData.id || 'mock-doc-id' }, payload),
                  delete: () => mockDelete({ id: docData.id || 'mock-doc-id' }),
                },
                data: () => docData,
              })),
            };
          },
        };
        return chain;
      }),
    })),
  },
}));

jest.mock('firebase-admin', () => ({
  firestore: {
    FieldValue: {
      serverTimestamp: () => new Date(),
    },
  },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    emailLog: {
      findMany: (...args: any[]) => mockEmailLogFindMany(...args),
      updateMany: (...args: any[]) => mockEmailLogUpdateMany(...args),
    },
  },
}));

jest.mock('@/lib/engine/CommunicationEngine', () => ({
  CommunicationEngine: {
    sendRawEmail: jest.fn().mockResolvedValue(true),
    updateDeliveryStatus: (...args: any[]) => mockEmailLogUpdateMany(...args),
  },
}));

describe('Invitation Abuse Control Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Suspension Gating on inviteSubscribers', () => {
    it('blocks sending invitations if investor account is suspended', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user_suspended', email: 'test@user.com' });
      mockGet.mockImplementation((colName, key) => {
        if (colName === 'users' && key === 'user_suspended') {
          return {
            invitationSuspended: true,
            suspensionReason: 'EXCESSIVE_BOUNCES',
          };
        }
        return null;
      });

      await expect(
        inviteSubscribers('valid-token', 'project_123', [{ email: 'recipient@test.com' }])
      ).rejects.toThrow('Your invitation privileges have been suspended');
    });
  });

  describe('Invitation Rate Limits', () => {
    it('blocks if project rate limit is breached', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user_123', email: 'test@user.com' });
      mockGet.mockImplementation((colName, key) => {
        if (colName === 'users' && key === 'user_123') {
          return { role: 'Lead Investor' };
        }
        if (colName === 'projects' && key === 'project_123') {
          return { ownerUid: 'user_123' };
        }
        if (colName === 'dealListings') {
          return [{ id: 'listing_123', status: 'published', visibilityMode: 'PRIVATE' }];
        }
        // Mock 100 recent invites
        if (colName === 'dealInvitations') {
          return Array.from({ length: 100 }, (_, i) => ({ id: `inv_${i}`, createdAt: new Date().toISOString() }));
        }
        return null;
      });

      await expect(
        inviteSubscribers('valid-token', 'project_123', [{ email: 'recipient@test.com' }])
      ).rejects.toThrow('A project is capped at 100 invitations per 24 hours');
    });

    it('blocks if account rate limit is breached', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user_123', email: 'test@user.com' });
      mockGet.mockImplementation((colName, key) => {
        if (colName === 'users' && key === 'user_123') {
          return { role: 'Lead Investor' };
        }
        if (colName === 'projects' && key === 'project_123') {
          return { ownerUid: 'user_123' };
        }
        if (colName === 'dealListings') {
          return [{ id: 'listing_123', status: 'published', visibilityMode: 'PRIVATE' }];
        }
        if (colName === 'dealInvitations') {
          // If query is for inviterUid (account rate limit check), return 150 documents
          if (key.includes('inviterUid_==_user_123')) {
            return Array.from({ length: 150 }, (_, i) => ({ id: `inv_${i}`, createdAt: new Date().toISOString() }));
          }
          // If query is for projectId (project rate limit check), return 0 documents
          return [];
        }
        return null;
      });

      await expect(
        inviteSubscribers('valid-token', 'project_123', [{ email: 'recipient@test.com' }])
      ).rejects.toThrow('An account is capped at 150 invitations per 24 hours');
    });
  });

  describe('Purchased List Detection', () => {
    it('flags list upload as suspicious if contains high stranger ratio (>80%)', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user_123', email: 'test@user.com' });
      mockGet.mockImplementation((colName, key) => {
        if (colName === 'users') {
          if (key === 'user_123') return { role: 'Lead Investor' };
          // Return empty (stranger) for invitees search
          return null;
        }
        if (colName === 'projects' && key === 'project_123') {
          return { ownerUid: 'user_123' };
        }
        if (colName === 'dealListings') {
          return [{ id: 'listing_123', status: 'published', visibilityMode: 'PRIVATE' }];
        }
        if (colName === 'dealInvitations') {
          return [];
        }
        return null;
      });

      // 6 recipients, all are strangers (ratio = 100% > 80%)
      const invitees = Array.from({ length: 6 }, (_, i) => ({ email: `stranger_${i}@gmail.com` }));

      // Blocked since strangers Count > 15
      const manyInvitees = Array.from({ length: 16 }, (_, i) => ({ email: `stranger_${i}@gmail.com` }));
      await expect(
        inviteSubscribers('valid-token', 'project_123', manyInvitees)
      ).rejects.toThrow('Your invitation batch was flagged as non-relational');

      // Operator alert written
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'PURCHASED_LIST_DETECTION',
          userId: 'user_123',
        })
      );
    });
  });

  describe('POST /api/identity/report-spam', () => {
    it('sets invitation status to reported, logs to operator queue, and increments complaint count', async () => {
      mockGet.mockImplementation((colName, key) => {
        if (colName === 'dealInvitations') {
          return [{ id: 'invite_123', inviterUid: 'user_123', inviteeEmail: 'victim@test.com' }];
        }
        if (colName === 'users' && key === 'user_123') {
          return { complaintCount: 0 };
        }
        return null;
      });

      const req = new NextRequest('http://localhost/api/identity/report-spam', {
        method: 'POST',
        body: JSON.stringify({ email: 'victim@test.com', token: 'valid-token', projectId: 'project_123' }),
      });
      const res = await reportSpam(req);
      expect(res.status).toBe(200);

      expect(mockUpdate).toHaveBeenCalled(); // reported state update + user complaintCount update
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'RECIPIENT_REPORT',
          userId: 'user_123',
        })
      );
    });

    it('suspends user invitation privilege when complaint threshold met (>= 2 complaints)', async () => {
      mockGet.mockImplementation((colName, key) => {
        if (colName === 'dealInvitations') {
          return [{ id: 'invite_123', inviterUid: 'user_123', inviteeEmail: 'victim@test.com' }];
        }
        if (colName === 'users' && key === 'user_123') {
          return { complaintCount: 1 }; // already 1 complaint, this makes it 2
        }
        return null;
      });

      const req = new NextRequest('http://localhost/api/identity/report-spam', {
        method: 'POST',
        body: JSON.stringify({ email: 'victim@test.com', token: 'valid-token', projectId: 'project_123' }),
      });
      const res = await reportSpam(req);
      expect(res.status).toBe(200);

      // Verify suspension updates applied
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          invitationSuspended: true,
          suspensionReason: 'USER_COMPLAINT',
        })
      );
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SUSPENSION_ALERT',
          userId: 'user_123',
        })
      );
    });
  });

  describe('POST /api/identity/appeal', () => {
    it('creates appeal request in operator queue and flags user profile', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user_123', email: 'test@user.com' });
      mockGet.mockImplementation((colName, key) => {
        if (colName === 'users' && key === 'user_123') {
          return { invitationSuspended: true };
        }
        return null;
      });

      const req = new NextRequest('http://localhost/api/identity/appeal', {
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: JSON.stringify({ reason: 'Accidental bounces.' }),
      });
      const res = await appealSuspension(req);
      expect(res.status).toBe(200);

      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'APPEAL_REQUEST',
          userId: 'user_123',
        })
      );
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          appealSubmitted: true,
          appealReason: 'Accidental bounces.',
        })
      );
    });
  });

  describe('POST /api/webhooks/sendgrid bounce/complaint handling', () => {
    it('suspends user on bounce threshold breach (>= 5 bounces)', async () => {
      mockEmailLogFindMany.mockResolvedValueOnce([
        { id: 'log_123', linkedProjectId: 'project_123', metadata: JSON.stringify({ userId: 'user_123' }) }
      ]);
      mockGet.mockImplementation((colName, key) => {
        if (colName === 'users' && key === 'user_123') {
          return { bounceCount: 4 }; // already 4 bounces, this makes it 5
        }
        return null;
      });

      const payload = [
        {
          event: 'bounce',
          sg_message_id: 'msg_123.filterdrecv-p3mdw1-755b77c5d9-4l54d-18-62029B85-1A.0',
          timestamp: Math.floor(Date.now() / 1000),
        },
      ];

      const req = new NextRequest('http://localhost/api/webhooks/sendgrid', {
        method: 'POST',
        headers: {
          'x-twilio-email-event-webhook-signature': 'mock_sig',
          'x-twilio-email-event-webhook-timestamp': '1234567890',
        },
        body: JSON.stringify(payload),
      });

      const res = await sendgridWebhook(req);
      expect(res.status).toBe(200);

      // Verify suspension applied
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          invitationSuspended: true,
          suspensionReason: 'EXCESSIVE_BOUNCES',
        })
      );
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SUSPENSION_ALERT',
          userId: 'user_123',
        })
      );
    });
  });
});
