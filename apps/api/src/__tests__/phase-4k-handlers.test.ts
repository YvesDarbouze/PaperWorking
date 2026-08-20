import { describe, expect, it } from '@jest/globals';
import { handleContactPost } from '../routes/public/contact/handler.js';
import { handleWaitlistPost } from '../routes/public/waitlist/handler.js';
import { handleUnsubscribePost } from '../routes/public/unsubscribe/handler.js';
import { handleBidsPost, handleBidsPut } from '../routes/bids/handler.js';
import { handleVendorsGet } from '../routes/vendors/handler.js';
import { handleIntegrationsStatusGet } from '../routes/integrations/status/handler.js';
import { handlePlaidWebhookPost } from '../routes/webhooks/plaid/handler.js';

const adminAuth = { uid: 'user-1' };
const authFailure = { status: 401, body: { error: 'Unauthorized' } };

describe('Phase 4k route handlers', () => {
  it('POST /api/contact validates and returns ticket id', async () => {
    const created: string[] = [];
    const result = await handleContactPost(
      {
        email: 'user@example.com',
        subject: 'Question',
        body: 'Hello there',
      },
      {
        createSupportTicket: async (ticket) => {
          created.push(ticket.id);
        },
        generateTicketId: () => 'ticket_fixed',
      },
    );

    expect(result.status).toBe(200);
    expect(result.body).toEqual(
      expect.objectContaining({ success: true, ticketId: 'ticket_fixed' }),
    );
    expect(created).toEqual(['ticket_fixed']);
  });

  it('POST /api/contact still succeeds when ticket write fails', async () => {
    const result = await handleContactPost(
      { email: 'user@example.com', subject: 'Q', body: 'Body' },
      {
        createSupportTicket: async () => {
          throw new Error('firestore down');
        },
      },
    );

    expect(result.status).toBe(200);
    expect((result.body as { success: boolean }).success).toBe(true);
  });

  it('POST /api/waitlist deduplicates existing email', async () => {
    const result = await handleWaitlistPost(
      { email: 'user@example.com' },
      {},
      { checkExists: async () => true },
    );

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ success: true, alreadyJoined: true });
  });

  it('POST /api/waitlist creates new entry', async () => {
    const saved: unknown[] = [];
    const result = await handleWaitlistPost(
      { email: 'new@example.com' },
      { referer: 'https://paperworking.co', userAgent: 'jest' },
      {
        checkExists: async () => false,
        saveEntry: async (entry) => {
          saved.push(entry);
        },
        sendConfirmation: async () => {},
      },
    );

    expect(result.status).toBe(201);
    expect(saved).toHaveLength(1);
  });

  it('POST /api/unsubscribe revokes global and project consent', async () => {
    const global: string[] = [];
    const project: Array<{ email: string; projectId: string }> = [];

    const result = await handleUnsubscribePost(
      { email: 'User@Example.com', projectId: 'proj-1' },
      {
        revokeGlobal: async (email) => {
          global.push(email);
        },
        revokeProjectConsent: async (email, projectId) => {
          project.push({ email, projectId });
        },
      },
    );

    expect(result.status).toBe(200);
    expect(global).toEqual(['user@example.com']);
    expect(project).toEqual([{ email: 'user@example.com', projectId: 'proj-1' }]);
  });

  it('POST /api/bids creates bid request', async () => {
    const saved: unknown[] = [];
    const result = await handleBidsPost(
      {
        action: 'create',
        projectId: 'proj-1',
        vendorId: 'vendor-1',
        serviceType: 'Inspector',
      },
      {
        requireAuth: async () => adminAuth,
        saveBid: async (bid) => {
          saved.push(bid);
        },
      },
    );

    expect(result.status).toBe(201);
    expect(saved).toHaveLength(1);
  });

  it('PUT /api/bids accepts bid and saves expense', async () => {
    const existingBid = {
      bidId: 'bid-1',
      projectId: 'proj-1',
      projectName: 'Flip',
      senderId: 'user-1',
      senderName: 'Owner',
      vendorId: 'vendor-1',
      vendorName: 'Contractor',
      serviceType: 'Inspector' as const,
      description: 'Inspection',
      bidAmount: 300,
      status: 'submitted' as const,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };

    const expenses: unknown[] = [];
    const result = await handleBidsPut(
      { bidId: 'bid-1', action: 'accept' },
      {
        requireAuth: async () => adminAuth,
        getBid: async () => existingBid,
        updateBid: async () => {},
        saveExpense: async (expense) => {
          expenses.push(expense);
        },
        priorVendorPaymentsYear: 500,
      },
    );

    expect(result.status).toBe(200);
    expect(expenses).toHaveLength(1);
    expect((result.body as { requires1099Flag: boolean }).requires1099Flag).toBe(true);
  });

  it('GET /api/vendors filters by search', async () => {
    const result = await handleVendorsGet(
      { search: 'Miami' },
      {
        requireAuth: async () => adminAuth,
        listVendors: async () => [
          { id: '1', city: 'Miami', licensingStates: ['FL'] },
          { id: '2', city: 'Denver', licensingStates: ['CO'] },
        ],
      },
    );

    expect(result.status).toBe(200);
    const body = result.body as { vendors: Array<{ id: string }> };
    expect(body.vendors).toHaveLength(1);
    expect(body.vendors[0].id).toBe('1');
  });

  it('GET /api/integrations/status requires auth', async () => {
    const authed = await handleIntegrationsStatusGet({
      requireAuth: async () => adminAuth,
      getStatus: async () => ({
        google_drive: { connected: true, email: 'drive@example.com' },
        mls: { connected: false, provider: null },
      }),
    });

    expect(authed.status).toBe(200);
    expect(authed.body).toEqual({
      google_drive: { connected: true, email: 'drive@example.com' },
      mls: { connected: false, provider: null },
    });

    const denied = await handleIntegrationsStatusGet({
      requireAuth: async () => authFailure,
    });
    expect(denied.status).toBe(401);
  });

  it('POST /api/webhooks/plaid rejects invalid signature', async () => {
    const result = await handlePlaidWebhookPost(
      JSON.stringify({ item_id: 'item-1' }),
      { plaidVerification: 'bad' },
      {
        verifyWebhook: async () => ({ isValid: false }),
      },
    );

    expect(result.status).toBe(401);
  });

  it('POST /api/webhooks/plaid processes valid webhook', async () => {
    const processed: string[] = [];
    const result = await handlePlaidWebhookPost(
      JSON.stringify({
        webhook_type: 'TRANSACTIONS',
        webhook_code: 'SYNC_UPDATES_AVAILABLE',
        item_id: 'item-abc',
      }),
      { plaidVerification: 'valid-jwt' },
      {
        verifyWebhook: async () => ({ isValid: true }),
        logWebhook: async (eventType) => `log-${eventType}`,
        processWebhook: async (ctx) => {
          processed.push(ctx.itemId);
        },
      },
    );

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ received: true });
    expect(processed).toEqual(['item-abc']);
  });
});
