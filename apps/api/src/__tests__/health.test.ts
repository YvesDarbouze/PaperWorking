import { describe, expect, it, jest } from '@jest/globals';
import { handleHealthGet } from '../routes/health/handler.js';

describe('GET /api/health', () => {
  it('returns 200 when postgres ping succeeds', async () => {
    const result = await handleHealthGet({
      pingPostgres: jest.fn().mockResolvedValue(undefined),
      breakers: {
        stripe: { getState: () => 'CLOSED' as const },
        plaid: { getState: () => 'CLOSED' as const },
        google_maps: { getState: () => 'CLOSED' as const },
        sendgrid: { getState: () => 'CLOSED' as const },
      },
      environment: 'test',
    });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      ok: true,
      status: { postgres: 'healthy', firestore: 'healthy' },
    });
  });

  it('returns 503 when postgres times out', async () => {
    const result = await handleHealthGet({
      pingPostgres: jest.fn().mockRejectedValue(new Error('Connection timed out')),
      breakers: {
        stripe: { getState: () => 'CLOSED' as const },
        plaid: { getState: () => 'CLOSED' as const },
        google_maps: { getState: () => 'CLOSED' as const },
        sendgrid: { getState: () => 'CLOSED' as const },
      },
    });

    expect(result.status).toBe(503);
    expect(result.body).toMatchObject({ ok: false });
  });

  it('marks services degraded when circuit is OPEN', async () => {
    const result = await handleHealthGet({
      breakers: {
        stripe: { getState: () => 'OPEN' as const },
        plaid: { getState: () => 'CLOSED' as const },
        google_maps: { getState: () => 'CLOSED' as const },
        sendgrid: { getState: () => 'CLOSED' as const },
      },
    });

    expect(result.status).toBe(200);
    const body = result.body as { services: { stripe: { status: string } } };
    expect(body.services.stripe.status).toBe('degraded');
  });
});
