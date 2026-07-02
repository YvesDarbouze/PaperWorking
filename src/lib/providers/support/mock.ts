import { SupportProvider, SupportMessage, SupportTicket } from './index';

const STORAGE_KEY = 'pw_mock_support_tickets';

let memoryTickets: SupportTicket[] = [];

function getStoredTickets(): SupportTicket[] {
  if (typeof window === 'undefined') return memoryTickets;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredTickets(tickets: SupportTicket[]) {
  if (typeof window === 'undefined') {
    memoryTickets = tickets;
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  } catch (e) {
    console.error('[MockSupportProvider] Failed to save mock tickets:', e);
  }
}

export class MockSupportProvider implements SupportProvider {
  async getOpenTicket(userId: string): Promise<SupportTicket | null> {
    const tickets = getStoredTickets();
    const openTicket = tickets.find((t) => t.userId === userId && t.status === 'open');
    return openTicket || null;
  }

  async createTicket(
    userId: string,
    email: string,
    plan: string,
    messages: SupportMessage[]
  ): Promise<string> {
    const tickets = getStoredTickets();
    const id = 'mock-ticket-' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();
    const newTicket: SupportTicket = {
      id,
      userId,
      email,
      plan,
      status: 'open',
      messages,
      createdAt: now,
      updatedAt: now,
    };
    tickets.push(newTicket);
    saveStoredTickets(tickets);
    return id;
  }

  async addMessage(ticketId: string, message: SupportMessage): Promise<void> {
    const tickets = getStoredTickets();
    const idx = tickets.findIndex((t) => t.id === ticketId);
    if (idx !== -1) {
      tickets[idx].messages.push(message);
      tickets[idx].updatedAt = new Date().toISOString();
      saveStoredTickets(tickets);
    }
  }

  async getUserTickets(userId: string): Promise<SupportTicket[]> {
    const tickets = getStoredTickets();
    return tickets.filter((t) => t.userId === userId);
  }
}
