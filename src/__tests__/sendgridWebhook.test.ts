import { GET, POST } from '@/app/api/webhooks/sendgrid/route';
import { NextRequest } from 'next/server';
import { CommunicationEngine } from '@/lib/engine/CommunicationEngine';

jest.mock('@/lib/engine/CommunicationEngine', () => ({
  CommunicationEngine: {
    updateDeliveryStatus: jest.fn().mockResolvedValue({ updated: true }),
  },
}));

describe('SendGrid Webhook Receiver (/api/webhooks/sendgrid)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  describe('POST /api/webhooks/sendgrid', () => {
    it('processes array of delivered, open, and click events successfully', async () => {
      const payload = [
        {
          event: 'delivered',
          sg_message_id: 'sg_msg_101.filter123',
          timestamp: 1600000000,
        },
        {
          event: 'open',
          sg_message_id: 'sg_msg_101.filter123',
          timestamp: 1600000100,
        },
        {
          event: 'click',
          sg_message_id: 'sg_msg_101.filter123',
          timestamp: 1600000200,
        },
      ];

      const request = new NextRequest('http://localhost/api/webhooks/sendgrid', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.received).toBe(true);
      expect(json.processed).toBe(3);

      expect(CommunicationEngine.updateDeliveryStatus).toHaveBeenCalledTimes(3);
      expect(CommunicationEngine.updateDeliveryStatus).toHaveBeenNthCalledWith(
        1,
        'sg_msg_101',
        'Delivered',
        new Date(1600000000 * 1000)
      );
      expect(CommunicationEngine.updateDeliveryStatus).toHaveBeenNthCalledWith(
        2,
        'sg_msg_101',
        'Opened',
        new Date(1600000100 * 1000)
      );
      expect(CommunicationEngine.updateDeliveryStatus).toHaveBeenNthCalledWith(
        3,
        'sg_msg_101',
        'Clicked',
        new Date(1600000200 * 1000)
      );
    });

    it('maps bounce and spamreport events to Bounced and Failed statuses', async () => {
      const payload = [
        {
          event: 'bounce',
          sg_message_id: 'sg_msg_bounce_999.filter456',
          timestamp: 1600000300,
        },
        {
          event: 'spamreport',
          sg_message_id: 'sg_msg_spam_888.filter789',
          timestamp: 1600000400,
        },
      ];

      const request = new NextRequest('http://localhost/api/webhooks/sendgrid', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.received).toBe(true);
      expect(json.processed).toBe(2);

      expect(CommunicationEngine.updateDeliveryStatus).toHaveBeenNthCalledWith(
        1,
        'sg_msg_bounce_999',
        'Bounced',
        expect.any(Date)
      );
      expect(CommunicationEngine.updateDeliveryStatus).toHaveBeenNthCalledWith(
        2,
        'sg_msg_spam_888',
        'Failed',
        expect.any(Date)
      );
    });

    it('returns 400 for invalid JSON payload', async () => {
      const request = new NextRequest('http://localhost/api/webhooks/sendgrid', {
        method: 'POST',
        body: 'invalid-json-body',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });
});
