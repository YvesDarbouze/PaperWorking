import { POST as startClaim } from '@/app/api/identity/claim/start/route';
import { POST as verifyClaim } from '@/app/api/identity/claim/verify/route';
import { POST as bindToken } from '@/app/api/identity/claim/bind-token/route';
import { NextRequest } from 'next/server';

// Mocks
const mockVerifyIdToken = jest.fn();
const mockGet = jest.fn();
const mockSet = jest.fn().mockResolvedValue(true);
const mockUpdate = jest.fn().mockResolvedValue(true);
const mockDelete = jest.fn().mockResolvedValue(true);
const mockSendRawEmail = jest.fn().mockResolvedValue(true);
const mockCapture = jest.fn().mockResolvedValue(true);

jest.mock('@/lib/firebase-admin/auth-guard', () => {
  return {
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
  };
});

jest.mock('@/lib/firebase/admin', () => {
  return {
    adminDb: {
      collection: jest.fn((colName) => {
        const colChain: any = {
          doc: jest.fn((docId) => {
            const docRef = {
              id: docId,
              path: `${colName}/${docId}`,
              update: (payload: any) => mockUpdate(docRef, payload),
              delete: () => mockDelete(docRef),
              set: (payload: any) => mockSet(docRef, payload),
              parent: {
                doc: jest.fn((newId) => ({
                  id: newId,
                  set: (payload: any) => mockSet({ id: newId, path: `${colName}/${newId}` }, payload),
                })),
              },
            };
            return {
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
          }),
          where: jest.fn((field, op, val) => {
            const chain: any = {
              limit: jest.fn(() => chain),
              get: async () => {
                const res = await mockGet(colName, `query_${field}_${op}_${val}`);
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
          get: async () => {
            const res = await mockGet(colName, 'all');
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
                    parent: {
                      doc: jest.fn((newId) => ({
                        id: newId,
                        set: (payload: any) => mockSet({ id: newId }, payload),
                      })),
                    },
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
  };
});

jest.mock('firebase-admin', () => {
  return {
    firestore: {
      FieldValue: {
        serverTimestamp: () => new Date(),
        arrayUnion: (val: any) => ['arrayUnion', val],
      },
    },
  };
});

jest.mock('@/lib/engine/CommunicationEngine', () => ({
  CommunicationEngine: {
    sendRawEmail: (...args: any[]) => mockSendRawEmail(...args),
  },
}));

jest.mock('@/lib/telemetry', () => ({
  telemetry: {
    capture: (...args: any[]) => mockCapture(...args),
  },
}));

describe('Identity Claim Route Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/identity/claim/start', () => {
    it('returns 401 if unauthenticated', async () => {
      const req = new NextRequest('http://localhost/api/identity/claim/start', {
        method: 'POST',
        body: JSON.stringify({ claimEmail: 'test@claim.com' }),
      });
      const res = await startClaim(req);
      expect(res.status).toBe(401);
    });

    it('returns 400 if claiming own primary email', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user_123', email: 'test@user.com' });
      const req = new NextRequest('http://localhost/api/identity/claim/start', {
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: JSON.stringify({ claimEmail: 'test@user.com' }),
      });
      const res = await startClaim(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('You cannot claim your own primary email');
    });

    it('returns 400 if target email has no history', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user_123', email: 'test@user.com' });
      mockGet.mockResolvedValue(null);

      const req = new NextRequest('http://localhost/api/identity/claim/start', {
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: JSON.stringify({ claimEmail: 'test@claim.com' }),
      });
      const res = await startClaim(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('No prior history found');
    });

    it('sends verification code if target email has history', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user_123', email: 'test@user.com' });
      mockGet.mockImplementation((colName, key) => {
        if (colName === 'dealInvitations') return [{ id: 'invite_123', inviteeEmail: 'test@claim.com' }];
        return null;
      });

      const req = new NextRequest('http://localhost/api/identity/claim/start', {
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: JSON.stringify({ claimEmail: 'test@claim.com' }),
      });
      const res = await startClaim(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);

      expect(mockSet).toHaveBeenCalled();
      expect(mockSendRawEmail).toHaveBeenCalledWith(
        ['test@claim.com'],
        expect.stringContaining('Verification Code'),
        expect.any(String)
      );
    });
  });

  describe('POST /api/identity/claim/verify', () => {
    it('returns 400 if verification code does not exist or matches incorrectly', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user_123', email: 'test@user.com' });
      mockGet.mockImplementation((colName, key) => {
        if (colName === 'identityVerificationClaims') {
          return {
            code: '123456',
            expiresAt: { toDate: () => new Date(Date.now() + 10 * 60 * 1000) },
            verified: false,
          };
        }
        return null;
      });

      const req = new NextRequest('http://localhost/api/identity/claim/verify', {
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: JSON.stringify({ claimEmail: 'test@claim.com', code: '999999' }),
      });
      const res = await verifyClaim(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('Invalid verification code');
    });

    it('performs history merge on valid code', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user_123', email: 'test@user.com', name: 'Test User' });
      
      mockGet.mockImplementation((colName, key) => {
        if (colName === 'identityVerificationClaims') {
          return {
            code: '123456',
            expiresAt: { toDate: () => new Date(Date.now() + 10 * 60 * 1000) },
            verified: false,
          };
        }
        if (colName === 'dealInvitations') {
          return [{ id: 'invite_1', inviteeEmail: 'test@claim.com' }];
        }
        if (colName === 'investor_contacts') {
          return [{ id: 'contact_1', email: 'test@claim.com' }];
        }
        if (colName === 'followers') {
          return [{ id: 'follower_1', email: 'test@claim.com' }];
        }
        if (colName === 'commitments') {
          return [{ id: 'commitment_1', email: 'test@claim.com' }];
        }
        if (colName === 'projects') {
          if (key === 'all') {
            return [{
              id: 'proj_123',
              equityParties: [{ email: 'test@claim.com', memberId: '' }]
            }];
          }
        }
        return null;
      });

      const req = new NextRequest('http://localhost/api/identity/claim/verify', {
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: JSON.stringify({ claimEmail: 'test@claim.com', code: '123456' }),
      });
      const res = await verifyClaim(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalled();
      expect(mockCapture).toHaveBeenCalledWith({
        distinctId: 'user_123',
        event: 'identity_history_claimed',
        properties: expect.any(Object),
      });
    });
  });

  describe('POST /api/identity/claim/bind-token', () => {
    it('binds history automatically without code when valid token is provided', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user_123', email: 'test@user.com', name: 'Test User' });

      mockGet.mockImplementation((colName, key) => {
        if (colName === 'dealInvitations') {
          if (key === 'query_token_==_valid-invite-token') {
            return [{ id: 'invite_123', inviteeEmail: 'test@claim.com' }];
          }
        }
        if (colName === 'projects') {
          if (key === 'all') {
            return [];
          }
        }
        return null;
      });

      const req = new NextRequest('http://localhost/api/identity/claim/bind-token', {
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: JSON.stringify({ token: 'valid-invite-token' }),
      });
      const res = await bindToken(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockCapture).toHaveBeenCalledWith({
        distinctId: 'user_123',
        event: 'identity_history_bound_via_token',
        properties: expect.any(Object),
      });
    });
  });
});
