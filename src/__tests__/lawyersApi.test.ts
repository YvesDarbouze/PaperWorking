/** @jest-environment node */
import { GET } from '../app/api/lawyers/route';
import { NextRequest } from 'next/server';

const mockVerifyIdToken = jest.fn();
const mockGet = jest.fn();
const mockQuery: any = {};
mockQuery.where = jest.fn().mockImplementation(() => mockQuery);
mockQuery.limit = jest.fn().mockImplementation(() => mockQuery);
mockQuery.get = (...args: any[]) => mockGet(...args);

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
  },
  adminDb: {
    collection: jest.fn().mockImplementation(() => mockQuery),
  },
}));

describe('Lawyers API Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unauthenticated requests (missing token)', async () => {
    const request = new NextRequest('http://localhost/api/lawyers?state=FL', {
      method: 'GET',
    });

    const response = await GET(request);
    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('rejects forged/invalid tokens', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const request = new NextRequest('http://localhost/api/lawyers?state=FL', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer invalid-forged-token',
      },
    });
    mockVerifyIdToken.mockRejectedValueOnce(new Error('Invalid token signature'));

    const response = await GET(request);
    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBe('Unauthorized');
    consoleSpy.mockRestore();
  });

  it('returns 400 if state code is missing', async () => {
    const request = new NextRequest('http://localhost/api/lawyers', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer valid-token',
      },
    });
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user_123' });

    const response = await GET(request);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe('State code is required');
  });

  it('queries database and returns matching lawyers if authenticated', async () => {
    const request = new NextRequest('http://localhost/api/lawyers?state=FL', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer valid-token',
      },
    });
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user_123' });

    // Mock vendors search results
    mockGet.mockResolvedValueOnce({
      size: 1,
      docs: [
        {
          id: 'lawyer_abc',
          data: () => ({
            displayName: 'Sarah Jenkins, Esq.',
            vendorType: 'lawyer',
            stateCode: 'FL',
            subscriptionPlan: 'Vendor Network',
            subscriptionStatus: 'active',
          }),
        },
      ],
    });
    // Mock legacy vendors search results
    mockGet.mockResolvedValueOnce({
      size: 0,
      docs: [],
    });

    const response = await GET(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.lawyers).toHaveLength(1);
    expect(json.lawyers[0].uid).toBe('lawyer_abc');
    expect(json.lawyers[0].displayName).toBe('Sarah Jenkins, Esq.');
    expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-token');
  });
});
