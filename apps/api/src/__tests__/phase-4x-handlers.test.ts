import { describe, expect, it } from '@jest/globals';
import {
  handleTeamGet,
  handleTeamPost,
  handleTeamPut,
  handleTeamDelete,
} from '../routes/team/handler.js';
import {
  handleBillingGet,
  handleBillingPost,
  handleBillingPut,
} from '../routes/billing/handler.js';
import { handleDataGet, handleDataPost } from '../routes/data/handler.js';
import {
  handleSettingsGet,
  handleSettingsPut,
  handleSettingsPost,
} from '../routes/settings/handler.js';
import {
  handleIntegrationsActionGet,
  handleIntegrationsActionDelete,
} from '../routes/integrations/action/handler.js';
import {
  handleIntegrationsGoogleDriveAuthorizeGet,
  handleIntegrationsGoogleDriveCallbackGet,
} from '../routes/integrations/google-drive/handler.js';
import { handleIntegrationsMlsConnectPost } from '../routes/integrations/mls/connect/handler.js';
import {
  handleCalendarAuthGet,
  handleCalendarEventsGet,
  handleCalendarSyncPost,
} from '../routes/calendar/handler.js';
import {
  handleMcpTransportGet,
  handleMcpTransportPost,
} from '../routes/mcp/transport/handler.js';

const auth = { uid: 'user-1', email: 'user@test.com' };

describe('Phase 4x handlers', () => {
  it('team handlers', async () => {
    const list = await handleTeamGet(['members'], {
      requireAuth: async () => auth,
      loadContext: async () => ({ orgId: 'org-1', userData: { role: 'Admin' } }),
      listMembers: async () => ({ members: [{ id: 'm1' }], invites: [] }),
    });
    expect(list.status).toBe(200);

    const invite = await handleTeamPost(
      ['invite'],
      { email: 'new@test.com', role: 'Deal Lead' },
      {
        requireAuth: async () => auth,
        loadContext: async () => ({ orgId: 'org-1', userData: { email: 'admin@test.com' } }),
        createInvite: async () => ({ inviteId: 'inv-1' }),
      },
    );
    expect(invite.status).toBe(200);

    const role = await handleTeamPut(
      ['members', 'm2', 'role'],
      { role: 'Contributor' },
      {
        requireAuth: async () => auth,
        loadContext: async () => ({ orgId: 'org-1', userData: { role: 'Admin' } }),
        loadMember: async () => ({ id: 'm2', role: 'Contributor' }),
        updateRole: async () => undefined,
      },
    );
    expect(role.status).toBe(200);

    const del = await handleTeamDelete(['members', 'm2'], { hard: 'false' }, {
      requireAuth: async () => auth,
      loadContext: async () => ({ orgId: 'org-1', userData: {} }),
      loadMember: async () => ({ id: 'm2', role: 'Contributor' }),
      removeMember: async () => undefined,
    });
    expect(del.status).toBe(200);
  });

  it('billing and data handlers', async () => {
    const paymentMethods = await handleBillingGet(['payment-methods'], {
      requireAuth: async () => auth,
      loadUser: async () => ({ paymentMethods: [{ id: 'pm_1' }], invoices: [] }),
    });
    expect(paymentMethods.status).toBe(200);

    const changePlan = await handleBillingPost(
      ['change-plan'],
      { planId: 'Team' },
      {
        requireAuth: async () => auth,
        loadUser: async () => ({ paymentMethods: [], invoices: [] }),
        updateUser: async () => undefined,
      },
    );
    expect(changePlan.status).toBe(200);

    const defaultPm = await handleBillingPut(
      ['payment-methods', 'pm_1'],
      {},
      {
        requireAuth: async () => auth,
        loadUser: async () => ({
          paymentMethods: [{ id: 'pm_1' }, { id: 'pm_2' }],
          invoices: [],
        }),
        updateUser: async () => undefined,
      },
    );
    expect(defaultPm.status).toBe(200);

    const exportStatus = await handleDataGet(['export', 'status'], {
      requireAuth: async () => auth,
      loadContext: async () => ({ orgId: 'org-1' }),
      loadLatestJob: async () => ({ id: 'job-1', createdAtMs: Date.now() - 20_000 }),
      listHistory: async () => [{ id: 'job-1', createdAtMs: Date.now() - 20_000 }],
    });
    expect(exportStatus.status).toBe(200);

    const exportPost = await handleDataPost(['export'], {
      requireAuth: async () => auth,
      loadContext: async () => ({ orgId: 'org-1' }),
      createJob: async () => ({ jobId: 'job-2' }),
    });
    expect(exportPost.status).toBe(200);
  });

  it('settings handlers', async () => {
    const profile = await handleSettingsGet(['profile'], {}, {}, {
      requireAuth: async () => auth,
      loadUser: async () => ({ displayName: 'Lead', email: 'lead@test.com' }),
    });
    expect(profile.status).toBe(200);

    const putProfile = await handleSettingsPut(
      ['profile'],
      { firstName: 'Lead', lastName: 'Investor', phone: '555' },
      {
        requireAuth: async () => auth,
        loadUser: async () => ({ email: 'lead@test.com', role: 'Lead Investor' }),
        updateUser: async (_uid, patch) => patch,
      },
    );
    expect(putProfile.status).toBe(200);

    const invite = await handleSettingsPost(
      ['team', 'invite'],
      { email: 'member@test.com', role: 'Deal Lead' },
      {
        requireAuth: async () => auth,
        loadUser: async () => ({ organizationId: 'org-1' }),
        createTeamInvite: async () => undefined,
      },
    );
    expect(invite.status).toBe(200);
  });

  it('integrations and calendar handlers', async () => {
    const authorize = await handleIntegrationsActionGet(
      ['slack', 'authorize'],
      {},
      'https://app.test',
      {},
    );
    expect(authorize.status).toBe(302);

    const disconnect = await handleIntegrationsActionDelete(['slack', 'disconnect'], {
      requireAuth: async () => auth,
      resolveOrgId: async () => 'org-1',
      disconnect: async () => undefined,
    });
    expect(disconnect.status).toBe(200);

    const driveAuth = await handleIntegrationsGoogleDriveAuthorizeGet({
      requireAuth: async () => auth,
      buildAuthUrl: async () => 'https://accounts.google.com/auth',
    });
    expect(driveAuth.status).toBe(200);

    const driveCallback = await handleIntegrationsGoogleDriveCallbackGet(
      { code: 'abc', state: 'user-1' },
      { saveConnection: async () => undefined },
    );
    expect(driveCallback.status).toBe(200);

    const mls = await handleIntegrationsMlsConnectPost({
      requireAuth: async () => auth,
      testConnection: async () => ({ ok: true, message: 'ok', providerId: 'bridge' }),
      saveConnection: async () => undefined,
    });
    expect(mls.status).toBe(200);

    const calAuth = await handleCalendarAuthGet('session-cookie', {
      verifySession: async () => ({ uid: auth.uid }),
      buildAuthUrl: () => 'https://accounts.google.com/calendar',
    });
    expect(calAuth.status).toBe(302);

    const events = await handleCalendarEventsGet('session-cookie', {
      verifySession: async () => ({ uid: auth.uid }),
      loadRefreshToken: async () => 'refresh-token',
      fetchEvents: async () => [{ id: 'evt-1', summary: 'Closing', start: { dateTime: '2026-01-01' } }],
    });
    expect(events.status).toBe(200);

    const sync = await handleCalendarSyncPost(
      {
        idToken: 'id-token',
        projectId: 'p1',
        title: 'Inspection',
        date: '2026-01-15T10:00:00.000Z',
      },
      {
        verifyIdToken: async () => ({ uid: auth.uid }),
        verifyAccess: async () => ({ authorized: true, project: { propertyName: 'Maple' } }),
        hasServiceAccount: () => true,
        syncEvent: async () => ({ eventId: 'evt-1', htmlLink: 'https://calendar.google.com' }),
        persistEvent: async () => undefined,
      },
    );
    expect(sync.status).toBe(200);
  });

  it('mcp transport handlers', async () => {
    const get = await handleMcpTransportGet(
      'sse',
      { authorization: 'Bearer test-key' },
      {
        getApiKey: () => 'test-key',
        handleTransport: async () => ({ status: 200, body: { ok: true } }),
      },
    );
    expect(get.status).toBe(200);

    const post = await handleMcpTransportPost(
      'sse',
      { jsonrpc: '2.0' },
      { authorization: 'Bearer test-key' },
      {
        getApiKey: () => 'test-key',
        handleTransport: async () => ({ status: 200, body: { ok: true } }),
      },
    );
    expect(post.status).toBe(200);
  });
});
