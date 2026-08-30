import { describe, expect, it, jest, beforeEach, beforeAll } from '@jest/globals';

process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://test:test@127.0.0.1:5432/test';

type AuthServiceCtor = typeof import('../auth/auth.service.js').AuthService;

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

  const supabaseAuth = {
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
    auth = new AuthService(prisma as never, supabaseAuth as never);
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_MOCK_AUTH = 'false';
  });

  it('rejects missing accessToken', async () => {
    const result = await auth.createSession(res as never, {});
    expect(result).toMatchObject({ status: 400 });
  });

  it('sets httpOnly __session cookie after Supabase JWT verify', async () => {
    supabaseAuth.verifyAccessToken.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      email: 'investor@example.com',
    });
    prisma.user.findUnique.mockResolvedValueOnce(null); // by id
    prisma.user.findFirst.mockResolvedValueOnce(null); // by legacy
    prisma.user.findUnique.mockResolvedValueOnce(null); // by email
    prisma.user.create.mockResolvedValue({});
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
    supabaseAuth.verifyAccessToken.mockRejectedValue(new Error('bad token'));
    const result = await auth.createSession(res as never, { accessToken: 'bad' });
    expect(result).toMatchObject({ status: 401 });
  });
});
