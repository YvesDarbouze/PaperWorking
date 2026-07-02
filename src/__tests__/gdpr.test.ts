import { GET, DELETE } from '@/app/api/user/gdpr/route';
import { NextRequest } from 'next/server';

var mockVerifyIdToken = jest.fn();
var mockGet = jest.fn();
var mockAdd = jest.fn();
var mockUpdate = jest.fn();
var mockBatchCommit = jest.fn();
var mockBatchUpdate = jest.fn();
var mockBatchDelete = jest.fn();
var mockBatchSet = jest.fn();

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
  },
  adminDb: {
    collection: jest.fn().mockImplementation(() => ({
      doc: jest.fn().mockImplementation(() => ({
        get: (...args: any[]) => mockGet(...args),
        update: (...args: any[]) => mockUpdate(...args),
      })),
      where: jest.fn().mockImplementation(() => ({
        get: (...args: any[]) => mockGet(...args),
      })),
      add: (...args: any[]) => mockAdd(...args),
    })),
    batch: jest.fn().mockImplementation(() => ({
      delete: (...args: any[]) => mockBatchDelete(...args),
      update: (...args: any[]) => mockBatchUpdate(...args),
      set: (...args: any[]) => mockBatchSet(...args),
      commit: (...args: any[]) => mockBatchCommit(...args),
    })),
  },
}));

describe('GDPR/CCPA Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/user/gdpr - Data Export', () => {
    it('returns 401 if unauthorized', async () => {
      const request = new NextRequest('http://localhost/api/user/gdpr', {
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });
      mockVerifyIdToken.mockRejectedValueOnce(new Error('Invalid token'));

      const response = await GET(request);
      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.success).toBe(false);
    });

    it('returns user export data and logs audit event if authorized', async () => {
      const request = new NextRequest('http://localhost/api/user/gdpr', {
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });
      mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user_123' });

      // Mock user document
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          email: 'user@example.com',
          displayName: 'John Doe',
          preferences: { pushEnabled: true },
        }),
      });

      // Mock notifications
      mockGet.mockResolvedValueOnce({
        docs: [
          {
            id: 'not_1',
            data: () => ({ recipientId: 'user_123', title: 'Notification 1' }),
          },
        ],
      });

      // Mock queued emails
      mockGet.mockResolvedValueOnce({
        docs: [
          {
            id: 'queued_1',
            data: () => ({ recipientId: 'user_123', title: 'Queued Email 1' }),
          },
        ],
      });

      mockAdd.mockResolvedValueOnce({ id: 'audit_log_123' });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.export.profile.email).toBe('user@example.com');
      expect(json.export.notifications).toHaveLength(1);
      expect(json.export.queuedEmails).toHaveLength(1);

      // Verify audit log write
      expect(mockAdd).toHaveBeenCalledTimes(1);
      expect(mockAdd.mock.calls[0][0].type).toBe('gdpr_export');
      expect(mockAdd.mock.calls[0][0].userId).toBe('user_123');
    });
  });

  describe('DELETE /api/user/gdpr - Data Deletion', () => {
    it('returns 401 if unauthorized', async () => {
      const request = new NextRequest('http://localhost/api/user/gdpr', {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });
      mockVerifyIdToken.mockRejectedValueOnce(new Error('Invalid token'));

      const response = await DELETE(request);
      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.success).toBe(false);
    });

    it('erases user data and resets preferences via a batch transaction', async () => {
      const request = new NextRequest('http://localhost/api/user/gdpr', {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });
      mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user_123' });

      // Mock notifications matching the query
      mockGet.mockResolvedValueOnce({
        docs: [
          {
            ref: 'not_ref_1',
          },
        ],
      });

      // Mock queued emails matching the query
      mockGet.mockResolvedValueOnce({
        docs: [
          {
            ref: 'queued_ref_1',
          },
        ],
      });

      mockBatchCommit.mockResolvedValueOnce(undefined);

      const response = await DELETE(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);

      // Verify batch deletes
      expect(mockBatchDelete).toHaveBeenCalledTimes(2);

      // Verify preferences reset on user document
      expect(mockBatchUpdate).toHaveBeenCalledTimes(1);
      const updatePayload = mockBatchUpdate.mock.calls[0][1];
      expect(updatePayload.fcmTokens).toEqual([]);
      expect(updatePayload['preferences.autoArchiveDays']).toBe(30);

      // Verify audit log entry
      expect(mockBatchSet).toHaveBeenCalledTimes(1);
      const auditPayload = mockBatchSet.mock.calls[0][1];
      expect(auditPayload.type).toBe('gdpr_deletion');
      expect(auditPayload.userId).toBe('user_123');
    });
  });
});
