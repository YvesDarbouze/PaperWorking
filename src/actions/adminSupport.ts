'use server';

import { cookies } from 'next/headers';
import { authorize } from '@/lib/authz/authorize';
import { logAdminAudit } from '@/lib/audit/auditLogger';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { CommunicationEngine } from '@/lib/engine/CommunicationEngine';
import type { SupportTicket, TicketMessage, TicketStatus, TaxonomyTag, SavedReply, PresenceLock } from '@/lib/support/types';

const STARTER_TAXONOMY: { name: string; slug: string; description: string }[] = [
  { name: 'Plaid Connection', slug: 'plaid-connection', description: 'Bank linking, OAuth re-authentication, and Plaid DTM issues' },
  { name: 'Billing & Subscriptions', slug: 'billing', description: 'Invoices, Stripe payments, plan upgrades, and past due dunning' },
  { name: 'Portfolio Data', slug: 'portfolio-data', description: 'ReilProject metrics, expense tracking, and NOI calculations' },
  { name: 'KPI Insights', slug: 'kpi-insights', description: 'Analytics dashboards, cap rate, and cash-on-cash yield queries' },
  { name: 'Phase Gates', slug: 'phase-gates', description: 'Acquisition phase gates, override governance, and approvals' },
  { name: 'Account Access', slug: 'account-access', description: 'Password resets, MFA configuration, and login issues' },
  { name: 'Bug Report', slug: 'bug', description: 'Technical software bugs and unexpected system errors' },
  { name: 'Feature Request', slug: 'feature-request', description: 'Customer product feedback and new feature suggestions' },
];

async function getSessionToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get('__session')?.value || null;
  } catch {
    return null;
  }
}

/**
 * Server Action: Fetch support tickets with queue filtering & search
 */
export async function getSupportTickets(params?: {
  queue?: 'mine' | 'unassigned' | 'all';
  tag?: string;
  search?: string;
}): Promise<SupportTicket[]> {
  const token = await getSessionToken();
  const authz = await authorize(token, 'admin:view_tickets');
  if (!authz.authorized || !authz.user) return [];

  const currentUserUid = authz.user.uid;
  const queue = params?.queue || 'all';

  try {
    const snap = await adminDb.collection('support_tickets').get();
    if (snap.empty) return [];

    const now = new Date().getTime();
    let tickets: SupportTicket[] = [];

    snap.docs.forEach((doc) => {
      const d = doc.data();
      const snoozedUntilMs = d.snoozedUntil?.toDate ? d.snoozedUntil.toDate().getTime() : (d.snoozedUntil ? new Date(d.snoozedUntil).getTime() : 0);

      // Auto-unsnooze if expired
      if (snoozedUntilMs && snoozedUntilMs <= now) {
        // Return to active state
      } else if (snoozedUntilMs && snoozedUntilMs > now) {
        // Currently snoozed — skip unless explicitly searching
        if (!params?.search) return;
      }

      const ticket: SupportTicket = {
        id: doc.id,
        subject: d.subject || 'No Subject',
        body: d.body || '',
        requesterUid: d.requesterUid || null,
        requesterEmail: d.requesterEmail || '',
        requesterName: d.requesterName || d.requesterEmail?.split('@')[0] || 'Unknown Requester',
        status: d.status || 'active',
        priority: d.priority || 'normal',
        assigneeUid: d.assigneeUid || null,
        assigneeName: d.assigneeName || null,
        tags: Array.isArray(d.tags) ? d.tags : [],
        createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : new Date().toISOString(),
        updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate().toISOString() : new Date().toISOString(),
        lastCustomerReplyAt: d.lastCustomerReplyAt?.toDate ? d.lastCustomerReplyAt.toDate().toISOString() : null,
        lastInternalReplyAt: d.lastInternalReplyAt?.toDate ? d.lastInternalReplyAt.toDate().toISOString() : null,
        firstResponseAt: d.firstResponseAt?.toDate ? d.firstResponseAt.toDate().toISOString() : null,
        resolvedAt: d.resolvedAt?.toDate ? d.resolvedAt.toDate().toISOString() : null,
        snoozedUntil: d.snoozedUntil?.toDate ? d.snoozedUntil.toDate().toISOString() : (d.snoozedUntil || null),
        fcrEligible: d.fcrEligible !== false,
      };

      // Queue filters
      if (queue === 'mine' && ticket.assigneeUid !== currentUserUid) return;
      if (queue === 'unassigned' && ticket.assigneeUid !== null) return;
      if (params?.tag && !ticket.tags.includes(params.tag)) return;

      if (params?.search) {
        const q = params.search.toLowerCase();
        const match =
          ticket.id.toLowerCase().includes(q) ||
          ticket.subject.toLowerCase().includes(q) ||
          ticket.requesterName.toLowerCase().includes(q) ||
          ticket.requesterEmail.toLowerCase().includes(q);
        if (!match) return;
      }

      tickets.push(ticket);
    });

    // Sort by updatedAt desc
    tickets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return tickets;
  } catch (error) {
    console.error('[getSupportTickets] Error:', error);
    return [];
  }
}

/**
 * Server Action: Fetch ticket details including messages subcollection & presence locks
 */
export async function getTicketDetails(ticketId: string): Promise<{
  ticket: SupportTicket | null;
  messages: TicketMessage[];
  presence: PresenceLock[];
}> {
  const token = await getSessionToken();
  const authz = await authorize(token, 'admin:view_tickets');
  if (!authz.authorized) {
    return { ticket: null, messages: [], presence: [] };
  }

  try {
    const ticketDoc = await adminDb.collection('support_tickets').doc(ticketId).get();
    if (!ticketDoc.exists) return { ticket: null, messages: [], presence: [] };

    const d = ticketDoc.data()!;
    const ticket: SupportTicket = {
      id: ticketDoc.id,
      subject: d.subject || '',
      body: d.body || '',
      requesterUid: d.requesterUid || null,
      requesterEmail: d.requesterEmail || '',
      requesterName: d.requesterName || '',
      status: d.status || 'active',
      priority: d.priority || 'normal',
      assigneeUid: d.assigneeUid || null,
      assigneeName: d.assigneeName || null,
      tags: Array.isArray(d.tags) ? d.tags : [],
      createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : new Date().toISOString(),
      updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate().toISOString() : new Date().toISOString(),
      lastCustomerReplyAt: d.lastCustomerReplyAt?.toDate ? d.lastCustomerReplyAt.toDate().toISOString() : null,
      lastInternalReplyAt: d.lastInternalReplyAt?.toDate ? d.lastInternalReplyAt.toDate().toISOString() : null,
      firstResponseAt: d.firstResponseAt?.toDate ? d.firstResponseAt.toDate().toISOString() : null,
      resolvedAt: d.resolvedAt?.toDate ? d.resolvedAt.toDate().toISOString() : null,
      snoozedUntil: d.snoozedUntil?.toDate ? d.snoozedUntil.toDate().toISOString() : (d.snoozedUntil || null),
      fcrEligible: d.fcrEligible !== false,
    };

    // Messages
    const msgsSnap = await adminDb.collection('support_tickets').doc(ticketId).collection('messages').orderBy('createdAt', 'asc').get();
    const messages: TicketMessage[] = msgsSnap.docs.map((doc) => {
      const md = doc.data();
      return {
        id: doc.id,
        authorType: md.authorType || 'customer',
        authorUid: md.authorUid || null,
        authorEmail: md.authorEmail || '',
        authorName: md.authorName || '',
        body: md.body || '',
        createdAt: md.createdAt?.toDate ? md.createdAt.toDate().toISOString() : new Date().toISOString(),
      };
    });

    // Presence locks
    const presenceSnap = await adminDb.collection('support_ticket_presence').doc(ticketId).collection('viewers').get();
    const presence: PresenceLock[] = presenceSnap.docs.map((doc) => {
      const pd = doc.data();
      return {
        ticketId,
        uid: doc.id,
        displayName: pd.displayName || 'Team Member',
        lastActiveAt: pd.lastActiveAt?.toDate ? pd.lastActiveAt.toDate().toISOString() : new Date().toISOString(),
      };
    });

    return { ticket, messages, presence };
  } catch (error) {
    console.error('[getTicketDetails] Error:', error);
    return { ticket: null, messages: [], presence: [] };
  }
}

/**
 * Server Action: Claim or Unclaim a support ticket
 */
export async function claimTicket(ticketId: string, claim: boolean = true): Promise<{ success: boolean; error?: string }> {
  const token = await getSessionToken();
  const authz = await authorize(token, 'admin:manage_tickets');
  if (!authz.authorized || !authz.user) {
    return { success: false, error: authz.reason || 'Unauthorized' };
  }

  try {
    const ticketRef = adminDb.collection('support_tickets').doc(ticketId);
    const doc = await ticketRef.get();
    if (!doc.exists) return { success: false, error: 'Ticket not found' };

    const beforeAssignee = doc.data()?.assigneeUid || null;
    const newAssigneeUid = claim ? authz.user.uid : null;
    const newAssigneeName = claim ? (authz.user.displayName || authz.user.email) : null;

    await ticketRef.update({
      assigneeUid: newAssigneeUid,
      assigneeName: newAssigneeName,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await logAdminAudit({
      actorUid: authz.user.uid,
      actorEmail: authz.user.email,
      actorRole: authz.user.role,
      action: claim ? 'ticket.claimed' : 'ticket.unclaimed',
      targetResource: 'support_tickets',
      targetResourceId: ticketId,
      status: 'SUCCESS',
      severity: 'info',
      metadata: {
        beforeAssignee,
        afterAssignee: newAssigneeUid,
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error('[claimTicket] Error:', error);
    return { success: false, error: error?.message };
  }
}

/**
 * Server Action: Add an Internal Note (NEVER sent to customer)
 */
export async function addInternalNote(ticketId: string, body: string): Promise<{ success: boolean; error?: string }> {
  const token = await getSessionToken();
  const authz = await authorize(token, 'admin:manage_tickets');
  if (!authz.authorized || !authz.user) {
    return { success: false, error: authz.reason || 'Unauthorized' };
  }

  if (!body || !body.trim()) return { success: false, error: 'Note body cannot be empty.' };

  try {
    const ticketRef = adminDb.collection('support_tickets').doc(ticketId);
    const msgRef = ticketRef.collection('messages').doc();

    await msgRef.set({
      id: msgRef.id,
      authorType: 'internal_note',
      authorUid: authz.user.uid,
      authorEmail: authz.user.email,
      authorName: authz.user.displayName || authz.user.email,
      body: body.trim(),
      createdAt: FieldValue.serverTimestamp(),
    });

    await ticketRef.update({
      updatedAt: FieldValue.serverTimestamp(),
    });

    await logAdminAudit({
      actorUid: authz.user.uid,
      actorEmail: authz.user.email,
      actorRole: authz.user.role,
      action: 'ticket.note_added',
      targetResource: 'support_tickets',
      targetResourceId: ticketId,
      status: 'SUCCESS',
      severity: 'info',
      metadata: {
        noteId: msgRef.id,
        bodyLength: body.trim().length,
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error('[addInternalNote] Error:', error);
    return { success: false, error: error?.message };
  }
}

/**
 * Server Action: Send Customer Reply via Resend / CommunicationEngine
 * Dispatches outbound email, sets firstResponseAt on first reply, updates status to 'pending'.
 */
export async function sendCustomerReply(ticketId: string, body: string): Promise<{ success: boolean; error?: string }> {
  const token = await getSessionToken();
  const authz = await authorize(token, 'admin:manage_tickets');
  if (!authz.authorized || !authz.user) {
    return { success: false, error: authz.reason || 'Unauthorized' };
  }

  if (!body || !body.trim()) return { success: false, error: 'Reply body cannot be empty.' };

  try {
    const ticketRef = adminDb.collection('support_tickets').doc(ticketId);
    const ticketDoc = await ticketRef.get();
    if (!ticketDoc.exists) return { success: false, error: 'Ticket not found.' };

    const tData = ticketDoc.data()!;
    const isFirstResponse = !tData.firstResponseAt;

    // 1. Dispatch outbound email to requester via SendGrid System Email Adapter (E-1, E-3)
    if (tData.requesterEmail) {
      try {
        const { getEmailProvider } = await import('@/lib/email/getEmailProvider');
        const emailProvider = getEmailProvider();
        await emailProvider.sendEmail({
          from: 'notifications@mail.paperworking.co',
          replyTo: 'hi@paperworking.co',
          to: [tData.requesterEmail],
          subject: `Re: ${tData.subject || 'PaperWorking Support'} [${ticketId}]`,
          templateKey: 'SUPPORT-CUSTOMER-REPLY',
          messageClass: 'O',
          html: `<div style="font-family: sans-serif; line-height: 1.6; color: #111;">
            <p>${body.trim().replace(/\n/g, '<br/>')}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #666;">PaperWorking Customer Support • Ticket ID: ${ticketId}</p>
          </div>`,
          text: `${body.trim()}\n\n--- PaperWorking Customer Support • Ticket ID: ${ticketId}`,
        });
      } catch (emailErr) {
        console.error('[sendCustomerReply] Outbound email dispatch error:', emailErr);
        // Continue ticket state update gracefully
      }
    }

    // 2. Write internal_reply message to subcollection
    const msgRef = ticketRef.collection('messages').doc();
    await msgRef.set({
      id: msgRef.id,
      authorType: 'internal_reply',
      authorUid: authz.user.uid,
      authorEmail: authz.user.email,
      authorName: authz.user.displayName || authz.user.email,
      body: body.trim(),
      createdAt: FieldValue.serverTimestamp(),
    });

    // 3. Update ticket metadata (sets firstResponseAt ONCE)
    const updatePayload: Record<string, any> = {
      status: 'pending',
      lastInternalReplyAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (isFirstResponse) {
      updatePayload.firstResponseAt = FieldValue.serverTimestamp();
    }

    await ticketRef.update(updatePayload);

    await logAdminAudit({
      actorUid: authz.user.uid,
      actorEmail: authz.user.email,
      actorRole: authz.user.role,
      action: 'ticket.replied',
      targetResource: 'support_tickets',
      targetResourceId: ticketId,
      status: 'SUCCESS',
      severity: 'info',
      metadata: {
        messageId: msgRef.id,
        recipientEmail: tData.requesterEmail,
        isFirstResponse,
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error('[sendCustomerReply] Error:', error);
    return { success: false, error: error?.message };
  }
}

/**
 * Server Action: Update Ticket Status (active, pending, closed)
 */
export async function updateTicketStatus(ticketId: string, status: TicketStatus): Promise<{ success: boolean; error?: string }> {
  const token = await getSessionToken();
  const authz = await authorize(token, 'admin:manage_tickets');
  if (!authz.authorized || !authz.user) {
    return { success: false, error: authz.reason || 'Unauthorized' };
  }

  try {
    const ticketRef = adminDb.collection('support_tickets').doc(ticketId);
    const doc = await ticketRef.get();
    if (!doc.exists) return { success: false, error: 'Ticket not found' };

    const beforeStatus = doc.data()?.status || 'active';
    const updatePayload: Record<string, any> = {
      status,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (status === 'closed') {
      updatePayload.resolvedAt = FieldValue.serverTimestamp();
    }

    await ticketRef.update(updatePayload);

    await logAdminAudit({
      actorUid: authz.user.uid,
      actorEmail: authz.user.email,
      actorRole: authz.user.role,
      action: 'ticket.status_changed',
      targetResource: 'support_tickets',
      targetResourceId: ticketId,
      status: 'SUCCESS',
      severity: 'info',
      metadata: {
        beforeStatus,
        afterStatus: status,
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error('[updateTicketStatus] Error:', error);
    return { success: false, error: error?.message };
  }
}

/**
 * Server Action: Update Ticket Tags (validated against controlled taxonomy)
 */
export async function updateTicketTags(ticketId: string, tags: string[]): Promise<{ success: boolean; error?: string }> {
  const token = await getSessionToken();
  const authz = await authorize(token, 'admin:manage_tickets');
  if (!authz.authorized || !authz.user) {
    return { success: false, error: authz.reason || 'Unauthorized' };
  }

  try {
    // Validate tags against active taxonomy
    const taxonomy = await getTaxonomy();
    const activeSlugs = new Set(taxonomy.map((t) => t.slug));

    for (const tag of tags) {
      if (!activeSlugs.has(tag)) {
        return { success: false, error: `Tag "${tag}" is not in the controlled taxonomy.` };
      }
    }

    const ticketRef = adminDb.collection('support_tickets').doc(ticketId);
    await ticketRef.update({
      tags,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await logAdminAudit({
      actorUid: authz.user.uid,
      actorEmail: authz.user.email,
      actorRole: authz.user.role,
      action: 'ticket.tagged',
      targetResource: 'support_tickets',
      targetResourceId: ticketId,
      status: 'SUCCESS',
      severity: 'info',
      metadata: { tags },
    });

    return { success: true };
  } catch (error: any) {
    console.error('[updateTicketTags] Error:', error);
    return { success: false, error: error?.message };
  }
}

/**
 * Server Action: Snooze Ticket
 */
export async function snoozeTicket(ticketId: string, untilIso: string | null): Promise<{ success: boolean; error?: string }> {
  const token = await getSessionToken();
  const authz = await authorize(token, 'admin:manage_tickets');
  if (!authz.authorized || !authz.user) {
    return { success: false, error: authz.reason || 'Unauthorized' };
  }

  try {
    const ticketRef = adminDb.collection('support_tickets').doc(ticketId);
    await ticketRef.update({
      snoozedUntil: untilIso ? new Date(untilIso) : null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await logAdminAudit({
      actorUid: authz.user.uid,
      actorEmail: authz.user.email,
      actorRole: authz.user.role,
      action: 'ticket.snoozed',
      targetResource: 'support_tickets',
      targetResourceId: ticketId,
      status: 'SUCCESS',
      severity: 'info',
      metadata: { snoozedUntil: untilIso },
    });

    return { success: true };
  } catch (error: any) {
    console.error('[snoozeTicket] Error:', error);
    return { success: false, error: error?.message };
  }
}

/**
 * Server Action: Fetch Controlled Tag Taxonomy
 */
export async function getTaxonomy(): Promise<TaxonomyTag[]> {
  try {
    const snap = await adminDb.collection('support_taxonomy').get();
    if (snap.empty) {
      // Seed starter taxonomy in Firestore
      const tags: TaxonomyTag[] = [];
      for (const t of STARTER_TAXONOMY) {
        const ref = adminDb.collection('support_taxonomy').doc(t.slug);
        const tagDoc = {
          id: t.slug,
          name: t.name,
          slug: t.slug,
          description: t.description,
          active: true,
          createdAt: new Date().toISOString(),
        };
        await ref.set(tagDoc);
        tags.push(tagDoc);
      }
      return tags;
    }

    return snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        name: d.name || doc.id,
        slug: d.slug || doc.id,
        description: d.description || '',
        active: d.active !== false,
        createdAt: d.createdAt || new Date().toISOString(),
      };
    }).filter((t) => t.active);
  } catch (error) {
    console.error('[getTaxonomy] Error:', error);
    return STARTER_TAXONOMY.map((t) => ({ ...t, id: t.slug, active: true, createdAt: new Date().toISOString() }));
  }
}

/**
 * Server Action: Fetch Saved Reply Templates
 */
export async function getSavedReplies(): Promise<SavedReply[]> {
  try {
    const snap = await adminDb.collection('support_saved_replies').get();
    if (snap.empty) return [];

    return snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        title: d.title || 'Untitled',
        content: d.content || '',
        category: d.category || 'General',
        createdByUid: d.createdByUid || 'SYSTEM',
        createdAt: d.createdAt || new Date().toISOString(),
      };
    });
  } catch (error) {
    console.error('[getSavedReplies] Error:', error);
    return [];
  }
}

/**
 * Server Action: Create Saved Reply Template
 */
export async function createSavedReply(params: { title: string; content: string; category?: string }): Promise<{ success: boolean; error?: string }> {
  const token = await getSessionToken();
  const authz = await authorize(token, 'admin:manage_tickets');
  if (!authz.authorized || !authz.user) {
    return { success: false, error: authz.reason || 'Unauthorized' };
  }

  try {
    const ref = adminDb.collection('support_saved_replies').doc();
    await ref.set({
      id: ref.id,
      title: params.title.trim(),
      content: params.content.trim(),
      category: params.category || 'General',
      createdByUid: authz.user.uid,
      createdAt: FieldValue.serverTimestamp(),
    });

    await logAdminAudit({
      actorUid: authz.user.uid,
      actorEmail: authz.user.email,
      actorRole: authz.user.role,
      action: 'saved_reply.created',
      targetResource: 'support_saved_replies',
      targetResourceId: ref.id,
      status: 'SUCCESS',
      severity: 'info',
      metadata: { title: params.title },
    });

    return { success: true };
  } catch (error: any) {
    console.error('[createSavedReply] Error:', error);
    return { success: false, error: error?.message };
  }
}
