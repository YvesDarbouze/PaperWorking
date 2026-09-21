/**
 * Admin Ticket Detail & Update Endpoint.
 *
 * GET /api/admin/tickets/[id] -> returns ticket with full engagementHistory
 * PATCH /api/admin/tickets/[id] -> updates status, priority, or assignee
 */

import { NextResponse, type NextRequest } from 'next/server';
import { isDevAdminAuthFailure, requireDevAdminAuth } from '@/lib/admin/dev-admin-auth';
import { ticketStore, type TicketPriority, type TicketQueue, type TicketStatus } from '@/lib/tickets/ticket-store';

export async function GET(
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

  return NextResponse.json({
    success: true,
    ticket,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireDevAdminAuth(request);
  if (isDevAdminAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const { id } = await params;
  let body: {
    status?: TicketStatus;
    priority?: TicketPriority;
    queue?: TicketQueue;
    assignedTo?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const adminName = (auth as any).role === 'admin' ? 'Admin Staff' : 'Staff Member';
  const updated = await ticketStore.updateTicket(id, body, adminName);
  if (!updated) {
    return NextResponse.json({ error: `Ticket ${id} not found.` }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    ticket: updated,
  });
}
