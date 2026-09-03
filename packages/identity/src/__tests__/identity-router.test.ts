import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import {
  IdentityVerificationError,
  verifyAccessToken,
  isFirebaseIssuedToken,
  isFirebaseSessionCookieToken,
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

  it('detects Firebase session cookies with project-scoped issuer', () => {
    const legacy = fakeJwt({ iss: 'https://session.firebase.google.com' });
    const scoped = fakeJwt({ iss: 'https://session.firebase.google.com/paperworking-97055' });
    expect(isFirebaseSessionCookieToken(legacy)).toBe(true);
    expect(isFirebaseSessionCookieToken(scoped)).toBe(true);
    expect(isFirebaseIssuedToken(scoped)).toBe(false);
  });
});

describe('verifyAccessToken router (Firebase-only)', () => {
  beforeEach(() => {
    process.env.USE_FIREBASE_AUTH = 'true';
    delete process.env.NEXT_PUBLIC_USE_FIREBASE_AUTH;
  });

  it('rejects missing token', async () => {
    await expect(verifyAccessToken(undefined, {})).rejects.toBeInstanceOf(
      IdentityVerificationError,
    );
  });

  it('routes Firebase token when flag is on', async () => {
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

  it('rejects Supabase-issued tokens', async () => {
    const firebase = {
      hasCredentials: () => true,
      verifyIdToken: jest.fn(),
      verifySessionCookie: jest.fn(),
      createSessionCookie: jest.fn(),
    };
    const token = fakeJwt({ iss: 'https://abc.supabase.co/auth/v1' });
    await expect(verifyAccessToken(token, { firebase })).rejects.toMatchObject({
      code: 'invalid_token',
      message: expect.stringContaining('Supabase tokens are not accepted'),
    });
    expect(firebase.verifyIdToken).not.toHaveBeenCalled();
  });

  it('maps Firebase expired token errors', async () => {
    const firebase = {
      hasCredentials: () => true,
      verifyIdToken: jest.fn(async () => {
        throw new Error('Firebase ID token has expired');
      }),
      verifySessionCookie: jest.fn(),
      createSessionCookie: jest.fn(),
    };
    const token = fakeJwt({ iss: 'https://securetoken.google.com/demo' });
    await expect(verifyAccessToken(token, { firebase })).rejects.toMatchObject({
      code: 'expired_token',
    });
  });

  it('rejects unknown issuer when Firebase mode is enabled', async () => {
    const token = fakeJwt({ iss: 'https://unknown.example.com' });
    await expect(
      verifyAccessToken(token, {
        firebase: {
          hasCredentials: () => true,
          verifyIdToken: jest.fn(),
          verifySessionCookie: jest.fn(),
          createSessionCookie: jest.fn(),
        },
      }),
    ).rejects.toMatchObject({
      code: 'invalid_token',
      message: expect.stringContaining('Unsupported identity token issuer'),
    });
  });

  it('routes Firebase session cookies to verifySessionCookie', async () => {
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
