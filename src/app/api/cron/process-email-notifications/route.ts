import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminMessaging } from '@/lib/firebase/admin';
import { CommunicationMessage, ApplicationUser, Project } from '@/types/schema';
import { generateNotificationEmailHtml } from '@/lib/emails/NotificationTemplate';
import { FieldValue } from 'firebase-admin/firestore';
import { CommunicationEngine } from '@/lib/engine/CommunicationEngine';
import { isUserInDND } from '@/lib/services/notificationService';

export const dynamic = 'force-dynamic';

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'notifications@paperworking.co';

async function sendPushNotification(
  recipientId: string,
  userData: any,
  title: string,
  body: string,
  deepLinkUrl: string,
  expiresAt?: Date
) {
  try {
    const fcmTokens = userData?.fcmTokens || [];
    if (fcmTokens.length > 0) {
      let ttlSeconds: number | undefined = undefined;
      if (expiresAt) {
        const remainingMs = expiresAt.getTime() - Date.now();
        ttlSeconds = Math.max(0, Math.floor(remainingMs / 1000));
      }

      const multicastMessage = {
        tokens: fcmTokens,
        notification: { title, body },
        data: { deepLinkUrl, title, body },
        webpush: {
          headers: {
            Urgency: 'high',
            ...(ttlSeconds !== undefined ? { TTL: String(ttlSeconds) } : {})
          },
          notification: { clickAction: deepLinkUrl, requireInteraction: true },
        },
      };

      const response = await adminMessaging.sendEachForMulticast(multicastMessage);
      console.log(`[process-email-notifications] Sent push to ${fcmTokens.length} devices. Success: ${response.successCount}`);

      // Stale token cleanup
      const tokensToRemove: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
          const code = resp.error.code;
          if (
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/registration-token-not-registered'
          ) {
            tokensToRemove.push(fcmTokens[idx]);
          }
        }
      });

      if (tokensToRemove.length > 0) {
        await adminDb.collection('users').doc(recipientId).update({
          fcmTokens: FieldValue.arrayRemove(...tokensToRemove),
        });
        console.log(`[process-email-notifications] Cleaned up ${tokensToRemove.length} stale FCM tokens`);
      }
    }
  } catch (err) {
    console.error('[process-email-notifications] FCM push dispatch failed:', err);
  }
}

function getBatchedContent(
  type: string,
  count: number,
  dealAddress: string,
  items: any[]
): { title: string; body: string } {
  const address = dealAddress || 'the property';

  if (count === 1) {
    return {
      title: items[0].title || `${items[0].type} Notification`,
      body: items[0].body || '',
    };
  }

  let title = '';
  let body = '';

  switch (type) {
    case 'VENDOR_BID':
      title = `${count} new bids on ${address}`;
      body = `You have received ${count} new bids on ${address}:\n` +
        items.map(item => `• ${item.actorName || 'A contractor'} bid ${item.amount || '$0.00'} for task '${item.task || 'the assigned task'}'`).join('\n');
      break;
    case 'TASK_COMPLETE':
      title = `${count} tasks completed on ${address}`;
      body = `${count} tasks have been marked complete on ${address}:\n` +
        items.map(item => `• '${item.task || 'assigned task'}' completed by ${item.actorName || 'teammate'}`).join('\n');
      break;
    case 'DOCUMENT_SIGNED':
      title = `${count} documents signed for ${address}`;
      body = `${count} documents have been signed for ${address}:\n` +
        items.map(item => `• '${item.documentName || 'document'}' signed by ${item.actorName || 'teammate'}`).join('\n');
      break;
    case 'RECEIPT_APPROVAL':
      title = `${count} receipts uploaded for ${address} — approval required`;
      body = `${count} receipts require approval for ${address}:\n` +
        items.map(item => `• Receipt of ${item.amount || '$0.00'} uploaded by ${item.actorName || 'teammate'}`).join('\n');
      break;
    case 'TEAM_INVITE':
      title = `You have ${count} team invitations`;
      body = `You have received ${count} invitations to join teams:\n` +
        items.map(item => `• Invitation from ${item.actorName || 'teammate'} to join team '${item.organizationName || 'organization'}'`).join('\n');
      break;
    case 'PHASE_TRANSITION':
      title = `${count} phase transitions on ${address}`;
      body = `Multiple phase changes on ${address}:\n` +
        items.map(item => `• Project advanced to '${item.phase || 'new'}' phase`).join('\n');
      break;
    default:
      title = `${count} new notifications for ${address}`;
      body = `You have received ${count} updates for ${address}:\n` +
        items.map(item => `• ${item.title || item.body || 'System notification'}`).join('\n');
  }

  return { title, body };
}

async function processQueuedEmails() {
  const queuedSnapshot = await adminDb.collection('queued_emails')
    .where('status', '==', 'pending')
    .get();

  const processedIds: string[] = [];
  const errors: any[] = [];

  if (queuedSnapshot.empty) {
    return { processedIds, errors };
  }

  // 1. Fetch user docs cache
  const userCache = new Map<string, any>();
  const recipientIds = Array.from(new Set(queuedSnapshot.docs.map(doc => doc.data().recipientId)));
  for (const recipientId of recipientIds) {
    try {
      const userDoc = await adminDb.collection('users').doc(recipientId).get();
      if (userDoc.exists) {
        userCache.set(recipientId, userDoc.data());
      }
    } catch (err) {
      console.error(`[process-email-notifications] Failed to fetch user ${recipientId}:`, err);
    }
  }

  // 2. Filter, check expiration, check retry backoff, check DND
  const now = new Date();
  const activeDocs: any[] = [];

  for (const doc of queuedSnapshot.docs) {
    const data = doc.data();
    const expiresAt = data.expiresAt ? (data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt)) : null;
    
    // Check expiration
    if (expiresAt && expiresAt < now) {
      console.log(`[process-email-notifications] Suppressing expired queued email ${doc.id}`);
      await doc.ref.update({
        status: 'suppressed',
        suppressedAt: FieldValue.serverTimestamp(),
        error: 'Expired before delivery'
      });
      continue;
    }

    // Check retry backoff
    const nextAttemptAfter = data.nextAttemptAfter ? (data.nextAttemptAfter.toDate ? data.nextAttemptAfter.toDate() : new Date(data.nextAttemptAfter)) : null;
    if (nextAttemptAfter && nextAttemptAfter > now) {
      console.log(`[process-email-notifications] Skipping queued email ${doc.id} due to retry backoff (next attempt after ${nextAttemptAfter})`);
      continue;
    }

    const userData = userCache.get(data.recipientId);
    if (!userData) continue;

    // Filter DND
    if (isUserInDND(userData)) {
      console.log(`[process-email-notifications] Skipping queued email ${doc.id} because user is in DND.`);
      continue;
    }

    activeDocs.push(doc);
  }

  // 3. Separate batchable and individual items
  const batchableItems: any[] = [];
  const individualItems: any[] = [];

  for (const doc of activeDocs) {
    const data = doc.data();
    const item = { id: doc.id, ref: doc.ref, ...data };
    if (data.isBatchable === true) {
      batchableItems.push(item);
    } else {
      individualItems.push(item);
    }
  }

  // 4. Process individual items
  for (const item of individualItems) {
    try {
      const userData = userCache.get(item.recipientId);

      // Check opt-out
      if (userData?.preferences?.emailEnabled === false && item.sendEmail) {
        await item.ref.update({
          status: 'cancelled',
          error: 'User opted out of email notifications',
          cancelledAt: FieldValue.serverTimestamp(),
        });
        continue;
      }

      // Lock document
      let lockAcquired = false;
      try {
        await adminDb.runTransaction(async (transaction) => {
          const freshDoc = (await transaction.get(item.ref as any)) as any;
          if (!freshDoc.exists || freshDoc.data()?.status !== 'pending') {
            throw new Error('Already processed or status changed');
          }
          transaction.update(item.ref, { status: 'processing' });
        });
        lockAcquired = true;
      } catch (lockErr) {
        console.log(`[process-email-notifications] Lock failed for queued email ${item.id}`);
        continue;
      }

      if (lockAcquired) {
        // Send email
        let providerMessageId = null;
        if (item.sendEmail && userData?.email) {
          const res = await CommunicationEngine.sendRawEmail([item.recipientEmail], item.subject, item.html);
          providerMessageId = res.id;
        }

        // Send push
        if (item.sendPush) {
          const expiresAtDate = item.expiresAt ? (item.expiresAt.toDate ? item.expiresAt.toDate() : new Date(item.expiresAt)) : undefined;
          await sendPushNotification(item.recipientId, userData, item.title, item.body, item.deepLinkUrl, expiresAtDate);
        }

        await item.ref.update({
          status: 'sent',
          sentAt: FieldValue.serverTimestamp(),
          ...(providerMessageId ? { providerMessageId } : {}),
        });
        processedIds.push(item.id);
      }
    } catch (err: any) {
      console.error(`[process-email-notifications] Failed to process individual item ${item.id}:`, err);
      try {
        const retryCount = (item.retryCount || 0) + 1;
        if (retryCount <= 3) {
          const backoffMinutes = 5 * retryCount;
          const nextAttemptAfter = new Date(Date.now() + backoffMinutes * 60 * 1000);
          await item.ref.update({
            status: 'pending', // retry later
            retryCount,
            nextAttemptAfter,
            error: err.message,
            lastFailedAt: FieldValue.serverTimestamp()
          });
        } else {
          await item.ref.update({
            status: 'failed',
            retryCount,
            error: `Max retries (3) exceeded: ${err.message}`,
            failedAt: FieldValue.serverTimestamp(),
          });
        }
      } catch (updateErr) {
        console.error(`[process-email-notifications] Failed to update error status for ${item.id}:`, updateErr);
      }
      errors.push({ id: item.id, error: err.message });
    }
  }

  // 5. Group batchable items
  // Group key: recipientId_type_projectId (or dealAddress if projectId is missing)
  const groups = new Map<string, any[]>();
  for (const item of batchableItems) {
    const key = `${item.recipientId}_${item.type}_${item.projectId || item.dealAddress || 'global'}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  }

  // Process grouped batchable items
  for (const [groupKey, groupItems] of groups.entries()) {
    try {
      // Find the earliest createdAt in the group
      const dates = groupItems.map(item => item.createdAt ? item.createdAt.toDate().getTime() : Date.now());
      const earliestTime = Math.min(...dates);

      // Check if the 15-minute window has passed since the earliest event
      if (now.getTime() - earliestTime < 15 * 60 * 1000) {
        console.log(`[process-email-notifications] Group ${groupKey} is still inside the 15m batching window. Skipping.`);
        continue;
      }

      // Lock all documents in the group
      let groupLocked = false;
      try {
        await adminDb.runTransaction(async (transaction) => {
          const freshDocs = [];
          for (const item of groupItems) {
            const freshDoc = (await transaction.get(item.ref as any)) as any;
            if (!freshDoc.exists || freshDoc.data()?.status !== 'pending') {
              throw new Error(`Item ${item.id} already processed or status changed`);
            }
            freshDocs.push(freshDoc);
          }
          // If all are pending, mark them processing
          for (const freshDoc of freshDocs) {
            transaction.update(freshDoc.ref, { status: 'processing' });
          }
        });
        groupLocked = true;
      } catch (lockErr) {
        console.log(`[process-email-notifications] Lock failed for group ${groupKey}:`, lockErr);
        continue;
      }

      if (groupLocked) {
        const firstItem = groupItems[0];
        const userData = userCache.get(firstItem.recipientId);
        const count = groupItems.length;

        const { title, body } = getBatchedContent(
          firstItem.type,
          count,
          firstItem.dealAddress,
          groupItems
        );

        const sendEmail = groupItems.some(item => item.sendEmail);
        const sendPush = groupItems.some(item => item.sendPush);

        // Send Email
        let providerMessageId = null;
        if (sendEmail && userData?.email) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://paperworking.co';
          const { generateSystemNotificationEmail } = await import(
            '../../../../lib/emails/templates/SystemNotificationEmail'
          );
          const { html, subject } = generateSystemNotificationEmail({
            title,
            body: body.replace(/\n/g, '<br/>'),
            deepLinkUrl: firstItem.deepLinkUrl || '/dashboard',
            appUrl,
          });

          const res = await CommunicationEngine.sendRawEmail([userData.email], subject, html);
          providerMessageId = res.id;
        }

        // Send Push
        if (sendPush) {
          // Push notification body is single line summary
          let pushBody = body.split('\n')[0]; // First line summary
          if (count > 1) {
            const actors = Array.from(new Set(groupItems.map(item => item.actorName))).filter(Boolean);
            if (actors.length > 0) {
              const actorList = actors.slice(0, 2).join(', ');
              const remaining = actors.length - 2;
              pushBody = `Latest from ${actorList}${remaining > 0 ? ` and ${remaining} other(s)` : ''}.`;
            }
          }
          const minExpiresAt = groupItems.reduce((min, item) => {
            if (!item.expiresAt) return min;
            const date = item.expiresAt.toDate ? item.expiresAt.toDate() : new Date(item.expiresAt);
            if (!min || date < min) return date;
            return min;
          }, null as Date | null);

          await sendPushNotification(firstItem.recipientId, userData, title, pushBody, firstItem.deepLinkUrl, minExpiresAt || undefined);
        }

        // Update all documents status to sent
        const batch = adminDb.batch();
        for (const item of groupItems) {
          batch.update(item.ref, {
            status: 'sent',
            sentAt: FieldValue.serverTimestamp(),
            ...(providerMessageId ? { providerMessageId } : {}),
          });
          processedIds.push(item.id);
        }
        await batch.commit();
        console.log(`[process-email-notifications] Successfully processed batch of ${count} items for group ${groupKey}`);
      }
    } catch (err: any) {
      console.error(`[process-email-notifications] Failed to process group ${groupKey}:`, err);
      // Mark all documents in group as failed/retry
      try {
        const batch = adminDb.batch();
        for (const item of groupItems) {
          const retryCount = (item.retryCount || 0) + 1;
          if (retryCount <= 3) {
            const backoffMinutes = 5 * retryCount;
            const nextAttemptAfter = new Date(Date.now() + backoffMinutes * 60 * 1000);
            batch.update(item.ref, {
              status: 'pending',
              retryCount,
              nextAttemptAfter,
              error: err.message,
              lastFailedAt: FieldValue.serverTimestamp()
            });
          } else {
            batch.update(item.ref, {
              status: 'failed',
              retryCount,
              error: `Max retries (3) exceeded: ${err.message}`,
              failedAt: FieldValue.serverTimestamp()
            });
          }
        }
        await batch.commit();
      } catch (updateErr) {
        console.error(`[process-email-notifications] Failed to update error status for group ${groupKey}:`, updateErr);
      }
      errors.push({ group: groupKey, error: err.message });
    }
  }

  return { processedIds, errors };
}

async function performDailyAutoArchive() {
  console.log('[process-email-notifications] Running daily auto-archive cleanup...');
  const now = new Date();
  
  try {
    // Fetch read, unarchived notifications
    const readNotificationsSnap = await adminDb.collection('notifications')
      .where('read', '==', true)
      .where('archived', '==', false)
      .get();

    if (readNotificationsSnap.empty) {
      console.log('[process-email-notifications] No read notifications found to auto-archive.');
      return;
    }

    // Cache for user preferences
    const userArchiveDays = new Map<string, number>();
    const batch = adminDb.batch();
    let archiveCount = 0;

    for (const doc of readNotificationsSnap.docs) {
      const data = doc.data();
      const recipientId = data.recipientId;
      if (!recipientId) continue;

      // Get autoArchiveDays for this user
      let days = userArchiveDays.get(recipientId);
      if (days === undefined) {
        days = 30; // default
        try {
          const userDoc = await adminDb.collection('users').doc(recipientId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            days = userData?.preferences?.autoArchiveDays || 30;
          }
        } catch (err) {
          console.error(`[process-email-notifications] Failed to fetch autoArchiveDays for ${recipientId}:`, err);
        }
        userArchiveDays.set(recipientId, days || 30);
      }

      const finalDays = days ?? 30;
      const readAt = data.readAt ? (data.readAt.toDate ? data.readAt.toDate() : new Date(data.readAt)) : null;
      if (readAt) {
        const archiveThreshold = new Date(now.getTime() - finalDays * 24 * 60 * 60 * 1000);
        if (readAt < archiveThreshold) {
          batch.update(doc.ref, { archived: true });
          archiveCount++;
        }
      }
    }

    if (archiveCount > 0) {
      await batch.commit();
      console.log(`[process-email-notifications] Auto-archived ${archiveCount} stale read notifications.`);
    }
  } catch (err) {
    console.error('[process-email-notifications] Daily auto-archive failed:', err);
  }
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.WORKER_SECRET;

  if (secret) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const cronResults = {
    messagesProcessed: 0,
    queuedEmailsProcessed: 0,
    errors: [] as any[],
  };

  // 1. Process Queue first
  try {
    const queueResults = await processQueuedEmails();
    cronResults.queuedEmailsProcessed = queueResults.processedIds.length;
    if (queueResults.errors.length > 0) {
      cronResults.errors.push(...queueResults.errors.map(e => ({ type: 'queue', ...e })));
    }
  } catch (err: any) {
    console.error('❌ [CRON EMAIL NOTIFICATIONS] Queue processing failed:', err);
    cronResults.errors.push({ type: 'queue_global', error: err.message });
  }

  // Run daily auto-archive cleanup
  try {
    await performDailyAutoArchive();
  } catch (err: any) {
    console.error('❌ [CRON EMAIL NOTIFICATIONS] Daily auto-archive failed:', err);
    cronResults.errors.push({ type: 'auto_archive', error: err.message });
  }

  // 2. Scan and process offline message notifications (backup loop)
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://paperworking.co';
    
    const messagesSnapshot = await adminDb.collectionGroup('messages')
      .where('emailNotificationSent', '==', false)
      .get();
      
    const processedMessages: string[] = [];

    for (const doc of messagesSnapshot.docs) {
      const message = doc.data() as CommunicationMessage;
      
      const messageDate = message.createdAt ? (message.createdAt as any).toDate() : new Date();
      if (messageDate > fiveMinutesAgo) {
        continue;
      }

      if (message.type === 'EMAIL_OUTBOUND') {
        continue;
      }

      const projectId = message.projectId;
      
      try {
        let unreadUids: string[] = [];
        let projectName = '';
        
        const projectDoc = await adminDb.collection('projects').doc(projectId).get();
        if (projectDoc.exists) {
          const project = projectDoc.data() as Project;
          projectName = project.propertyName || '';
          
          if (message.recipientsUid && message.recipientsUid.length > 0) {
             unreadUids = message.recipientsUid.filter(uid => !message.readByUid?.includes(uid));
          } else {
             const members = project?.members || {};
             const memberUids = Object.keys(members).filter(uid => uid !== message.senderUid);
             unreadUids = memberUids.filter(uid => !message.readByUid?.includes(uid));
          }
        }

        let usersSnapshot: any = null;
        if (unreadUids.length > 0) {
           const uidsToQuery = unreadUids.slice(0, 30);
           usersSnapshot = await adminDb.collection('users')
              .where('uid', 'in', uidsToQuery)
              .get();
        }

        const recipientsToNotifyImmediately: string[] = [];
        if (usersSnapshot && !usersSnapshot.empty) {
          for (const userDoc of usersSnapshot.docs) {
            const user = userDoc.data() as ApplicationUser;
            if (!user.email) continue;

            if (user.preferences?.emailEnabled === false) {
              console.log(`[process-email-notifications] User ${user.uid} opted out of emails.`);
              continue;
            }

            const snippet = message.body.length > 80 ? `${message.body.substring(0, 80)}...` : message.body;
            const subject = `New message from ${message.senderName}`;
            const html = generateNotificationEmailHtml({
              senderName: message.senderName,
              projectName,
              messageSnippet: snippet,
              projectId,
              appUrl,
            });

            const isQuiet = CommunicationEngine.isQuietHoursActive(user.preferences?.quietHours);
            if (isQuiet) {
              console.log(`[process-email-notifications] Quiet hours active for ${user.uid}. Queueing message email.`);
              await adminDb.collection('queued_emails').add({
                recipientId: user.uid,
                recipientEmail: user.email,
                subject,
                html,
                deepLinkUrl: `/dashboard/projects/${projectId}`,
                status: 'pending',
                createdAt: FieldValue.serverTimestamp(),
              });
            } else {
              recipientsToNotifyImmediately.push(user.email);
            }
          }
        }

        if (recipientsToNotifyImmediately.length > 0) {
          const snippet = message.body.length > 80 ? `${message.body.substring(0, 80)}...` : message.body;
          const subject = `New message from ${message.senderName}`;
          
          const html = generateNotificationEmailHtml({
            senderName: message.senderName,
            projectName,
            messageSnippet: snippet,
            projectId,
            appUrl,
          });
          
          const result = await CommunicationEngine.sendRawEmail(recipientsToNotifyImmediately, subject, html);
          
          if (result) {
            await adminDb.collection('projects').doc(projectId)
              .collection('messages')
              .add({
                senderEmail: FROM_EMAIL,
                senderName: 'PaperWorking',
                body: `Automated notification sent to ${recipientsToNotifyImmediately.length} recipients.`,
                subject,
                type: 'EMAIL_OUTBOUND',
                recipients: recipientsToNotifyImmediately,
                providerMessageId: result.id,
                projectId,
                organizationId: message.organizationId,
                mock: result.mock,
                createdAt: FieldValue.serverTimestamp(),
              });
          }
        }
        
        await doc.ref.update({
          emailNotificationSent: true
        });
        
        processedMessages.push(doc.id);
      } catch (err: any) {
        cronResults.errors.push({ type: 'message', id: doc.id, error: err.message });
      }
    }

    cronResults.messagesProcessed = processedMessages.length;
  } catch (err: any) {
    console.error('❌ [CRON EMAIL NOTIFICATIONS] Message scanning failed:', err);
    cronResults.errors.push({ type: 'messages_global', error: err.message });
  }

  const status = cronResults.errors.length > 0 ? 500 : 200;
  return NextResponse.json({
    ok: cronResults.errors.length === 0,
    results: cronResults
  }, { status });
}
