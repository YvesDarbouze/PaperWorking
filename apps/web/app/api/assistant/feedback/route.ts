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
import { ticketStore } from '@/lib/tickets/ticket-store';

export interface FeedbackRequestBody {
  kind: 'idea' | 'bug' | 'feature_request';
  title: string;
  description: string;
  userEmail?: string;
  userName?: string;
  route?: string;
  errorContext?: string;
  clientTierClaim?: string; // Untrusted! Server always verifies against session.
  ticketId?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  module?: string;
  reilPhase?: string;
  diagnostics?: Record<string, unknown>;
  hasAttachment?: boolean;
  attachmentName?: string;
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

  const {
    kind,
    title,
    description,
    route,
    errorContext,
    severity,
    module: affectedModule,
    reilPhase,
    diagnostics,
    hasAttachment,
    attachmentName,
  } = body;

  if (!kind || !['idea', 'bug', 'feature_request'].includes(kind)) {
    return NextResponse.json({ error: 'Invalid feedback kind.' }, { status: 400 });
  }
  if (!title?.trim() || !description?.trim()) {
    return NextResponse.json({ error: 'Title and description are required.' }, { status: 400 });
  }

  // Generate clean tracking Ticket ID if not provided
  const prefix = kind === 'bug' ? 'PW-BUG' : kind === 'feature_request' ? 'PW-FEAT' : 'PW-IDEA';
  const ticketId = body.ticketId || `${prefix}-${Math.floor(10000 + Math.random() * 90000)}`;

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
      const isInvestorOrTeam =
        verifiedAccountType === 'investor' ||
        verifiedAccountType === 'investment_team' ||
        verifiedAccountType === 'admin';
      const hasActiveSub = sub.status === 'active' || sub.status === 'trialing';
      isSubscriber = isInvestorOrTeam && hasActiveSub;
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

  // Format diagnostics string if present
  let diagnosticsSummary: string | undefined = undefined;
  if (diagnostics && typeof diagnostics === 'object') {
    const diagParts: string[] = [];
    if (diagnostics.appVersion) diagParts.push(`App Version: ${diagnostics.appVersion}`);
    if (diagnostics.route) diagParts.push(`Route: ${diagnostics.route}`);
    if (diagnostics.platform) diagParts.push(`OS / Platform: ${diagnostics.platform}`);
    if (diagnostics.userAgent) diagParts.push(`User-Agent: ${diagnostics.userAgent}`);
    if (diagnostics.viewport) {
      const vp = diagnostics.viewport as { width?: number; height?: number };
      diagParts.push(`Viewport: ${vp.width}x${vp.height}`);
    }
    diagnosticsSummary = diagParts.join('\n');
  }

  // 5. Persist to Firestore /feedback collection via Firebase Admin SDK
  let feedbackDocId = `fb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      const addPromise = db.collection('feedback').add({
        ticketId,
        kind,
        title: title.trim(),
        description: description.trim(),
        userEmail,
        userName,
        accountType: verifiedAccountType,
        isSubscriber,
        uid: uid || null,
        route: route || '/',
        module: affectedModule || null,
        reilPhase: reilPhase || null,
        severity: severity || (kind === 'bug' ? 'medium' : null),
        diagnostics: diagnostics || null,
        hasAttachment: !!hasAttachment,
        attachmentName: attachmentName || null,
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

  // 5b. Persist to Unified Ticket Store & Admin Engagement Ledger
  try {
    await ticketStore.createTicket({
      id: ticketId,
      kind,
      subject: title.trim(),
      description: description.trim(),
      requesterName: userName,
      requesterEmail: userEmail,
      requesterTier: verifiedAccountType,
      priority: severity || (kind === 'bug' ? 'medium' : 'low'),
      module: affectedModule || undefined,
      reilPhase: reilPhase || undefined,
      dinnerPledge: kind === 'feature_request',
      diagnostics: diagnostics || undefined,
      hasAttachment: !!hasAttachment,
      attachmentName: attachmentName || undefined,
    });
  } catch (storeErr) {
    console.error('Failed to create ticket in ticketStore:', storeErr);
  }

  // 6. Trigger SendGrid transactional emails to product team & user receipt
  try {
    await sendGridService.sendFeedbackNotification({
      ticketId,
      kind,
      title: title.trim(),
      description: description.trim(),
      userEmail,
      userName,
      userTier: verifiedAccountType,
      route,
      severity,
      module: affectedModule,
      reilPhase,
      diagnosticsSummary,
      hasAttachment,
      attachmentName,
      errorContext,
    });
  } catch (emailErr) {
    console.error('SendGrid dispatch error:', emailErr);
  }

  const successMessage =
    kind === 'bug'
      ? `Bug report recorded successfully under Ticket ${ticketId}. Our engineering team has been notified.`
      : kind === 'feature_request'
      ? `Feature request recorded successfully under Ticket ${ticketId}. If we develop this feature, dinner is on us!`
      : 'Thank you for helping shape PaperWorking! Your feedback has been recorded.';

  return NextResponse.json({
    success: true,
    feedbackId: feedbackDocId,
    ticketId,
    kind,
    message: successMessage,
  });
}
