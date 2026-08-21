import { handleSessionDelete, handleSessionPost } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import {
  ACCT_COOKIE,
  DEV_MOCK_SESSION_TOKEN,
  encodeSubCookie,
  SUB_COOKIE,
} from '@/lib/auth/session-cookies';

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
  const result = await handleSessionPost(request, body, {
    env: {
      nodeEnv: process.env.NODE_ENV,
      enableMockAuth: mockAuthEnabled(),
    },
  });

  if (
    result.status === 200 &&
    mockAuthEnabled() &&
    Array.isArray(result.cookies) &&
    result.cookies.length > 0
  ) {
    const accountType = normalizeDevAccountType(body.accountType);
    const isMockToken = body.idToken === DEV_MOCK_SESSION_TOKEN;
    result.cookies = result.cookies.map((cookie) => {
      if (cookie.name === ACCT_COOKIE) return { ...cookie, value: accountType };
      // Dev/mock logins should unlock Deals (sidebar paywall checks __sub).
      if (isMockToken && cookie.name === SUB_COOKIE) {
        return { ...cookie, value: encodeSubCookie('Individual', 'active') };
      }
      return cookie;
    });
  }

  return toNextResponse(result);
}

export async function DELETE(request: Request) {
  const result = await handleSessionDelete(request, {
    env: { nodeEnv: process.env.NODE_ENV },
  });
  return toNextResponse(result);
}
