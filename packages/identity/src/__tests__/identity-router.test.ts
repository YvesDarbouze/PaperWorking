import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import {
  IdentityVerificationError,
  verifyAccessToken,
  isFirebaseIssuedToken,
  isSupabaseIssuedToken,
} from '../index.js';

function fakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.signature`;
}

describe('JWT routing', () => {
  it('detects Firebase-issued tokens', () => {
    const token = fakeJwt({ iss: 'https://securetoken.google.com/demo' });
    expect(isFirebaseIssuedToken(token)).toBe(true);
    expect(isSupabaseIssuedToken(token)).toBe(false);
  });

  it('detects Supabase-issued tokens', () => {
    const token = fakeJwt({ iss: 'https://abc.supabase.co/auth/v1' });
    expect(isSupabaseIssuedToken(token)).toBe(true);
    expect(isFirebaseIssuedToken(token)).toBe(false);
  });
});

describe('verifyAccessToken router', () => {
  beforeEach(() => {
    delete process.env.USE_FIREBASE_AUTH;
    delete process.env.NEXT_PUBLIC_USE_FIREBASE_AUTH;
  });

  it('rejects missing token', async () => {
    await expect(verifyAccessToken(undefined, {})).rejects.toBeInstanceOf(
      IdentityVerificationError,
    );
  });

  it('routes Firebase token when flag is on', async () => {
    process.env.USE_FIREBASE_AUTH = 'true';
    const firebase = {
      hasCredentials: () => true,
      verifyIdToken: jest.fn(async () => ({
        uid: 'fb-1',
        email: 'a@b.com',
        provider: 'firebase' as const,
      })),
      verifySessionCookie: jest.fn(),
      createSessionCookie: jest.fn(),
    };
    const token = fakeJwt({ iss: 'https://securetoken.google.com/demo' });
    const identity = await verifyAccessToken(token, { firebase });
    expect(identity.uid).toBe('fb-1');
    expect(firebase.verifyIdToken).toHaveBeenCalledWith(token);
  });

  it('uses Supabase when Firebase flag is off', async () => {
    const supabase = {
      hasCredentials: () => true,
      verifyAccessToken: jest.fn(async () => ({
        uid: 'sb-1',
        provider: 'supabase' as const,
      })),
    };
    const token = fakeJwt({ iss: 'https://abc.supabase.co/auth/v1' });
    const identity = await verifyAccessToken(token, { supabase });
    expect(identity.uid).toBe('sb-1');
  });

  it('maps Firebase expired token errors', async () => {
    process.env.USE_FIREBASE_AUTH = 'true';
    const firebase = {
      hasCredentials: () => true,
      verifyIdToken: jest.fn(async () => {
        throw new Error('Firebase ID token has expired');
      }),
      verifySessionCookie: jest.fn(),
      createSessionCookie: jest.fn(),
    };
    const supabase = {
      hasCredentials: () => true,
      verifyAccessToken: jest.fn(async () => ({
        uid: 'sb-fallback',
        provider: 'supabase' as const,
      })),
    };
    const token = fakeJwt({ iss: 'https://securetoken.google.com/demo' });
    await expect(verifyAccessToken(token, { firebase, supabase })).rejects.toMatchObject({
      code: 'expired_token',
    });
    expect(supabase.verifyAccessToken).not.toHaveBeenCalled();
  });

  it('does not fall back to Supabase when Firebase verification fails', async () => {
    process.env.USE_FIREBASE_AUTH = 'true';
    const firebase = {
      hasCredentials: () => true,
      verifyIdToken: jest.fn(async () => {
        throw new Error('Firebase ID token has invalid signature');
      }),
      verifySessionCookie: jest.fn(),
      createSessionCookie: jest.fn(),
    };
    const supabase = {
      hasCredentials: () => true,
      verifyAccessToken: jest.fn(async () => ({
        uid: 'sb-fallback',
        provider: 'supabase' as const,
      })),
    };
    const token = fakeJwt({ iss: 'https://securetoken.google.com/demo' });
    await expect(verifyAccessToken(token, { firebase, supabase })).rejects.toMatchObject({
      code: 'invalid_token',
    });
    expect(supabase.verifyAccessToken).not.toHaveBeenCalled();
  });

  it('rejects unknown issuer when Firebase mode is enabled', async () => {
    process.env.USE_FIREBASE_AUTH = 'true';
    const supabase = {
      hasCredentials: () => true,
      verifyAccessToken: jest.fn(async () => ({
        uid: 'sb-fallback',
        provider: 'supabase' as const,
      })),
    };
    const token = fakeJwt({ iss: 'https://unknown.example.com' });
    await expect(
      verifyAccessToken(token, {
        firebase: {
          hasCredentials: () => true,
          verifyIdToken: jest.fn(),
          verifySessionCookie: jest.fn(),
          createSessionCookie: jest.fn(),
        },
        supabase,
      }),
    ).rejects.toMatchObject({
      code: 'invalid_token',
      message: expect.stringContaining('Unsupported identity token issuer'),
    });
    expect(supabase.verifyAccessToken).not.toHaveBeenCalled();
  });

  it('routes Supabase-issued tokens to Supabase verifier only', async () => {
    process.env.USE_FIREBASE_AUTH = 'true';
    const supabase = {
      hasCredentials: () => true,
      verifyAccessToken: jest.fn(async () => ({
        uid: 'sb-legacy',
        provider: 'supabase' as const,
      })),
    };
    const firebase = {
      hasCredentials: () => true,
      verifyIdToken: jest.fn(),
      verifySessionCookie: jest.fn(),
      createSessionCookie: jest.fn(),
    };
    const token = fakeJwt({ iss: 'https://abc.supabase.co/auth/v1' });
    const identity = await verifyAccessToken(token, { supabase, firebase });
    expect(identity.uid).toBe('sb-legacy');
    expect(supabase.verifyAccessToken).toHaveBeenCalledWith(token);
    expect(firebase.verifyIdToken).not.toHaveBeenCalled();
  });

  it('routes Firebase session cookies to verifySessionCookie', async () => {
    process.env.USE_FIREBASE_AUTH = 'true';
    const firebase = {
      hasCredentials: () => true,
      verifyIdToken: jest.fn(),
      verifySessionCookie: jest.fn(async () => ({
        uid: 'fb-session',
        email: 'a@b.com',
        provider: 'firebase' as const,
      })),
      createSessionCookie: jest.fn(),
    };
    const token = fakeJwt({ iss: 'https://session.firebase.google.com' });
    const identity = await verifyAccessToken(token, { firebase });
    expect(identity.uid).toBe('fb-session');
    expect(firebase.verifySessionCookie).toHaveBeenCalledWith(token);
    expect(firebase.verifyIdToken).not.toHaveBeenCalled();
  });
});
