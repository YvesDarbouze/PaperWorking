import { handleSessionDelete, handleSessionPost } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import {
  ACCT_COOKIE,
  DEV_MOCK_SESSION_TOKEN,
  encodeSubCookie,
  SUB_COOKIE,
} from '@/lib/auth/session-cookies';
import { adminAuth, loadSessionProfile } from '@/lib/firebase/admin';

function hasAdminCredentials(): boolean {
  const hasExplicit = !!(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
  const hasAdc = !!(process.env.GOOGLE_CLOUD_PROJECT || process.env.K_SERVICE);
  return hasExplicit || hasAdc;
}

function mockAuthEnabled(): boolean {
  return process.env.ENABLE_MOCK_AUTH === 'true' || process.env.NODE_ENV !== 'production';
}

function normalizeDevAccountType(value: unknown): string {
  if (typeof value !== 'string') return 'investor';
  const normalized = value.trim().toLowerCase();
  if (normalized === 'admin' || normalized === 'vendor') return normalized;
  return 'investor';
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    idToken?: string;
    accountType?: string;
  };

  const credentialsAvailable = hasAdminCredentials();

  const result = await handleSessionPost(request, body, {
    hasCredentials: () => credentialsAvailable,
    verifyIdToken: credentialsAvailable
      ? async (idToken) => {
          const decoded = await adminAuth.verifyIdToken(idToken);
          return { uid: decoded.uid };
        }
      : undefined,
    createSessionCookie: credentialsAvailable
      ? async (idToken, expiresInMs) => adminAuth.createSessionCookie(idToken, expiresInMs)
      : undefined,
    getUserProfile: credentialsAvailable
      ? async (uid) => {
          const profile = await loadSessionProfile(uid);
          const accountType = normalizeDevAccountType(body.accountType || profile.accountType);
          return { ...profile, accountType };
        }
      : undefined,
    env: {
      nodeEnv: process.env.NODE_ENV,
      enableMockAuth: mockAuthEnabled(),
    },
  });

  if (result.status === 200 && Array.isArray(result.cookies) && result.cookies.length > 0) {
    const accountType = normalizeDevAccountType(body.accountType);
    const isMockToken = body.idToken === DEV_MOCK_SESSION_TOKEN;
    result.cookies = result.cookies.map((cookie) => {
      // Localhost must not use Secure cookies or browsers drop them.
      if (process.env.NODE_ENV !== 'production' && cookie.options) {
        cookie = { ...cookie, options: { ...cookie.options, secure: false } };
      }
      if (cookie.name === ACCT_COOKIE) return { ...cookie, value: accountType };
      if (isMockToken && cookie.name === SUB_COOKIE) {
        return { ...cookie, value: encodeSubCookie('Individual', 'active') };
      }
      // Real Firebase logins in local/dev: unlock Deals unless profile already says active.
      if (!isMockToken && cookie.name === SUB_COOKIE && process.env.NODE_ENV !== 'production') {
        return { ...cookie, value: encodeSubCookie('Individual', 'active') };
      }
      return cookie;
    });
  }

  return toNextResponse(result);
}

export async function DELETE(request: Request) {
  const credentialsAvailable = hasAdminCredentials();
  const result = await handleSessionDelete(request, {
    hasCredentials: () => credentialsAvailable,
    verifySessionCookie: credentialsAvailable
      ? async (sessionCookie) => {
          const decoded = await adminAuth.verifySessionCookie(sessionCookie);
          return { uid: decoded.uid };
        }
      : undefined,
    env: { nodeEnv: process.env.NODE_ENV },
  });
  return toNextResponse(result);
}
