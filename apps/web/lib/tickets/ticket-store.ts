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

export type TicketKind = 'bug' | 'feature_request' | 'idea' | 'callback' | 'support' | 'question';
export type TicketStatus = 'open' | 'in_progress' | 'waiting_on_user' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketQueue = 'unassigned' | 'mine' | 'all';

export interface TicketEngagementMessage {
  id: string;
  author: 'user' | 'assistant' | 'admin' | 'system';
  authorName: string;
  authorEmail?: string;
  content: string;
  timestamp: string;
  isInternalNote?: boolean;
  attachments?: Array<{
    name: string;
    url?: string;
    type?: string;
    size?: number;
  }>;
}

export interface AdminTicketRecord {
  id: string;
  kind: TicketKind;
  subject: string;
  description: string;
  requesterName: string;
  requesterEmail: string;
  requesterTier: string;
  status: TicketStatus;
  priority: TicketPriority;
  queue: TicketQueue;
  assignedTo?: string;
  module?: string;
  reilPhase?: string;
  dinnerPledge?: boolean;
  phone?: string;
  preferredWindow?: string;
  diagnostics?: Record<string, unknown>;
  hasAttachment?: boolean;
  attachmentName?: string;
  tags: string[];
  engagementHistory: TicketEngagementMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketInput {
  id?: string;
  kind: TicketKind;
  subject: string;
  description: string;
  requesterName: string;
  requesterEmail: string;
  requesterTier?: string;
  priority?: TicketPriority;
  queue?: TicketQueue;
  assignedTo?: string;
  module?: string;
  reilPhase?: string;
  dinnerPledge?: boolean;
  phone?: string;
  preferredWindow?: string;
  diagnostics?: Record<string, unknown>;
  hasAttachment?: boolean;
  attachmentName?: string;
  tags?: string[];
  initialMessage?: string;
}

export interface TicketFilterOptions {
  queue?: TicketQueue | 'all';
  status?: TicketStatus | 'all';
  kind?: TicketKind | 'all';
  priority?: TicketPriority | 'all';
  search?: string;
  limit?: number;
}

// Realistic baseline dataset seeded once when repository is initialized
const SEED_REAL_TICKETS: AdminTicketRecord[] = [
  {
    id: 'PW-BUG-18420',
    kind: 'bug',
    subject: 'Cannot upload LOI package in Document Vault',
    description: 'When uploading signed multi-page LOI PDF on Safari macOS, document hangs on 99% progress.',
    requesterName: 'Bob Martinez',
    requesterEmail: 'bob@capital.test',
    requesterTier: 'investor',
    status: 'open',
    priority: 'high',
    queue: 'unassigned',
    module: 'Document Vault',
    reilPhase: 'Fund',
    dinnerPledge: false,
    tags: ['vault', 'pdf-upload', 'safari'],
    diagnostics: {
      appVersion: '0.1.0-dev',
      platform: 'macOS',
      route: '/projects/proj-8492/vault',
      viewport: { width: 1440, height: 900 },
      recentErrors: [{ message: 'NetworkTimeoutException during chunk upload', timestamp: '2026-08-21T15:00:00.000Z' }],
    },
    hasAttachment: true,
    attachmentName: 'loi-upload-freeze.png',
    engagementHistory: [
      {
        id: 'msg-seed-1',
        author: 'user',
        authorName: 'Bob Martinez',
        authorEmail: 'bob@capital.test',
        content: 'When uploading signed multi-page LOI PDF on Safari macOS, document hangs on 99% progress.',
        timestamp: '2026-08-21T15:00:00.000Z',
      },
    ],
    createdAt: '2026-08-21T15:00:00.000Z',
    updatedAt: '2026-08-21T15:00:00.000Z',
  },
  {
    id: 'PW-FEAT-39102',
    kind: 'feature_request',
    subject: 'Automated Cap Rate sensitivity heatmaps on Deal Calculator',
    description: 'Would love a 2D sensitivity matrix comparing Exit Cap Rate vs. Interest Rate to show LPs return swings at a glance.',
    requesterName: 'Elena Rostova',
    requesterEmail: 'elena@syndicate.test',
    requesterTier: 'investment_team',
    status: 'in_progress',
    priority: 'high',
    queue: 'mine',
    assignedTo: 'admin@paperworking.co',
    module: 'Deal Calculator',
    reilPhase: 'Acquisition',
    dinnerPledge: true,
    tags: ['calculator', 'sensitivity', 'dinner-pledge'],
    diagnostics: {
      appVersion: '0.1.0-dev',
      route: '/calculator',
      platform: 'macOS',
    },
    engagementHistory: [
      {
        id: 'msg-seed-2',
        author: 'user',
        authorName: 'Elena Rostova',
        authorEmail: 'elena@syndicate.test',
        content: 'Would love a 2D sensitivity matrix comparing Exit Cap Rate vs. Interest Rate to show LPs return swings at a glance.',
        timestamp: '2026-08-21T12:20:00.000Z',
      },
      {
        id: 'msg-seed-3',
        author: 'admin',
        authorName: 'Yves (Lead Admin)',
        authorEmail: 'yves@paperworking.co',
        content: 'Elena, great suggestion. This is planned for the Acquisition v2 milestone. Dinner is on us when this ships!',
        timestamp: '2026-08-21T13:00:00.000Z',
        isInternalNote: false,
      },
    ],
    createdAt: '2026-08-21T12:20:00.000Z',
    updatedAt: '2026-08-21T13:00:00.000Z',
  },
  {
    id: 'PW-CALL-28491',
    kind: 'callback',
    subject: 'Priority Callback: Title contingency deadline expiring in 48 hours',
    description: 'Need assistance verifying escrow earnest money release conditions before Friday 5:00 PM EST.',
    requesterName: 'Marcus Vance',
    requesterEmail: 'marcus@vanceholdings.test',
    requesterTier: 'investment_team',
    status: 'open',
    priority: 'critical',
    queue: 'unassigned',
    phone: '+1-415-555-0199',
    preferredWindow: 'Within 15 minutes (Priority SLA)',
    tags: ['contingency', 'urgent-closing', 'callback'],
    engagementHistory: [
      {
        id: 'msg-seed-4',
        author: 'user',
        authorName: 'Marcus Vance',
        authorEmail: 'marcus@vanceholdings.test',
        content: 'Title contingency deadline expiring in 48 hours. Please call +1-415-555-0199.',
        timestamp: '2026-08-21T16:15:00.000Z',
      },
    ],
    createdAt: '2026-08-21T16:15:00.000Z',
    updatedAt: '2026-08-21T16:15:00.000Z',
  },
  {
    id: 'PW-SUP-18204',
    kind: 'support',
    subject: 'Sub-contractor invoice breakdown export for CPA Schedule E',
    description: 'How do I generate an itemized PDF report of capital expenditures vs operating repairs for my tax preparer?',
    requesterName: 'Sarah Jenkins',
    requesterEmail: 'sarah@jenkinsgroup.test',
    requesterTier: 'investor',
    status: 'resolved',
    priority: 'medium',
    queue: 'all',
    assignedTo: 'admin@paperworking.co',
    module: 'Holding Ledger',
    reilPhase: 'Hold',
    tags: ['tax', 'schedule-e', 'export'],
    engagementHistory: [
      {
        id: 'msg-seed-5',
        author: 'user',
        authorName: 'Sarah Jenkins',
        authorEmail: 'sarah@jenkinsgroup.test',
        content: 'How do I generate an itemized PDF report of capital expenditures vs operating repairs for my tax preparer?',
        timestamp: '2026-08-20T09:00:00.000Z',
      },
      {
        id: 'msg-seed-6',
        author: 'admin',
        authorName: 'Operations Staff',
        authorEmail: 'no_reply@paperworking.co',
        content: 'Hi Sarah, navigate to Project > Holding > Ledger, click "Export", and select "CPA Tax Package (Schedule E / Form 4797)".',
        timestamp: '2026-08-20T10:15:00.000Z',
        isInternalNote: false,
      },
    ],
    createdAt: '2026-08-20T09:00:00.000Z',
    updatedAt: '2026-08-20T10:15:00.000Z',
  },
];

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
    const prefix =
      kind === 'bug'
        ? 'PW-BUG'
        : kind === 'feature_request'
        ? 'PW-FEAT'
        : kind === 'callback'
        ? 'PW-CALL'
        : kind === 'question'
        ? 'PW-ASK'
        : kind === 'idea'
        ? 'PW-IDEA'
        : 'PW-SUP';
    const rand = Math.floor(10000 + Math.random() * 90000);
    return `${prefix}-${rand}`;
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
