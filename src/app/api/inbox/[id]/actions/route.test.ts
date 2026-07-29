/** @jest-environment node */
import { POST } from './route';
import { NextRequest } from 'next/server';

// Mock token vault
jest.mock('@/lib/encryption/tokenVault', () => ({
  decryptToken: (token: string) => token,
  decrypt: (token: string) => token,
}));

// Mock Rent Monitor
jest.mock('@/lib/alerts/rentMonitor', () => ({
  checkMissingRent: jest.fn(),
}));

// Mock Firebase Admin
const mockGetInboxItem = jest.fn();
const mockGetProject = jest.fn();
const mockUpdateInboxItem = jest.fn();
const mockUpdateProject = jest.fn();

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'user_abc' }),
  },
  adminDb: {
    collection: (col: string) => {
      if (col === 'inboxItems') {
        return {
          doc: (id: string) => ({
            get: mockGetInboxItem,
            update: mockUpdateInboxItem,
          }),
        };
      }
      if (col === 'projects') {
        return {
          doc: (id: string) => ({
            get: mockGetProject,
            update: mockUpdateProject,
          }),
        };
      }
      return {};
    },
  },
}));

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    bankConnection: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

describe('Inbox Actions API Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when unauthorized', async () => {
    const req = new NextRequest('http://localhost/api/inbox/alert_123/actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'confirm_paid' }),
    });

    // Mock no auth header
    const res = await POST(req, { params: Promise.resolve({ id: 'alert_123' }) });
    expect(res.status).toBe(401);
  });

  it('marks alert paid and updates project notes on confirm_paid', async () => {
    // Mock item
    mockGetInboxItem.mockResolvedValue({
      exists: true,
      data: () => ({
        id: 'alert_123',
        recipientUid: 'user_abc',
        metadata: {
          projectId: 'proj_abc',
          expectedDate: '2026-07-01',
          expectedAmount: 2500,
        },
      }),
    });

    // Mock project
    mockGetProject.mockResolvedValue({
      exists: true,
      data: () => ({
        id: 'proj_abc',
        notes: [],
      }),
    });

    const req = new NextRequest('http://localhost/api/inbox/alert_123/actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-id-token',
      },
      body: JSON.stringify({ action: 'confirm_paid', paidDate: '2026-07-02' }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: 'alert_123' }) });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockUpdateInboxItem).toHaveBeenCalledWith(
      expect.objectContaining({
        archived: true,
        actionTaken: 'confirm_paid',
      })
    );
    expect(mockUpdateProject).toHaveBeenCalledWith(
      expect.objectContaining({
        notes: expect.any(Array),
        'financials.rentStatus': 'PAID_MANUALLY',
      })
    );
  });

  it('marks alert late on mark_late', async () => {
    mockGetInboxItem.mockResolvedValue({
      exists: true,
      data: () => ({
        id: 'alert_123',
        recipientUid: 'user_abc',
        metadata: {
          projectId: 'proj_abc',
          expectedDate: '2026-07-01',
          expectedAmount: 2500,
        },
      }),
    });

    mockGetProject.mockResolvedValue({
      exists: true,
      data: () => ({
        id: 'proj_abc',
        notes: '',
      }),
    });

    const req = new NextRequest('http://localhost/api/inbox/alert_123/actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-id-token',
      },
      body: JSON.stringify({ action: 'mark_late' }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: 'alert_123' }) });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockUpdateInboxItem).toHaveBeenCalledWith(
      expect.objectContaining({
        archived: true,
        actionTaken: 'mark_late',
      })
    );
    expect(mockUpdateProject).toHaveBeenCalledWith(
      expect.objectContaining({
        notes: expect.any(String),
        'financials.rentStatus': 'LATE',
      })
    );
  });
});
