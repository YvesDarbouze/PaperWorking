import { POST } from '../route';
import { NextRequest } from 'next/server';

var mockVerifySessionCookie = jest.fn();
var mockGet = jest.fn();
var mockAdd = jest.fn();
var mockUpdate = jest.fn();
var mockSet = jest.fn();

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifySessionCookie: (...args: any[]) => mockVerifySessionCookie(...args),
  },
  adminDb: {
    collection: jest.fn().mockImplementation(() => ({
      doc: jest.fn().mockImplementation(() => ({
        get: (...args: any[]) => mockGet(...args),
        update: (...args: any[]) => mockUpdate(...args),
        set: (...args: any[]) => mockSet(...args),
      })),
      add: (...args: any[]) => mockAdd(...args),
    })),
  },
}));

// Stub firebase-admin for FieldValue.serverTimestamp()
jest.mock('firebase-admin', () => {
  const original = jest.requireActual('firebase-admin');
  return {
    ...original,
    firestore: {
      FieldValue: {
        serverTimestamp: () => 'MOCK_SERVER_TIMESTAMP',
      },
    },
  };
});

describe('Events API Endpoint (POST /api/events)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 if unauthorized (no session cookie)', async () => {
    const request = new NextRequest('http://localhost/api/events', {
      method: 'POST',
      body: JSON.stringify({
        event: 'onboarding_intent_selected',
        properties: { intent: 'first_investment', phase: 1 },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toContain('Unauthorized');
  });

  it('returns 401 if session cookie is invalid', async () => {
    const request = new NextRequest('http://localhost/api/events', {
      method: 'POST',
      headers: {
        Cookie: '__session=invalid-cookie',
      },
      body: JSON.stringify({
        event: 'onboarding_intent_selected',
        properties: { intent: 'first_investment', phase: 1 },
      }),
    });

    mockVerifySessionCookie.mockRejectedValueOnce(new Error('Invalid session cookie'));

    const response = await POST(request);
    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toContain('Unauthorized');
  });

  it('returns 400 if event name is missing or invalid', async () => {
    const request = new NextRequest('http://localhost/api/events', {
      method: 'POST',
      headers: {
        Cookie: '__session=valid-cookie',
      },
      body: JSON.stringify({
        properties: { intent: 'first_investment', phase: 1 },
      }),
    });

    mockVerifySessionCookie.mockResolvedValueOnce({ uid: 'user_123' });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain('Missing or invalid event name');
  });

  it('successfully persists onboarding intent selected event to user record', async () => {
    const request = new NextRequest('http://localhost/api/events', {
      method: 'POST',
      headers: {
        Cookie: '__session=valid-cookie',
      },
      body: JSON.stringify({
        event: 'onboarding_intent_selected',
        properties: { intent: 'own_properties', phase: 3 },
      }),
    });

    mockVerifySessionCookie.mockResolvedValueOnce({ uid: 'user_123' });
    mockAdd.mockResolvedValueOnce({ id: 'event_doc_123' });
    mockSet.mockResolvedValueOnce(undefined);

    const response = await POST(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);

    // Verify event is logged to 'events' collection
    expect(mockAdd).toHaveBeenCalledTimes(1);
    expect(mockAdd).toHaveBeenCalledWith({
      uid: 'user_123',
      event: 'onboarding_intent_selected',
      properties: { intent: 'own_properties', phase: 3 },
      createdAt: 'MOCK_SERVER_TIMESTAMP',
    });

    // Verify user profile document is set with merge: true
    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith({
      onboardingIntent: 'own_properties',
      onboardingPhase: 3,
      onboardingIntentAt: 'MOCK_SERVER_TIMESTAMP',
      updatedAt: 'MOCK_SERVER_TIMESTAMP',
    }, { merge: true });
  });

  it('skips saving user record update if intent property is missing', async () => {
    const request = new NextRequest('http://localhost/api/events', {
      method: 'POST',
      headers: {
        Cookie: '__session=valid-cookie',
      },
      body: JSON.stringify({
        event: 'onboarding_intent_selected',
        properties: { phase: 3 },
      }),
    });

    mockVerifySessionCookie.mockResolvedValueOnce({ uid: 'user_123' });
    mockAdd.mockResolvedValueOnce({ id: 'event_doc_123' });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);

    // Should add event but NOT set user profile
    expect(mockAdd).toHaveBeenCalledTimes(1);
    expect(mockSet).not.toHaveBeenCalled();
  });
});
