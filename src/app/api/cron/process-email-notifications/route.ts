import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { CommunicationMessage, ApplicationUser, Project } from '@/types/schema';
import { generateNotificationEmailHtml } from '@/lib/emails/NotificationTemplate';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

async function sendViaResend(to: string[], subject: string, html: string): Promise<{ id: string } | null> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@paperworking.io';

  if (!apiKey) {
    console.log('[Mock Email] Would have sent to:', to, 'Subject:', subject);
    return { id: `mock_${Date.now().toString(36)}` };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend API error ${res.status}: ${err}`);
  }

  return res.json();
}

/**
 * GET /api/cron/process-email-notifications
 *
 * Scans for unread messages older than 5 minutes that haven't triggered an email yet.
 * Dispatches a notification to the intended recipients or project team members.
 *
 * Protected by Vercel CRON_SECRET or WORKER_SECRET.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.WORKER_SECRET;

  if (secret) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://paperworking.io';
    
    // Using collectionGroup to find unnotified messages across all projects
    const messagesSnapshot = await adminDb.collectionGroup('messages')
      .where('emailNotificationSent', '==', false)
      .get();
      
    const processedMessages: string[] = [];
    const errors: any[] = [];

    for (const doc of messagesSnapshot.docs) {
      const message = doc.data() as CommunicationMessage;
      
      // Filter out messages that are newer than 5 minutes (in-memory)
      const messageDate = message.createdAt ? (message.createdAt as any).toDate() : new Date();
      if (messageDate > fiveMinutesAgo) {
        continue;
      }

      // Skip system outbound emails
      if (message.type === 'EMAIL_OUTBOUND') {
        continue;
      }

      const projectId = message.projectId;
      
      try {
        let recipientsToNotify: string[] = [];
        let unreadUids: string[] = [];
        let projectName = '';
        
        // Fetch the project to get its name and team members
        const projectDoc = await adminDb.collection('projects').doc(projectId).get();
        if (projectDoc.exists) {
          const project = projectDoc.data() as Project;
          projectName = project.propertyName || '';
          
          if (message.recipientsUid && message.recipientsUid.length > 0) {
             unreadUids = message.recipientsUid.filter(uid => !message.readByUid?.includes(uid));
          } else {
             // Fallback: Notify active project team members (excluding the sender)
             const members = project?.members || {};
             const memberUids = Object.keys(members).filter(uid => uid !== message.senderUid);
             unreadUids = memberUids.filter(uid => !message.readByUid?.includes(uid));
          }
        }

        // Fetch emails for the unread users
        if (unreadUids.length > 0) {
           const uidsToQuery = unreadUids.slice(0, 30);
           const usersSnapshot = await adminDb.collection('users')
              .where('uid', 'in', uidsToQuery)
              .get();
              
           recipientsToNotify = usersSnapshot.docs.map(u => (u.data() as ApplicationUser).email);
        }

        // Send the email if there are unread recipients
        if (recipientsToNotify.length > 0) {
          const snippet = message.body.length > 80 ? `${message.body.substring(0, 80)}...` : message.body;
          const subject = `New message from ${message.senderName}`;
          
          const html = generateNotificationEmailHtml({
            senderName: message.senderName,
            projectName,
            messageSnippet: snippet,
            projectId,
            appUrl,
          });
          
          const result = await sendViaResend(recipientsToNotify, subject, html);
          
          // Log the outbound email in Firestore as an audit log
          if (result) {
            await adminDb.collection('projects').doc(projectId)
              .collection('messages')
              .add({
                senderEmail: process.env.RESEND_FROM_EMAIL || 'notifications@paperworking.io',
                senderName: 'PaperWorking',
                body: `Automated notification sent to ${recipientsToNotify.length} recipients.`,
                subject,
                type: 'EMAIL_OUTBOUND',
                recipients: recipientsToNotify,
                providerMessageId: result.id,
                projectId,
                organizationId: message.organizationId,
                mock: !process.env.RESEND_API_KEY,
                createdAt: FieldValue.serverTimestamp(),
              });
          }
        }
        
        // Mark as processed (even if no recipients) so we don't process it again
        await doc.ref.update({
          emailNotificationSent: true
        });
        
        processedMessages.push(doc.id);
      } catch (err: any) {
        errors.push({ id: doc.id, error: err.message });
      }
    }

    return NextResponse.json({ 
      ok: true, 
      processedCount: processedMessages.length,
      processed: processedMessages,
      errors 
    });
  } catch (error: any) {
    console.error('❌ [CRON EMAIL NOTIFICATIONS] Uncaught error:', error);
    return NextResponse.json({ error: 'cron_failed', detail: error.message }, { status: 500 });
  }
}
