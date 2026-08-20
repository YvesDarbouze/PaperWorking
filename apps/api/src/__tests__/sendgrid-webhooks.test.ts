import { describe, expect, it, jest } from '@jest/globals';
import { generateKeyPairSync, createSign } from 'crypto';
import {
  mapSendGridEventType,
  extractSendGridMessageId,
  parseSendGridWebhookPayload,
  SENDGRID_EVENT_STATUS_MAP,
} from '../lib/email/sendgrid-events.js';
import {
  formatSendGridPublicKey,
  verifySendGridSignature,
  isMockSendGridSignature,
} from '../lib/email/sendgrid-signature.js';
import {
  parseInboundEmailPayload,
  stripQuotedHistoryAndSignatures,
  computeAbuseUserUpdates,
} from '../lib/email/inbound-email-parser.js';
import {
  handleSendGridWebhookGet,
  handleSendGridWebhookPost,
} from '../routes/webhooks/sendgrid/handler.js';
import { handleInboundEmailsWebhookPost } from '../routes/webhooks/emails/handler.js';
import { handleInboundEmailParsePost } from '../routes/webhooks/inbound-email/handler.js';
import {
  handleEmailReplyPost,
  handleEmailReplyGet,
} from '../routes/webhooks/email-reply/handler.js';

describe('sendgrid event mapping', () => {
  it('maps known event types', () => {
    expect(SENDGRID_EVENT_STATUS_MAP.delivered).toBe('Delivered');
    expect(mapSendGridEventType('open')).toBe('Opened');
    expect(mapSendGridEventType('unknown')).toBeNull();
  });

  it('extracts message id prefix before dot', () => {
    expect(
      extractSendGridMessageId({ sg_message_id: 'abc123.filter001.delivery' }),
    ).toBe('abc123');
  });

  it('parses array or single-object payloads', () => {
    expect(parseSendGridWebhookPayload('[{"event":"delivered"}]')).toHaveLength(1);
    expect(parseSendGridWebhookPayload('{"event":"open"}')).toHaveLength(1);
  });
});

describe('sendgrid signature verification', () => {
  it('formats bare public keys with PEM headers', () => {
    const formatted = formatSendGridPublicKey('ABC');
    expect(formatted).toContain('-----BEGIN PUBLIC KEY-----');
  });

  it('accepts mock signatures outside production', () => {
    expect(isMockSendGridSignature('mock_sig_test', 'development')).toBe(true);
    expect(isMockSendGridSignature('mock_sig_test', 'production')).toBe(false);
  });

  it('verifies ECDSA signatures over timestamp + body', () => {
    const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const rawBody = '[{"event":"delivered","sg_message_id":"msg1"}]';
    const timestamp = '1600000000';
    const signer = createSign('sha256');
    signer.update(timestamp + rawBody);
    const signature = signer.sign(privateKey, 'base64');

    expect(
      verifySendGridSignature(rawBody, signature, timestamp, publicKey.export({ type: 'spki', format: 'pem' }) as string),
    ).toBe(true);
    expect(
      verifySendGridSignature(rawBody, 'bad', timestamp, publicKey.export({ type: 'spki', format: 'pem' }) as string),
    ).toBe(false);
  });
});

describe('inbound email parser', () => {
  it('strips quoted reply history', () => {
    const cleaned = stripQuotedHistoryAndSignatures('Hello\n> quoted\nMore');
    expect(cleaned).toBe('Hello');
  });

  it('parses Postmark-style payload into thread event', () => {
    const result = parseInboundEmailPayload({
      From: 'Investor@Example.com',
      TextBody: 'Interested in the deal',
      To: 'reply+token123@mail.paperworking.co',
    });

    expect(result.success).toBe(true);
    expect(result.event?.eventType).toBe('INBOUND_EMAIL_REPLY');
    expect(result.event?.metadata?.token).toBe('token123');
  });

  it('computes abuse suspension after bounce threshold', () => {
    const result = computeAbuseUserUpdates('Bounced', { bounceCount: 4 }, 'user-1');
    expect(result.userUpdates.invitationSuspended).toBe(true);
    expect(result.operatorAlert?.type).toBe('SUSPENSION_ALERT');
  });
});

describe('sendgrid webhook handlers', () => {
  it('GET returns health status', async () => {
    const result = await handleSendGridWebhookGet();
    expect(result.body).toEqual({ status: 'ok', service: 'PaperWorking SendGrid Webhook' });
  });

  it('POST processes delivery events', async () => {
    const updateDeliveryStatus = jest.fn().mockResolvedValue({ updated: 1 });
    const rawBody = JSON.stringify([
      { event: 'delivered', sg_message_id: 'msg_abc.filter', timestamp: 1600000000 },
      { event: 'unknown_event', sg_message_id: 'msg_skip' },
    ]);

    const result = await handleSendGridWebhookPost(
      rawBody,
      { signature: 'mock_sig_dev', timestamp: '1' },
      {
        verificationKey: 'test-key',
        nodeEnv: 'development',
        updateDeliveryStatus,
      },
    );

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ received: true, processed: 1, totalEvents: 2 });
    expect(updateDeliveryStatus).toHaveBeenCalledWith(
      'msg_abc',
      'Delivered',
      expect.any(Date),
    );
  });

  it('POST rejects invalid signatures when verification enabled', async () => {
    const result = await handleSendGridWebhookPost(
      '[]',
      { signature: 'invalid', timestamp: '1' },
      {
        verificationKey: 'not-a-real-key',
        nodeEnv: 'production',
        verifySignature: () => false,
      },
    );

    expect(result.status).toBe(401);
  });
});

describe('inbound email webhook handlers', () => {
  it('POST /webhooks/emails requires bearer secret', async () => {
    const unconfigured = await handleInboundEmailsWebhookPost({}, null, { webhookSecret: undefined });
    expect(unconfigured.status).toBe(503);

    const unauthorized = await handleInboundEmailsWebhookPost({}, 'Bearer wrong', {
      webhookSecret: 'secret',
    });
    expect(unauthorized.status).toBe(401);

    const ok = await handleInboundEmailsWebhookPost(
      { From: 'a@b.com' },
      'Bearer secret',
      {
        webhookSecret: 'secret',
        processInbound: async () => ({ success: true, projectId: 'proj-1' }),
      },
    );
    expect(ok.status).toBe(200);
    expect(ok.body).toEqual({ processed: true, projectId: 'proj-1' });
  });

  it('POST /webhooks/inbound-email parses payload', async () => {
    const result = await handleInboundEmailParsePost({
      From: 'inv@example.com',
      TextBody: 'Yes, interested',
      To: 'reply+tok@mail.paperworking.co',
    });

    expect(result.status).toBe(200);
    const body = result.body as { success: boolean; event: { eventType: string } };
    expect(body.success).toBe(true);
    expect(body.event.eventType).toBe('INBOUND_EMAIL_REPLY');
  });
});

describe('email-reply webhook handlers', () => {
  const messages: Array<{ id: string; dealId: string; text: string; senderEmail: string; senderName: string; source: 'email_inbound'; createdAt: string }> = [];

  it('POST stores inbound deal reply', async () => {
    const result = await handleEmailReplyPost(
      { text: 'Looks good', slug: 'deal-abc', from: 'inv@example.com' },
      {
        storeMessage: (msg) => {
          messages.push(msg);
        },
        now: () => new Date('2026-01-01T00:00:00.000Z'),
      },
    );

    expect(result.status).toBe(200);
    expect(messages).toHaveLength(1);
  });

  it('GET lists messages for deal', async () => {
    const result = await handleEmailReplyGet(
      { dealId: 'deal-abc' },
      {
        listMessages: async (dealId) =>
          messages.filter((m) => !dealId || m.dealId === dealId),
      },
    );

    expect(result.status).toBe(200);
    const body = result.body as { total: number };
    expect(body.total).toBe(1);
  });
});
