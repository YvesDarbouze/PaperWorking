/**
 * SendGrid Event Webhook route tests.
 *
 * The email-event store is mocked (via `jest.unstable_mockModule`, the ESM
 * equivalent of `jest.mock`) so the tests assert:
 *   - ECDSA P-256 signature verification (valid / tampered body / tampered signature)
 *   - SendGrid event → delivery status mapping
 *   - Idempotent dedupe accounting (processed vs duplicates)
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { generateKeyPairSync, sign as signPayload } from 'node:crypto';
import type { EmailEventInput, EmailEventWriteResult } from '@/lib/email/email-event-store';

const recordEmailEventMock =
  jest.fn<(input: EmailEventInput) => Promise<EmailEventWriteResult>>();
const isEmailSuppressedMock = jest.fn<(email: string) => Promise<boolean>>();

jest.unstable_mockModule('@/lib/email/email-event-store', () => ({
  recordEmailEvent: recordEmailEventMock,
  isEmailSuppressed: isEmailSuppressedMock,
}));

const { GET, POST } = await import('@/app/api/webhooks/sendgrid/route');

const WEBHOOK_URL = 'http://localhost/api/webhooks/sendgrid';

const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

function sendgridRequest(rawBody: string, headers: Record<string, string> = {}): Request {
  return new Request(WEBHOOK_URL, {
    method: 'POST',
    body: rawBody,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function signedHeaders(rawBody: string, timestamp = String(Math.floor(Date.now() / 1000))): Record<string, string> {
  const signature = signPayload('sha256', Buffer.from(timestamp + rawBody), privateKey).toString('base64');
  return {
    'x-twilio-email-event-webhook-signature': signature,
    'x-twilio-email-event-webhook-timestamp': timestamp,
  };
}

beforeEach(() => {
  recordEmailEventMock.mockReset();
  isEmailSuppressedMock.mockReset();
  recordEmailEventMock.mockResolvedValue({ recorded: true, duplicate: false });
  isEmailSuppressedMock.mockResolvedValue(false);
  delete process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY;
});

describe('GET /api/webhooks/sendgrid', () => {
  it('returns 200 OK verification response', async () => {
    const response = await GET();
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.status).toBe('ok');
    expect(json.service).toBe('PaperWorking SendGrid Webhook');
  });
});

describe('POST /api/webhooks/sendgrid — signature verification', () => {
  it('skips verification with a console warning when no verification key is configured', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const rawBody = JSON.stringify([
        { event: 'delivered', sg_message_id: 'sg_msg_1.filter123', timestamp: 1600000000 },
      ]);

      const response = await POST(sendgridRequest(rawBody));
      expect(response.status).toBe(200);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('signature verification skipped'),
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('accepts a valid ECDSA P-256 signature', async () => {
    process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY = publicKeyPem;
    const rawBody = JSON.stringify([
      {
        event: 'delivered',
        sg_event_id: 'evt-valid-signature',
        sg_message_id: 'sg_msg_valid.filter123',
        email: 'investor@example.com',
        timestamp: 1600000000,
      },
    ]);

    const response = await POST(sendgridRequest(rawBody, signedHeaders(rawBody)));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.received).toBe(true);
    expect(recordEmailEventMock).toHaveBeenCalledTimes(1);
    expect(recordEmailEventMock.mock.calls[0]?.[0]).toMatchObject({
      eventId: 'evt-valid-signature',
      event: 'delivered',
      status: 'Delivered',
      messageId: 'sg_msg_valid',
      email: 'investor@example.com',
    });
  });

  it('rejects a tampered body with 401', async () => {
    process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY = publicKeyPem;
    const originalBody = JSON.stringify([
      { event: 'delivered', sg_message_id: 'sg_msg_tamper.filter123', timestamp: 1600000000 },
    ]);
    const headers = signedHeaders(originalBody);
    const tamperedBody = JSON.stringify([
      { event: 'bounce', sg_message_id: 'sg_msg_tamper.filter123', timestamp: 1600000000 },
    ]);

    const response = await POST(sendgridRequest(tamperedBody, headers));
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe('Invalid signature');
    expect(recordEmailEventMock).not.toHaveBeenCalled();
  });

  it('rejects a tampered signature with 401', async () => {
    process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY = publicKeyPem;
    const rawBody = JSON.stringify([
      { event: 'delivered', sg_message_id: 'sg_msg_badsig.filter123', timestamp: 1600000000 },
    ]);
    const validHeaders = signedHeaders(rawBody);

    const response = await POST(
      sendgridRequest(rawBody, {
        ...validHeaders,
        'x-twilio-email-event-webhook-signature': Buffer.from('tampered-signature').toString('base64'),
      }),
    );

    expect(response.status).toBe(401);
    expect(recordEmailEventMock).not.toHaveBeenCalled();
  });

  it('rejects requests missing the signature headers with 401', async () => {
    process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY = publicKeyPem;
    const rawBody = JSON.stringify([
      { event: 'delivered', sg_message_id: 'sg_msg_nosig.filter123', timestamp: 1600000000 },
    ]);

    const response = await POST(sendgridRequest(rawBody));
    expect(response.status).toBe(401);
    expect(recordEmailEventMock).not.toHaveBeenCalled();
  });
});

describe('POST /api/webhooks/sendgrid — event processing', () => {
  it('maps SendGrid event types to delivery statuses', async () => {
    const payload = [
      { event: 'processed', sg_message_id: 'sg_1.filter', timestamp: 1600000000 },
      { event: 'deferred', sg_message_id: 'sg_2.filter', timestamp: 1600000001 },
      { event: 'delivered', sg_message_id: 'sg_3.filter', timestamp: 1600000002 },
      { event: 'open', sg_message_id: 'sg_4.filter', timestamp: 1600000003 },
      { event: 'click', sg_message_id: 'sg_5.filter', timestamp: 1600000004 },
      { event: 'bounce', sg_message_id: 'sg_6.filter', email: 'bounce@example.com', timestamp: 1600000005 },
      { event: 'dropped', sg_message_id: 'sg_7.filter', email: 'drop@example.com', timestamp: 1600000006 },
      { event: 'spamreport', sg_message_id: 'sg_8.filter', email: 'spam@example.com', timestamp: 1600000007 },
      { event: 'group_unsubscribe', sg_message_id: 'sg_9.filter', email: 'unsub@example.com', timestamp: 1600000008 },
      { event: 'not_a_real_event', sg_message_id: 'sg_10.filter', timestamp: 1600000009 },
    ];

    const response = await POST(sendgridRequest(JSON.stringify(payload)));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.received).toBe(true);
    expect(json.processed).toBe(9);
    expect(json.duplicates).toBe(0);
    expect(json.totalEvents).toBe(10);

    const mapped = recordEmailEventMock.mock.calls.map(([input]) => [input.event, input.status]);
    expect(mapped).toEqual([
      ['processed', 'Sent'],
      ['deferred', 'Sent'],
      ['delivered', 'Delivered'],
      ['open', 'Opened'],
      ['click', 'Clicked'],
      ['bounce', 'Bounced'],
      ['dropped', 'Bounced'],
      ['spamreport', 'Failed'],
      ['group_unsubscribe', 'Failed'],
    ]);

    // Message ids are stripped of the SendGrid ".filter" suffix
    expect(recordEmailEventMock.mock.calls[0]?.[0].messageId).toBe('sg_1');
    // Suppression events carry the recipient + event through to the store
    expect(recordEmailEventMock.mock.calls[5]?.[0]).toMatchObject({
      event: 'bounce',
      email: 'bounce@example.com',
    });
  });

  it('deduplicates repeated event ids', async () => {
    const seen = new Set<string>();
    recordEmailEventMock.mockImplementation(async (input) => {
      const id = input.eventId ?? `${input.messageId}|${input.event}|${input.timestamp}`;
      if (seen.has(id)) return { recorded: false, duplicate: true };
      seen.add(id);
      return { recorded: true, duplicate: false };
    });

    const payload = JSON.stringify([
      { event: 'delivered', sg_event_id: 'evt-dup-1', sg_message_id: 'sg_dup.filter', timestamp: 1600000010 },
      { event: 'delivered', sg_event_id: 'evt-dup-1', sg_message_id: 'sg_dup.filter', timestamp: 1600000010 },
    ]);

    const first = await POST(sendgridRequest(payload));
    const firstJson = await first.json();
    expect(firstJson.processed).toBe(1);
    expect(firstJson.duplicates).toBe(1);

    const second = await POST(sendgridRequest(payload));
    const secondJson = await second.json();
    expect(secondJson.processed).toBe(0);
    expect(secondJson.duplicates).toBe(2);
  });

  it('deduplicates fallback ids derived from message id + event + timestamp', async () => {
    const seen = new Set<string>();
    recordEmailEventMock.mockImplementation(async (input) => {
      const id = input.eventId ?? `${input.messageId}|${input.event}|${input.timestamp}`;
      if (seen.has(id)) return { recorded: false, duplicate: true };
      seen.add(id);
      return { recorded: true, duplicate: false };
    });

    const payload = JSON.stringify([
      { event: 'open', sg_message_id: 'sg_fallback.filter', timestamp: 1600000020 },
      { event: 'open', sg_message_id: 'sg_fallback.filter', timestamp: 1600000020 },
    ]);

    const response = await POST(sendgridRequest(payload));
    const json = await response.json();

    expect(recordEmailEventMock.mock.calls[0]?.[0].eventId).toBeUndefined();
    expect(json.processed).toBe(1);
    expect(json.duplicates).toBe(1);
  });

  it('returns 400 for invalid JSON payload', async () => {
    const response = await POST(sendgridRequest('invalid-json-body'));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe('Invalid JSON payload');
    expect(recordEmailEventMock).not.toHaveBeenCalled();
  });
});
