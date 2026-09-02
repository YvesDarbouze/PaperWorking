import { Injectable, Logger, Optional } from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  createDefaultIdentityDeps,
  type IdentityVerificationDeps,
} from '@paperworking/identity';
import {
  buildAuthUserForUid,
  buildSessionCookieDescriptors,
  createIdentityProvisioningService,
  createPrismaSessionUserStore,
  resolveAuthUserFromAccessToken,
  sessionCommandService,
  type SessionUserStore,
} from '@paperworking/services';
import type { AuthUser } from '@paperworking/authz';
import { createPrismaIdentityUserRepository, type ApiPrismaClient } from '@paperworking/database';
import { PrismaService } from '../prisma/prisma.service.js';
import { readCookie } from './auth-cookies.js';
import { SESSION_COOKIE } from './auth.types.js';
import { buildAuthMeResponse } from '../routes/auth/me/handler.js';
import { buildAuthSessionsResponse } from '../routes/auth/sessions/handler.js';

function resolveApiPrismaClient(prisma: PrismaService): ApiPrismaClient {
  if (prisma.client?.user) return prisma.client;
  return prisma as unknown as ApiPrismaClient;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly identityDeps: IdentityVerificationDeps;
  private readonly sessionStore: SessionUserStore;
  private readonly identityUserRepository;
  private readonly identityProvisioning;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() identityDeps?: IdentityVerificationDeps,
  ) {
    this.identityDeps = identityDeps ?? createDefaultIdentityDeps();
    const prismaClient = resolveApiPrismaClient(this.prisma);
    this.sessionStore = createPrismaSessionUserStore(prismaClient);
    this.identityUserRepository = createPrismaIdentityUserRepository(prismaClient);
    this.identityProvisioning = createIdentityProvisioningService({
      repository: this.identityUserRepository,
      sessionStore: this.sessionStore,
      onRemap: (oldId, newId, email) => {
        this.logger.log(`Remapping User ${oldId} → ${newId} for email ${email}`);
      },
    });
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
    const mockEnabled = this.mockAuthEnabled();
    const accessToken = body.accessToken || body.idToken;

    if (!accessToken) {
      return { status: 400, body: { error: 'accessToken required' } };
    }

    if (this.hasIdentityCredentials() && !accessToken.startsWith('mock')) {
      const result = await sessionCommandService.establishSession({
        accessToken,
        accountType: body.accountType,
        identity: this.identityDeps,
        identityProvisioning: this.identityProvisioning,
        subscriptionLookup: this.subscriptionLookup(),
        policy: 'nest',
      });

      if (!result.ok) {
        if (result.status === 401) {
          this.logger.warn('createSession verify failed');
        }
        return { status: result.status, body: result.body };
      }

      for (const cookie of result.cookies) {
        res.cookie(cookie.name, cookie.value, cookie.options);
      }
      return { ok: true, uid: result.uid };
    }

    if (mockEnabled) {
      const cookie = `mock:${accessToken}`;
      const authUser = await this.ensureDevUser();
      await this.applyMockSessionCookies(res, cookie, authUser.uid);
      return { ok: true, uid: authUser.uid };
    }

    return { status: 503, body: { error: 'Identity provider credentials not configured' } };
  }

  private async applyMockSessionCookies(res: Response, sessionValue: string, uid: string) {
    const authUser = await this.toAuthUser(uid);
    const subscription = await this.subscriptionLookup().findForUserId(uid);
    for (const cookie of buildSessionCookieDescriptors({
      policy: 'nest',
      sessionValue,
      authUserAccountType: authUser.accountType,
      subscription,
    })) {
      res.cookie(cookie.name, cookie.value, cookie.options);
    }
    this.logger.debug('Issued mock session cookies');
  }

  async clearSession(res: Response): Promise<void> {
    for (const cookie of sessionCommandService.buildClearSessionCookies({ policy: 'nest' })) {
      res.clearCookie(cookie.name, { ...cookie.options, httpOnly: cookie.options.httpOnly });
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

  private subscriptionLookup() {
    return {
      findForUserId: async (userId: string) => {
        const user = await this.prisma.user.findFirst({
          where: { OR: [{ id: userId }, { legacyFirebaseUid: userId }] },
        });
        const sub = await this.prisma.subscription.findFirst({
          where: { userId: user?.id || userId },
          orderBy: { updatedAt: 'desc' },
        });
        return sub ? { plan: sub.plan, status: sub.status } : null;
      },
    };
  }

  private hasIdentityCredentials(): boolean {
    return (
      Boolean(this.identityDeps.supabase?.hasCredentials()) ||
      Boolean(this.identityDeps.firebase?.hasCredentials())
    );
  }
}

export { normalizeClientAccountType } from './account-type.js';
