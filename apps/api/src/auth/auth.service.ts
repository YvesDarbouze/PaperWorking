import { Injectable, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';
import { readCookie } from './auth-cookies.js';
import {
  ACCT_COOKIE,
  SESSION_COOKIE,
  SUB_COOKIE,
  type AuthUser,
} from './auth.types.js';
import { SupabaseAuthService } from './supabase-auth.service.js';
import { remapUserPrimaryKey } from './user-id-remap.js';

const SESSION_EXPIRES_MS = 1000 * 60 * 60 * 24 * 5; // 5 days

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseAuth: SupabaseAuthService,
  ) {}

  mockAuthEnabled(): boolean {
    if (process.env.NODE_ENV === 'production') return false;
    const flag = process.env.USE_MOCK_DATA ?? process.env.ENABLE_MOCK_AUTH;
    if (flag === 'false' || flag === '0') return false;
    return true;
  }

  async resolveUserFromRequest(req: Request): Promise<AuthUser | null> {
    const bearer = req.headers.authorization;
    if (bearer?.startsWith('Bearer ')) {
      const token = bearer.slice('Bearer '.length).trim();
      if (token === 'dev-session' && this.mockAuthEnabled()) {
        return this.ensureDevUser();
      }
      // Bearer is accepted for non-browser clients; primary browser session is httpOnly cookie.
      if (this.supabaseAuth.hasCredentials() && !token.startsWith('mock')) {
        try {
          const decoded = await this.supabaseAuth.verifyAccessToken(token);
          return this.toAuthUser(decoded.id);
        } catch {
          /* fall through to cookie */
        }
      }
    }

    const session = readCookie(req, SESSION_COOKIE);
    if (!session) return null;

    if (session.startsWith('mock:') && this.mockAuthEnabled()) {
      return this.ensureDevUser();
    }

    if (this.supabaseAuth.hasCredentials()) {
      try {
        const decoded = await this.supabaseAuth.verifyAccessToken(session);
        return this.toAuthUser(decoded.id);
      } catch (err) {
        this.logger.warn(`Invalid session cookie: ${(err as Error).message}`);
        return null;
      }
    }

    if (this.mockAuthEnabled()) {
      return this.ensureDevUser();
    }
    return null;
  }

  private async ensureDevUser(): Promise<AuthUser> {
    const uid = '00000000-0000-4000-8000-000000000001';
    await this.prisma.user.upsert({
      where: { email: 'dev@paperworking.test' },
      create: {
        id: uid,
        email: 'dev@paperworking.test',
        name: 'Dev User',
        displayName: 'Dev User',
        accountType: 'investor',
      },
      update: {},
    });
    return this.toAuthUser(uid);
  }

  /**
   * Build AuthUser from database only.
   * Cookies (__acct), body.accountType, query, and headers MUST NOT grant admin.
   */
  private async toAuthUser(uid: string): Promise<AuthUser> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ id: uid }, { legacyFirebaseUid: uid }],
      },
    });
    const dbAccountType = (user?.accountType || 'investor').trim().toLowerCase();
    const dbRole = (user?.role || '').trim().toLowerCase();
    const isAdmin = dbAccountType === 'admin' || dbRole === 'admin';

    let accountType = 'investor';
    if (isAdmin) accountType = 'admin';
    else if (dbAccountType === 'vendor') accountType = 'vendor';
    else if (dbAccountType === 'investment_team') accountType = 'investment_team';
    else accountType = 'investor';

    return {
      uid: user?.id || uid,
      email: user?.email,
      accountType,
      isAdmin,
      role: user?.role,
    };
  }

  async createSession(
    res: Response,
    body: { accessToken?: string; idToken?: string; accountType?: string },
  ): Promise<{ ok: true; uid: string } | { status: number; body: unknown }> {
    const accountType = normalizeClientAccountType(body.accountType);
    const mockEnabled = this.mockAuthEnabled();
    const accessToken = body.accessToken || body.idToken;

    if (!accessToken) {
      return { status: 400, body: { error: 'accessToken required' } };
    }

    if (this.supabaseAuth.hasCredentials() && !accessToken.startsWith('mock')) {
      try {
        const decoded = await this.supabaseAuth.verifyAccessToken(accessToken);
        const authUser = await this.upsertSupabaseUser(decoded.id, decoded.email, accountType);
        this.setSessionCookies(res, accessToken, authUser.accountType, false);
        return { ok: true, uid: authUser.uid };
      } catch (err) {
        this.logger.warn(`createSession verify failed: ${(err as Error).message}`);
        return { status: 401, body: { error: 'Invalid access token' } };
      }
    }

    if (mockEnabled) {
      const cookie = `mock:${accessToken}`;
      const authUser = await this.ensureDevUser();
      this.setSessionCookies(res, cookie, authUser.accountType, true);
      return { ok: true, uid: authUser.uid };
    }

    return { status: 503, body: { error: 'Supabase Auth credentials not configured' } };
  }

  async clearSession(res: Response): Promise<void> {
    const base = cookieBaseOptions();
    for (const name of [SESSION_COOKIE, ACCT_COOKIE, SUB_COOKIE]) {
      res.clearCookie(name, { ...base, httpOnly: name === SESSION_COOKIE });
    }
  }

  async getMe(user: AuthUser) {
    const row = await this.prisma.user.findFirst({
      where: { OR: [{ id: user.uid }, { legacyFirebaseUid: user.uid }] },
    });
    const sub = await this.prisma.subscription.findFirst({
      where: { userId: row?.id || user.uid },
      orderBy: { updatedAt: 'desc' },
    });
    return {
      authenticated: true,
      uid: user.uid,
      email: row?.email || user.email,
      displayName: row?.displayName || row?.name,
      accountType: user.accountType,
      isAdmin: user.isAdmin,
      subscriptionPlan: sub?.plan || 'Individual',
      subscriptionStatus: sub?.status || 'active',
    };
  }

  async listSessions(user: AuthUser, userAgent?: string) {
    return {
      success: true,
      incomplete: true,
      stub: true,
      message: 'Multi-device session listing is not implemented; showing current session only.',
      sessions: [
        {
          id: 'sess_current',
          uid: user.uid,
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
          userAgent: userAgent || 'unknown',
          current: true,
        },
      ],
    };
  }

  /**
   * Ensure public.User.id === auth.users.id.
   * Remaps existing email / legacyFirebaseUid rows when needed.
   */
  private async upsertSupabaseUser(
    authUserId: string,
    email: string | undefined,
    accountType: string,
  ): Promise<AuthUser> {
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error('Supabase user email is required to provision application User');
    }

    const byId = await this.prisma.user.findUnique({ where: { id: authUserId } });
    if (byId) {
      const existingIsAdmin =
        (byId.accountType || '').toLowerCase() === 'admin' ||
        (byId.role || '').toLowerCase() === 'admin';
      await this.prisma.user.update({
        where: { id: byId.id },
        data: {
          email: normalizedEmail,
          ...(!existingIsAdmin ? { accountType } : {}),
        },
      });
      return this.toAuthUser(byId.id);
    }

    const byLegacy = await this.prisma.user.findFirst({
      where: { legacyFirebaseUid: authUserId },
    });
    if (byLegacy) {
      if (byLegacy.id !== authUserId) {
        await remapUserPrimaryKey(this.prisma.client, byLegacy.id, authUserId);
      }
      return this.toAuthUser(authUserId);
    }

    const byEmail = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (byEmail) {
      if (byEmail.id !== authUserId) {
        this.logger.log(
          `Remapping User ${byEmail.id} → ${authUserId} for email ${normalizedEmail}`,
        );
        await remapUserPrimaryKey(this.prisma.client, byEmail.id, authUserId);
      }
      const existingIsAdmin =
        (byEmail.accountType || '').toLowerCase() === 'admin' ||
        (byEmail.role || '').toLowerCase() === 'admin';
      await this.prisma.user.update({
        where: { id: authUserId },
        data: {
          email: normalizedEmail,
          legacyFirebaseUid: byEmail.legacyFirebaseUid ?? byEmail.id,
          ...(!existingIsAdmin ? { accountType } : {}),
        },
      });
      return this.toAuthUser(authUserId);
    }

    await this.prisma.user.create({
      data: {
        id: authUserId,
        email: normalizedEmail,
        accountType,
      },
    });
    return this.toAuthUser(authUserId);
  }

  private setSessionCookies(
    res: Response,
    sessionValue: string,
    accountType: string,
    isMock: boolean,
  ) {
    const base = cookieBaseOptions();
    const maxAge = SESSION_EXPIRES_MS;
    res.cookie(SESSION_COOKIE, sessionValue, {
      ...base,
      httpOnly: true,
      maxAge,
    });
    res.cookie(ACCT_COOKIE, accountType === 'admin' ? 'admin' : accountType, {
      ...base,
      httpOnly: false,
      maxAge,
    });
    res.cookie(SUB_COOKIE, encodeSub('Individual', 'active'), {
      ...base,
      httpOnly: false,
      maxAge,
    });
    if (isMock) {
      this.logger.debug('Issued mock session cookies');
    }
  }
}

/**
 * Vercel (FE) → Cloud Run (API) is cross-site. Browsers only send credentials
 * cookies when SameSite=None; Secure. Use COOKIE_SAMESITE=lax only if FE and
 * API share a registrable domain (e.g. paperworking.co + api.paperworking.co).
 */
function cookieBaseOptions(): {
  path: string;
  secure: boolean;
  sameSite: 'lax' | 'none';
} {
  const sameSiteEnv = (process.env.COOKIE_SAMESITE || '').trim().toLowerCase();
  const production = process.env.NODE_ENV === 'production';
  const sameSite: 'lax' | 'none' =
    sameSiteEnv === 'lax'
      ? 'lax'
      : sameSiteEnv === 'none' || production
        ? 'none'
        : 'lax';
  return {
    path: '/',
    secure: production || sameSite === 'none',
    sameSite,
  };
}

function normalizeClientAccountType(value: unknown): string {
  if (typeof value !== 'string') return 'investor';
  const n = value.trim().toLowerCase();
  if (n === 'vendor') return 'vendor';
  if (n === 'investment_team') return 'investment_team';
  return 'investor';
}

function encodeSub(plan: string, status: string): string {
  return Buffer.from(JSON.stringify({ plan, status }), 'utf8').toString('base64url');
}
