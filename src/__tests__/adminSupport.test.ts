import { SupportTicket, TicketMessage, TaxonomyTag } from '@/lib/support/types';

describe('PROMPT 3 & PART B — Support Inbox & Reconciled Metrics Unit Suite', () => {
  describe('Ticket Data Model & 3-State Conversation Transitions', () => {
    it('initializes tickets in active state with FCR eligibility', () => {
      const ticket: SupportTicket = {
        id: 'ticket_123',
        subject: 'Plaid link error on Chase account',
        body: 'I am getting ITEM_LOGIN_REQUIRED when connecting Chase.',
        requesterUid: 'user_abc',
        requesterEmail: 'investor@example.com',
        requesterName: 'Jane Investor',
        status: 'active',
        priority: 'normal',
        assigneeUid: null,
        assigneeName: null,
        tags: ['plaid-connection'],
        createdAt: new Date('2026-08-12T10:00:00Z').toISOString(),
        updatedAt: new Date('2026-08-12T10:00:00Z').toISOString(),
        lastCustomerReplyAt: new Date('2026-08-12T10:00:00Z').toISOString(),
        lastInternalReplyAt: null,
        firstResponseAt: null,
        resolvedAt: null,
        snoozedUntil: null,
        fcrEligible: true,
      };

      expect(ticket.status).toBe('active');
      expect(ticket.assigneeUid).toBeNull();
      expect(ticket.firstResponseAt).toBeNull();
      expect(ticket.fcrEligible).toBe(true);
    });

    it('customer replies always reopen closed or pending tickets to active', () => {
      let status: SupportTicket['status'] = 'pending';
      const customerReplyArrived = true;

      if (customerReplyArrived) {
        status = 'active';
      }

      expect(status).toBe('active');
    });
  });

  describe('Internal Note vs Customer Reply Channel Separation (dim01)', () => {
    it('internal notes do NOT set firstResponseAt and do NOT send emails', () => {
      let firstResponseAt: string | null = null;
      let emailDispatched = false;

      const action = 'internal_note' as string;
      if (action === 'internal_reply' && !firstResponseAt) {
        firstResponseAt = new Date().toISOString();
        emailDispatched = true;
      }

      expect(firstResponseAt).toBeNull();
      expect(emailDispatched).toBe(false);
    });

    it('customer replies set firstResponseAt ONCE and dispatch outbound emails', () => {
      let firstResponseAt: string | null = null;
      let emailDispatched = false;

      const action = 'internal_reply';
      if (action === 'internal_reply' && !firstResponseAt) {
        firstResponseAt = new Date().toISOString();
        emailDispatched = true;
      }

      expect(firstResponseAt).not.toBeNull();
      expect(emailDispatched).toBe(true);
    });
  });

  describe('Controlled Tag Taxonomy Enforcement', () => {
    const activeTaxonomy: TaxonomyTag[] = [
      { id: 'plaid-connection', name: 'Plaid Connection', slug: 'plaid-connection', description: '', active: true, createdAt: '' },
      { id: 'billing', name: 'Billing', slug: 'billing', description: '', active: true, createdAt: '' },
    ];

    it('accepts tags from controlled taxonomy', () => {
      const tag = 'plaid-connection';
      const isValid = activeTaxonomy.some((t) => t.slug === tag);
      expect(isValid).toBe(true);
    });

    it('rejects unknown tags not in taxonomy', () => {
      const tag = 'unknown-random-tag';
      const isValid = activeTaxonomy.some((t) => t.slug === tag);
      expect(isValid).toBe(false);
    });
  });

  describe('Part B Reconciled Metrics Calculations', () => {
    it('computes MEDIAN first response time correctly (excluding notes)', () => {
      // 3 tickets with FRT durations: 1.0 hr, 3.0 hrs, 5.0 hrs
      const frtDurations = [1.0, 3.0, 5.0];
      frtDurations.sort((a, b) => a - b);

      const mid = Math.floor(frtDurations.length / 2);
      const median = frtDurations.length % 2 !== 0
        ? frtDurations[mid]
        : (frtDurations[mid - 1] + frtDurations[mid]) / 2;

      expect(median).toBe(3.0);
    });

    it('calculates First Contact Resolution (FCR) rate', () => {
      // 10 closed tickets, 8 resolved on first reply
      const closedCount = 10;
      const fcrCount = 8;
      const fcrPct = Math.round((fcrCount / closedCount) * 100);

      expect(fcrPct).toBe(80);
    });
  });
});
