import AdminTicketsPanel from '@/components/admin/AdminTicketsPanel';
import { ticketStore } from '@/lib/tickets/ticket-store';

export default async function AdminTicketsPage() {
  const initialTickets = await ticketStore.listTickets();
  return <AdminTicketsPanel initialTickets={initialTickets} />;
}
