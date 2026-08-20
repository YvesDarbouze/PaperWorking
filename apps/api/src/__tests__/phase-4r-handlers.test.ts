import { describe, expect, it } from '@jest/globals';
import { handleTaxPackagePost } from '../routes/tax/package/handler.js';
import { handleTax1040EsPost } from '../routes/tax/1040-es/handler.js';
import { handleRulesApplyPost } from '../routes/rules/apply/handler.js';
import { handleAuthIpGet } from '../routes/auth/ip/handler.js';
import { handleAuthRevokePost } from '../routes/auth/revoke/handler.js';
import { handleAccountDataDownloadPost } from '../routes/account/data/download/handler.js';
import {
  handleAccountDataDeleteGet,
  handleAccountDataDeletePost,
} from '../routes/account/data/delete/handler.js';
import { handleEmailsSendPost } from '../routes/emails/send/handler.js';
import { handleEsignCreatePost } from '../routes/esign/create/handler.js';
import { handleEsignStatusGet } from '../routes/esign/status/handler.js';
import { handleFundCloseDealPost } from '../routes/fund/close-deal/handler.js';
import { handleExitCompletePost } from '../routes/exit/complete/handler.js';

const adminAuth = { uid: 'user-1', email: 'lead@test.com' };

describe('Phase 4r route handlers', () => {
  it('tax package and 1040-es handlers', async () => {
    const pkg = await handleTaxPackagePost(
      { projectId: 'proj-1', taxYear: 2025 },
      { requireAuth: async () => adminAuth },
    );
    expect(pkg.status).toBe(200);
    expect((pkg.body as { documents: unknown[] }).documents.length).toBeGreaterThan(0);

    const es = await handleTax1040EsPost(
      { projectId: 'proj-1', taxYear: 2026 },
      { requireAuth: async () => adminAuth },
    );
    expect(es.status).toBe(200);
    expect(es.headers?.['Content-Type']).toBe('application/pdf');
  });

  it('rules apply + auth ip/revoke', async () => {
    const apply = await handleRulesApplyPost('rule-1', {
      requireAuth: async () => adminAuth,
      applyRule: async () => ({ updatedCount: 2 }),
    });
    expect(apply.status).toBe(200);

    const ip = await handleAuthIpGet({ headers: { 'x-forwarded-for': '9.9.9.9' } });
    expect((ip.body as { ip: string }).ip).toBe('9.9.9.9');

    const revoke = await handleAuthRevokePost(
      { idToken: 'token' },
      { revokeSessions: async () => undefined },
    );
    expect(revoke.status).toBe(200);
  });

  it('account GDPR download/delete handlers', async () => {
    const download = await handleAccountDataDownloadPost({
      requireAuth: async () => adminAuth,
      buildExportZip: async () => new Uint8Array([1, 2, 3]),
    });
    expect(download.headers?.['Content-Type']).toBe('application/zip');

    const status = await handleAccountDataDeleteGet({
      requireAuth: async () => adminAuth,
      getDeletionJob: async () => null,
    });
    expect((status.body as { active: boolean }).active).toBe(false);

    const del = await handleAccountDataDeletePost({
      requireAuth: async () => adminAuth,
      executeDeletion: async () => ({ step: 'completed', message: 'done' }),
    });
    expect(del.status).toBe(200);
  });

  it('emails send + esign create/status', async () => {
    const email = await handleEmailsSendPost(
      {
        idToken: 'tok',
        projectId: 'p1',
        to: ['a@test.com'],
        subject: 'Update',
        html: '<p>Hi</p>',
      },
      {
        verifyIdToken: async () => ({ uid: 'user-1' }),
        verifyProjectAccess: async () => ({ ok: true }),
        sendCustomEmail: async () => ({ success: true, messageId: 'm1' }),
      },
    );
    expect(email.status).toBe(200);

    const create = await handleEsignCreatePost(
      {
        projectId: 'p1',
        documentId: 'd1',
        documentName: 'Sub Agreement',
        signerRole: 'Investor',
        signerEmail: 'inv@test.com',
        signerName: 'Investor',
        documentUrl: 'https://files/sub.pdf',
      },
      {
        requireAuth: async () => adminAuth,
        verifyProjectMembership: async () => true,
        createEnvelope: async () => ({
          envelopeId: 'env-1',
          status: 'sent',
          provider: 'mock',
        }),
      },
    );
    expect(create.status).toBe(200);

    const status = await handleEsignStatusGet('env-1', {
      requireAuth: async () => adminAuth,
      getEnvelopeStatus: async () => ({ status: 'completed', envelopeId: 'env-1' }),
      reconcileStatus: async () => undefined,
    });
    expect(status.status).toBe(200);
  });

  it('fund close-deal and exit complete handlers', async () => {
    const close = await handleFundCloseDealPost(
      { projectId: 'p1', finalPurchasePrice: 300000 },
      {
        requireAuth: async () => adminAuth,
        closeDeal: async () => undefined,
      },
    );
    expect(close.status).toBe(200);

    const exit = await handleExitCompletePost(
      { projectId: 'p1', strategy: 'Sell' },
      {
        requireAuth: async () => adminAuth,
        loadProjectFinancials: async () => ({ purchasePrice: 25000000 }),
        completeExit: async () => ({
          pdfBuffer: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
          fileName: 'TaxPacket_p1.pdf',
        }),
      },
    );
    expect(exit.status).toBe(200);
    expect(exit.headers?.['Content-Type']).toBe('application/pdf');
  });
});
