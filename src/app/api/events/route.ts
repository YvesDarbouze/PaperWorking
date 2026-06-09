import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import * as admin from 'firebase-admin';
import telemetry from '@/lib/telemetry';

/* ═══════════════════════════════════════════════════════
   Events API — POST /api/events
   
   Central event ingestion endpoint for onboarding
   milestones and product analytics.
   
   Events are:
   1. Logged to Firestore (events collection)
   2. Stubbed for PostHog (console.log until integrated)
   3. Trigger side-effects (email sends, profile updates)
   
   Auth: Requires valid Firebase ID token in Authorization header.
   ═══════════════════════════════════════════════════════ */

// Recognized milestone events
const MILESTONE_EVENTS = new Set([
  'onboarding_intent_selected',
  'first_project_created',
  'first_metric_lit',
  'second_project_created',
  'onboarding_celebration_dismissed',
  'onboarding_overlay_dismissed',
  'onboarding_completed',
]);

interface EventPayload {
  event: string;
  properties?: Record<string, unknown>;
  timestamp?: string;
}

export async function POST(request: NextRequest) {
  try {
    // ── Auth: verify Firebase ID token on the request ──
    const auth = await requireAuth(request);
    if (isAuthError(auth)) {
      return auth;
    }
    const { uid, token } = auth;

    // Reject anonymous callers
    if (token.provider_id === 'anonymous' || token.firebase?.sign_in_provider === 'anonymous') {
      return NextResponse.json(
        { error: 'Unauthorized — anonymous users not allowed' },
        { status: 401 }
      );
    }

    // ── Parse body ──
    const body: EventPayload = await request.json();
    const { event, properties = {}, timestamp } = body;

    if (!event || typeof event !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid event name' },
        { status: 400 }
      );
    }

    // Ensure all user attribution fields in properties are derived from verified auth token
    const sanitizedProperties = { ...properties };
    delete sanitizedProperties.distinctId;
    delete sanitizedProperties.uid;
    delete sanitizedProperties.userId;
    delete sanitizedProperties.untrustedUid;

    // ── Real PostHog Telemetry Integration (Failure-Isolated) ──
    try {
      await telemetry.capture({
        distinctId: uid,
        event,
        properties: sanitizedProperties,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      });
      await telemetry.flush();
    } catch (telemetryErr) {
      console.error('[Events API] Telemetry capture/flush failed:', telemetryErr);
    }

    // ── Log to Firestore (Failure-Isolated) ──
    try {
      const eventDoc = {
        uid,
        event,
        properties: sanitizedProperties,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await adminDb.collection('events').add(eventDoc);
    } catch (dbErr) {
      console.error('[Events API] Firestore event logging failed:', dbErr);
    }

    // ── Milestone side-effects ──
    if (MILESTONE_EVENTS.has(event)) {
      const userRef = adminDb.collection('users').doc(uid);

      switch (event) {
        case 'onboarding_intent_selected': {
          const intent = properties?.intent;
          const phase = properties?.phase;
          if (intent) {
            await userRef.set({
              onboardingIntent: intent,
              onboardingPhase: phase !== undefined ? phase : null,
              onboardingIntentAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            console.log(`[Events] Milestone: onboarding_intent_selected saved for user ${uid}`);
          }
          break;
        }

        case 'first_metric_lit': {
          // Mark the first milestone timestamp on the user profile
          await userRef.update({
            firstMetricLit: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // TODO: Trigger FirstMetricEmail via email service
          console.log(`[Events] Milestone: first_metric_lit for user ${uid}`);
          break;
        }

        case 'second_project_created': {
          // TODO: Trigger SecondProjectEmail via email service
          console.log(`[Events] Milestone: second_project_created for user ${uid}`);
          break;
        }

        case 'onboarding_completed': {
          await userRef.update({
            onboardingCompleted: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log(`[Events] Milestone: onboarding_completed for user ${uid}`);
          break;
        }

        default:
          console.log(`[Events] Milestone: ${event} for user ${uid}`);
      }
    }

    return NextResponse.json({ success: true, event });
  } catch (err) {
    console.error('[Events API] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
