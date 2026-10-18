import { describe, expect, it, beforeEach } from '@jest/globals';
import {
  registerAuthUser,
  findAuthUserByEmail,
  findAuthUserByUid,
  clearAuthUsers,
  shouldAttemptFirestore,
} from '../lib/auth/user-store.js';
import { hashPassword, verifyPasswordHash } from '../lib/auth/password.js';
import { handleSessionPost } from '../routes/auth/session/handler.js';
import type { HttpRequestLike } from '../http/response.js';

function mockRequest(headers: Record<string, string> = {}): HttpRequestLike {
  const lower = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
  );
  return {
    headers: {
      get(name: string) {
        return lower[name.toLowerCase()] ?? null;
      },
    },
  };
}

describe('Auth User Store & Session Handler (v0 architecture)', () => {
  beforeEach(() => {
    clearAuthUsers();
  });

  describe('user-store operations (memory + seed fixtures)', () => {
    it('registers and retrieves a new user by email and UID', () => {
      const email = `newinvestor-${Date.now()}@paperworking.test`;
      const uid = `usr-${Date.now()}`;
      const password = 'StrongPassword2026!';
      const passwordHash = hashPassword(password);

      registerAuthUser({
        uid,
        email,
        passwordHash,
        accountType: 'investor',
        subscriptionPlan: 'Individual',
        subscriptionStatus: 'active',
        displayName: 'New Investor',
      });

      // Lookup by email with different casing/whitespace
      const foundByEmail = findAuthUserByEmail(`  ${email.toUpperCase()}  `);
      expect(foundByEmail).not.toBeNull();
      expect(foundByEmail?.uid).toBe(uid);
      expect(foundByEmail?.displayName).toBe('New Investor');
      expect(verifyPasswordHash(password, foundByEmail!.passwordHash)).toBe(true);

      // Lookup by UID
      const foundByUid = findAuthUserByUid(uid);
      expect(foundByUid).not.toBeNull();
      expect(foundByUid?.email).toBe(email.toLowerCase());
    });

    it('resolves seed users from local fixture on demand', () => {
      const seedUser = findAuthUserByEmail('e2e@paperworking.test');
      expect(seedUser).not.toBeNull();
      expect(seedUser?.email).toBe('e2e@paperworking.test');
      expect(seedUser?.accountType).toBe('investor');
    });

    it('returns null for nonexistent emails', () => {
      expect(findAuthUserByEmail('does-not-exist@nowhere.test')).toBeNull();
    });

    it('shouldAttemptFirestore guard returns false — the web BFF owns Firestore persistence', () => {
      expect(shouldAttemptFirestore()).toBe(false);
    });
  });

  describe('handleSessionPost (v0: Firebase idToken contract)', () => {
    it('rejects credential-only bodies without idToken with 400 — Firebase client owns credential auth', async () => {
      const request = mockRequest({ origin: 'http://localhost:3000' });
      const email = `signup-test-${Date.now()}@paperworking.test`;

      const result = await handleSessionPost(
        request,
        {
          email,
          password: 'AcctPassword2026!',
          fullName: 'Jane Doe Investor',
          accountType: 'investor',
          acceptTerms: true,
          agreedAt: new Date().toISOString(),
        },
        { env: { nodeEnv: 'test' } },
      );

      expect(result.status).toBe(400);
      expect(result.body).toMatchObject({ error: 'Missing or invalid idToken' });
      expect(findAuthUserByEmail(email)).toBeNull();
    });

    it('rejects non-idToken payloads regardless of acceptTerms', async () => {
      const request = mockRequest({ origin: 'http://localhost:3000' });
      const result = await handleSessionPost(
        request,
        {
          email: 'unregistered@test.com',
          password: 'AnyPassword123!',
        },
        { env: { nodeEnv: 'test' } },
      );

      expect(result.status).toBe(400);
      expect(result.body).toMatchObject({ error: 'Missing or invalid idToken' });
    });

    it('Bug_16 Regression: invalid and repeated-TLD emails never register through the session endpoint', async () => {
      const request = mockRequest({ origin: 'http://localhost:3000' });
      const invalidEmails = [
        'test@gmail.com.com.com.com',
        'test@gmail.com.com..com.com',
        'qatesthub3@gmail.com.com.com.com',
        'test@gmail.com.com',
        'user@domain.com.org',
      ];

      for (const badEmail of invalidEmails) {
        const result = await handleSessionPost(
          request,
          {
            email: badEmail,
            password: 'AcctPassword2026!',
            fullName: 'QA Test Hub',
            accountType: 'investor',
            acceptTerms: true,
            agreedAt: new Date().toISOString(),
          },
          { env: { nodeEnv: 'test' } },
        );

        expect(result.status).toBe(400);
        expect(findAuthUserByEmail(badEmail)).toBeNull();
      }
    });
  });
});
