import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Google Calendar Event Sync
 *
 * Creates or updates a Calendar event tied to a deal milestone.
 *
 * POST /api/calendar/sync
 * Body: {
 *   idToken: string
 *   projectId: string
 *   eventType: 'inspection' | 'closing' | 'appraisal' | 'listing' | 'custom'
 *   title: string
 *   date: string          // ISO-8601 date string
 *   durationMinutes?: number  // default 60
 *   description?: string
 *   attendeeEmails?: string[]
 *   existingEventId?: string  // when updating
 * }
 */

type EventType = 'inspection' | 'closing' | 'appraisal' | 'listing' | 'custom';

const EVENT_COLORS: Record<EventType, number> = {
  inspection: 5,  // banana
  closing:    2,  // sage
  appraisal:  6,  // tangerine
  listing:    9,  // blueberry
  custom:     1,  // lavender
};

function buildGoogleAuth() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    return null;
  }
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      idToken,
      projectId,
      eventType = 'custom',
      title,
      date,
      durationMinutes = 60,
      description = '',
      attendeeEmails = [],
      existingEventId,
    } = body;

    // ── Validation ─────────────────────────────────────────
    if (!idToken || !projectId || !title || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: idToken, projectId, title, date' },
        { status: 400 },
      );
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const [dealSnap, userSnap] = await Promise.all([
      adminDb.collection('projects').doc(projectId).get(),
      adminDb.collection('users').doc(uid).get(),
    ]);

    if (!dealSnap.exists) return NextResponse.json({ error: 'Deal not found.' }, { status: 404 });
    if (!userSnap.exists)  return NextResponse.json({ error: 'User not found.' }, { status: 404 });

    const dealData = dealSnap.data()!;
    const userData = userSnap.data()!;

    if (dealData.organizationId !== userData.organizationId) {
      return NextResponse.json({ error: 'Cross-tenant access denied.' }, { status: 403 });
    }

    // ── Mock path (no service account configured) ──────────
    const auth = buildGoogleAuth();
    if (!auth) {
      const mockEventId = `mock_cal_${projectId}_${Date.now()}`;
      await adminDb.collection('projects').doc(projectId).update({
        [`calendarEvents.${eventType}`]: {
          eventId: mockEventId,
          title,
          date,
          eventType,
          syncedAt: FieldValue.serverTimestamp(),
          mock: true,
        },
        updatedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({
        success: true,
        mock: true,
        eventId: mockEventId,
        message: 'Calendar event mocked — set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY to enable live sync.',
      });
    }

    // ── Live Google Calendar path ───────────────────────────
    const calendar = google.calendar({ version: 'v3', auth });

    const startDt = new Date(date);
    const endDt = new Date(startDt.getTime() + durationMinutes * 60_000);

    const eventBody = {
      summary: title,
      description: description || `PaperWorking deal milestone — ${dealData.propertyName || projectId}`,
      colorId: String(EVENT_COLORS[eventType as EventType] ?? 1),
      start: { dateTime: startDt.toISOString(), timeZone: 'America/New_York' },
      end:   { dateTime: endDt.toISOString(),   timeZone: 'America/New_York' },
      attendees: attendeeEmails.map((email: string) => ({ email })),
      extendedProperties: {
        private: { paperworkingProjectId: projectId, eventType },
      },
    };

    let eventId: string;
    let htmlLink: string;

    if (existingEventId) {
      const res = await calendar.events.update({
        calendarId: 'primary',
        eventId: existingEventId,
        requestBody: eventBody,
      });
      eventId = res.data.id!;
      htmlLink = res.data.htmlLink!;
    } else {
      const res = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: eventBody,
        sendUpdates: attendeeEmails.length > 0 ? 'all' : 'none',
      });
      eventId = res.data.id!;
      htmlLink = res.data.htmlLink!;
    }

    // Write back to Firestore
    await adminDb.collection('projects').doc(projectId).update({
      [`calendarEvents.${eventType}`]: {
        eventId,
        htmlLink,
        title,
        date,
        eventType,
        syncedAt: FieldValue.serverTimestamp(),
      },
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, eventId, htmlLink });
  } catch (error: any) {
    console.error('[Calendar Sync] Error:', error);
    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json({ error: 'Session expired.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to sync calendar event.', details: error.message }, { status: 500 });
  }
}
