import { handleSessionDelete, handleSessionPost } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import { ACCT_COOKIE } from '@/lib/auth/session-cookies';

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
    result.cookies = result.cookies.map((cookie) =>
      cookie.name === ACCT_COOKIE ? { ...cookie, value: accountType } : cookie,
    );
  }

  return toNextResponse(result);
}

export async function DELETE(request: Request) {
  const result = await handleSessionDelete(request, {
    env: { nodeEnv: process.env.NODE_ENV },
  });
  return toNextResponse(result);
}
