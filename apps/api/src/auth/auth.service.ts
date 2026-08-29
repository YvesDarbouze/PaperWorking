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
import { FirebaseAdminService } from './firebase-admin.service.js';

const SESSION_EXPIRES_MS = 1000 * 60 * 60 * 24 * 5; // 5 days

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly firebase: FirebaseAdminService,
  ) {}

  mockAuthEnabled(): boolean {
    // Production can NEVER enable mock auth — even if ENABLE_MOCK_AUTH / USE_MOCK_DATA is true.
    if (process.env.NODE_ENV === 'production') return false;
    // Align with FE env.ts: USE_MOCK_DATA and ENABLE_MOCK_AUTH are interchangeable.
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
      if (this.firebase.hasCredentials()) {
        try {
          const decoded = await this.firebase.verifyIdToken(token);
          // Never pass cookies/headers for privilege — DB only.
          return this.toAuthUser(decoded.uid);
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

    if (this.firebase.hasCredentials()) {
      try {
        const decoded = await this.firebase.verifySessionCookie(session);
        return this.toAuthUser(decoded.uid);
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
    const uid = 'dev-user-1';
    await this.prisma.user.upsert({
      where: { email: 'dev@paperworking.test' },
      create: {
        id: uid,
        firebaseUid: uid,
        email: 'dev@paperworking.test',
        name: 'Dev User',
        displayName: 'Dev User',
        accountType: 'investor',
      },
      update: {},
    });
    // Privileges always from DB row — never from cookie/body.
    return this.toAuthUser(uid);
  }

  /**
   * Build AuthUser from database only.
   * Cookies (__acct), body.accountType, query, and headers MUST NOT grant admin.
   */
  private async toAuthUser(uid: string): Promise<AuthUser> {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ firebaseUid: uid }, { id: uid }] },
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
    body: { idToken?: string; accountType?: string },
  ): Promise<{ ok: true; uid: string } | { status: number; body: unknown }> {
    // Client may request investor/vendor only — never admin.
    const accountType = normalizeClientAccountType(body.accountType);
    const mockEnabled = this.mockAuthEnabled();

    if (!body.idToken) {
      return { status: 400, body: { error: 'idToken required' } };
    }

    if (this.firebase.hasCredentials() && !body.idToken.startsWith('mock')) {
      const decoded = await this.firebase.verifyIdToken(body.idToken);
      const cookie = await this.firebase.createSessionCookie(body.idToken, SESSION_EXPIRES_MS);
      const authUser = await this.upsertFirebaseUser(decoded.uid, accountType);
      // Cookie is UI hint only; authz ignores it.
      this.setSessionCookies(res, cookie, authUser.accountType, false);
      return { ok: true, uid: decoded.uid };
    }

    if (mockEnabled) {
      const cookie = `mock:${body.idToken}`;
      const authUser = await this.ensureDevUser();
      this.setSessionCookies(res, cookie, authUser.accountType, true);
      return { ok: true, uid: 'dev-user-1' };
    }

    return { status: 503, body: { error: 'Auth credentials not configured' } };
  }

  async clearSession(res: Response): Promise<void> {
    const secure = process.env.NODE_ENV === 'production';
    for (const name of [SESSION_COOKIE, ACCT_COOKIE, SUB_COOKIE]) {
      res.clearCookie(name, { path: '/', httpOnly: name === SESSION_COOKIE, secure, sameSite: 'lax' });
    }
  }

  async getMe(user: AuthUser) {
    const row = await this.prisma.user.findFirst({
      where: { OR: [{ id: user.uid }, { firebaseUid: user.uid }] },
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
    // Nest does not persist multi-device session rows — only the current cookie session.
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

  private async upsertFirebaseUser(uid: string, accountType: string): Promise<AuthUser> {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ firebaseUid: uid }, { id: uid }] },
    });
    if (existing) {
      const existingIsAdmin =
        (existing.accountType || '').toLowerCase() === 'admin' ||
        (existing.role || '').toLowerCase() === 'admin';
      // Never elevate to admin from client. Never downgrade existing admin.
      const data: { firebaseUid: string; accountType?: string } = { firebaseUid: uid };
      if (!existingIsAdmin) {
        data.accountType = accountType; // investor | vendor | investment_team only
      }
      await this.prisma.user.update({
        where: { id: existing.id },
        data,
      });
      return this.toAuthUser(existing.id);
    }
    await this.prisma.user.create({
      data: {
        id: uid,
        firebaseUid: uid,
        email: `${uid}@users.firebase`,
        accountType,
      },
    });
    return this.toAuthUser(uid);
  }

  private setSessionCookies(
    res: Response,
    sessionValue: string,
    accountType: string,
    isMock: boolean,
  ) {
    const secure = process.env.NODE_ENV === 'production';
    const maxAge = SESSION_EXPIRES_MS; // express cookie maxAge is milliseconds
    res.cookie(SESSION_COOKIE, sessionValue, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge,
    });
    // Display cookie only — AuthorizationService / toAuthUser never read this for privileges.
    res.cookie(ACCT_COOKIE, accountType === 'admin' ? 'admin' : accountType, {
      httpOnly: false,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge,
    });
    res.cookie(SUB_COOKIE, encodeSub('Individual', 'active'), {
      httpOnly: false,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge,
    });
    if (isMock) {
      this.logger.debug('Issued mock session cookies');
    }
  }
}

/** Client-supplied account type — admin is NEVER accepted from the client. */
function normalizeClientAccountType(value: unknown): string {
  if (typeof value !== 'string') return 'investor';
  const n = value.trim().toLowerCase();
  if (n === 'vendor') return 'vendor';
  if (n === 'investment_team') return 'investment_team';
  // Reject admin and unknown values — fall back to investor.
  return 'investor';
}

function encodeSub(plan: string, status: string): string {
  return Buffer.from(JSON.stringify({ plan, status }), 'utf8').toString('base64url');
}
