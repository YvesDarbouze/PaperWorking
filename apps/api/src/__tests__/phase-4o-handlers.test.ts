import { describe, expect, it } from '@jest/globals';
import { handleMessagesGet, handleMessagesPost } from '../routes/messages/handler.js';
import { handleMessageReadPatch } from '../routes/messages/read/handler.js';
import { handleDashboardGet } from '../routes/dashboard/handler.js';
import { handleReconciliationPeriodGet } from '../routes/reconciliations/period/handler.js';
import { handleReconciliationFinalizePost } from '../routes/reconciliations/finalize/handler.js';
import { handleReconciliationMatchPost } from '../routes/reconciliations/match/handler.js';
import { handleReconciliationItemVerifyPost } from '../routes/reconciliations/items/verify/handler.js';
import {
  handleWorkspaceGet,
  handleWorkspacePut,
  handleWorkspacePost,
} from '../routes/workspace/handler.js';
import {
  handleNotificationPreferencesGet,
  handleNotificationPreferencesPut,
} from '../routes/user/notification-preferences/handler.js';
import {
  handleSecuritySettingsGet,
  handleSecuritySettingsPut,
} from '../routes/security/settings/handler.js';

const adminAuth = { uid: 'user-1' };

describe('Phase 4o route handlers', () => {
  it('GET /api/messages returns threads for inbox', async () => {
    const result = await handleMessagesGet(
      { userId: 'user-1' },
      {
        listMessages: async () => [
          { id: '1', threadId: 't1', read: false, createdAt: '2026-01-01', subject: 'Hi' },
        ],
      },
    );
    expect(result.status).toBe(200);
    expect((result.body as { threads: unknown[] }).threads).toHaveLength(1);
  });

  it('POST /api/messages creates message', async () => {
    const result = await handleMessagesPost(
      { senderId: 'a', recipientId: 'b', content: 'Hello' },
      {
        createMessage: async (input) => ({ ...input, read: false, createdAt: new Date().toISOString() }),
        generateMessageId: () => 'msg-fixed',
        generateThreadId: () => 'thread-fixed',
      },
    );
    expect(result.status).toBe(200);
    expect((result.body as { message: { id: string } }).message.id).toBe('msg-fixed');
  });

  it('PATCH /api/messages/[id]/read updates read state', async () => {
    const result = await handleMessageReadPatch(
      'msg-1',
      { read: false },
      { updateReadState: async (_id, read) => ({ id: 'msg-1', read }) },
    );
    expect(result.status).toBe(200);
    expect((result.body as { message: { read: boolean } }).message.read).toBe(false);
  });

  it('GET /api/dashboard loads payload', async () => {
    const result = await handleDashboardGet(
      { organizationId: 'org-1' },
      {
        requireAuth: async () => adminAuth,
        loadDashboard: async () => ({
          noi: { current: 1000, delta: 100, changePercent: 10, sparkline: [], insufficientData: false },
          activeProjects: { count: 2, distribution: {} },
        }),
      },
    );
    expect(result.status).toBe(200);
    expect((result.body as { noi: { current: number } }).noi.current).toBe(1000);
  });

  it('reconciliation period/match/finalize/verify handlers', async () => {
    const period = await handleReconciliationPeriodGet('period-1', {
      requireAuth: async () => adminAuth,
      getPeriod: async () => ({ id: 'period-1', status: 'OPEN' }),
    });
    expect(period.status).toBe(200);

    const matched = await handleReconciliationMatchPost('period-1', {
      requireAuth: async () => adminAuth,
      matchItems: async () => ({ id: 'period-1', status: 'MATCHED' }),
    });
    expect(matched.status).toBe(200);

    const finalized = await handleReconciliationFinalizePost(
      'period-1',
      { notes: 'done' },
      {
        requireAuth: async () => adminAuth,
        finalizeReconciliation: async () => ({ id: 'period-1', status: 'FINALIZED' }),
      },
    );
    expect(finalized.status).toBe(200);

    const verified = await handleReconciliationItemVerifyPost(
      'item-1',
      {},
      {
        requireAuth: async () => adminAuth,
        verifyItem: async () => ({ itemId: 'item-1', status: 'VERIFIED' }),
      },
    );
    expect(verified.status).toBe(200);
  });

  it('workspace GET/PUT/POST actions', async () => {
    const got = await handleWorkspaceGet({
      requireAuth: async () => adminAuth,
      getWorkspace: async () => ({ name: 'Acme' }),
    });
    expect(got.status).toBe(200);

    const updated = await handleWorkspacePut(
      { name: 'Acme 2' },
      {
        requireAuth: async () => adminAuth,
        updateWorkspace: async (_uid, patch) => patch,
      },
    );
    expect(updated.status).toBe(200);

    const logo = await handleWorkspacePost(
      'logo',
      { logoBase64: 'abc', format: 'png' },
      {
        requireAuth: async () => adminAuth,
        uploadLogo: async () => {},
      },
    );
    expect(logo.status).toBe(200);
  });

  it('notification preferences GET/PUT', async () => {
    const got = await handleNotificationPreferencesGet({
      requireAuth: async () => adminAuth,
      getPreferences: async () => ({ emailTransactionAlerts: true, emailAlertMinAmount: 50 }),
    });
    expect(got.status).toBe(200);

    const updated = await handleNotificationPreferencesPut(
      { emailDigestMode: 'DAILY_DIGEST' },
      {
        requireAuth: async () => adminAuth,
        updatePreferences: async (_uid, patch) => ({
          emailTransactionAlerts: true,
          emailAlertMinAmount: 0,
          ...patch,
        }),
      },
    );
    expect(updated.status).toBe(200);
  });

  it('security settings GET/PUT invalidates sessions when SSO enabled', async () => {
    let invalidated = false;
    const got = await handleSecuritySettingsGet({
      requireAuth: async () => adminAuth,
      getSettings: async () => ({
        ssoEnabled: false,
        twoFaRequired: false,
        sessionTimeout: '24 hours',
        ipAllowlist: '',
      }),
    });
    expect(got.status).toBe(200);

    const updated = await handleSecuritySettingsPut(
      { ssoEnabled: true },
      {
        requireAuth: async () => adminAuth,
        getSettings: async () => ({
          ssoEnabled: false,
          twoFaRequired: false,
          sessionTimeout: '24 hours',
          ipAllowlist: '',
        }),
        saveSettings: async (_uid, settings) => settings,
        invalidateOrgSessions: async () => {
          invalidated = true;
        },
      },
    );
    expect(updated.status).toBe(200);
    expect(invalidated).toBe(true);
  });
});
