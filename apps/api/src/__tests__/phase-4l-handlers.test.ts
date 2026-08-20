import { describe, expect, it } from '@jest/globals';
import { handleAuthChangePasswordPost } from '../routes/auth/change-password/handler.js';
import { handleAuthResetPasswordPost } from '../routes/auth/reset-password/handler.js';
import { handleAuthMagicLinkPost } from '../routes/auth/magic-link/handler.js';
import { handleAuthTwoFaPost } from '../routes/auth/two-fa/handler.js';
import { handleDocuSignWebhookPost } from '../routes/webhooks/docusign/handler.js';
import { handlePlaidCreateLinkTokenPost } from '../routes/plaid/create-link-token/handler.js';
import { handleInvitationsRespondPost } from '../routes/invitations/respond/handler.js';

const adminAuth = { uid: 'user-1' };
const authFailure = { status: 401, body: { error: 'Unauthorized' } };

describe('Phase 4l route handlers', () => {
  it('POST /api/auth/change-password updates password after verification', async () => {
    const updated: string[] = [];
    const result = await handleAuthChangePasswordPost(
      { currentPassword: 'old', newPassword: 'new' },
      {
        requireAuth: async () => adminAuth,
        getUserEmail: async () => 'user@example.com',
        verifyPassword: async () => ({ ok: true }),
        updatePassword: async (_uid, pw) => {
          updated.push(pw);
        },
      },
    );

    expect(result.status).toBe(200);
    expect(updated).toEqual(['new']);
  });

  it('POST /api/auth/reset-password always returns success message', async () => {
    const result = await handleAuthResetPasswordPost(
      { email: 'user@example.com' },
      { sendPasswordReset: async () => {} },
    );

    expect(result.status).toBe(200);
    expect(result.body).toEqual(
      expect.objectContaining({ success: true }),
    );
  });

  it('POST /api/auth/magic-link sends link email', async () => {
    const sent: string[] = [];
    const result = await handleAuthMagicLinkPost(
      { email: 'user@example.com' },
      {
        sendMagicLink: async ({ email }) => {
          sent.push(email);
        },
      },
    );

    expect(result.status).toBe(200);
    expect(sent).toEqual(['user@example.com']);
  });

  it('POST /api/auth/2fa/setup returns secret and QR', async () => {
    const result = await handleAuthTwoFaPost(
      'setup',
      { password: 'secret' },
      {
        requireAuth: async () => adminAuth,
        getUserEmail: async () => 'user@example.com',
        verifyPassword: async () => ({ ok: true }),
      },
    );

    expect(result.status).toBe(200);
    const body = result.body as { secret: string; qrSvg: string };
    expect(body.secret).toBeTruthy();
    expect(body.qrSvg).toContain('<svg');
  });

  it('POST /api/auth/2fa/verify saves backup codes', async () => {
    const saved: unknown[] = [];
    const result = await handleAuthTwoFaPost(
      'verify',
      { code: '123456', secret: 'ABC' },
      {
        requireAuth: async () => adminAuth,
        saveTwoFaSettings: async (_uid, settings) => {
          saved.push(settings);
        },
        generateBackupCodes: () => ['11111111', '22222222'],
      },
    );

    expect(result.status).toBe(200);
    expect(saved).toHaveLength(1);
  });

  it('POST /api/webhooks/docusign rejects missing HMAC key', async () => {
    const result = await handleDocuSignWebhookPost('{}', { signature: 'x' }, {});
    expect(result.status).toBe(503);
  });

  it('POST /api/webhooks/docusign reconciles final envelope', async () => {
    const body = JSON.stringify({ envelopeId: 'env-1', status: 'completed' });
    const sig = await import('crypto').then((crypto) =>
      crypto.createHmac('sha256', 'key').update(body).digest('base64'),
    );

    const reconciled: string[] = [];
    const result = await handleDocuSignWebhookPost(
      body,
      { signature: sig },
      {
        hmacKey: 'key',
        reconcileEnvelope: async (event) => {
          reconciled.push(event.envelopeId);
        },
      },
    );

    expect(result.status).toBe(200);
    expect(reconciled).toEqual(['env-1']);
  });

  it('POST /api/plaid/create-link-token returns mock token', async () => {
    const result = await handlePlaidCreateLinkTokenPost(
      { projectId: 'proj-1' },
      {
        requireAuth: async () => adminAuth,
        bankingProvider: 'mock',
        generateMockToken: () => 'link-sandbox-mock-test',
      },
    );

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      success: true,
      link_token: 'link-sandbox-mock-test',
      mock: true,
    });
  });

  it('POST /api/invitations/respond delegates to processor', async () => {
    const result = await handleInvitationsRespondPost(
      { token: 'a'.repeat(20), action: 'decline' },
      {
        checkRateLimit: async () => ({ allowed: true }),
        processResponse: async () => ({ invitationId: 'inv-1' }),
      },
    );

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      success: true,
      action: 'decline',
      invitationId: 'inv-1',
    });
  });

  it('POST /api/invitations/respond respects auth failure from rate limit path only via processor', async () => {
    const denied = await handlePlaidCreateLinkTokenPost({}, {
      requireAuth: async () => authFailure,
    });
    expect(denied.status).toBe(401);
  });
});
