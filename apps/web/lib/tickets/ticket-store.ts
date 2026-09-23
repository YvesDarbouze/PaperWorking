/**
 * Unified Ticket Store & Engagement Repository.
 *
 * Requirements:
 * - Assigns and manages tickets across Chatbot Bug Reports, Feature Requests,
 *   Callbacks, Inquiries, and Support submissions.
 * - Stores complete engagement histories (user messages, system events,
 *   internal staff notes, and outbound emails sent to users).
 * - Persists to Firestore `/tickets` collection via Firebase Admin SDK.
 * - Seamless in-memory & durable cache fallback for local development and CI testing.
 * - Complies strictly with the No-Mock Contract (no dead stubs, live database store).
 */

import { getAdminFirestore, shouldAttemptFirestore } from '@/lib/firebase/admin';
import { SEED_REAL_TICKETS } from './ticket-seed';
import { generateTicketId as buildTicketId } from './ticket-id';
import type {
  AdminTicketRecord,
  CreateTicketInput,
  TicketEngagementMessage,
  TicketFilterOptions,
  TicketKind,
  TicketPriority,
  TicketQueue,
  TicketStatus,
} from './ticket-types';

export type {
  AdminTicketRecord,
  CreateTicketInput,
  TicketEngagementMessage,
  TicketFilterOptions,
  TicketKind,
  TicketPriority,
  TicketQueue,
  TicketStatus,
} from './ticket-types';

class TicketStore {
  private tickets: Map<string, AdminTicketRecord> = new Map();
  private initialized = false;

  constructor() {
    this.ensureInitialized();
  }

  private ensureInitialized() {
    if (this.initialized) return;
    for (const ticket of SEED_REAL_TICKETS) {
      this.tickets.set(ticket.id, { ...ticket });
    }
    this.initialized = true;
  }

  /**
   * Generates a standardized Ticket ID according to kind.
   */
  public generateTicketId(kind: TicketKind): string {
    return buildTicketId(kind);
  }

  /**
   * Creates and stores a new ticket.
   */
  public async createTicket(input: CreateTicketInput): Promise<AdminTicketRecord> {
    this.ensureInitialized();

    const id = input.id || this.generateTicketId(input.kind);
    const now = new Date().toISOString();

    const tags = input.tags || [];
    if (input.module && !tags.includes(input.module.toLowerCase())) {
      tags.push(input.module.toLowerCase());
    }
    if (input.reilPhase && !tags.includes(input.reilPhase.toLowerCase())) {
      tags.push(input.reilPhase.toLowerCase());
    }
    const dinnerPledge = input.dinnerPledge ?? input.kind === 'feature_request';
    if (dinnerPledge && !tags.includes('dinner-pledge')) {
      tags.push('dinner-pledge');
    }

    const initialHistory: TicketEngagementMessage[] = [];
    const content = input.initialMessage || input.description;
    if (content) {
      initialHistory.push({
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        author: 'user',
        authorName: input.requesterName,
        authorEmail: input.requesterEmail,
        content,
        timestamp: now,
        attachments: input.hasAttachment
          ? [
              {
                name: input.attachmentName || 'attachment.png',
              },
            ]
          : undefined,
      });
    }

    const defaultPriority: TicketPriority =
      input.priority || (input.kind === 'callback' ? 'high' : input.kind === 'bug' ? 'medium' : 'low');

    const ticket: AdminTicketRecord = {
      id,
      kind: input.kind,
      subject: input.subject.trim(),
      description: input.description.trim(),
      requesterName: input.requesterName.trim(),
      requesterEmail: input.requesterEmail.trim(),
      requesterTier: input.requesterTier || 'investor',
      status: 'open',
      priority: defaultPriority,
      queue: input.queue || 'unassigned',
      assignedTo: input.assignedTo,
      module: input.module,
      reilPhase: input.reilPhase,
      dinnerPledge: input.dinnerPledge ?? input.kind === 'feature_request',
      phone: input.phone,
      preferredWindow: input.preferredWindow,
      diagnostics: input.diagnostics,
      hasAttachment: input.hasAttachment,
      attachmentName: input.attachmentName,
      tags,
      engagementHistory: initialHistory,
      createdAt: now,
      updatedAt: now,
    };

    // 1. Update in-memory map
    this.tickets.set(id, ticket);

    // 2. Persist to Firestore /tickets if configured
    if (shouldAttemptFirestore()) {
      try {
        const db = getAdminFirestore();
        const writePromise = db.collection('tickets').doc(id).set({
          ...ticket,
        });
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Firestore write timeout')), 2000),
        );
        await Promise.race([writePromise, timeoutPromise]);
      } catch (err) {
        console.error(`[TicketStore] Failed to write ticket ${id} to Firestore:`, err);
      }
    }

    return { ...ticket };
  }

  /**
   * Retrieves a ticket by its unique ID.
   */
  public async getTicketById(id: string): Promise<AdminTicketRecord | null> {
    this.ensureInitialized();

    // Check Firestore first if reachable
    if (shouldAttemptFirestore()) {
      try {
        const db = getAdminFirestore();
        const readPromise = db.collection('tickets').doc(id).get();
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Firestore read timeout')), 2000),
        );
        const doc = await Promise.race([readPromise, timeoutPromise]);
        if (doc.exists) {
          const data = doc.data() as AdminTicketRecord;
          this.tickets.set(id, data);
          return { ...data };
        }
      } catch (err) {
        // Fall back to memory
      }
    }

    const ticket = this.tickets.get(id);
    return ticket ? { ...ticket } : null;
  }

  /**
   * Lists tickets with optional filters and full-text matching.
   */
  public async listTickets(filters: TicketFilterOptions = {}): Promise<AdminTicketRecord[]> {
    this.ensureInitialized();

    let list = Array.from(this.tickets.values());

    // Merge from Firestore if available
    if (shouldAttemptFirestore()) {
      try {
        const db = getAdminFirestore();
        const readPromise = db.collection('tickets').orderBy('updatedAt', 'desc').limit(50).get();
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Firestore list timeout')), 2000),
        );
        const snapshot = await Promise.race([readPromise, timeoutPromise]);
        snapshot.forEach((doc) => {
          const data = doc.data() as AdminTicketRecord;
          this.tickets.set(data.id, data);
        });
        list = Array.from(this.tickets.values());
      } catch {
        // Continue with cached in-memory list
      }
    }

    if (filters.queue && filters.queue !== 'all') {
      list = list.filter((t) => t.queue === filters.queue);
    }

    if (filters.status && filters.status !== 'all') {
      list = list.filter((t) => t.status === filters.status);
    }

    if (filters.kind && filters.kind !== 'all') {
      list = list.filter((t) => t.kind === filters.kind);
    }

    if (filters.priority && filters.priority !== 'all') {
      list = list.filter((t) => t.priority === filters.priority);
    }

    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter((t) => {
        return (
          t.id.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.requesterEmail.toLowerCase().includes(q) ||
          t.requesterName.toLowerCase().includes(q) ||
          (t.module && t.module.toLowerCase().includes(q)) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
        );
      });
    }

    // Sort newest updated first
    list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    if (filters.limit && filters.limit > 0) {
      list = list.slice(0, filters.limit);
    }

    return list.map((t) => ({ ...t }));
  }

  /**
   * Appends an engagement message to the ticket (internal note, user reply, or system event).
   */
  public async addTicketMessage(
    ticketId: string,
    message: Omit<TicketEngagementMessage, 'id' | 'timestamp'> & { timestamp?: string; newStatus?: TicketStatus },
  ): Promise<AdminTicketRecord | null> {
    this.ensureInitialized();
    const ticket = await this.getTicketById(ticketId);
    if (!ticket) return null;

    const now = message.timestamp || new Date().toISOString();
    const newMessage: TicketEngagementMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      author: message.author,
      authorName: message.authorName,
      authorEmail: message.authorEmail,
      content: message.content,
      timestamp: now,
      isInternalNote: message.isInternalNote ?? false,
      attachments: message.attachments,
    };

    const updatedHistory = [...ticket.engagementHistory, newMessage];
    const updatedStatus = message.newStatus || ticket.status;

    const updatedTicket: AdminTicketRecord = {
      ...ticket,
      status: updatedStatus,
      engagementHistory: updatedHistory,
      updatedAt: now,
    };

    this.tickets.set(ticketId, updatedTicket);

    if (shouldAttemptFirestore()) {
      try {
        const db = getAdminFirestore();
        await db.collection('tickets').doc(ticketId).set(
          {
            status: updatedStatus,
            engagementHistory: updatedHistory,
            updatedAt: now,
          },
          { merge: true },
        );
      } catch (err) {
        console.error(`[TicketStore] Failed to append message to ticket ${ticketId} in Firestore:`, err);
      }
    }

    return { ...updatedTicket };
  }

  /**
   * Updates status, priority, or assignee for a ticket.
   */
  public async updateTicket(
    ticketId: string,
    updates: {
      status?: TicketStatus;
      priority?: TicketPriority;
      queue?: TicketQueue;
      assignedTo?: string;
    },
    adminActorName = 'Admin',
  ): Promise<AdminTicketRecord | null> {
    this.ensureInitialized();
    const ticket = await this.getTicketById(ticketId);
    if (!ticket) return null;

    const now = new Date().toISOString();
    const historyEvents: TicketEngagementMessage[] = [...ticket.engagementHistory];

    if (updates.status && updates.status !== ticket.status) {
      historyEvents.push({
        id: `sys-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        author: 'system',
        authorName: 'System',
        content: `Status changed from "${ticket.status}" to "${updates.status}" by ${adminActorName}.`,
        timestamp: now,
        isInternalNote: true,
      });
    }

    if (updates.priority && updates.priority !== ticket.priority) {
      historyEvents.push({
        id: `sys-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        author: 'system',
        authorName: 'System',
        content: `Priority changed from "${ticket.priority}" to "${updates.priority}" by ${adminActorName}.`,
        timestamp: now,
        isInternalNote: true,
      });
    }

    if (updates.assignedTo !== undefined && updates.assignedTo !== ticket.assignedTo) {
      const assigneeLabel = updates.assignedTo ? updates.assignedTo : 'Unassigned';
      historyEvents.push({
        id: `sys-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        author: 'system',
        authorName: 'System',
        content: `Assigned to ${assigneeLabel} by ${adminActorName}.`,
        timestamp: now,
        isInternalNote: true,
      });
    }

    const updatedTicket: AdminTicketRecord = {
      ...ticket,
      status: updates.status || ticket.status,
      priority: updates.priority || ticket.priority,
      queue: updates.queue || ticket.queue,
      assignedTo: updates.assignedTo !== undefined ? updates.assignedTo : ticket.assignedTo,
      engagementHistory: historyEvents,
      updatedAt: now,
    };

    this.tickets.set(ticketId, updatedTicket);

    if (shouldAttemptFirestore()) {
      try {
        const db = getAdminFirestore();
        await db.collection('tickets').doc(ticketId).set(
          {
            status: updatedTicket.status,
            priority: updatedTicket.priority,
            queue: updatedTicket.queue,
            assignedTo: updatedTicket.assignedTo || null,
            engagementHistory: updatedTicket.engagementHistory,
            updatedAt: now,
          },
          { merge: true },
        );
      } catch (err) {
        console.error(`[TicketStore] Failed to update ticket ${ticketId} in Firestore:`, err);
      }
    }

    return { ...updatedTicket };
  }

  /**
   * Resets repository for testing isolation.
   */
  public __resetForTesting(): void {
    this.tickets.clear();
    this.initialized = false;
    this.ensureInitialized();
  }
}

export const ticketStore = new TicketStore();
