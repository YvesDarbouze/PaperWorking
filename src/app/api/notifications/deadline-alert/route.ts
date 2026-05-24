import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { NotificationService } from '@/lib/services/notificationService';

export const dynamic = 'force-dynamic';

/* ═══════════════════════════════════════════════════════
   POST /api/notifications/deadline-alert

   Fires a DEADLINE_ALERT notification for a contingency
   deadline. Called by PurchaseInterview when contingency
   dates are saved. Auth via Bearer token.
   ═══════════════════════════════════════════════════════ */

interface DeadlineAlertBody {
  recipientId: string;
  projectId: string;
  dealAddress: string;
  contingencyType: string; // 'Inspection' | 'Financing' | 'Appraisal'
  deadlineDate: string;    // ISO string
  daysUntil: number;
}

export async function POST(request: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    // ── Body validation ──────────────────────────────
    const body: DeadlineAlertBody = await request.json();
    const { recipientId, projectId, dealAddress, contingencyType, deadlineDate, daysUntil } = body;

    if (!recipientId || !projectId || !dealAddress || !contingencyType || !deadlineDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: recipientId, projectId, dealAddress, contingencyType, deadlineDate' },
        { status: 400 },
      );
    }

    // ── Derive the human-readable time string ────────
    const timeLabel = daysUntil <= 1
      ? `${daysUntil} day`
      : `${daysUntil} days`;

    // ── Idempotency: don't re-fire for the same contingency+date ──
    // The notification service handles deduplication at the inbox level,
    // but we generate a stable actor to avoid spamming.

    const notificationId = await NotificationService.createNotification({
      recipientId,
      type: 'DEADLINE_ALERT',
      actor: {
        uid,
        name: 'PaperWorking System',
        role: 'System',
      },
      objectReference: {
        projectId,
        dealAddress,
        time: timeLabel,
        task: `${contingencyType} contingency`,
      },
      deepLinkUrl: `/dashboard/projects/${projectId}`,
      expiresAt: new Date(deadlineDate),
    });

    console.log(`[DeadlineAlert] Created DEADLINE_ALERT ${notificationId} for ${contingencyType} on ${dealAddress} (${timeLabel})`);

    return NextResponse.json({ success: true, notificationId });
  } catch (error: any) {
    console.error('[DeadlineAlert] Error:', error);
    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json({ success: false, error: 'Session expired.' }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
