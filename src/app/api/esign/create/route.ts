import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { getESignProvider } from '@/lib/providers/esign';
import { logger } from '@/lib/logger';

/**
 * POST /api/esign/create
 *
 * Creates an e-signature envelope for a project document.
 *
 * Security contract:
 *   • Requires Firebase ID token (Bearer scheme). No token → 401.
 *   • Caller must be a member of the project. Not a member → 403.
 *   • Provider (DocuSign or Mock) is selected via ESIGN_PROVIDER env var.
 *   • On success, writes the envelopeId + status to Firestore so the UI
 *     can poll /api/esign/status/[envelopeId] or wait for the webhook.
 *
 * Body:
 *   projectId    string  (required)
 *   documentId   string  (required)  — Firestore document ID in project's documents subcollection
 *   documentName string  (required)  — Human-readable label
 *   signerRole   string  (required)  — e.g. "General Contractor"
 *   signerEmail  string  (required)
 *   signerName   string  (required)
 *   documentUrl  string  (required)  — Firebase Storage download URL
 */

export async function POST(req: NextRequest) {
  // ── 1. Authenticate ──────────────────────────────────────────────────────
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;
  const callerUid = auth.uid;

  // ── 2. Parse body ────────────────────────────────────────────────────────
  let body: {
    projectId: string;
    documentId: string;
    documentName: string;
    signerRole: string;
    signerEmail: string;
    signerName: string;
    documentUrl: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { projectId, documentId, documentName, signerRole, signerEmail, signerName, documentUrl } = body;
  if (!projectId || !documentId || !documentName || !signerRole || !signerEmail || !signerName || !documentUrl) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields: projectId, documentId, documentName, signerRole, signerEmail, signerName, documentUrl' },
      { status: 400 },
    );
  }

  // ── 3. Verify project membership ─────────────────────────────────────────
  try {
    const projectSnap = await adminDb.collection('projects').doc(projectId).get();
    if (!projectSnap.exists) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    const project = projectSnap.data()!;
    const members = project.members ?? {};
    let authorized = !!members[callerUid];

    if (!authorized) {
      const callerSnap = await adminDb.collection('users').doc(callerUid).get();
      const callerOrgId = callerSnap.data()?.organizationId;
      if (callerOrgId && callerOrgId === project.organizationId) authorized = true;
    }

    if (!authorized) {
      logger.warn('[esign/create] Unauthorized attempt', { callerUid, projectId });
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // ── 4. Create envelope via provider ────────────────────────────────────
    const provider = getESignProvider();
    const result = await provider.createEnvelope({
      projectId, documentId, documentName, signerRole, signerEmail, signerName, documentUrl,
    });

    // ── 5. Persist envelope record to Firestore ───────────────────────────
    const envelopeRef = adminDb
      .collection('projects')
      .doc(projectId)
      .collection('esign_envelopes')
      .doc(result.envelopeId);

    // Only write if the mock adapter hasn't already created the doc
    const existing = await envelopeRef.get();
    if (!existing.exists) {
      await envelopeRef.set({
        envelopeId:   result.envelopeId,
        provider:     provider.providerName,
        documentId,
        documentName,
        signerRole,
        signerEmail,
        signerName,
        status:       result.status,
        createdAt:    result.createdAt,
        updatedAt:    result.createdAt,
        requestedByUid: callerUid,
      });
    }

    // ── 6. Update the DealDocument's eSignStatus to 'Awaiting Signature' ──
    await adminDb
      .collection('projects')
      .doc(projectId)
      .collection('documents')
      .doc(documentId)
      .update({
        eSignStatus:       'Awaiting Signature',
        eSignRequestedAt:  new Date(),
        eSignEnvelopeId:   result.envelopeId,
        eSignProvider:     provider.providerName,
      });

    logger.info('[esign/create] Envelope created', {
      projectId, documentId, envelopeId: result.envelopeId, provider: provider.providerName,
    });

    return NextResponse.json({
      success:    true,
      envelopeId: result.envelopeId,
      status:     result.status,
      signingUrl: result.signingUrl ?? null,
      provider:   provider.providerName,
    });
  } catch (error) {
    logger.error('[esign/create] Unexpected error', error instanceof Error ? error : undefined);
    return NextResponse.json({ success: false, error: 'Failed to create envelope' }, { status: 500 });
  }
}
