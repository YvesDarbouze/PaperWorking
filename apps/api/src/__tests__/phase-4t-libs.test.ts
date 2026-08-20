import { describe, expect, it } from '@jest/globals';
import {
  buildCommitmentSignedTransition,
  checkSubscriptionInvitationExpiry,
  validateSubscriptionToken,
} from '../lib/invitations/subscription.js';
import {
  buildInvitationRecord,
  buildInviteUrl,
  canSendInvitation,
  validateSendInvitationBody,
} from '../lib/invitations/send.js';
import {
  buildIndicationUpdate,
  formatIndicationValue,
  validateIndicationBody,
} from '../lib/invitations/indication.js';
import { buildNewSubscriberContact, validateSubscribeBody } from '../lib/invitations/subscribe.js';
import { formatDealUpdateRow, validateUpdatesToken } from '../lib/invitations/updates.js';

describe('Phase 4t invitation libs', () => {
  it('validates indication body', () => {
    expect(validateIndicationBody({ type: 'percentage', value: 10 }).ok).toBe(true);
    expect(validateIndicationBody({ type: 'amount', value: 50000, currency: 'us' }).ok).toBe(false);
    expect(validateIndicationBody({ type: 'amount', value: 50000, currency: 'USD' }).ok).toBe(true);
  });

  it('builds indication update payload', () => {
    const update = buildIndicationUpdate('percentage', 25, null);
    expect(update.indication).toMatchObject({ type: 'percentage', value: 25 });
    expect(formatIndicationValue('amount', 1000, 'USD')).toContain('USD');
  });

  it('validates subscribe and updates tokens', () => {
    expect(validateSubscribeBody('tok', { email: 'a@b.com' }).ok).toBe(true);
    expect(validateUpdatesToken('short').ok).toBe(false);
    expect(validateUpdatesToken('a'.repeat(16)).ok).toBe(true);
  });

  it('formats deal update rows', () => {
    const row = formatDealUpdateRow('u1', {
      title: 'Update',
      body: 'Body',
      authorName: 'Lead',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    expect(row.id).toBe('u1');
    expect(row.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('builds subscriber contact and subscription transition', () => {
    const contact = buildNewSubscriberContact({ email: 'x@y.com', name: 'X', fallbackName: 'Y' });
    expect(contact.emailConsent).toBe(true);

    const transition = buildCommitmentSignedTransition({
      fromStatus: 'pending',
      actorEmail: 'x@y.com',
      action: 'esign',
    });
    expect(transition.toStatus).toBe('signed');
    expect(transition.evidence).toContain('DocuSign');
  });

  it('validates send invitation authorization helpers', () => {
    const body = validateSendInvitationBody({
      projectId: 'p1',
      email: 'a@b.com',
      name: 'A',
      proposedEquityPercent: 10,
    });
    expect(body.ok).toBe(true);

    expect(
      canSendInvitation({
        callerUid: 'u1',
        members: { u1: { role: 'Lead Investor' } },
        organizationId: 'org-1',
      }),
    ).toBe(true);

    const record = buildInvitationRecord({
      projectId: 'p1',
      dealName: 'Deal',
      organizationId: 'org-1',
      email: 'a@b.com',
      name: 'A',
      proposedEquityPercent: 10,
      proposedAmount: 0,
      invitedByUid: 'u1',
      invitedByName: 'Lead',
      token: 'tok',
    });
    expect(record.token).toBe('tok');
    expect(buildInviteUrl('tok', 'https://app.test')).toContain('/invest/tok');

    expect(checkSubscriptionInvitationExpiry(new Date(Date.now() + 1000)).ok).toBe(true);
    expect(validateSubscriptionToken('a'.repeat(16)).ok).toBe(true);
  });
});
