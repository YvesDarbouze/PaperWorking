import {
  filterUserDealsHistory,
  formatDealThreadEvent,
  parseInboundEmailPayload,
  DealThreadEvent,
} from '@/lib/deals/historyUtils';
import { DealInvitation, DealInterest } from '@/lib/deals/engagementUtils';

describe('Deal History, Communications & Inbound Email Utilities (PROMPT 5)', () => {
  describe('filterUserDealsHistory', () => {
    it('categorizes created, invited, and committed deals for an investor account', () => {
      const deals = [
        { id: 'deal_1', slug: '123mainst', displayAddress: '123 Main St', ownerId: 'user_1' },
        { id: 'deal_2', slug: '456oakave', displayAddress: '456 Oak Ave', ownerId: 'user_2' },
      ];

      const invitations: DealInvitation[] = [
        {
          id: 'inv_1',
          dealId: 'deal_2',
          dealSlug: '456oakave',
          token: 'tok_1',
          invitedEmail: 'investor@test.com',
          senderUserId: 'user_2',
          senderName: 'Owner Two',
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          expiresAt: new Date().toISOString(),
        },
      ];

      const interests: DealInterest[] = [
        {
          id: 'int_1',
          dealId: 'deal_2',
          userId: 'user_1',
          amountIntent: 25000,
          currency: 'USD',
          businessCardSnapshot: { displayName: 'Investor One', email: 'investor@test.com' },
          status: 'COMMITTED',
          createdAt: new Date().toISOString(),
        },
      ];

      const history = filterUserDealsHistory(deals, invitations, interests, 'user_1', 'investor@test.com');

      expect(history.createdDeals).toHaveLength(1);
      expect(history.createdDeals[0].id).toBe('deal_1');

      expect(history.invitedDeals).toHaveLength(1);
      expect(history.invitedDeals[0].invite.invitedEmail).toBe('investor@test.com');

      expect(history.committedDeals).toHaveLength(1);
      expect(history.committedDeals[0].interest.amountIntent).toBe(25000);
    });
  });

  describe('formatDealThreadEvent', () => {
    it('formats thread events with correct badge labels and timestamps', () => {
      const event: DealThreadEvent = {
        id: 'evt_1',
        dealId: 'deal_1',
        dealSlug: '123mainst',
        eventType: 'INBOUND_EMAIL_REPLY',
        senderName: 'External Investor',
        senderEmail: 'external@investor.com',
        timestamp: new Date().toISOString(),
        content: 'I want to invest in this syndicate.',
      };

      const formatted = formatDealThreadEvent(event);
      expect(formatted.badgeLabel).toBe('via Email');
      expect(formatted.badgeColor).toContain('amber');
      expect(formatted.formattedDate).toBeDefined();
    });
  });

  describe('parseInboundEmailPayload', () => {
    it('parses raw SendGrid/Postmark webhook payload and strips quoted history', () => {
      const payload = {
        From: 'external@investor.com',
        To: 'reply+token123abc@paperworking.co',
        Subject: 'Re: Inquiry regarding 123 Main St',
        TextBody: 'I would like to participate for $50,000.\n\nOn Mon, Aug 3, 2026 wrote:\n> Original message history',
      };

      const res = parseInboundEmailPayload(payload);

      expect(res.success).toBe(true);
      expect(res.event).toBeDefined();
      expect(res.event?.senderEmail).toBe('external@investor.com');
      expect(res.event?.content).toBe('I would like to participate for $50,000.');
      expect(res.event?.badgeLabel).toBe('via Email');
      expect(res.event?.metadata?.token).toBe('token123abc');
      expect(res.event?.metadata?.viaEmail).toBe(true);
    });
  });
});
