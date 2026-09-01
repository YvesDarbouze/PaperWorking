import { Injectable, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  createDefaultIdentityDeps,
  verifyAccessToken,
  type IdentityVerificationDeps,
} from '@paperworking/identity';
import {
  buildAuthUserForUid,
  createPrismaSessionUserStore,
  normalizeClientAccountType,
  resolveAuthUserFromAccessToken,
  type SessionUserStore,
} from '@paperworking/services';
import type { AuthUser } from '@paperworking/authz';
import { PrismaService } from '../prisma/prisma.service.js';
import { readCookie } from './auth-cookies.js';
import { ACCT_COOKIE, SESSION_COOKIE, SUB_COOKIE } from './auth.types.js';
import { remapUserPrimaryKey } from './user-id-remap.js';
import { buildAuthMeResponse } from '../routes/auth/me/handler.js';
import { buildAuthSessionsResponse } from '../routes/auth/sessions/handler.js';

const SESSION_EXPIRES_MS = 1000 * 60 * 60 * 24 * 5; // 5 days

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly identityDeps: IdentityVerificationDeps;
  private readonly sessionStore: SessionUserStore;

  constructor(
    private readonly prisma: PrismaService,
    identityDeps?: IdentityVerificationDeps,
  ) {
    this.identityDeps = identityDeps ?? createDefaultIdentityDeps();
    this.sessionStore = createPrismaSessionUserStore(this.prisma);
  }

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
      if (this.hasIdentityCredentials() && !token.startsWith('mock')) {
        const user = await resolveAuthUserFromAccessToken(token, this.sessionDeps());
        if (user) return user;
      }
    }

    const session = readCookie(req, SESSION_COOKIE);
    if (!session) return null;

    if (session.startsWith('mock:') && this.mockAuthEnabled()) {
      return this.ensureDevUser();
    }

    if (this.hasIdentityCredentials()) {
      const user = await resolveAuthUserFromAccessToken(session, this.sessionDeps());
      if (!user) {
        this.logger.warn('Invalid session cookie');
      }
      return user;
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

  private async toAuthUser(uid: string): Promise<AuthUser> {
    return buildAuthUserForUid(uid, this.sessionStore);
  }

  private sessionDeps() {
    return {
      identity: this.identityDeps,
      store: this.sessionStore,
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

    if (this.hasIdentityCredentials() && !accessToken.startsWith('mock')) {
      try {
        const decoded = await this.verifyIdentityToken(accessToken);
        const authUser = await this.upsertIdentityUser(
          decoded.uid,
          decoded.email,
          accountType,
        );
        await this.setSessionCookies(res, accessToken, authUser.uid, false);
        return { ok: true, uid: authUser.uid };
      } catch (err) {
        this.logger.warn(`createSession verify failed: ${(err as Error).message}`);
        return { status: 401, body: { error: 'Invalid access token' } };
      }
    }

    if (mockEnabled) {
      const cookie = `mock:${accessToken}`;
      const authUser = await this.ensureDevUser();
      await this.setSessionCookies(res, cookie, authUser.uid, true);
      return { ok: true, uid: authUser.uid };
    }

    return { status: 503, body: { error: 'Identity provider credentials not configured' } };
  }

  async clearSession(res: Response): Promise<void> {
    const base = cookieBaseOptions();
    for (const name of [SESSION_COOKIE, ACCT_COOKIE, SUB_COOKIE]) {
      res.clearCookie(name, { ...base, httpOnly: name === SESSION_COOKIE });
    }
  }

  async getMe(user: AuthUser) {
    return buildAuthMeResponse(user, {
      findUser: (uid) =>
        this.prisma.user.findFirst({
          where: { OR: [{ id: uid }, { legacyFirebaseUid: uid }] },
        }),
      findSubscription: (userId) =>
        this.prisma.subscription.findFirst({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
        }),
    });
  }

  async listSessions(user: AuthUser, userAgent?: string) {
    return buildAuthSessionsResponse(user, userAgent);
  }

  /**
   * Ensure public.User.id === IdP uid (Firebase or Supabase).
   * Remaps existing email / legacyFirebaseUid rows when needed.
   */
  private async upsertIdentityUser(
    authUserId: string,
    email: string | undefined,
    accountType: string,
  ): Promise<AuthUser> {
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error('Identity user email is required to provision application User');
    }

    const byId = await this.prisma.user.findUnique({ where: { id: authUserId } });
    if (byId) {
      // Existing user: sync email only — never overwrite authoritative accountType from client.
      await this.prisma.user.update({
        where: { id: byId.id },
        data: { email: normalizedEmail },
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
      await this.prisma.user.update({
        where: { id: authUserId },
        data: {
          email: normalizedEmail,
          legacyFirebaseUid: byEmail.legacyFirebaseUid ?? byEmail.id,
        },
      });
      return this.toAuthUser(authUserId);
    }

    // First-time provisioning: client accountType accepted once (admin never accepted).
    await this.prisma.user.create({
      data: {
        id: authUserId,
        email: normalizedEmail,
        accountType,
      },
    });
    return this.toAuthUser(authUserId);
  }

  /**
   * Display-only cookies (__acct, __sub) mirror DB state for UX — never used for authz.
   */
  private async setSessionCookies(
    res: Response,
    sessionValue: string,
    uid: string,
    isMock: boolean,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ id: uid }, { legacyFirebaseUid: uid }] },
    });
    const sub = await this.prisma.subscription.findFirst({
      where: { userId: user?.id || uid },
      orderBy: { updatedAt: 'desc' },
    });
    const authUser = await this.toAuthUser(uid);
    const base = cookieBaseOptions();
    const maxAge = SESSION_EXPIRES_MS;
    res.cookie(SESSION_COOKIE, sessionValue, {
      ...base,
      httpOnly: true,
      maxAge,
    });
    res.cookie(
      ACCT_COOKIE,
      authUser.accountType === 'admin' ? 'admin' : authUser.accountType,
      {
        ...base,
        httpOnly: false,
        maxAge,
      },
    );
    res.cookie(
      SUB_COOKIE,
      encodeSub(sub?.plan || 'Individual', sub?.status || 'active'),
      {
        ...base,
        httpOnly: false,
        maxAge,
      },
    );
    if (isMock) {
      this.logger.debug('Issued mock session cookies');
    }
  }

  private hasIdentityCredentials(): boolean {
    return (
      Boolean(this.identityDeps.supabase?.hasCredentials()) ||
      Boolean(this.identityDeps.firebase?.hasCredentials())
    );
  }

  private verifyIdentityToken(token: string) {
    return verifyAccessToken(token, this.identityDeps);
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

export { normalizeClientAccountType } from './account-type.js';

function encodeSub(plan: string, status: string): string {
  return Buffer.from(JSON.stringify({ plan, status }), 'utf8').toString('base64url');
}
