import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { getESignProvider } from '@/lib/providers/esign';
import { adminDb } from '@/lib/firebase/admin';
import { logger } from '@/lib/logger';

/**
 * GET /api/esign/status/[envelopeId]
 *
 * Returns the current status of an e-signature envelope.
 * Syncs the status back to Firestore if the provider reports a terminal state.
 *
 * Auth: Requires valid Firebase ID token.
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ envelopeId: string }> },
) {
  // ── 1. Authenticate ──────────────────────────────────────────────────────
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { envelopeId } = await params;
  if (!envelopeId) {
    return NextResponse.json({ success: false, error: 'envelopeId is required' }, { status: 400 });
  }

  try {
    // ── 2. Query provider for live status ────────────────────────────────
    const provider = getESignProvider();
    const result = await provider.getEnvelopeStatus(envelopeId);

    // ── 3. Reconcile Firestore if terminal ───────────────────────────────
    if (result.status === 'completed' || result.status === 'declined' || result.status === 'voided') {
      // Find the envelope doc across projects (collectionGroup)
      const snap = await adminDb
        .collectionGroup('esign_envelopes')
        .where('envelopeId', '==', envelopeId)
        .limit(1)
        .get();

      if (!snap.empty) {
        const envDoc = snap.docs[0];
        const envData = envDoc.data();
        const updates: Record<string, unknown> = {
          status:    result.status,
          updatedAt: new Date().toISOString(),
        };
        if (result.completedAt) updates.completedAt = result.completedAt;
        if (result.signerName)  updates.signerName  = result.signerName;

        await envDoc.ref.update(updates);

        // Update the parent DealDocument's eSignStatus
        if (envData.documentId && envData.projectId) {
          const docRef = adminDb
            .collection('projects')
            .doc(envData.projectId)
            .collection('documents')
            .doc(envData.documentId);

          let eSignStatus: string;
          if (result.status === 'completed') eSignStatus = 'Signed';
          else if (result.status === 'declined') eSignStatus = 'Declined';
          else eSignStatus = 'Not Required';

          const docUpdates: Record<string, unknown> = { eSignStatus };
          if (result.status === 'completed') {
            docUpdates.eSignedAt      = result.completedAt ? new Date(result.completedAt) : new Date();
            docUpdates.eSignedByName  = result.signerName ?? null;
          }
          await docRef.update(docUpdates);
        }
      }
    }

    logger.info('[esign/status] Status polled', { envelopeId, status: result.status });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    logger.error('[esign/status] Error', error instanceof Error ? error : undefined);
    return NextResponse.json({ success: false, error: 'Failed to retrieve envelope status' }, { status: 500 });
  }
}
