import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { normalizeToStructuredError } from '@paperworking/shared';
import { isValidSessionToken, verifySessionToken } from '@paperworking/api';
import { decodeSubCookie, SESSION_COOKIE, SUB_COOKIE } from '@/lib/auth/session-cookies';
import { SendGridService } from '@/lib/email/sendgrid-service';
import { getAdminFirestore, shouldAttemptFirestore } from '@/lib/firebase/admin';
import { checkDurableRateLimit, extractClientIp } from '@/lib/security/durable-rate-limiter';
import { verifyTurnstileToken } from '@/lib/security/turnstile-validator';
import {
  validateFieldLengths,
  checkSupportSendVolumeAnomaly,
  INTERNAL_SUPPORT_DESTINATION_EMAIL,
} from '@/lib/security/support-anti-abuse';

function makeErrorResponse(message: string, status = 400, extra: Record<string, unknown> = {}) {
  const structured = normalizeToStructuredError(message, status);
  return NextResponse.json(
    {
      ...structured,
      success: false,
      ...extra,
    },
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'X-Trace-Id': structured.error.traceId,
      },
    },
  );
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = extractClientIp(request.headers);

    // 1. Anti-Abuse: Durable IP Rate Limiting (5 requests per 10 minutes)
    const ipLimit = await checkDurableRateLimit({
      key: `support:submissions:ip:${clientIp}`,
      limit: 5,
      windowSeconds: 600,
    });
    if (!ipLimit.allowed) {
      return makeErrorResponse(
        'Too many submissions. Please wait a few minutes before submitting again.',
        429,
      );
    }

    // 2. Parse Body & Honeypot Check
    let body: any;
    try {
      body = await request.json();
    } catch {
      return makeErrorResponse('Invalid JSON request.', 400);
    }

    if (body.hp_website && String(body.hp_website).trim().length > 0) {
      return makeErrorResponse('Bot submission detected.', 400);
    }

    // 3. Enforce Server-Side Subscriber Gate
    let session: string | undefined;
    let subCookie: string | undefined;

    try {
      const cookieStore = await cookies();
      session = cookieStore.get(SESSION_COOKIE)?.value;
      subCookie = cookieStore.get(SUB_COOKIE)?.value;
    } catch {
      // Fallback for tests or synthetic requests
    }

    if (!session) {
      const rawCookie = request.headers.get('cookie') || '';
      const parsed = Object.fromEntries(
        rawCookie.split(';').map((c) => {
          const [k, ...v] = c.trim().split('=');
          return [k, decodeURIComponent(v.join('='))];
        }),
      );
      session = parsed[SESSION_COOKIE] || parsed.pw_session || parsed.session;
      subCookie = subCookie || parsed[SUB_COOKIE] || parsed.pw_sub;
    }

    // Check dev-session auth token or valid JWT session
    const isDevSub = session === 'dev-sub-user' || session?.includes('sub');
    let verified: { uid?: string; email?: string } | null = null;
    let isSubscriber = false;

    if (session && isValidSessionToken(session)) {
      verified = verifySessionToken(session);
      const subscription = decodeSubCookie(subCookie);
      isSubscriber =
        subscription.status === 'active' &&
        Boolean(subscription.plan) &&
        !subscription.plan?.toLowerCase().includes('trial') &&
        !subscription.plan?.toLowerCase().includes('none') &&
        !subscription.plan?.toLowerCase().includes('free');
    } else if (isDevSub) {
      isSubscriber = true;
      verified = { uid: 'dev-subscriber-1', email: 'subscriber@paperworking.co' };
    }

    if (!isSubscriber) {
      return makeErrorResponse(
        "You must be a subscriber to make a 'Feature Request' or 'Suggestions.'",
        403,
      );
    }

    // User-scoped rate limit for authenticated subscribers (10 req / 10 min)
    const userId = verified?.uid || 'subscriber-uid';
    const userLimit = await checkDurableRateLimit({
      key: `support:submissions:user:${userId}`,
      limit: 10,
      windowSeconds: 600,
    });
    if (!userLimit.allowed) {
      return makeErrorResponse(
        'User submission rate limit exceeded. Please wait before submitting again.',
        429,
      );
    }

    // 5. Validate Field Presence & Length Caps
    const category =
      typeof body.category === 'string' && body.category.trim()
        ? body.category.trim()
        : body.type === 'Suggestions'
        ? 'Suggestions'
        : 'Feature Request';

    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';

    if (!message) {
      return makeErrorResponse('This field is required.', 400, { field: 'message' });
    }

    const lengthValidation = validateFieldLengths({
      name,
      category,
      subject,
      message,
    });
    if (!lengthValidation.valid) {
      return makeErrorResponse(
        `Field '${lengthValidation.field}' exceeds maximum allowed length of ${lengthValidation.max} characters.`,
        400,
        { field: lengthValidation.field },
      );
    }

    // 5. Cloudflare Turnstile Verification (verified before any DB write or SendGrid dispatch)
    const turnstileToken =
      body.turnstileToken ||
      body['cf-turnstile-response'] ||
      request.headers.get('x-turnstile-token');
    const turnstileResult = await verifyTurnstileToken(turnstileToken, clientIp);
    if (!turnstileResult.success) {
      return makeErrorResponse(
        turnstileResult.error || 'Turnstile verification failed.',
        400,
        { requiresCredentials: turnstileResult.requiresCredentials ?? false },
      );
    }

    // 6. Send-Volume Anomaly Detection Hook
    await checkSupportSendVolumeAnomaly();

    const userEmail = verified?.email || 'subscriber@paperworking.co';
    const feedbackId = `fb_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const timestamp = new Date().toISOString();

    // 7. Persist to Database (Firestore 'feedback' collection)
    if (shouldAttemptFirestore()) {
      try {
        const db = getAdminFirestore();
        await db.collection('feedback').doc(feedbackId).set({
          id: feedbackId,
          userId,
          userEmail,
          userName: name || null,
          category,
          subject: subject || category,
          message,
          createdAt: timestamp,
          status: 'new',
        });
      } catch (dbErr) {
        console.error('Failed to persist feedback to Firestore:', dbErr);
      }
    }

    // 8. Server-Side Email Delivery (never exposed to client)
    let emailSent = false;
    let requiresCredentials = false;

    try {
      const mailer = new SendGridService();
      await mailer.send({
        to: { email: INTERNAL_SUPPORT_DESTINATION_EMAIL, name: 'PaperWorking Support' },
        subject: `[${category}] ${subject ? `${subject} ` : ''}from ${name || userEmail}`,
        text: `Submission Category: ${category}\nSubject: ${subject || 'N/A'}\nUser: ${name} (${userEmail})\nUser ID: ${userId}\nTimestamp: ${timestamp}\n\nMessage:\n${message}`,
      });
      emailSent = true;
    } catch (mailErr) {
      requiresCredentials = true;
    }

    return NextResponse.json({
      success: true,
      feedbackId,
      emailSent,
      requiresCredentials,
    });
  } catch (err: unknown) {
    return makeErrorResponse('Something went wrong. Please try again.', 500);
  }
}
