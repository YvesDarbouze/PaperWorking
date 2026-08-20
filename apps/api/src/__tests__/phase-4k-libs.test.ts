import { describe, expect, it } from '@jest/globals';
import {
  validateContactForm,
  generateSupportTicketId,
  isValidWaitlistEmail,
} from '../lib/public/forms.js';
import { filterVendorsBySearch } from '../lib/vendors/filter.js';
import {
  acceptBid,
  createBidRequest,
  submitBidResponse,
} from '../lib/marketplace/bidding.js';
import {
  isTransactionSyncEvent,
  parsePlaidWebhookPayload,
  plaidEventType,
} from '../lib/webhooks/plaid-events.js';

describe('public form validation', () => {
  it('validateContactForm rejects missing email', () => {
    const result = validateContactForm({ subject: 'Hi', body: 'Hello' });
    expect(result.ok).toBe(false);
  });

  it('validateContactForm accepts valid input', () => {
    const result = validateContactForm({
      name: 'Alice',
      email: 'alice@example.com',
      subject: 'Help',
      body: 'Need support',
      category: 'Billing Issue',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.tag).toBe('billing-issue');
      expect(result.value.email).toBe('alice@example.com');
    }
  });

  it('isValidWaitlistEmail validates email format', () => {
    expect(isValidWaitlistEmail('user@example.com')).toBe(true);
    expect(isValidWaitlistEmail('not-an-email')).toBe(false);
  });

  it('generateSupportTicketId produces ticket prefix', () => {
    expect(generateSupportTicketId(() => 123)).toMatch(/^ticket_123_/);
  });
});

describe('filterVendorsBySearch', () => {
  const vendors = [
    { id: '1', city: 'Miami', licensingStates: ['FL'], companyName: 'Alpha Co' },
    { id: '2', zip: '90210', serviceAreas: ['90210'], companyName: 'Beta LLC' },
    { id: '3', location: 'Austin, TX', companyName: 'Gamma Inc' },
  ];

  it('filters by ZIP code', () => {
    const result = filterVendorsBySearch(vendors, '90210');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('filters by city, state format', () => {
    const result = filterVendorsBySearch(vendors, 'Miami, FL');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by company name substring', () => {
    const result = filterVendorsBySearch(vendors, 'gamma');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });
});

describe('bidding pure functions', () => {
  const baseParams = {
    projectId: 'proj-1',
    projectName: 'Flip House',
    senderId: 'user-1',
    senderName: 'Owner',
    vendorId: 'vendor-1',
    vendorName: 'Contractor',
    serviceType: 'General Contractor' as const,
    description: 'Renovation',
    bidId: 'bid_test',
    now: () => new Date('2026-01-15T12:00:00.000Z'),
  };

  it('createBidRequest sets pending status', () => {
    const bid = createBidRequest(baseParams);
    expect(bid.status).toBe('pending');
    expect(bid.bidId).toBe('bid_test');
  });

  it('submitBidResponse updates amount and status', () => {
    const bid = createBidRequest(baseParams);
    const updated = submitBidResponse(bid, 5000, '2 weeks', 'Ready to start', baseParams.now);
    expect(updated.status).toBe('submitted');
    expect(updated.bidAmount).toBe(5000);
  });

  it('acceptBid flags 1099 when cumulative >= 600', () => {
    const bid = submitBidResponse(
      createBidRequest(baseParams),
      200,
      '1 week',
      undefined,
      baseParams.now,
    );
    const { requires1099Flag, expenseRecord } = acceptBid(bid, 500, baseParams.now);
    expect(requires1099Flag).toBe(true);
    expect(expenseRecord.requires1099NEC).toBe(true);
  });
});

describe('plaid webhook helpers', () => {
  it('parsePlaidWebhookPayload parses JSON', () => {
    const payload = parsePlaidWebhookPayload(
      JSON.stringify({ webhook_type: 'ITEM', webhook_code: 'ERROR', item_id: 'item-1' }),
    );
    expect(payload.item_id).toBe('item-1');
  });

  it('isTransactionSyncEvent detects sync events', () => {
    expect(
      isTransactionSyncEvent({
        webhook_type: 'TRANSACTIONS',
        webhook_code: 'SYNC_UPDATES_AVAILABLE',
      }),
    ).toBe(true);
    expect(
      isTransactionSyncEvent({ webhook_type: 'ITEM', webhook_code: 'DEFAULT_UPDATE' }),
    ).toBe(false);
  });

  it('plaidEventType combines type and code', () => {
    expect(
      plaidEventType({ webhook_type: 'TRANSACTIONS', webhook_code: 'DEFAULT_UPDATE' }),
    ).toBe('TRANSACTIONS/DEFAULT_UPDATE');
  });
});
