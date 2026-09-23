import { NextResponse } from 'next/server';
import { getAdminFirestore, shouldAttemptFirestore } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/unsubscribe
 *
 * Revokes email consent globally (`unsubscribedEmails/{email}`) and, when a
 * projectId is supplied, flips `emailConsent` to false on the matching
 * `investor_contacts` and `followers` documents for that project.
 *
 * Body: { email: string, projectId?: string }
 */
export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const record = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
    const rawEmail = typeof record.email === 'string' ? record.email.trim().toLowerCase() : '';
    const projectId = typeof record.projectId === 'string' && record.projectId.trim() ? record.projectId.trim() : undefined;

    if (!rawEmail) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: email' },
        { status: 400 }
      );
    }

    const emailLower = rawEmail;

    if (!shouldAttemptFirestore()) {
      console.warn(
        `[Unsubscribe] Firestore unavailable — unsubscribe for ${emailLower} was not persisted.`,
      );
    } else {
      const db = getAdminFirestore();

      // 1. Write to global unsubscribedEmails collection (DM-25)
      await db.collection('unsubscribedEmails').doc(emailLower).set({
        email: emailLower,
        unsubscribedAt: new Date().toISOString(),
      });

      if (projectId) {
        // 2. Search in investor_contacts subcollection
        const contactsRef = db
          .collection('projects')
          .doc(projectId)
          .collection('investor_contacts');
        const contactsSnap = await contactsRef.where('email', '==', emailLower).get();

        for (const doc of contactsSnap.docs) {
          await doc.ref.update({ emailConsent: false });
        }

        // 3. Search in followers subcollection
        const followersRef = db.collection('projects').doc(projectId).collection('followers');
        const followersSnap = await followersRef.where('email', '==', emailLower).get();

        for (const doc of followersSnap.docs) {
          await doc.ref.update({ emailConsent: false });
        }
      }
    }

    console.info('[Unsubscribe] Revoked email consent globally', { email: emailLower, projectId });

    return NextResponse.json({
      success: true,
      message: `Unsubscribed ${emailLower} from project communications.`,
    });
  } catch (error) {
    console.error('[Unsubscribe] General Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
