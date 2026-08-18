/** @jest-environment node */
import { adminAuth } from '@/lib/firebase/admin';
import { proxy } from '@/proxy';
import { NextRequest } from 'next/server';
import * as admin from 'firebase-admin';

const mockAdd = jest.fn().mockResolvedValue({ id: 'event_123' });
const mockCollection = jest.fn().mockImplementation((colName) => ({
  add: mockAdd,
}));

jest.mock('@/lib/firebase/admin', () => {
  const original = jest.requireActual('@/lib/firebase/admin');
  return {
    ...original,
    adminDb: {
      collection: (colName: string) => mockCollection(colName),
    },
  };
});

describe('SECURITY_SENTRY: Mock Auth Bypasses Verification', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('adminAuth.verifyIdToken accepts exact mock tokens if ENABLE_MOCK_AUTH is true and not in production', async () => {
    process.env.ENABLE_MOCK_AUTH = 'true';
    (process.env as any).NODE_ENV = 'development';

    const result = await adminAuth.verifyIdToken('mock_token');
    expect(result).toBeDefined();
    expect(result.uid).toBe('user_lead_investor_seed');

    const resultSession = await adminAuth.verifyIdToken('mock_session_token_123');
    expect(resultSession).toBeDefined();
    expect(resultSession.uid).toBe('user_lead_investor_seed');
  });

  it('adminAuth.verifyIdToken rejects mock tokens if in production even if ENABLE_MOCK_AUTH is true', async () => {
    process.env.ENABLE_MOCK_AUTH = 'true';
    (process.env as any).NODE_ENV = 'production';

    await expect(adminAuth.verifyIdToken('mock_token')).rejects.toThrow();
  });

  it('adminAuth.verifyIdToken rejects startsWith mock_ tokens in all environments', async () => {
    process.env.ENABLE_MOCK_AUTH = 'true';
    (process.env as any).NODE_ENV = 'development';

    await expect(adminAuth.verifyIdToken('mock_token_some_other_prefix')).rejects.toThrow();
  });

  it('adminAuth.verifyIdToken rejects mock tokens if ENABLE_MOCK_AUTH is false and not in test env', async () => {
    process.env.ENABLE_MOCK_AUTH = 'false';
    (process.env as any).NODE_ENV = 'development'; // wait, since node_env !== 'test' gets checked via production logic, but if NODE_ENV is production it also fails. Let's set NODE_ENV to production

    (process.env as any).NODE_ENV = 'production';
    await expect(adminAuth.verifyIdToken('mock_token')).rejects.toThrow();
  });

  it('proxy middleware bypass blocks local development auto-auth if ENABLE_MOCK_AUTH is false', async () => {
    process.env.ENABLE_MOCK_AUTH = 'false';
    (process.env as any).NODE_ENV = 'development';

    const req = new NextRequest('http://localhost/dashboard/command-center', {
      headers: { host: 'localhost' }
    });
    const res = proxy(req);
    
    expect(res).toBeDefined();
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
    expect(res.cookies.get('__session')).toBeUndefined();
  });

  it('proxy middleware bypass allows local development auto-auth if ENABLE_MOCK_AUTH is true', async () => {
    process.env.ENABLE_MOCK_AUTH = 'true';
    (process.env as any).NODE_ENV = 'development';

    const req = new NextRequest('http://localhost/dashboard/command-center', {
      headers: { host: 'localhost' }
    });
    const res = proxy(req);
    
    expect(res).toBeDefined();
    expect(res.status).toBe(307);
    expect(res.cookies.get('__session')?.value).toBe('mock_session_token_123');
  });

  it('logs AUTH_FAILURE telemetry in production when verifyIdToken fails', async () => {
    (process.env as any).NODE_ENV = 'production';
    process.env.ENABLE_MOCK_AUTH = 'false';

    const mockVerify = jest.fn().mockRejectedValue(new Error('Invalid token'));
    mockAdd.mockClear();
    mockCollection.mockClear();

    jest.spyOn(admin, 'auth').mockReturnValue({
      verifyIdToken: mockVerify,
    } as any);

    await expect(adminAuth.verifyIdToken('some_bad_token')).rejects.toThrow('Invalid token');

    expect(mockVerify).toHaveBeenCalledWith('some_bad_token');
    expect(mockCollection).toHaveBeenCalledWith('securityEvents');
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'AUTH_FAILURE',
        reason: 'Invalid token',
        ipHash: expect.any(String),
        route: expect.any(String),
        timestamp: expect.any(String),
      })
    );
  });
});

