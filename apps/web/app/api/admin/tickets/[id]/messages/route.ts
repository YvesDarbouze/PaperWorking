/**
 * Admin Ticket Engagement Messages Endpoint.
 *
 * POST /api/admin/tickets/[id]/messages
 * Adds an internal note or sends an official email reply to the customer
 * via SendGrid from no_reply@paperworking.co.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { isDevAdminAuthFailure, requireDevAdminAuth } from '@/lib/admin/dev-admin-auth';
import { ticketStore, type TicketStatus } from '@/lib/tickets/ticket-store';
import { sendGridService } from '@/lib/email/sendgrid-service';
import { SUPPORT_REPLY_FROM_EMAIL } from '@/lib/support/support-addresses';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireDevAdminAuth(request);
  if (isDevAdminAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const { id } = await params;
  const ticket = await ticketStore.getTicketById(id);
  if (!ticket) {
    return NextResponse.json({ error: `Ticket ${id} not found.` }, { status: 404 });
  }

  let body: {
    content: string;
    isInternalNote?: boolean;
    newStatus?: TicketStatus;
    adminName?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const content = body.content?.trim();
  if (!content) {
    return NextResponse.json({ error: 'Message content is required.' }, { status: 400 });
  }

  const isInternal = Boolean(body.isInternalNote);
  const adminName = body.adminName?.trim() || 'PaperWorking Operations';

  // 1. Add message to engagement history
  const updatedTicket = await ticketStore.addTicketMessage(id, {
    author: 'admin',
    authorName: adminName,
    authorEmail: SUPPORT_REPLY_FROM_EMAIL,
    content,
    isInternalNote: isInternal,
    newStatus: body.newStatus,
  });

  if (!updatedTicket) {
    return NextResponse.json({ error: 'Failed to update ticket.' }, { status: 500 });
  }

  // 2. If it's a public reply to the customer, dispatch SendGrid email
  let emailDispatched = false;
  if (!isInternal && ticket.requesterEmail) {
    try {
      await sendGridService.sendTicketStaffReply({
        ticketId: ticket.id,
        ticketSubject: ticket.subject,
        userEmail: ticket.requesterEmail,
        userName: ticket.requesterName,
        adminName,
        replyContent: content,
      });
      emailDispatched = true;
    } catch (mailErr) {
      console.error('[AdminTickets] Failed to send customer reply email:', mailErr);
    }
  }

  return NextResponse.json({
    success: true,
    ticket: updatedTicket,
    emailDispatched,
  });
}
