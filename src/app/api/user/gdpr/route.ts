import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

const DEFAULT_CATEGORY_PREFERENCES = {
  syndication: { inbox: true, email: true, push: true },
  bids: { inbox: true, email: true, push: false },
  tasks: { inbox: true, email: true, push: false },
  deadlines: { inbox: true, email: true, push: true },
  billing: { inbox: true, email: true, push: false },
  alerts: { inbox: true, email: true, push: true },
};

const DEFAULT_QUIET_HOURS = {
  enabled: false,
  start: '22:00',
  end: '08:00',
  timezone: 'America/New_York',
};

// Helper to authenticate request and return UID
async function authenticateRequest(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    return decoded.uid;
  } catch (err) {
    console.error('[GDPR] Token verification failed:', err);
    return null;
  }
}

/**
 * GET /api/user/gdpr
 * Exports all user notification data, preferences, and queued items.
 */
export async function GET(request: NextRequest) {
  try {
    const uid = await authenticateRequest(request);
    if (!uid) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch user profile preferences
    const userDoc = await adminDb.collection('users').doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    const preferences = userData?.preferences || {};

    // 2. Query all user notifications
    const notificationsSnap = await adminDb
      .collection('notifications')
      .where('recipientId', '==', uid)
      .get();
    const notifications = notificationsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // 3. Query all user queued emails
    const queuedEmailsSnap = await adminDb
      .collection('queued_emails')
      .where('recipientId', '==', uid)
      .get();
    const queuedEmails = queuedEmailsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // 4. Log GDPR Export action to auditLog
    await adminDb.collection('auditLog').add({
      type: 'gdpr_export',
      userId: uid,
      at: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      export: {
        profile: {
          email: userData?.email || null,
          displayName: userData?.displayName || '',
          preferences,
        },
        notifications,
        queuedEmails,
      },
    });
  } catch (err: any) {
    console.error('[GDPR] GET Export failed:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/user/gdpr
 * Deletes all notification and email records for the user, clears push tokens,
 * and resets preferences to default values.
 */
export async function DELETE(request: NextRequest) {
  try {
    const uid = await authenticateRequest(request);
    if (!uid) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const batch = adminDb.batch();

    // 1. Delete notifications in batches
    const notificationsSnap = await adminDb
      .collection('notifications')
      .where('recipientId', '==', uid)
      .get();
    notificationsSnap.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // 2. Delete queued emails in batches
    const queuedEmailsSnap = await adminDb
      .collection('queued_emails')
      .where('recipientId', '==', uid)
      .get();
    queuedEmailsSnap.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // 3. Reset user profile preferences & clear FCM tokens
    const userRef = adminDb.collection('users').doc(uid);
    batch.update(userRef, {
      fcmTokens: [],
      'preferences.pushEnabled': true,
      'preferences.emailEnabled': true,
      'preferences.autoArchiveDays': 30,
      'preferences.quietHours': DEFAULT_QUIET_HOURS,
      'preferences.categories': DEFAULT_CATEGORY_PREFERENCES,
    });

    // 4. Log GDPR Deletion action to auditLog
    const auditRef = adminDb.collection('auditLog').doc();
    batch.set(auditRef, {
      type: 'gdpr_deletion',
      userId: uid,
      at: FieldValue.serverTimestamp(),
    });

    // Commit all deletions and updates atomically
    await batch.commit();

    console.log(`[GDPR] Successfully executed deletion workflow for user: ${uid}`);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[GDPR] DELETE Deletion failed:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
