import { describe, expect, it } from '@jest/globals';
import { createHmac } from 'node:crypto';
import {
  validateBridgeAddressQuery,
  mapBridgeSearchRecords,
  validateBridgeLookupParams,
  buildBridgeMetadataResponse,
  isBridgeCredentialIssue,
} from '../lib/bridge/helpers.js';
import { verifyBridgeWebhookHmac } from '../lib/webhooks/bridge-hmac.js';
import { validateWorkerAuthorization, parseWorkerBatchSize } from '../lib/worker/drain.js';
import { validateRehabUpdateBody, mergeRehabData } from '../lib/projects/rehab.js';
import { validateTodosUpdateBody, validateTodoPermissionChanges } from '../lib/projects/todos.js';
import {
  validateLenderPackageAccess,
  buildCustomaryChecklistNames,
} from '../lib/projects/lender-package.js';
import {
  normalizeSelectedInstruments,
  validateLoanInstruments,
  buildLoanRecordsForInstrument,
} from '../lib/projects/loans.js';

describe('Phase 4y libs', () => {
  it('bridge query validation and mapping', () => {
    expect(validateBridgeAddressQuery('ab').ok).toBe(false);
    expect(validateBridgeAddressQuery('123 Main').ok).toBe(true);
    expect(validateBridgeLookupParams({ key: 'agent-1' }).ok).toBe(true);
    expect(
      mapBridgeSearchRecords([
        { ListingKey: '1', UnparsedAddress: '123 Main', ListPrice: 100000 },
      ])[0].address,
    ).toBe('123 Main');
    expect(buildBridgeMetadataResponse(['A', 'B']).metadata).toMatchObject({
      fieldCount: 2,
    });
    expect(isBridgeCredentialIssue('BRIDGE_CONFIG_FAILURE')).toBe(true);
  });

  it('webhook hmac and worker auth', () => {
    const secret = 'bridge-secret';
    const body = '{"event":"status"}';
    const signature = createHmac('sha256', secret).update(body).digest('hex');
    expect(verifyBridgeWebhookHmac(body, signature, secret)).toBe(true);
    expect(verifyBridgeWebhookHmac(body, 'bad-signature', secret)).toBe(false);
    expect(validateWorkerAuthorization('Bearer worker', 'worker').ok).toBe(true);
    expect(parseWorkerBatchSize('99')).toBe(20);
  });

  it('rehab and todos helpers', () => {
    expect(
      validateRehabUpdateBody({
        idToken: 'tok',
        projectId: 'p1',
        updates: { budget: 1000 },
      }).ok,
    ).toBe(true);
    expect(mergeRehabData({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
    expect(
      validateTodosUpdateBody({ idToken: 'tok', projectId: 'p1', todos: [] }).ok,
    ).toBe(true);
    expect(
      validateTodoPermissionChanges({
        currentActionItems: [{ id: 't1', completed: false }],
        proposedTodos: [{ id: 't1', completed: true }],
        profile: { subscriptionPlan: 'None', subscriptionStatus: 'inactive' },
        userEmail: 'user@test.com',
      }).ok,
    ).toBe(false);
  });

  it('lender package and loans helpers', () => {
    expect(validateLenderPackageAccess({ role: 'LP' }).ok).toBe(false);
    expect(buildCustomaryChecklistNames(['Conventional']).length).toBeGreaterThan(0);
    expect(normalizeSelectedInstruments({ instrument: 'Bridge' }).instruments).toEqual(['Bridge']);
    expect(validateLoanInstruments(['Conventional']).ok).toBe(true);
    expect(
      buildLoanRecordsForInstrument('p1', 'SBA 504', () => 'loan-1').length,
    ).toBe(2);
  });
});
