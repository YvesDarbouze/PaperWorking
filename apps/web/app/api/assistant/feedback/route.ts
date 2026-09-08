/**
 * Server-authoritative endpoint for Community Feedback submissions.
 *
 * Requirements:
 * - Suggest an idea: All users.
 * - Report a bug: All users (attach route + error context with user consent).
 * - Request a feature: Subscribers ONLY.
 *   Non-subscribers get a graceful upsell line, never an unhandled error.
 * - Server is the sole authority on tier verification.
 * - Persists to Firestore /feedback collection via Firebase Admin SDK.
 * - Dispatches SendGrid receipt to user and notification to PaperWorking product team.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { isValidSessionToken, verifySessionToken } from '@paperworking/api';
import { ACCT_COOKIE, decodeSubCookie, SESSION_COOKIE, SUB_COOKIE } from '@/lib/auth/session-cookies';
import { getAdminFirestore, shouldAttemptFirestore } from '@/lib/firebase/admin';
import { verifyAppCheckHeader } from '@/lib/firebase/app-check-server';
import { sendGridService } from '@/lib/email/sendgrid-service';

export interface FeedbackRequestBody {
  kind: 'idea' | 'bug' | 'feature_request';
  title: string;
  description: string;
  userEmail?: string;
  userName?: string;
  route?: string;
  errorContext?: string;
  clientTierClaim?: string; // Untrusted! Server always verifies against session.
}

export async function POST(request: NextRequest) {
  // 1. App Check verification
  const appCheckToken = request.headers.get('x-firebase-appcheck');
  const appCheckResult = await verifyAppCheckHeader(appCheckToken);
  if (!appCheckResult.valid) {
    return NextResponse.json({ error: appCheckResult.error || 'App Check failed.' }, { status: 403 });
  }

  // 2. Parse request body
  let body: FeedbackRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const { kind, title, description, route, errorContext } = body;
  if (!kind || !['idea', 'bug', 'feature_request'].includes(kind)) {
    return NextResponse.json({ error: 'Invalid feedback kind.' }, { status: 400 });
  }
  if (!title?.trim() || !description?.trim()) {
    return NextResponse.json({ error: 'Title and description are required.' }, { status: 400 });
  }

  // 3. Authenticate and determine true server-side tier
  let cookieStore = null;
  try {
    cookieStore = await cookies();
  } catch {
    // Outside request store (e.g. testing)
  }
  const session = cookieStore?.get(SESSION_COOKIE)?.value || request.cookies.get(SESSION_COOKIE)?.value;
  let isAuthenticated = false;
  let uid: string | undefined;
  let verifiedAccountType = 'guest';
  let isSubscriber = false;

  if (session && isValidSessionToken(session)) {
    const verified = verifySessionToken(session);
    if (verified) {
      isAuthenticated = true;
      uid = verified.uid;
      verifiedAccountType =
        cookieStore?.get(ACCT_COOKIE)?.value ??
        request.cookies.get(ACCT_COOKIE)?.value ??
        verified.accountType ??
        'investor';
      const sub = decodeSubCookie(cookieStore?.get(SUB_COOKIE)?.value || request.cookies.get(SUB_COOKIE)?.value);
      isSubscriber =
        sub.status === 'active' ||
        sub.status === 'trialing' ||
        (verifiedAccountType !== 'vendor' && verifiedAccountType !== 'guest');
    }
  }

  // 4. Invariant: Server is the only authority on feature requests.
  // Gated to subscribers only; non-subscribers receive graceful upsell response.
  if (kind === 'feature_request' && !isSubscriber) {
    return NextResponse.json(
      {
        success: false,
        upsell: true,
        message:
          'Feature requests directly shape PaperWorking development and are reserved for active subscribers. Start your 14-day Investor or Investment Team trial to submit feature requests and prioritize our roadmap.',
        upgradeUrl: '/pricing',
      },
      { status: 200 },
    );
  }

  const userEmail = body.userEmail || (isAuthenticated ? `${uid || 'user'}@paperworking.co` : 'anonymous@paperworking.co');
  const userName = body.userName || (isAuthenticated ? 'PaperWorking Investor' : 'Community Member');

  // 5. Persist to Firestore /feedback collection via Firebase Admin SDK
  let feedbackDocId = `fb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      const addPromise = db.collection('feedback').add({
        kind,
        title: title.trim(),
        description: description.trim(),
        userEmail,
        userName,
        accountType: verifiedAccountType,
        isSubscriber,
        uid: uid || null,
        route: route || '/',
        errorContext: errorContext || null,
        createdAt: new Date().toISOString(),
        status: 'new',
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore timeout')), 2000),
      );
      const docRef = await Promise.race([addPromise, timeoutPromise]);
      feedbackDocId = docRef.id;
    } catch (dbErr) {
      console.error('Failed to write feedback to Firestore:', dbErr);
      // Don't crash if Firestore is offline; continue to dispatch email
    }
  }

  // 6. Trigger SendGrid transactional emails
  try {
    await sendGridService.sendFeedbackNotification({
      kind,
      title: title.trim(),
      description: description.trim(),
      userEmail,
      userName,
      userTier: verifiedAccountType,
      route,
      errorContext,
    });
  } catch (emailErr) {
    console.error('SendGrid dispatch error:', emailErr);
  }

  return NextResponse.json({
    success: true,
    feedbackId: feedbackDocId,
    kind,
    message: 'Thank you for helping shape PaperWorking! Your feedback has been recorded.',
  });
}
