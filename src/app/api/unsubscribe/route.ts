import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { email, projectId } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: email' },
        { status: 400 }
      );
    }

    const emailLower = email.trim().toLowerCase();

    // 1. Write to global unsubscribedEmails collection (DM-25)
    await adminDb.collection('unsubscribedEmails').doc(emailLower).set({
      email: emailLower,
      unsubscribedAt: new Date().toISOString(),
    });

    if (projectId) {
      // 2. Search in investor_contacts subcollection
      const contactsRef = adminDb.collection('projects').doc(projectId).collection('investor_contacts');
      const contactsSnap = await contactsRef.where('email', '==', emailLower).get();
      
      for (const doc of contactsSnap.docs) {
        await doc.ref.update({ emailConsent: false });
      }
    }

    if (projectId) {
      // 3. Search in followers subcollection
      const followersRef = adminDb.collection('projects').doc(projectId).collection('followers');
      const followersSnap = await followersRef.where('email', '==', emailLower).get();

      for (const doc of followersSnap.docs) {
        await doc.ref.update({ emailConsent: false });
      }
    }

    logger.info('[Unsubscribe] Revoked email consent globally', { email: emailLower, projectId });

    return NextResponse.json({
      success: true,
      message: `Unsubscribed ${emailLower} from project communications.`,
    });
  } catch (error) {
    logger.error('[Unsubscribe] General Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
