import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
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
   
   Auth: Requires valid Firebase session cookie.
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
    // ── Auth: verify session cookie ──
    const sessionCookie = request.cookies.get('__session')?.value;
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Unauthorized — no session' },
        { status: 401 }
      );
    }

    let uid: string;
    try {
      const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
      uid = decoded.uid;
    } catch {
      return NextResponse.json(
        { error: 'Unauthorized — invalid session' },
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

    // ── Real PostHog Telemetry Integration ──
    await telemetry.capture({
      distinctId: uid,
      event,
      properties: { ...properties, $timestamp: timestamp || new Date().toISOString() },
    });
    await telemetry.flush();

    // ── Log to Firestore ──
    const eventDoc = {
      uid,
      event,
      properties,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await adminDb.collection('events').add(eventDoc);

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
          // Mark the first metric timestamp on the user profile
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
