import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { prisma } from '@/lib/prisma';

/* ═══════════════════════════════════════════════════════════════
   CommunicationEngine — Unified Transactional Mail Module

   Central module for all outbound email operations. Integrates:
     • Template rendering (canned + user-composed)
     • Resend API dispatch (transactional mail provider)
     • Per-recipient EmailLog tracking (Sent → Delivered → Opened → Clicked)
     • Firestore audit trail for real-time inbox display
     • Prisma CommunicationLog for portfolio analytics

   Core API:
     sendCannedEmail(templateId, userId, contextData)
     sendCustomEmail(opts)
     updateDeliveryStatus(messageId, status, timestamp)

   Provider: Resend (drop-in replaceable with SendGrid/SES)
   ═══════════════════════════════════════════════════════════════ */

// ─── Types ───────────────────────────────────────────────────

export type EmailStatus = 'Sent' | 'Delivered' | 'Opened' | 'Clicked' | 'Bounced' | 'Failed';

export type TemplateSlug =
  | 'phase_advance'
  | 'investor_pledge'
  | 'document_upload'
  | 'project_closed'
  | 'notification'
  | 'user_composed';

export interface ContextData {
  /** Required: Firestore project ID for deal context */
  projectId: string;
  /** Additional template-specific merge variables */
  [key: string]: unknown;
}

export interface SendResult {
  success: boolean;
  messageId: string;
  mock: boolean;
  recipientCount: number;
  error?: string;
}

interface DispatchPayload {
  to: string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}

// ─── Constants ───────────────────────────────────────────────

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://paperworking.co';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'notifications@paperworking.io';
const INBOUND_DOMAIN = process.env.INBOUND_EMAIL_DOMAIN || '';

// ─── Template Registry ──────────────────────────────────────

/**
 * Lazy-imports template generators to avoid circular deps.
 * Each returns { subject: string; html: string }.
 */
const TEMPLATE_REGISTRY: Record<
  TemplateSlug,
  (ctx: ContextData) => Promise<{ subject: string; html: string }>
> = {
  async phase_advance(ctx) {
    const { generatePhaseAdvanceEmail } = await import(
      '@/lib/emails/templates/PhaseAdvanceEmail'
    );
    return generatePhaseAdvanceEmail({
      projectName: (ctx.projectName as string) || 'Your Project',
      projectId: ctx.projectId,
      fromPhase: (ctx.fromPhase as string) || 'Unknown',
      toPhase: (ctx.toPhase as string) || 'Unknown',
      advancedBy: (ctx.advancedBy as string) || 'A team member',
      appUrl: APP_URL,
    });
  },

  async investor_pledge(ctx) {
    const { generateInvestorPledgeEmail } = await import(
      '@/lib/emails/templates/InvestorPledgeEmail'
    );
    return generateInvestorPledgeEmail({
      projectName: (ctx.projectName as string) || 'Your Project',
      projectId: ctx.projectId,
      investorName: (ctx.investorName as string) || 'An investor',
      pledgeAmount: (ctx.pledgeAmount as number) || 0,
      totalRaised: (ctx.totalRaised as number) || 0,
      targetAmount: (ctx.targetAmount as number) || 0,
      appUrl: APP_URL,
    });
  },

  async document_upload(ctx) {
    const { generateDocumentUploadEmail } = await import(
      '@/lib/emails/templates/DocumentUploadEmail'
    );
    return generateDocumentUploadEmail({
      projectName: (ctx.projectName as string) || 'Your Project',
      projectId: ctx.projectId,
      documentName: (ctx.documentName as string) || 'Untitled',
      category: (ctx.category as string) || 'General',
      uploaderName: (ctx.uploaderName as string) || 'A team member',
      appUrl: APP_URL,
    });
  },

  async project_closed(ctx) {
    const { generateProjectClosedEmail } = await import(
      '@/lib/emails/templates/ProjectClosedEmail'
    );
    return generateProjectClosedEmail({
      projectName: (ctx.projectName as string) || 'Your Project',
      projectId: ctx.projectId,
      outcome: (ctx.outcome as 'closed_won' | 'closed_lost') || 'closed_won',
      closedBy: (ctx.closedBy as string) || 'A team member',
      netProfit: ctx.netProfit as number | undefined,
      roi: ctx.roi as number | undefined,
      daysHeld: ctx.daysHeld as number | undefined,
      appUrl: APP_URL,
    });
  },

  async notification(ctx) {
    const { generateNotificationEmailHtml } = await import(
      '@/lib/emails/NotificationTemplate'
    );
    const html = generateNotificationEmailHtml({
      senderName: (ctx.senderName as string) || 'PaperWorking',
      projectName: ctx.projectName as string | undefined,
      messageSnippet: (ctx.messageSnippet as string) || '',
      projectId: ctx.projectId,
      appUrl: APP_URL,
    });
    const subject = ctx.projectName 
      ? `New message from ${(ctx.senderName as string) || 'PaperWorking'} regarding Project ${ctx.projectName}`
      : `New message from ${(ctx.senderName as string) || 'PaperWorking'}`;

    return {
      subject,
      html,
    };
  },

  async user_composed(ctx) {
    // User-composed emails bypass templates — raw HTML/text provided by caller
    const subject = (ctx.subject as string) || 'Message from PaperWorking';
    const html =
      (ctx.html as string) ||
      `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#333;white-space:pre-wrap;">${(ctx.body as string) || ''}</div>`;
    return { subject, html };
  },
};

// ─── Internal Helpers ───────────────────────────────────────

/**
 * Resolves a Firebase UID to { email, displayName }.
 */
async function resolveUser(uid: string): Promise<{ email: string; displayName: string }> {
  const userRecord = await adminAuth.getUser(uid);
  return {
    email: userRecord.email || '',
    displayName: userRecord.displayName || userRecord.email || 'User',
  };
}

/**
 * Fetches project context from Firestore.
 */
async function getProjectContext(
  projectId: string,
): Promise<{ organizationId: string; propertyName: string; teamMembers: string[] }> {
  const snap = await adminDb.collection('projects').doc(projectId).get();
  if (!snap.exists) throw new Error(`Project ${projectId} not found`);
  const data = snap.data()!;
  return {
    organizationId: data.organizationId,
    propertyName: data.propertyName || data.name || 'Untitled Project',
    teamMembers: data.teamMembers || [data.ownerId].filter(Boolean),
  };
}

/**
 * Resolves UIDs → email addresses. Skips unresolvable users gracefully.
 */
async function resolveEmails(uids: string[]): Promise<{ uid: string; email: string }[]> {
  const results: { uid: string; email: string }[] = [];
  for (const uid of uids) {
    try {
      const { email } = await resolveUser(uid);
      if (email) results.push({ uid, email });
    } catch {
      // Skip unresolvable UIDs silently
    }
  }
  return results;
}

/**
 * Dispatches email via Resend API. Falls back to mock when RESEND_API_KEY is absent.
 */
async function dispatchViaResend(payload: DispatchPayload): Promise<{ id: string; mock: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    const mockId = `mock_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    console.log(`[CommunicationEngine] MOCK dispatch → ${payload.to.join(', ')} | ${payload.subject}`);
    return { id: mockId, mock: true };
  }

  const body = {
    from: FROM_EMAIL,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    ...(payload.text && { text: payload.text }),
    ...(payload.replyTo && { reply_to: payload.replyTo }),
    ...(payload.tags && { tags: payload.tags }),
  };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Resend API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return { id: data.id, mock: false };
}

/**
 * Persists the message to Firestore (real-time inbox) + Prisma (analytics).
 */
async function persistAuditTrail(
  projectId: string,
  organizationId: string,
  opts: {
    senderEmail: string;
    senderName: string;
    senderUid?: string;
    subject: string;
    body: string;
    type: 'EMAIL_OUTBOUND' | 'EMAIL_INBOUND' | 'INTERNAL_COMMENT';
    recipients: string[];
    providerMessageId: string;
    mock: boolean;
    templateSlug: TemplateSlug;
  },
): Promise<string> {
  // 1. Firestore — powers the real-time inbox
  const ref = await adminDb
    .collection('projects')
    .doc(projectId)
    .collection('messages')
    .add({
      senderEmail: opts.senderEmail,
      senderName: opts.senderName,
      senderUid: opts.senderUid || null,
      body: opts.body.replace(/<[^>]+>/g, '').slice(0, 800),
      subject: opts.subject,
      type: opts.type,
      recipients: opts.recipients,
      providerMessageId: opts.providerMessageId,
      templateSlug: opts.templateSlug,
      projectId,
      organizationId,
      mock: opts.mock,
      emailNotificationSent: true,
      readByUid: opts.senderUid ? [opts.senderUid] : [],
      createdAt: FieldValue.serverTimestamp(),
    });

  // 2. Prisma CommunicationLog — powers portfolio analytics
  try {
    if (prisma) {
      await prisma.communicationLog.create({
        data: {
          linkedProjectId: projectId,
          organizationId,
          type: opts.type,
          direction: opts.type === 'EMAIL_INBOUND' ? 'IN' : 'OUT',
          fromAddress: opts.senderEmail,
          toAddress: opts.recipients.join(', '),
          subject: opts.subject,
          body: opts.body.replace(/<[^>]+>/g, '').slice(0, 1000),
          providerMessageId: opts.providerMessageId,
          threadId: projectId,
        },
      });
    }
  } catch (err) {
    console.warn('[CommunicationEngine] Prisma audit-log skipped:', err);
  }

  // 3. Trigger Notification Engine (Asynchronous / Non-blocking)
  // We use dynamic import to avoid circular dependency with NotificationEngine
  import('./NotificationEngine').then(({ NotificationEngine }) => {
    NotificationEngine.triggerMessageNotification(projectId, ref.id);
  }).catch(err => {
    console.error('[CommunicationEngine] Notification trigger failed:', err);
  });

  return ref.id;
}

/**
 * Creates EmailLog rows for per-recipient delivery tracking.
 */
async function createEmailLogs(
  organizationId: string,
  projectId: string,
  recipients: { uid?: string; email: string }[],
  messageId: string,
  templateSlug: TemplateSlug,
  subject: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    if (!prisma) return;

    await prisma.emailLog.createMany({
      data: recipients.map((r) => ({
        organizationId,
        recipientId: r.uid || null,
        recipientEmail: r.email,
        messageId,
        templateSlug,
        linkedProjectId: projectId,
        status: 'Sent',
        subject,
        metadata: metadata ? JSON.stringify(metadata) : null,
      })),
    });
  } catch (err) {
    console.warn('[CommunicationEngine] EmailLog creation skipped:', err);
  }
}

// ═══════════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════════

export const CommunicationEngine = {
  /**
   * sendCannedEmail — Core function
   *
   * Merges user data with a registered template and dispatches the message.
   * Automatically resolves the recipient from their Firebase UID, fetches
   * project context for merge variables, and tracks delivery status.
   *
   * @param templateId - The template slug to render (e.g. 'phase_advance')
   * @param userId     - Firebase UID of the recipient (or 'team' to send to all team members)
   * @param contextData - Template merge variables (must include projectId)
   */
  async sendCannedEmail(
    templateId: TemplateSlug,
    userId: string | 'team',
    contextData: ContextData,
  ): Promise<SendResult> {
    const { projectId } = contextData;

    // 1. Validate template exists
    const templateFn = TEMPLATE_REGISTRY[templateId];
    if (!templateFn) {
      return { success: false, messageId: '', mock: false, recipientCount: 0, error: `Unknown template: ${templateId}` };
    }

    // 2. Resolve project context
    const project = await getProjectContext(projectId);
    const enrichedContext: ContextData = {
      ...contextData,
      projectName: contextData.projectName || project.propertyName,
      organizationId: project.organizationId,
    };

    // 3. Resolve recipients
    let recipients: { uid: string; email: string }[];
    if (userId === 'team') {
      recipients = await resolveEmails(project.teamMembers);
    } else {
      const resolved = await resolveEmails([userId]);
      recipients = resolved;
    }

    if (!recipients.length) {
      return { success: false, messageId: '', mock: false, recipientCount: 0, error: 'No valid recipients found' };
    }

    // 4. Render template
    const { subject, html } = await templateFn(enrichedContext);

    // 5. Inject tracking token + build reply-to
    const trackingSubject = `${subject} [ref:deal_${projectId}]`;
    const replyTo = INBOUND_DOMAIN ? `reply+${projectId}@${INBOUND_DOMAIN}` : undefined;

    // 6. Dispatch via Resend
    const { id: messageId, mock } = await dispatchViaResend({
      to: recipients.map((r) => r.email),
      subject: trackingSubject,
      html,
      replyTo,
      tags: [
        { name: 'template', value: templateId },
        { name: 'project', value: projectId },
      ],
    });

    // 7. Persist audit trail (Firestore + Prisma CommunicationLog)
    await persistAuditTrail(projectId, project.organizationId, {
      senderEmail: FROM_EMAIL,
      senderName: 'PaperWorking',
      subject: trackingSubject,
      body: html,
      type: 'EMAIL_OUTBOUND',
      recipients: recipients.map((r) => r.email),
      providerMessageId: messageId,
      mock,
      templateSlug: templateId,
    });

    // 8. Create per-recipient EmailLog rows for delivery tracking
    await createEmailLogs(
      project.organizationId,
      projectId,
      recipients,
      messageId,
      templateId,
      trackingSubject,
      { templateId, userId },
    );

    return {
      success: true,
      messageId,
      mock,
      recipientCount: recipients.length,
    };
  },

  /**
   * sendCustomEmail — User-composed messages
   *
   * For ad-hoc email composition from the inbox compose modal.
   * Wraps the same dispatch + audit pipeline but uses raw subject/body.
   */
  async sendCustomEmail(opts: {
    senderUid: string;
    projectId: string;
    to: string[];
    subject: string;
    html: string;
    text?: string;
  }): Promise<SendResult> {
    const { senderUid, projectId, to, subject, html, text } = opts;

    // Resolve sender + project
    const [sender, project] = await Promise.all([
      resolveUser(senderUid),
      getProjectContext(projectId),
    ]);

    // Inject tracking
    const trackingSubject = `${subject} [ref:deal_${projectId}]`;
    const replyTo = INBOUND_DOMAIN ? `reply+${projectId}@${INBOUND_DOMAIN}` : undefined;

    // Dispatch
    const { id: messageId, mock } = await dispatchViaResend({
      to,
      subject: trackingSubject,
      html,
      text,
      replyTo,
      tags: [
        { name: 'template', value: 'user_composed' },
        { name: 'project', value: projectId },
      ],
    });

    // Audit trail
    await persistAuditTrail(projectId, project.organizationId, {
      senderEmail: sender.email,
      senderName: sender.displayName,
      senderUid,
      subject: trackingSubject,
      body: text || html,
      type: 'EMAIL_OUTBOUND',
      recipients: to,
      providerMessageId: messageId,
      mock,
      templateSlug: 'user_composed',
    });

    // EmailLog rows
    await createEmailLogs(
      project.organizationId,
      projectId,
      to.map((email) => ({ email })),
      messageId,
      'user_composed',
      trackingSubject,
      { senderUid, composedBy: sender.displayName },
    );

    return { success: true, messageId, mock, recipientCount: to.length };
  },

  /**
   * updateDeliveryStatus — Webhook callback handler
   *
   * Called by the Resend webhook endpoint when a delivery event fires.
   * Updates the EmailLog row with the new status + timestamp.
   *
   * Status flow: Sent → Delivered → Opened → Clicked
   * Error flow:  Sent → Bounced / Failed
   */
  async updateDeliveryStatus(
    messageId: string,
    status: EmailStatus,
    timestamp?: Date,
  ): Promise<{ updated: number }> {
    if (!prisma) return { updated: 0 };

    const now = timestamp || new Date();

    // Build the update payload based on status
    const updateData: Record<string, unknown> = { status };

    switch (status) {
      case 'Delivered':
        updateData.deliveredAt = now;
        break;
      case 'Opened':
        updateData.openedAt = now;
        break;
      case 'Clicked':
        updateData.clickedAt = now;
        break;
      case 'Bounced':
        updateData.bouncedAt = now;
        break;
      case 'Failed':
        updateData.bouncedAt = now;
        break;
    }

    const result = await prisma.emailLog.updateMany({
      where: { messageId },
      data: updateData,
    });

    return { updated: result.count };
  },

  /**
   * getDeliveryStats — Analytics query
   *
   * Returns aggregate delivery statistics for a project or organization.
   */
  async getDeliveryStats(
    organizationId: string,
    projectId?: string,
  ): Promise<{
    total: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    failed: number;
    deliveryRate: number;
    openRate: number;
  }> {
    if (!prisma) {
      return { total: 0, sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, failed: 0, deliveryRate: 0, openRate: 0 };
    }

    const where: Record<string, unknown> = { organizationId };
    if (projectId) where.linkedProjectId = projectId;

    const [total, delivered, opened, clicked, bounced, failed] = await Promise.all([
      prisma.emailLog.count({ where: { ...where } }),
      prisma.emailLog.count({ where: { ...where, status: 'Delivered' } }),
      prisma.emailLog.count({ where: { ...where, status: 'Opened' } }),
      prisma.emailLog.count({ where: { ...where, status: 'Clicked' } }),
      prisma.emailLog.count({ where: { ...where, status: 'Bounced' } }),
      prisma.emailLog.count({ where: { ...where, status: 'Failed' } }),
    ]);

    const sent = total - bounced - failed;
    const deliveryRate = total > 0 ? ((delivered + opened + clicked) / total) * 100 : 0;
    const openRate = delivered > 0 ? ((opened + clicked) / (delivered + opened + clicked)) * 100 : 0;

    return {
      total,
      sent,
      delivered,
      opened,
      clicked,
      bounced,
      failed,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      openRate: Math.round(openRate * 100) / 100,
    };
  },

  /**
   * getEmailLogs — Per-project or per-recipient audit trail
   */
  async getEmailLogs(
    organizationId: string,
    opts?: { projectId?: string; recipientEmail?: string; limit?: number },
  ) {
    if (!prisma) return [];

    const where: Record<string, unknown> = { organizationId };
    if (opts?.projectId) where.linkedProjectId = opts.projectId;
    if (opts?.recipientEmail) where.recipientEmail = opts.recipientEmail;

    return prisma.emailLog.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      take: opts?.limit || 50,
    });
  },

  /**
   * Available template slugs for validation
   */
  TEMPLATE_SLUGS: Object.keys(TEMPLATE_REGISTRY) as TemplateSlug[],
};
