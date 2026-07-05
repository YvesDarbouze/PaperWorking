import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { ApplicationUser } from '@/types/schema';
import { generateInboxDigestEmail } from '@/lib/emails/templates/InboxDigestEmail';
import { CommunicationEngine } from '@/lib/engine/CommunicationEngine';

export const dynamic = 'force-dynamic';

function isBusinessHours(timezone: string): boolean {
  try {
    const now = new Date();
    const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long'
    });
    const weekday = weekdayFormatter.format(now);

    if (weekday === 'Saturday' || weekday === 'Sunday') {
      return false;
    }

    const hourFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false
    });
    const hour = parseInt(hourFormatter.format(now), 10);
    return hour >= 9 && hour < 17; // 9:00 AM to 5:00 PM
  } catch (err) {
    console.error('[send-digest] Error checking business hours:', err);
    return false;
  }
}

async function executeDigest() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://paperworking.co';
  const usersSnapshot = await adminDb.collection('users').get();
  
  const processedUsers: string[] = [];
  const errors: any[] = [];

  for (const userDoc of usersSnapshot.docs) {
    const user = userDoc.data() as ApplicationUser;
    if (!user.email) continue;

    // Check opt-out
    if (user.preferences?.emailEnabled === false) {
      continue;
    }

    // Check timezone business hours
    const timezone = user.preferences?.quietHours?.timezone || (user.preferences as any)?.timezone || 'America/New_York';
    if (!isBusinessHours(timezone)) {
      console.log(`[send-digest] Outside business hours for user ${user.uid} (${timezone}). Skipping digest.`);
      continue;
    }

    try {
      // Query unread & unarchived notifications
      const notificationsSnap = await adminDb.collection('notifications')
        .where('recipientId', '==', user.uid)
        .where('read', '==', false)
        .where('archived', '==', false)
        .get();

      const unreadItems = notificationsSnap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ref: d.ref,
            title: data.title || 'Notification',
            body: data.body || '',
            deepLinkUrl: data.deepLinkUrl || '/dashboard',
            digestSent: !!data.digestSent,
            createdAt: data.createdAt ? (data.createdAt as any).toDate() : new Date(),
          };
        })
        .filter((n) => !n.digestSent);

      if (unreadItems.length === 0) {
        continue;
      }

      // Group items and compile digest email
      const { subject, html } = generateInboxDigestEmail({
        recipientName: user.displayName || 'User',
        items: unreadItems,
        appUrl,
      });

      // Send the email
      console.log(`[send-digest] Sending digest to ${user.email} with ${unreadItems.length} items.`);
      await CommunicationEngine.sendRawEmail([user.email], subject, html);

      // Mark these notifications as digestSent = true in a batch write
      const batch = adminDb.batch();
      for (const item of unreadItems) {
        batch.update(item.ref, { digestSent: true });
      }
      await batch.commit();

      processedUsers.push(user.uid);
    } catch (err: any) {
      console.error(`[send-digest] Failed to send digest for user ${user.uid}:`, err);
      errors.push({ uid: user.uid, error: err.message });
    }
  }

  return { processedUsers, errors };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || process.env.WORKER_SECRET;

  if (!cronSecret) {
    console.error('[Cron/SendDigest] CRON_SECRET env var not set');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = await executeDigest();
    const status = results.errors.length > 0 ? 500 : 200;
    return NextResponse.json({
      ok: results.errors.length === 0,
      processedCount: results.processedUsers.length,
      processed: results.processedUsers,
      errors: results.errors
    }, { status });
  } catch (error: any) {
    console.error('❌ [CRON SEND DIGEST] Uncaught error:', error);
    return NextResponse.json({ error: 'cron_failed', detail: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
