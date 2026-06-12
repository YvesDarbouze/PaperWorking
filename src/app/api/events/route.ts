import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import * as admin from 'firebase-admin';
import telemetry from '@/lib/telemetry';
import { CommunicationEngine } from '@/lib/engine/CommunicationEngine';
import { generateFirstMetricEmail } from '@/lib/emails/templates/FirstMetricEmail';
import { generateSecondProjectEmail } from '@/lib/emails/templates/SecondProjectEmail';

/* ═══════════════════════════════════════════════════════
   Events API — POST /api/events
   
   Central event ingestion endpoint for onboarding
   milestones and product analytics.
   
   Events are:
   1. Logged to Firestore (events collection)
   2. Forwarded to PostHog telemetry (failure-isolated)
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

// ─── Milestone email helper ─────────────────────────────────
//
// Dispatches a milestone email with full idempotency and audit trail.
// Contract:
//   • Never throws — any failure is caught and logged.
//   • Returns false without sending if the milestone was already sent.
//   • Marks the milestone as sent AFTER a successful dispatch.
//   • Writes an audit doc to `milestoneEmailSends/{uid}_{milestone}`.
//
async function sendMilestoneEmail(opts: {
  uid: string;
  milestone: string;
  idempotencyField: string;
  to: string;
  subject: string;
  html: string;
  displayName: string;
}): Promise<boolean> {
  const { uid, milestone, idempotencyField, to, subject, html, displayName } = opts;
  const userRef = adminDb.collection('users').doc(uid);

  try {
    // ── Idempotency guard ──────────────────────────────────
    const userSnap = await userRef.get();
    if (userSnap.data()?.[idempotencyField] === true) {
      console.log(`[Events] Milestone email already sent: ${milestone} for ${uid}`);
      return false;
    }

    // ── Dispatch via CommunicationEngine (Resend / mock) ──
    const { id: providerMessageId, mock } = await CommunicationEngine.sendRawEmail(
      [to],
      subject,
      html,
    );

    // ── Mark sent on user doc ──────────────────────────────
    await userRef.set(
      {
        [idempotencyField]: true,
        [`${idempotencyField}At`]: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    // ── Audit trail ───────────────────────────────────────
    // Doc ID is deterministic so it can never be duplicated.
    const auditRef = adminDb
      .collection('milestoneEmailSends')
      .doc(`${uid}_${milestone}`);
    await auditRef.set({
      uid,
      milestone,
      to,
      displayName,
      providerMessageId,
      mock,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(
      `[Events] Milestone email sent: ${milestone} → ${to}` +
        (mock ? ' (mocked — no RESEND_API_KEY)' : ''),
    );
    return true;
  } catch (err) {
    // Email failure MUST NOT break event ingestion.
    console.error(`[Events] Milestone email failed for ${milestone}/${uid}:`, err);
    return false;
  }
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
          await userRef.update({
            firstMetricLit: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // ── Send FirstMetricEmail (failure-isolated, idempotent) ──
          {
            const userSnap = await userRef.get();
            const userData = userSnap.data() ?? {};
            const userEmail: string = userData.email || token.email || '';
            const displayName: string = userData.displayName || token.name || 'there';

            if (userEmail) {
              const projectName = String(sanitizedProperties.projectName ?? 'Your Project');
              const metricName  = String(sanitizedProperties.metricName  ?? 'First Metric');
              const metricValue = String(sanitizedProperties.metricValue ?? '—');
              const projectUrl  = String(sanitizedProperties.projectUrl  ?? '/dashboard');

              const { subject, html } = generateFirstMetricEmail({
                displayName,
                projectName,
                metricName,
                metricValue,
                projectUrl,
              });

              await sendMilestoneEmail({
                uid,
                milestone: 'first_metric_lit',
                idempotencyField: 'firstMetricEmailSent',
                to: userEmail,
                subject,
                html,
                displayName,
              });
            }
          }
          break;
        }

        case 'second_project_created': {
          // ── Send SecondProjectEmail (failure-isolated, idempotent) ──
          {
            const userSnap = await userRef.get();
            const userData = userSnap.data() ?? {};
            const userEmail: string = userData.email || token.email || '';
            const displayName: string = userData.displayName || token.name || 'there';

            if (userEmail) {
              const projectName   = String(sanitizedProperties.projectName   ?? 'Your Project');
              const totalProjects = Number(sanitizedProperties.totalProjects ?? 2);

              const { subject, html } = generateSecondProjectEmail({
                displayName,
                projectName,
                totalProjects,
              });

              await sendMilestoneEmail({
                uid,
                milestone: 'second_project_created',
                idempotencyField: 'secondProjectEmailSent',
                to: userEmail,
                subject,
                html,
                displayName,
              });
            }
          }
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
