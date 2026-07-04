/** @jest-environment node */
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { POST as invitationsSendPOST } from '@/app/api/invitations/send/route';
import { POST as reportingExportPOST } from '@/app/api/reporting/export/route';
import { POST as titleSearchPOST } from '@/app/api/closing/title-search/route';
import { NextRequest, NextResponse } from 'next/server';

var mockVerifyIdToken = jest.fn();
var mockGet = jest.fn();
var mockSet = jest.fn();
var mockUpdate = jest.fn();

// Mock the Firebase Admin SDK proxy imports
jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
  },
  adminDb: {
    collection: jest.fn().mockImplementation(() => ({
      doc: jest.fn().mockImplementation(() => ({
        get: (...args: any[]) => mockGet(...args),
        set: (...args: any[]) => mockSet(...args),
        update: (...args: any[]) => mockUpdate(...args),
      })),
      where: jest.fn().mockImplementation(() => ({
        limit: jest.fn().mockImplementation(() => ({
          get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
        })),
      })),
    })),
  },
}));

describe('1. requireAuth Guard Helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects requests with missing Authorization header', async () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: {},
    });
    const result = await requireAuth(req);
    expect(isAuthError(result)).toBe(true);
    const response = result as NextResponse;
    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBe('Unauthorized');
    expect(json.message).toContain('Missing or malformed Authorization header');
  });

  it('rejects requests with malformed Authorization header (no Bearer)', async () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: {
        Authorization: 'Basic c29tZXRva2Vu',
      },
    });
    const result = await requireAuth(req);
    expect(isAuthError(result)).toBe(true);
    const response = result as NextResponse;
    expect(response.status).toBe(401);
  });

  it('rejects requests with expired token', async () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: {
        Authorization: 'Bearer expired-token',
      },
    });
    const expiredError = new Error('Token expired');
    (expiredError as any).code = 'auth/id-token-expired';
    mockVerifyIdToken.mockRejectedValueOnce(expiredError);

    const result = await requireAuth(req);
    expect(isAuthError(result)).toBe(true);
    const response = result as NextResponse;
    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.message).toContain('Token has expired');
  });

  it('rejects requests with revoked token', async () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: {
        Authorization: 'Bearer revoked-token',
      },
    });
    const revokedError = new Error('Token revoked');
    (revokedError as any).code = 'auth/id-token-revoked';
    mockVerifyIdToken.mockRejectedValueOnce(revokedError);

    const result = await requireAuth(req);
    expect(isAuthError(result)).toBe(true);
    const response = result as NextResponse;
    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.message).toContain('Token has been revoked');
  });

  it('successfully returns AuthContext for a valid token', async () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: {
        Authorization: 'Bearer valid-token',
      },
    });
    mockVerifyIdToken.mockResolvedValueOnce({
      uid: 'user_123',
      email: 'user@example.com',
    });

    const result = await requireAuth(req);
    expect(isAuthError(result)).toBe(false);
    const context = result as any;
    expect(context.uid).toBe('user_123');
    expect(context.token.email).toBe('user@example.com');
  });
});

describe('2. POST /api/invitations/send Auth Gates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects request with 401 if unauthorized', async () => {
    const req = new NextRequest('http://localhost/api/invitations/send', {
      method: 'POST',
      headers: {}, // missing header
    });
    const response = await invitationsSendPOST(req);
    expect(response.status).toBe(401);
  });

  it('rejects with 403 if user is not a project member or in project list', async () => {
    const req = new NextRequest('http://localhost/api/invitations/send', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({
        projectId: 'proj_1',
        email: 'investor@example.com',
        name: 'John Investor',
        proposedEquityPercent: 10,
      }),
    });

    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'unauthorized_user' });
    
    // Mock project document
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        organizationId: 'org_1',
        propertyName: '123 Main St',
        members: {
          different_user: { role: 'Lead Investor' },
        },
      }),
    });

    // Mock caller profile showing different organizationId
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        organizationId: 'org_2',
        role: 'Lead Investor',
      }),
    });

    const response = await invitationsSendPOST(req);
    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error).toContain('insufficient permissions');
  });

  it('accepts invitation post if user is Lead Investor in project members', async () => {
    const req = new NextRequest('http://localhost/api/invitations/send', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({
        projectId: 'proj_1',
        email: 'investor@example.com',
        name: 'John Investor',
        proposedEquityPercent: 10,
      }),
    });

    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'authorized_user' });
    
    // Mock project document
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        organizationId: 'org_1',
        propertyName: '123 Main St',
        members: {
          authorized_user: { role: 'Lead Investor' },
        },
      }),
    });

    // Mock caller user profile
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        displayName: 'Authorized User Name',
        organizationId: 'org_1',
      }),
    });

    const response = await invitationsSendPOST(req);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(mockSet).toHaveBeenCalledTimes(1);
    // Assert that the invitedByUid is derived from token (authorized_user), not body
    const persistedInvitation = mockSet.mock.calls[0][0];
    expect(persistedInvitation.invitedByUid).toBe('authorized_user');
    expect(persistedInvitation.invitedByName).toBe('Authorized User Name');
  });
});

describe('3. POST /api/reporting/export Auth Gates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects request with 401 if unauthorized', async () => {
    const req = new NextRequest('http://localhost/api/reporting/export', {
      method: 'POST',
      headers: {}, // missing header
    });
    const response = await reportingExportPOST(req);
    expect(response.status).toBe(401);
  });

  it('rejects with 403 if user does not own or participate in the requested project', async () => {
    const req = new NextRequest('http://localhost/api/reporting/export', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({
        format: 'csv',
        type: 'pl',
        projectIds: ['proj_1'],
      }),
    });

    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'unauthorized_user' });

    // Mock caller user profile
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        organizationId: 'org_2',
      }),
    });

    // Mock project document
    mockGet.mockResolvedValueOnce({
      exists: true,
      id: 'proj_1',
      data: () => ({
        organizationId: 'org_1',
        propertyName: '123 Main St',
        members: {
          different_user: { role: 'Lead Investor' },
        },
        financials: {},
      }),
    });

    const response = await reportingExportPOST(req);
    expect(response.status).toBe(403);
  });
});

describe('4. POST /api/closing/title-search Auth Gates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects request with 401 if unauthorized', async () => {
    const req = new NextRequest('http://localhost/api/closing/title-search', {
      method: 'POST',
      headers: {}, // missing header
    });
    const response = await titleSearchPOST(req);
    expect(response.status).toBe(401);
  });

  it('returns 503 (provider decision required) if authorized but provider is not configured', async () => {
    const req = new NextRequest('http://localhost/api/closing/title-search', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({
        projectId: 'proj_1',
        propertyAddress: '123 Main St',
      }),
    });

    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'authorized_user' });

    const response = await titleSearchPOST(req);
    expect(response.status).toBe(503);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.providerDecisionRequired).toBe(true);
  });
});
