import { describe, expect, it, jest, beforeEach, beforeAll } from '@jest/globals';
import { normalizeClientAccountType } from '../auth/account-type.js';

process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://test:test@127.0.0.1:5432/test';

type AuthServiceCtor = typeof import('../auth/auth.service.js').AuthService;

function makeIdentityDeps(supabaseAuth: {
  hasCredentials: () => boolean;
  verifyAccessToken: (token: string) => Promise<{ id: string; email?: string }>;
}) {
  return {
    supabase: {
      hasCredentials: supabaseAuth.hasCredentials,
      verifyAccessToken: (token: string) =>
        supabaseAuth.verifyAccessToken(token).then((r) => ({
          uid: r.id,
          email: r.email,
          provider: 'supabase' as const,
        })),
    },
    firebase: {
      hasCredentials: () => false,
      verifyIdToken: jest.fn(),
      verifySessionCookie: jest.fn(),
      createSessionCookie: jest.fn(),
    },
  };
}

describe('AuthService accountType escalation prevention', () => {
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
      findFirst: jest.fn().mockResolvedValue(null),
    },
    client: {},
  };

  const supabaseVerifier = {
    hasCredentials: jest.fn(() => true),
    verifyAccessToken: jest.fn(),
  };

  let auth: InstanceType<AuthServiceCtor>;
  const cookies: Array<{ name: string; value: string }> = [];
  const res = {
    cookie: (name: string, value: string) => {
      cookies.push({ name, value });
    },
  };

  beforeAll(async () => {
    ({ AuthService } = await import('../auth/auth.service.js'));
  });

  beforeEach(() => {
    cookies.length = 0;
    jest.clearAllMocks();
    auth = new AuthService(prisma as never, makeIdentityDeps(supabaseVerifier) as never);
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_MOCK_AUTH = 'false';
    delete process.env.USE_FIREBASE_AUTH;
    prisma.subscription.findFirst.mockResolvedValue(null);
  });

  it('does not overwrite accountType for existing user on session sync', async () => {
    supabaseVerifier.verifyAccessToken.mockResolvedValue({
      id: 'user-existing',
      email: 'investor@example.com',
    });
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'user-existing',
      email: 'investor@example.com',
      accountType: 'investor',
      role: 'investor',
    });
    prisma.user.update.mockResolvedValue({});
    prisma.user.findFirst.mockResolvedValue({
      id: 'user-existing',
      email: 'investor@example.com',
      accountType: 'investor',
      role: 'investor',
    });

    await auth.createSession(res as never, {
      accessToken: 'jwt',
      accountType: 'vendor',
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-existing' },
      data: { email: 'investor@example.com' },
    });
    expect(prisma.user.update.mock.calls[0][0].data).not.toHaveProperty('accountType');
  });

  it('accepts accountType only on first-time user create', async () => {
    supabaseVerifier.verifyAccessToken.mockResolvedValue({
      id: 'user-new',
      email: 'new@example.com',
    });
    prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    prisma.user.findFirst.mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValue({});
    prisma.user.findFirst.mockResolvedValue({
      id: 'user-new',
      email: 'new@example.com',
      accountType: 'vendor',
      role: null,
    });

    await auth.createSession(res as never, {
      accessToken: 'jwt',
      accountType: 'vendor',
    });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ accountType: 'vendor' }),
      }),
    );
  });

  it('normalizeClientAccountType rejects admin from client', () => {
    expect(normalizeClientAccountType('admin')).toBe('investor');
    expect(normalizeClientAccountType('ADMIN')).toBe('investor');
  });
});
