import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { NotificationService } from '@/lib/services/notificationService';
import { TeamInvitation } from '@/types/schema';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.WORKER_SECRET;

  if (secret) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const results = {
    expiredCount: 0,
    day3RemindersSent: 0,
    day6RemindersSent: 0,
    errors: [] as any[],
  };

  try {
    const now = new Date();
    
    // Process pending invites
    const pendingSnap = await adminDb.collection('teamInvitations')
      .where('status', '==', 'pending')
      .get();

    for (const doc of pendingSnap.docs) {
      const invite = doc.data() as TeamInvitation;
      const expiresAt = (invite.expiresAt as any).toDate ? (invite.expiresAt as any).toDate() : new Date(invite.expiresAt);
      const createdAt = (invite.createdAt as any).toDate ? (invite.createdAt as any).toDate() : new Date(invite.createdAt);
      
      // 1. Expiration check
      if (expiresAt < now) {
        try {
          await doc.ref.update({ status: 'expired' });
          results.expiredCount++;
        } catch (err: any) {
          results.errors.push({ id: doc.id, error: err.message, action: 'expire' });
        }
        continue;
      }

      // 2. Reminders check
      const daysSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      
      let shouldSendDay3 = daysSinceCreation >= 3 && daysSinceCreation < 6 && !invite.day3ReminderSent;
      let shouldSendDay6 = daysSinceCreation >= 6 && !invite.day6ReminderSent;

      if (shouldSendDay3 || shouldSendDay6) {
        try {
          // Check if user exists by email
          const userSnap = await adminDb.collection('users').where('email', '==', invite.email).limit(1).get();
          
          if (!userSnap.empty) {
            const userDoc = userSnap.docs[0];
            await NotificationService.createNotification({
              recipientId: userDoc.id,
              type: 'TEAM_INVITE_REMINDER',
              actor: { uid: invite.invitedByUid, name: invite.invitedByName },
              objectReference: {
                organizationId: invite.organizationId,
                organizationName: invite.organizationName,
              },
              deepLinkUrl: `/invite/team?token=${invite.token}`,
              expiresAt,
            });
          } else {
            // Unregistered user, queue email directly
            await adminDb.collection('queued_emails').add({
              recipientEmail: invite.email,
              status: 'pending',
              isBatchable: false,
              type: 'TEAM_INVITE_REMINDER',
              actorName: invite.invitedByName,
              deepLinkUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://paperworking.co'}/invite/team?token=${invite.token}`,
              sendEmail: true,
              sendPush: false,
              title: `Reminder: ${invite.invitedByName} invited you to join team ${invite.organizationName}`,
              body: `Don't forget! You have a pending invitation to join the organization '${invite.organizationName}'.`,
              subject: `Reminder: ${invite.invitedByName} invited you to join team ${invite.organizationName}`,
              html: `<p>${invite.invitedByName} invited you to join team ${invite.organizationName}.</p><p>This invitation will expire soon.</p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://paperworking.co'}/invite/team?token=${invite.token}">Accept Invitation</a>`,
              createdAt: FieldValue.serverTimestamp(),
              retryCount: 0,
              expiresAt,
            });
          }

          if (shouldSendDay6) {
            await doc.ref.update({ day6ReminderSent: true });
            results.day6RemindersSent++;
          } else if (shouldSendDay3) {
            await doc.ref.update({ day3ReminderSent: true });
            results.day3RemindersSent++;
          }
        } catch (err: any) {
          results.errors.push({ id: doc.id, error: err.message, action: 'reminder' });
        }
      }
    }
  } catch (err: any) {
    console.error('❌ [CRON TEAM INVITES] Global error:', err);
    results.errors.push({ type: 'global', error: err.message });
  }

  const status = results.errors.length > 0 ? 500 : 200;
  return NextResponse.json({
    ok: results.errors.length === 0,
    results
  }, { status });
}
