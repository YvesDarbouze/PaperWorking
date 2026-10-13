import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { POST as postPlaidConnections } from '../../app/api/plaid/connections/route';
import { POST as postDealShare } from '../../app/api/deals/[id]/share/route';
import { createVendorRequestInStore } from '../../lib/vendor-portal/vendor-store';
import { TicketStore } from '../../lib/tickets/ticket-store';
import { SEED_RAW_DEALS } from '../../lib/marketplace/seed-data';

describe('POST /api/plaid/connections honest credential handling & sync', () => {
  const origClientId = process.env.PLAID_CLIENT_ID;
  const origSecret = process.env.PLAID_SECRET;

  beforeEach(() => {
    process.env.TEST_AUTH_UID = 'dev-user-1';
    delete process.env.PLAID_CLIENT_ID;
    delete process.env.PLAID_SECRET;
  });

  afterEach(() => {
    if (origClientId) process.env.PLAID_CLIENT_ID = origClientId;
    else delete process.env.PLAID_CLIENT_ID;
    if (origSecret) process.env.PLAID_SECRET = origSecret;
    else delete process.env.PLAID_SECRET;
  });

  it('returns 503 with honest REQUIRES CREDENTIALS badge payload when unconfigured', async () => {
    const req = new Request('http://localhost/api/plaid/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: 'project-1' }),
    });

    const res = await postPlaidConnections(req);
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.configured).toBe(false);
    expect(data.requiresCredentials).toBe(true);
    expect(data.error).toMatch(/REQUIRES CREDENTIALS: PLAID_CLIENT_ID, PLAID_SECRET/);
  });
});

describe('Private deal share route uses CSPRNG secure tokens', () => {
  beforeEach(() => {
    process.env.TEST_AUTH_UID = 'dev-user-1';
  });

  it('generates a 32-character hex secure token when sharing a deal', async () => {
    const targetDeal = SEED_RAW_DEALS[0];
    delete targetDeal.shareToken;

    const req = new Request(`http://localhost/api/deals/${targetDeal.id}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: 'copy_link',
        recipients: ['partner@apexcapital.com'],
      }),
    });

    const res = await postDealShare(req, { params: Promise.resolve({ id: targetDeal.id }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.shareToken).toBeDefined();

    const tokenSuffix = data.shareToken.split('_').pop();
    expect(tokenSuffix).toMatch(/^[a-f0-9]{32}$/);
  });
});

import { POST as postFeedbackRoute } from '../../app/api/assistant/feedback/route';

describe('Assistant feedback route uses CSPRNG ticket IDs', () => {
  it('generates high-entropy 10-char alphanumeric ticket IDs', async () => {
    const req = new Request('http://localhost/api/assistant/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'bug',
        title: 'Broken navigation link',
        description: 'Detail about broken navigation',
      }),
    });

    const res = await postFeedbackRoute(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.ticketId).toMatch(/^PW-BUG-[A-Z0-9]{10}$/);
  });
});

