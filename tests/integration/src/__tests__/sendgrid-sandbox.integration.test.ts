import {
  handleSendGridWebhookPost,
  isMockSendGridSignature,
  parseSendGridWebhookPayload,
} from '@paperworking/api';

describe('integration — sendgrid sandbox (mock signature path)', () => {
  it('accepts mock signatures outside production', () => {
    expect(isMockSendGridSignature('mock_sig_test', 'development')).toBe(true);
    expect(isMockSendGridSignature('mock_sig_test', 'production')).toBe(false);
  });

  it('processes delivered event payload in sandbox mode', async () => {
    const rawBody = JSON.stringify([
      {
        event: 'delivered',
        sg_message_id: 'msg-integration-001.filter001',
        email: 'investor@paperworking.test',
      },
    ]);

    const events = parseSendGridWebhookPayload(rawBody);
    expect(events).toHaveLength(1);

    const result = await handleSendGridWebhookPost(
      rawBody,
      { signature: 'mock_sig_test', timestamp: '1600000000' },
      {
        verificationKey: 'test-verification-key',
        nodeEnv: 'development',
        updateDeliveryStatus: async () => ({ updated: 1 }),
      },
    );

    expect(result.status).toBe(200);
    const body = result.body as { processed: number; totalEvents: number };
    expect(body.processed).toBe(1);
    expect(body.totalEvents).toBe(1);
  });
});
