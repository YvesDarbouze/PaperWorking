/**
 * Comprehensive Test Suite for Unified Ticket Management & Admin Engagement.
 *
 * Covers:
 * 1. Unified Ticket Store & Data Modeling (CRUD, Engagement History, Tags, Diagnostics)
 * 2. Request Ingestion Points (Chatbot Bug, Feature Request with Dinner Pledge, Callback, Support Form)
 * 3. Admin Ticket APIs:
 *    - GET /api/admin/tickets (authorization, queue filtering, status/kind/priority, search)
 *    - GET /api/admin/tickets/[id] (detail with complete engagement timeline)
 *    - PATCH /api/admin/tickets/[id] (status and priority transitions, system audit logging)
 *    - POST /api/admin/tickets/[id]/messages (internal staff notes vs. public email replies via SendGrid from no_reply@paperworking.co)
 * 4. UI Component (AdminTicketsPanel metrics counters, table rendering, dinner pledge badges)
 */

import React from 'react';
import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import { NextRequest } from 'next/server';
import { ticketStore } from '@/lib/tickets/ticket-store';
import { sentEmailsForTesting, __clearSentEmailsForTesting } from '@/lib/email/sendgrid-service';
import { POST as feedbackPost } from '@/app/api/assistant/feedback/route';
import { POST as callbackPost } from '@/app/api/assistant/callback/route';
import { GET as adminTicketsGet } from '@/app/api/admin/tickets/route';
import { GET as adminTicketGet, PATCH as adminTicketPatch } from '@/app/api/admin/tickets/[id]/route';
import { POST as adminTicketMessagesPost } from '@/app/api/admin/tickets/[id]/messages/route';
import AdminTicketsPanel from '@/components/admin/AdminTicketsPanel';

// Mock cookies for subscriber checks
jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({
    get: (key: string) => {
      if (key === 'pw_session') return { value: 'dev-sub-user' };
      if (key === 'pw_acct') return { value: 'investor' };
      if (key === 'pw_sub') return { value: JSON.stringify({ status: 'active', plan: 'Investor Tier' }) };
      return undefined;
    },
  })),
}));

// Prevent hanging network connections during unit testing
(process.env as Record<string, string | undefined>).NODE_ENV = 'test';
delete process.env.FIRESTORE_EMULATOR_HOST;
delete process.env.FIRESTORE_EMULATOR_RUNNING;

describe('Unified Ticket Management & Admin Engagement Tracking', () => {
  beforeEach(() => {
    ticketStore.__resetForTesting();
    __clearSentEmailsForTesting();
  });

  describe('1. Unified Ticket Store & Engagement Ledger', () => {
    it('creates and retrieves a bug ticket with diagnostics and initial engagement message', async () => {
      const ticket = await ticketStore.createTicket({
        kind: 'bug',
        subject: 'Underwriting Cap Rate rounding issue',
        description: 'Cap Rate displays 6.00% instead of 6.125% on mobile view.',
        requesterName: 'Jane Doe',
        requesterEmail: 'jane@example.com',
        requesterTier: 'investor',
        priority: 'high',
        module: 'Deal Calculator',
        reilPhase: 'Acquisition',
        diagnostics: {
          platform: 'iOS',
          viewport: { width: 390, height: 844 },
        },
        hasAttachment: true,
        attachmentName: 'screenshot-mobile.png',
      });

      expect(ticket.id).toMatch(/^PW-BUG-\d+/);
      expect(ticket.status).toBe('open');
      expect(ticket.priority).toBe('high');
      expect(ticket.engagementHistory.length).toBe(1);
      expect(ticket.engagementHistory[0]?.author).toBe('user');
      expect(ticket.engagementHistory[0]?.content).toContain('Cap Rate displays 6.00%');
      expect(ticket.tags).toContain('deal calculator');
      expect(ticket.tags).toContain('acquisition');

      const retrieved = await ticketStore.getTicketById(ticket.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.subject).toBe('Underwriting Cap Rate rounding issue');
    });

    it('records an internal staff note without affecting customer notifications', async () => {
      const ticket = await ticketStore.createTicket({
        kind: 'feature_request',
        subject: 'Add CSV export for lender draw requests',
        description: 'Allow 1-click CSV download formatted for Fannie Mae draws.',
        requesterName: 'Marcus Vance',
        requesterEmail: 'marcus@example.com',
      });

      const updated = await ticketStore.addTicketMessage(ticket.id, {
        author: 'admin',
        authorName: 'Yves (Lead Ops)',
        authorEmail: 'yves@paperworking.co',
        content: 'Investigated format spec. We can support Fannie Mae Form 4797 standard.',
        isInternalNote: true,
      });

      expect(updated?.engagementHistory.length).toBe(2);
      const internalNote = updated?.engagementHistory[1];
      expect(internalNote?.isInternalNote).toBe(true);
      expect(internalNote?.authorName).toBe('Yves (Lead Ops)');
    });

    it('updates ticket status and priority with automatic system audit logging', async () => {
      const ticket = await ticketStore.createTicket({
        kind: 'bug',
        subject: 'Session timeout loop',
        description: 'Token expires after 5 minutes.',
        requesterName: 'Alex',
        requesterEmail: 'alex@example.com',
        priority: 'medium',
      });

      const updated = await ticketStore.updateTicket(
        ticket.id,
        {
          status: 'in_progress',
          priority: 'critical',
          assignedTo: 'admin@paperworking.co',
        },
        'Senior Engineer',
      );

      expect(updated?.status).toBe('in_progress');
      expect(updated?.priority).toBe('critical');
      expect(updated?.assignedTo).toBe('admin@paperworking.co');

      // Check system audit log in timeline
      const systemMessages = updated?.engagementHistory.filter((m) => m.author === 'system');
      expect(systemMessages?.length).toBe(3); // status, priority, and assignment changes
      expect(systemMessages?.[0]?.content).toContain('Status changed from "open" to "in_progress"');
    });
  });

  describe('2. Request Ingestion Endpoints (Auto-Assigning Tickets)', () => {
    it('creates bug ticket via /api/assistant/feedback with PW-BUG-XXXXX and adds to store', async () => {
      const req = new NextRequest('http://localhost:3000/api/assistant/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Firebase-AppCheck': 'test-token',
        },
        body: JSON.stringify({
          kind: 'bug',
          title: 'Holding clock freeze on Firefox',
          description: 'Timer stops incrementing after switching tabs.',
          userEmail: 'dev@investor.com',
          userName: 'David Miller',
          module: 'Holding Ledger',
          severity: 'high',
        }),
      });

      const res = await feedbackPost(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.ticketId).toMatch(/^PW-BUG-\d+/);

      // Verify stored in ticketStore
      const ticket = await ticketStore.getTicketById(data.ticketId);
      expect(ticket).not.toBeNull();
      expect(ticket?.subject).toBe('Holding clock freeze on Firefox');
      expect(ticket?.priority).toBe('high');
      expect(ticket?.requesterEmail).toBe('dev@investor.com');
    });

    it('creates feature request ticket via /api/assistant/feedback with Dinner Pledge or graceful upsell', async () => {
      const req = new NextRequest('http://localhost:3000/api/assistant/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Firebase-AppCheck': 'test-token',
        },
        body: JSON.stringify({
          kind: 'feature_request',
          ticketId: 'PW-FEAT-99881',
          title: 'Automated 1031 Exchange Timeline Tracker',
          description: 'Count down 45-day identification and 180-day closing deadlines.',
          userEmail: 'subscriber@paperworking.co',
          userName: 'Sarah Jenkins',
          reilPhase: 'Exit',
        }),
      });

      const res = await feedbackPost(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      if (data.upsell) {
        expect(data.message).toContain('Feature requests directly shape PaperWorking development');
      } else {
        expect(data.ticketId).toMatch(/^PW-FEAT-\d+/);
      }

      // Verify feature request created in ticketStore always has dinnerPledge: true
      const featTicket = await ticketStore.createTicket({
        kind: 'feature_request',
        subject: 'Automated 1031 Exchange Timeline Tracker',
        description: 'Count down 45-day identification and 180-day closing deadlines.',
        requesterName: 'Sarah Jenkins',
        requesterEmail: 'subscriber@paperworking.co',
        reilPhase: 'Exit',
      });
      expect(featTicket.id).toMatch(/^PW-FEAT-\d+/);
      expect(featTicket.dinnerPledge).toBe(true);
      expect(featTicket.tags).toContain('dinner-pledge');
    });

    it('creates callback ticket via /api/assistant/callback with PW-CALL-XXXXX', async () => {
      const req = new NextRequest('http://localhost:3000/api/assistant/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Firebase-AppCheck': 'test-token',
        },
        body: JSON.stringify({
          name: 'Robert Fox',
          phone: '+1-555-432-9876',
          email: 'robert@foxcapital.test',
          preferredWindow: '2:00 PM – 4:00 PM EST',
          topic: 'Escrow Earnest Money Release',
          transcript: 'User: How do I release earnest money? Assistant: I will schedule a call.',
        }),
      });

      const res = await callbackPost(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.ticketId).toMatch(/^PW-CALL-\d+/);

      const ticket = await ticketStore.getTicketById(data.ticketId);
      expect(ticket).not.toBeNull();
      expect(ticket?.phone).toBe('+1-555-432-9876');
      expect(ticket?.preferredWindow).toBe('2:00 PM – 4:00 PM EST');
      expect(ticket?.engagementHistory[0]?.content).toContain('Chat Transcript:');
    });
  });

  describe('3. Admin Ticket API Endpoints & Live Email Replies', () => {
    it('enforces admin authorization on GET /api/admin/tickets', async () => {
      const unauthReq = new NextRequest('http://localhost:3000/api/admin/tickets');
      const unauthRes = await adminTicketsGet(unauthReq);
      expect(unauthRes.status).toBe(401);

      const authReq = new NextRequest('http://localhost:3000/api/admin/tickets', {
        headers: { Authorization: 'Bearer mock-admin-token' },
      });
      const authRes = await adminTicketsGet(authReq);
      expect(authRes.status).toBe(200);
      const body = await authRes.json();
      expect(body.success).toBe(true);
      expect(body.tickets.length).toBeGreaterThanOrEqual(4);
    });

    it('supports filtering by status, kind, and search query on GET /api/admin/tickets', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/admin/tickets?kind=bug&search=Vault',
        {
          headers: { Authorization: 'Bearer mock-admin-token' },
        },
      );
      const res = await adminTicketsGet(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.tickets.length).toBe(1);
      expect(body.tickets[0].id).toBe('PW-BUG-18420');
    });

    it('retrieves ticket detail with full engagement history on GET /api/admin/tickets/[id]', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/tickets/PW-BUG-18420', {
        headers: { Authorization: 'Bearer mock-admin-token' },
      });
      const res = await adminTicketGet(req, { params: Promise.resolve({ id: 'PW-BUG-18420' }) });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ticket.id).toBe('PW-BUG-18420');
      expect(body.ticket.engagementHistory.length).toBeGreaterThanOrEqual(1);
    });

    it('updates status and priority on PATCH /api/admin/tickets/[id]', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/tickets/PW-BUG-18420', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-admin-token',
        },
        body: JSON.stringify({
          status: 'in_progress',
          priority: 'critical',
        }),
      });
      const res = await adminTicketPatch(req, { params: Promise.resolve({ id: 'PW-BUG-18420' }) });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ticket.status).toBe('in_progress');
      expect(body.ticket.priority).toBe('critical');
    });

    it('posts internal note on POST /api/admin/tickets/[id]/messages without sending email', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/tickets/PW-BUG-18420/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-admin-token',
        },
        body: JSON.stringify({
          content: 'Internal triage: reproduced on macOS Safari 17.4.',
          isInternalNote: true,
          adminName: 'Lead Dev',
        }),
      });

      const res = await adminTicketMessagesPost(req, { params: Promise.resolve({ id: 'PW-BUG-18420' }) });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.emailDispatched).toBe(false);
      expect(sentEmailsForTesting.length).toBe(0);

      const latestMsg = body.ticket.engagementHistory.slice(-1)[0];
      expect(latestMsg.isInternalNote).toBe(true);
      expect(latestMsg.content).toBe('Internal triage: reproduced on macOS Safari 17.4.');
    });

    it('sends live SendGrid reply email from no_reply@paperworking.co on customer reply', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/tickets/PW-BUG-18420/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-admin-token',
        },
        body: JSON.stringify({
          content: 'Hi Bob, we have released a hotfix for the PDF upload timeout. Please refresh and try again.',
          isInternalNote: false,
          newStatus: 'resolved',
          adminName: 'Yves (Lead Admin)',
        }),
      });

      const res = await adminTicketMessagesPost(req, { params: Promise.resolve({ id: 'PW-BUG-18420' }) });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.emailDispatched).toBe(true);
      expect(body.ticket.status).toBe('resolved');

      // Verify email dispatched via SendGrid from no_reply@paperworking.co
      expect(sentEmailsForTesting.length).toBe(1);
      const email = sentEmailsForTesting[0];
      expect(email.subject).toContain('Update on Ticket [PW-BUG-18420]');
      expect(email.from).toEqual({ email: 'no_reply@paperworking.co', name: 'PaperWorking Support' });
      expect(email.to).toEqual([{ email: 'bob@capital.test', name: 'Bob Martinez' }]);
      expect(email.text).toContain('we have released a hotfix for the PDF upload timeout');
    });
  });

  describe('4. UI Component: AdminTicketsPanel', () => {
    it('renders metrics counters, filter tabs, and ticket table markup', async () => {
      const initialTickets = await ticketStore.listTickets();
      const html = renderToString(<AdminTicketsPanel initialTickets={initialTickets} />);

      expect(html).toContain('Tickets &amp; Customer Engagement');
      expect(html).toContain('Total Tickets');
      expect(html).toContain('Open Tickets');
      expect(html).toContain('In Progress');
      expect(html).toContain('Waiting on User');
      expect(html).toContain('High / Critical');
      expect(html).toContain('🍽️ Dinner Pledges');
      expect(html).toContain('All Queues');
      expect(html).toContain('Assigned to Me');
      expect(html).toContain('Unassigned');
      expect(html).toContain('data-testid="admin-tickets-table"');
    });
  });
});
