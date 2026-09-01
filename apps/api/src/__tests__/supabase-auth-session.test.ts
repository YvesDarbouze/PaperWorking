import { describe, expect, it, jest, beforeEach, beforeAll } from '@jest/globals';

process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://test:test@127.0.0.1:5432/test';

type AuthServiceCtor = typeof import('../auth/auth.service.js').AuthService;

function makeIdentityDeps(supabaseAuth: {
  hasCredentials: () => boolean;
  verifyAccessToken: (token: string) => Promise<{ uid: string; email?: string; provider: 'supabase' }>;
}) {
  return {
    supabase: {
      hasCredentials: supabaseAuth.hasCredentials,
      verifyAccessToken: supabaseAuth.verifyAccessToken,
    },
    firebase: {
      hasCredentials: () => false,
      verifyIdToken: jest.fn(),
      verifySessionCookie: jest.fn(),
      createSessionCookie: jest.fn(),
    },
  };
}

describe('AuthService Supabase session', () => {
  let AuthService: AuthServiceCtor;
  const prisma = {
    user: {
      upsert: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    subscription: {
      findFirst: jest.fn(),
    },
    client: {},
  };

  const supabaseVerifier = {
    hasCredentials: jest.fn(() => true),
    verifyAccessToken: jest.fn(),
  };

  let auth: InstanceType<AuthServiceCtor>;
  const cookies: Array<{ name: string; value: string; httpOnly?: boolean }> = [];
  const res = {
    cookie: (name: string, value: string, opts: { httpOnly?: boolean }) => {
      cookies.push({ name, value, httpOnly: opts.httpOnly });
    },
  };

  beforeAll(async () => {
    ({ AuthService } = await import('../auth/auth.service.js'));
  });

  beforeEach(() => {
    cookies.length = 0;
    jest.clearAllMocks();
    auth = new AuthService(
      prisma as never,
      makeIdentityDeps({
        hasCredentials: () => supabaseVerifier.hasCredentials(),
        verifyAccessToken: (token) =>
          supabaseVerifier.verifyAccessToken(token).then((r) => ({
            uid: r.id,
            email: r.email,
            provider: 'supabase' as const,
          })),
      }) as never,
    );
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_MOCK_AUTH = 'false';
    delete process.env.USE_FIREBASE_AUTH;
    delete process.env.NEXT_PUBLIC_USE_FIREBASE_AUTH;
  });

  it('rejects missing accessToken', async () => {
    const result = await auth.createSession(res as never, {});
    expect(result).toMatchObject({ status: 400 });
  });

  it('sets httpOnly __session cookie after Supabase JWT verify', async () => {
    supabaseVerifier.verifyAccessToken.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      email: 'investor@example.com',
    });
    prisma.user.findUnique.mockResolvedValueOnce(null);
    prisma.user.findFirst.mockResolvedValueOnce(null);
    prisma.user.findUnique.mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValue({});
    prisma.subscription.findFirst.mockResolvedValue({
      plan: 'Individual',
      status: 'active',
    });
    prisma.user.findFirst.mockResolvedValueOnce({
      id: '11111111-1111-4111-8111-111111111111',
      email: 'investor@example.com',
      accountType: 'investor',
      role: 'investor',
    });

    const result = await auth.createSession(res as never, {
      accessToken: 'supabase-access-jwt',
      accountType: 'investor',
    });

    expect(result).toEqual({ ok: true, uid: '11111111-1111-4111-8111-111111111111' });
    const session = cookies.find((c) => c.name === '__session');
    expect(session?.value).toBe('supabase-access-jwt');
    expect(session?.httpOnly).toBe(true);
  });

  it('returns 401 for invalid JWT', async () => {
    supabaseVerifier.verifyAccessToken.mockRejectedValue(new Error('bad token'));
    const result = await auth.createSession(res as never, { accessToken: 'bad' });
    expect(result).toMatchObject({ status: 401 });
  });
});
