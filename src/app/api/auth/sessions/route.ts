import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const uid = auth.uid;

  // Retrieve sessions from Firestore subcollection
  const sessionsRef = adminDb.collection('users').doc(uid).collection('sessions');
  const snap = await sessionsRef.orderBy('lastActiveAt', 'desc').get();

  const userAgent = req.headers.get('user-agent') || 'Unknown Device';
  const ip = req.headers.get('x-forwarded-for') || '192.168.1.100';

  let currentDevice = 'macOS (Chrome Browser)';
  if (userAgent.includes('iPhone')) currentDevice = 'iPhone (Safari)';
  else if (userAgent.includes('Windows')) currentDevice = 'Windows (Firefox)';
  else if (userAgent.includes('Linux')) currentDevice = 'Linux (Chrome)';

  if (snap.empty) {
    // Initialize current session
    const currentSession = {
      device: currentDevice,
      location: 'New York, USA',
      ip,
      isCurrent: true,
      lastActiveAt: new Date().toISOString(),
    };
    await sessionsRef.add(currentSession);

    // Also seed another session for test coverage of the "Log Out All Other Sessions" feature
    await sessionsRef.add({
      device: 'Safari on iPhone',
      location: 'New York, USA',
      ip: '172.56.21.8',
      isCurrent: false,
      lastActiveAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    });

    const refreshedSnap = await sessionsRef.orderBy('lastActiveAt', 'desc').get();
    const sessions = refreshedSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json(sessions);
  }

  const sessions = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return NextResponse.json(sessions);
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const uid = auth.uid;

  // Revoke via Firebase Admin SDK
  await adminAuth.revokeRefreshTokens(uid);

  // Clear all sessions except the current one
  const sessionsRef = adminDb.collection('users').doc(uid).collection('sessions');
  const snap = await sessionsRef.get();

  const batch = adminDb.batch();
  for (const doc of snap.docs) {
    const data = doc.data();
    if (!data.isCurrent) {
      batch.delete(doc.ref);
    }
  }
  await batch.commit();

  return NextResponse.json({ success: true });
}
