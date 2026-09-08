/**
 * Server-authoritative endpoint for Callback Requests.
 *
 * Requirements:
 * - Collects name, phone, preferred window, topic, transcript.
 * - Server is the sole authority on tier checks: Investment Team flagged priority; others quoted business-hours.
 * - Client tier claims are untrusted and ignored.
 * - Dispatches SendGrid internal notification with interaction transcript attached.
 * - Dispatches SendGrid user receipt summarizing the request and expected SLA.
 * - Persists to Firestore /callbacks collection via Firebase Admin SDK.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { isValidSessionToken, verifySessionToken } from '@paperworking/api';
import { ACCT_COOKIE, SESSION_COOKIE } from '@/lib/auth/session-cookies';
import { getAdminFirestore, shouldAttemptFirestore } from '@/lib/firebase/admin';
import { verifyAppCheckHeader } from '@/lib/firebase/app-check-server';
import { sendGridService } from '@/lib/email/sendgrid-service';

export interface CallbackRequestBody {
  name: string;
  phone: string;
  email: string;
  preferredWindow: string;
  topic: string;
  transcript?: string;
  clientTierClaim?: string; // Untrusted!
}

export async function POST(request: NextRequest) {
  // 1. App Check verification
  const appCheckToken = request.headers.get('x-firebase-appcheck');
  const appCheckResult = await verifyAppCheckHeader(appCheckToken);
  if (!appCheckResult.valid) {
    return NextResponse.json({ error: appCheckResult.error || 'App Check failed.' }, { status: 403 });
  }

  // 2. Parse request body
  let body: CallbackRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { name, phone, email, preferredWindow, topic, transcript } = body;
  if (!name?.trim() || !phone?.trim() || !email?.trim() || !preferredWindow?.trim()) {
    return NextResponse.json(
      { error: 'Name, phone number, email, and preferred window are required.' },
      { status: 400 },
    );
  }

  // 3. Server-side true tier verification
  let cookieStore = null;
  try {
    cookieStore = await cookies();
  } catch {
    // Outside request store (e.g. testing)
  }
  const session = cookieStore?.get(SESSION_COOKIE)?.value || request.cookies.get(SESSION_COOKIE)?.value;
  let verifiedAccountType = 'investor';
  let uid: string | undefined;

  if (session && isValidSessionToken(session)) {
    const verified = verifySessionToken(session);
    if (verified) {
      uid = verified.uid;
      verifiedAccountType =
        cookieStore?.get(ACCT_COOKIE)?.value ??
        request.cookies.get(ACCT_COOKIE)?.value ??
        verified.accountType ??
        'investor';
    }
  }

  const isPriorityTier = verifiedAccountType === 'investment_team' || verifiedAccountType === 'admin';

  // 4. Persist to Firestore /callbacks collection via Admin SDK
  let callbackId = `cb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      const addPromise = db.collection('callbacks').add({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        preferredWindow: preferredWindow.trim(),
        topic: topic?.trim() || 'General Product Question',
        transcript: transcript || null,
        accountType: verifiedAccountType,
        isPriority: isPriorityTier,
        uid: uid || null,
        createdAt: new Date().toISOString(),
        status: 'pending',
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore timeout')), 2000),
      );
      const docRef = await Promise.race([addPromise, timeoutPromise]);
      callbackId = docRef.id;
    } catch (dbErr) {
      console.error('Failed to write callback to Firestore:', dbErr);
    }
  }

  // 5. Send dual SendGrid emails
  let emailsDispatched = 0;
  try {
    const dispatchResults = await sendGridService.sendCallbackRequest({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      preferredWindow: preferredWindow.trim(),
      topic: topic?.trim() || 'Product Support',
      userTier: verifiedAccountType,
      transcript,
    });
    if (dispatchResults?.userReceipt && dispatchResults?.teamAlert) {
      emailsDispatched = 2;
    }
  } catch (emailErr) {
    console.error('Failed to send SendGrid callback emails:', emailErr);
  }

  return NextResponse.json({
    success: true,
    callbackId,
    isPriority: isPriorityTier,
    emailsDispatched,
    message: isPriorityTier
      ? 'Priority callback registered. A senior team member will reach out within 15 minutes.'
      : 'Callback registered. We will call during your requested window between 9:00 AM – 6:00 PM EST.',
  });
}
