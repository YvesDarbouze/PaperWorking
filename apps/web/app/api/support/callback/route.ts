import { NextRequest, NextResponse } from 'next/server';
import { normalizeToStructuredError } from '@paperworking/shared';
import { SendGridService } from '@/lib/email/sendgrid-service';
import { getAdminFirestore, shouldAttemptFirestore } from '@/lib/firebase/admin';
import { ticketStore } from '@/lib/tickets/ticket-store';
import { checkDurableRateLimit, extractClientIp } from '@/lib/security/durable-rate-limiter';
import { verifyTurnstileToken } from '@/lib/security/turnstile-validator';
import {
  validateFieldLengths,
  checkSupportSendVolumeAnomaly,
  INTERNAL_SUPPORT_DESTINATION_EMAIL,
} from '@/lib/security/support-anti-abuse';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

import { normalizeToE164, isValidE164 } from '@/lib/support/phone-validation';

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
      key: `support:callback:ip:${clientIp}`,
      limit: 5,
      windowSeconds: 600,
    });
    if (!ipLimit.allowed) {
      return makeErrorResponse(
        'Too many requests. Please wait a few minutes before requesting another call back.',
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

    // 3. Validation & Field Length Caps
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const preferredTime = typeof body.preferredTime === 'string' ? body.preferredTime.trim() : '';
    const topic = typeof body.topic === 'string' ? body.topic.trim() : '';

    if (!name) {
      return makeErrorResponse('This field is required.', 400, { field: 'name' });
    }

    if (!email) {
      return makeErrorResponse('This field is required.', 400, { field: 'email' });
    }

    if (!isValidEmail(email)) {
      return makeErrorResponse('Enter a valid email address.', 400, { field: 'email' });
    }

    if (!phone) {
      return makeErrorResponse('This field is required.', 400, { field: 'phone' });
    }

    const normalizedPhone = normalizeToE164(phone);
    if (!normalizedPhone || !isValidE164(normalizedPhone)) {
      return makeErrorResponse('Enter a valid phone number.', 400, { field: 'phone' });
    }

    const lengthValidation = validateFieldLengths({
      name,
      email,
      phone: normalizedPhone,
      preferredTime,
      topic,
    });
    if (!lengthValidation.valid) {
      return makeErrorResponse(
        `Field '${lengthValidation.field}' exceeds maximum allowed length of ${lengthValidation.max} characters.`,
        400,
        { field: lengthValidation.field },
      );
    }

    // 4. Cloudflare Turnstile Verification (verified before any DB write or SendGrid dispatch)
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

    // 5. Send-Volume Anomaly Detection Hook
    await checkSupportSendVolumeAnomaly();

    const ticketId = ticketStore.generateTicketId('callback');
    const callbackId = ticketId;
    const timestamp = new Date().toISOString();

    // 5b. Record Transactional Telephone Consent (Review C3.5 - Strict Zero SMS Policy)
    if (shouldAttemptFirestore()) {
      try {
        const db = getAdminFirestore();
        await db.collection('consentRecords').doc(ticketId).set({
          id: ticketId,
          userId: null,
          consentType: 'callback_phone_consent',
          version: '2026-08',
          agreedAt: timestamp,
          ipAddress: clientIp,
          userAgent: request.headers.get('user-agent') || 'Unknown',
          metadata: {
            phone: normalizedPhone,
            email,
            name,
            preferredTime: preferredTime || null,
            topic: topic || null,
            disclosure:
              'Transactional-response-only; one-time telephone call by support staff; zero SMS.',
          },
          createdAt: timestamp,
        });
      } catch (consentErr) {
        console.error('Failed to log callback phone consent:', consentErr);
      }
    }

    // 6. Persist to Database (Firestore 'callbacks' collection)
    if (shouldAttemptFirestore()) {
      try {
        const db = getAdminFirestore();
        await db.collection('callbacks').doc(ticketId).set({
          id: ticketId,
          ticketId,
          name,
          email,
          phone: normalizedPhone,
          preferredTime: preferredTime || null,
          topic: topic || null,
          createdAt: timestamp,
          status: 'pending',
          consentRecorded: true,
          smsAllowed: false,
        });
      } catch (dbErr) {
        console.error('Failed to persist callback to Firestore:', dbErr);
      }
    }

    // 6b. Persist to Unified Ticket Store & Admin Engagement Ledger
    try {
      await ticketStore.createTicket({
        id: ticketId,
        kind: 'callback',
        subject: `Callback Request: ${topic || 'Product Support'} (${preferredTime || 'Not specified'})`,
        description: `Telephone callback requested by ${name} (${normalizedPhone}) for time: ${preferredTime || 'Not specified'}.\nTopic: ${topic || 'General'}`,
        requesterName: name,
        requesterEmail: email,
        requesterTier: 'investor',
        priority: 'high',
        phone: normalizedPhone,
        preferredWindow: preferredTime || undefined,
        tags: ['callback', 'support-page'],
        initialMessage: `Phone: ${normalizedPhone}\nPreferred Time: ${preferredTime || 'Anytime'}\nTopic: ${topic || 'General'}`,
      });
    } catch (storeErr) {
      console.error('Failed to create callback ticket in ticketStore:', storeErr);
    }

    // 7. Server-Side Delivery (never exposed to client)
    let emailSent = false;
    let requiresCredentials = false;

    try {
      const mailer = new SendGridService();
      await mailer.send({
        to: { email: INTERNAL_SUPPORT_DESTINATION_EMAIL, name: 'PaperWorking Support' },
        subject: `[${ticketId}] [Call Back Request] from ${name}`,
        text: `Call Back Request Received:\n\nTicket: ${ticketId}\nName: ${name}\nEmail: ${email}\nPhone Number: ${normalizedPhone}\nPreferred Time: ${preferredTime || 'Not specified'}\nTopic: ${topic || 'Not specified'}\nTimestamp: ${timestamp}\nZero-SMS Notice: Transactional callback phone request only.`,
      });
      emailSent = true;
    } catch (mailErr) {
      requiresCredentials = true;
    }

    return NextResponse.json({
      success: true,
      ticketId,
      callbackId,
      emailSent,
      requiresCredentials,
    });
  } catch (err: unknown) {
    return makeErrorResponse('Something went wrong. Please try again.', 500);
  }
}
