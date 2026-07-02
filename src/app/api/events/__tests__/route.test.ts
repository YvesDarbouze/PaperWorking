import { POST } from '../route';
import { NextRequest, NextResponse } from 'next/server';

var mockRequireAuth = jest.fn();
var mockGet = jest.fn();
var mockAdd = jest.fn();
var mockUpdate = jest.fn();
var mockSet = jest.fn();

// Mock the auth guard
jest.mock('@/lib/firebase-admin/auth-guard', () => ({
  requireAuth: (req: any) => mockRequireAuth(req),
  isAuthError: (result: any) => result instanceof Response || result instanceof NextResponse,
}));

// Mock firebase admin DB
jest.mock('@/lib/firebase/admin', () => ({
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

// Mock telemetry singleton
var mockCapture = jest.fn();
var mockFlush = jest.fn();
jest.mock('@/lib/telemetry', () => ({
  capture: (...args: any[]) => mockCapture(...args),
  flush: (...args: any[]) => mockFlush(...args),
}));

describe('Events API Endpoint (POST /api/events)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 if unauthorized (no/invalid token)', async () => {
    const request = new NextRequest('http://localhost/api/events', {
      method: 'POST',
      body: JSON.stringify({
        event: 'onboarding_intent_selected',
        properties: { intent: 'first_investment', phase: 1 },
      }),
    });

    mockRequireAuth.mockResolvedValueOnce(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));

    const response = await POST(request);
    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toContain('Unauthorized');
  });

  it('returns 401 if caller is anonymous', async () => {
    const request = new NextRequest('http://localhost/api/events', {
      method: 'POST',
      body: JSON.stringify({
        event: 'onboarding_intent_selected',
        properties: { intent: 'first_investment', phase: 1 },
      }),
    });

    mockRequireAuth.mockResolvedValueOnce({
      uid: 'anon_123',
      token: {
        provider_id: 'anonymous',
        firebase: { sign_in_provider: 'anonymous' },
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toContain('anonymous users not allowed');
  });

  it('returns 400 if event name is missing or invalid', async () => {
    const request = new NextRequest('http://localhost/api/events', {
      method: 'POST',
      body: JSON.stringify({
        properties: { intent: 'first_investment', phase: 1 },
      }),
    });

    mockRequireAuth.mockResolvedValueOnce({
      uid: 'user_123',
      token: {
        provider_id: 'password',
        firebase: { sign_in_provider: 'password' },
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain('Missing or invalid event name');
  });

  it('successfully persists onboarding intent selected event to user record and forwards to telemetry', async () => {
    const request = new NextRequest('http://localhost/api/events', {
      method: 'POST',
      body: JSON.stringify({
        event: 'onboarding_intent_selected',
        properties: { intent: 'own_properties', phase: 3 },
        timestamp: '2026-06-09T12:00:00Z',
      }),
    });

    mockRequireAuth.mockResolvedValueOnce({
      uid: 'user_123',
      token: {
        provider_id: 'google.com',
        firebase: { sign_in_provider: 'google.com' },
      },
    });
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

    // Verify telemetry has correct properties and top-level timestamp
    expect(mockCapture).toHaveBeenCalledTimes(1);
    expect(mockCapture).toHaveBeenCalledWith({
      distinctId: 'user_123',
      event: 'onboarding_intent_selected',
      properties: { intent: 'own_properties', phase: 3 },
      timestamp: new Date('2026-06-09T12:00:00Z'),
    });
    expect(mockFlush).toHaveBeenCalledTimes(1);

    // Verify user profile document is set with merge: true
    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith({
      onboardingIntent: 'own_properties',
      onboardingPhase: 3,
      onboardingIntentAt: 'MOCK_SERVER_TIMESTAMP',
      updatedAt: 'MOCK_SERVER_TIMESTAMP',
    }, { merge: true });
  });

  it('tolerates telemetry failures without crashing the API response', async () => {
    const request = new NextRequest('http://localhost/api/events', {
      method: 'POST',
      body: JSON.stringify({
        event: 'onboarding_completed',
        properties: {},
      }),
    });

    mockRequireAuth.mockResolvedValueOnce({
      uid: 'user_123',
      token: {
        provider_id: 'password',
        firebase: { sign_in_provider: 'password' },
      },
    });
    mockAdd.mockResolvedValueOnce({ id: 'event_doc_123' });
    mockUpdate.mockResolvedValueOnce(undefined);

    // Telemetry capture throws
    mockCapture.mockRejectedValueOnce(new Error('PostHog timeout'));

    const response = await POST(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);

    expect(mockAdd).toHaveBeenCalledTimes(1);
  });
});
