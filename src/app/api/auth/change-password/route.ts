import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const uid = auth.uid;
  const body = await req.json().catch(() => ({}));
  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Current password and new password are required.' }, { status: 400 });
  }

  // 1. Fetch user email using Admin SDK
  let email: string;
  try {
    const userRecord = await adminAuth.getUser(uid);
    email = userRecord.email || '';
  } catch {
    return NextResponse.json({ error: 'Failed to retrieve user information.' }, { status: 500 });
  }

  if (!email) {
    return NextResponse.json({ error: 'User does not have an email address associated.' }, { status: 400 });
  }

  // 2. Verify current password via Firebase Auth REST API signInWithPassword
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
  try {
    const verifyRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: currentPassword,
          returnSecureToken: true,
        }),
      }
    );

    if (!verifyRes.ok) {
      const errBody = await verifyRes.json().catch(() => ({}));
      const errorMsg = errBody.error?.message || 'Incorrect current password.';
      return NextResponse.json({ error: errorMsg }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: 'Verification failed. Please try again.' }, { status: 500 });
  }

  // 3. Update password using Admin SDK
  try {
    await adminAuth.updateUser(uid, {
      password: newPassword,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update password.';
    return NextResponse.json({ error: message }, { status: 550 });
  }

  return NextResponse.json({ success: true });
}
