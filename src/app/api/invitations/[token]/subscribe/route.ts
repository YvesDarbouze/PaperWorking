import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { logger } from '@/lib/logger';

async function blockVendor(request: NextRequest) {
  const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');
  let callerUid: string | null = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.slice(7);
    try {
      const decoded = await adminDb.collection('users').doc(idToken).get();
      if (decoded.exists) callerUid = decoded.id;
      else {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        callerUid = decodedToken.uid;
      }
    } catch (e) {
      if ((idToken === 'mock_token' || idToken === 'mock_token_123' || idToken === 'mock_session_token_123') && process.env.ENABLE_MOCK_AUTH === 'true') {
        callerUid = request.cookies.get('mock_user_uid')?.value || null;
      }
    }
  } else if (process.env.ENABLE_MOCK_AUTH === 'true') {
    callerUid = request.cookies.get('mock_user_uid')?.value || null;
  }

  if (callerUid) {
    const userSnap = await adminDb.collection('users').doc(callerUid).get();
    const userData = userSnap.exists ? userSnap.data() : null;
    if (userData && (userData.role === 'Vendor' || userData.accountType === 'vendor')) {
      return true;
    }
  }
  return false;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  try {
    if (await blockVendor(request)) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }
    const body = await request.json();
    const { name, email } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token missing.' }, { status: 400 });
    }

    // 1. Resolve invitation
    const snap = await adminDb
      .collection('invitations')
      .where('token', '==', token)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
    }

    const invDoc = snap.docs[0];
    const inv = invDoc.data();
    const projectId = inv.projectId;

    const emailLower = (email || inv.email || '').trim().toLowerCase();

    // 2. Update investor_contacts
    const contactsRef = adminDb.collection('projects').doc(projectId).collection('investor_contacts');
    const contactsSnap = await contactsRef.where('email', '==', emailLower).get();
    for (const doc of contactsSnap.docs) {
      await doc.ref.update({ emailConsent: true, inAppConsent: true });
    }

    // 3. Update followers
    const followersRef = adminDb.collection('projects').doc(projectId).collection('followers');
    const followersSnap = await followersRef.where('email', '==', emailLower).get();
    for (const doc of followersSnap.docs) {
      await doc.ref.update({ emailConsent: true, inAppConsent: true });
    }

    // If they aren't in either, create them as follower or contact so consent is tracked
    if (followersSnap.empty && contactsSnap.empty) {
      const newContactId = `contact_${Date.now()}`;
      await contactsRef.doc(newContactId).set({
        id: newContactId,
        name: name || inv.name || 'Unnamed Investor',
        email: emailLower,
        emailConsent: true,
        inAppConsent: true,
        createdAt: new Date().toISOString(),
        relationship: 'Subscriber',
        type: 'Individual',
        potentialTicket: 0,
      });
    }

    logger.info('[Subscribe] Subscribed & unlocked deal', { email: emailLower, projectId });

    return NextResponse.json({ success: true, message: 'Successfully subscribed. Deal unlocked.' });
  } catch (error) {
    logger.error('[Subscribe] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
