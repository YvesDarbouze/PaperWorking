/**
 * Admin Tickets Query Endpoint.
 *
 * GET /api/admin/tickets?queue=all|unassigned|mine&status=all|open|in_progress|waiting_on_user|resolved|closed&kind=all|bug|feature_request|callback|support&priority=all|critical|high|medium|low&search=
 */

import { NextResponse, type NextRequest } from 'next/server';
import { isDevAdminAuthFailure, requireDevAdminAuth } from '@/lib/admin/dev-admin-auth';
import { ticketStore, type TicketFilterOptions } from '@/lib/tickets/ticket-store';

export async function GET(request: NextRequest) {
  const auth = await requireDevAdminAuth(request);
  if (isDevAdminAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const queue = (searchParams.get('queue') as any) || 'all';
  const status = (searchParams.get('status') as any) || 'all';
  const kind = (searchParams.get('kind') as any) || 'all';
  const priority = (searchParams.get('priority') as any) || 'all';
  const search = searchParams.get('search') || undefined;

  const filters: TicketFilterOptions = {
    queue,
    status,
    kind,
    priority,
    search,
  };

  const tickets = await ticketStore.listTickets(filters);

  return NextResponse.json({
    success: true,
    count: tickets.length,
    tickets,
  });
}
