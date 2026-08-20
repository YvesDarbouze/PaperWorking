import { describe, expect, it } from '@jest/globals';
import {
  isUserAdmin,
  validateTeamInviteBody,
  countOtherActiveAdmins,
} from '../lib/team/helpers.js';
import {
  validateChangePlanBody,
  addPaymentMethod,
  setDefaultPaymentMethod,
  removePaymentMethod,
} from '../lib/billing/helpers.js';
import { computeExportJobStatus } from '../lib/data/export.js';
import {
  buildProfileResponse,
  validateBillingContactUpdate,
  buildIntegrationConnectUpdates,
} from '../lib/settings/sections.js';
import {
  buildIntegrationCallbackHtml,
  parseIntegrationActionPath,
} from '../lib/integrations/oauth.js';
import {
  validateCalendarSyncBody,
  mapCalendarEvents,
  isInvalidGrantError,
} from '../lib/calendar/helpers.js';
import { validateMcpAuthorization } from '../lib/mcp/auth.js';

describe('Phase 4x libs', () => {
  it('team helpers', () => {
    expect(isUserAdmin('Lead Investor')).toBe(true);
    expect(validateTeamInviteBody({ email: 'a@b.com', role: 'Admin' }).ok).toBe(true);
    expect(
      countOtherActiveAdmins(
        [
          { id: '1', role: 'Admin', status: 'active' },
          { id: '2', role: 'Admin', status: 'active' },
        ],
        '1',
      ),
    ).toBe(1);
  });

  it('billing helpers', () => {
    expect(validateChangePlanBody({ planId: 'Team' }).ok).toBe(true);
    const methods = addPaymentMethod([], {
      id: 'pm_1',
      brand: 'visa',
      last4: '4242',
    });
    expect(methods[0].isDefault).toBe(true);
    expect(setDefaultPaymentMethod(methods, 'pm_1')[0].isDefault).toBe(true);
    expect(removePaymentMethod(methods, 'pm_1')).toHaveLength(0);
  });

  it('data export status simulation', () => {
    const ready = computeExportJobStatus({
      id: 'job-1',
      createdAtMs: Date.now() - 20_000,
    });
    expect(ready.status).toBe('Ready for Download');
    expect(ready.downloadUrl).toContain('download-export');
  });

  it('settings and integrations helpers', () => {
    expect(buildProfileResponse({ displayName: 'User' }).name).toBe('User');
    expect(validateBillingContactUpdate({ billingEmail: 'bad' }).ok).toBe(false);
    expect(buildIntegrationConnectUpdates('google-drive').googleDriveConnected).toBe(true);
    expect(parseIntegrationActionPath(['slack', 'authorize']).action).toBe('authorize');
    expect(buildIntegrationCallbackHtml('slack')).toContain('INTEGRATION_SUCCESS');
  });

  it('calendar and mcp helpers', () => {
    expect(
      validateCalendarSyncBody({
        idToken: 'tok',
        projectId: 'p1',
        title: 'Closing',
        date: '2026-01-01T10:00:00.000Z',
      }).ok,
    ).toBe(true);
    expect(mapCalendarEvents([{ id: '1', summary: 'Event', start: { dateTime: '2026-01-01' } }])[0].summary).toBe('Event');
    expect(isInvalidGrantError('invalid_grant')).toBe(true);
    expect(validateMcpAuthorization('Bearer secret', 'secret').ok).toBe(true);
    expect(validateMcpAuthorization('Bearer wrong', 'secret').ok).toBe(false);
  });
});
