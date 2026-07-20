import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { logger } from '@/lib/logger';
import { createHmac, timingSafeEqual } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { syncFractionalInvestorFromCommitment } from '@/lib/firebase/syncFractionalInvestors';
import { CommitmentStatus } from '@/types/schema';

/**
 * POST /api/webhooks/docusign
 *
 * DocuSign Connect webhook — receives real-time envelope status updates.
 *
 * Security: HMAC-SHA256 signature verified against DOCUSIGN_WEBHOOK_HMAC_KEY.
 * DocuSign sets the signature in the X-DocuSign-Signature-1 header.
 *
 * Registration:
 *   DocuSign Admin → Integrations → Connect → Add Configuration
 *   URL: {NEXT_PUBLIC_APP_URL}/api/webhooks/docusign
 *   Events: envelope-completed, envelope-declined, envelope-voided
 *
 * This route is the async reconciliation path. The polling route
 * /api/esign/status/[envelopeId] handles synchronous status checks.
 */

function verifySignature(body: string, signature: string | null, hmacKey: string): boolean {
  if (!signature) return false;
  const expected = createHmac('sha256', hmacKey).update(body).digest('base64');
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const hmacKey = process.env.DOCUSIGN_WEBHOOK_HMAC_KEY;
  if (!hmacKey) {
    logger.error('[DocuSign Webhook] DOCUSIGN_WEBHOOK_HMAC_KEY not configured — rejecting request');
    return NextResponse.json({ error: 'Webhook endpoint not configured' }, { status: 503 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get('X-DocuSign-Signature-1');

  if (!verifySignature(rawBody, signature, hmacKey)) {
    logger.warn('[webhooks/docusign] Invalid HMAC signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // DocuSign Connect sends the envelope status in different shapes depending on
  // the configuration (JSON vs XML). We handle the JSON format.
  const envelopeId  = (event.envelopeId ?? (event as any).data?.envelopeId) as string | undefined;
  const rawStatus   = (event.status ?? (event as any).data?.envelopeSummary?.status) as string | undefined;
  const completedAt = (event.completedDateTime ?? (event as any).data?.envelopeSummary?.completedDateTime) as string | undefined;

  if (!envelopeId || !rawStatus) {
    logger.warn('[webhooks/docusign] Missing envelopeId or status in payload');
    return NextResponse.json({ received: true }); // Return 200 to prevent DocuSign retries for malformed events
  }

  const status = rawStatus.toLowerCase();
  const isFinal = status === 'completed' || status === 'declined' || status === 'voided';

  if (!isFinal) {
    // Non-terminal events (sent, delivered) — acknowledge and ignore
    return NextResponse.json({ received: true });
  }

  try {
    // Find the envelope across all projects
    const snap = await adminDb
      .collectionGroup('esign_envelopes')
      .where('envelopeId', '==', envelopeId)
      .limit(1)
      .get();

    if (snap.empty) {
      logger.warn('[webhooks/docusign] Envelope not found in Firestore', { envelopeId });
      return NextResponse.json({ received: true });
    }

    const envDoc = snap.docs[0];
    const envData = envDoc.data();
    const now = new Date().toISOString();

    // Update envelope record
    const envelopeUpdate: Record<string, unknown> = {
      status:    status,
      updatedAt: now,
    };
    if (completedAt) envelopeUpdate.completedAt = completedAt;

    await envDoc.ref.update(envelopeUpdate);

    // Update parent DealDocument
    if (envData.projectId && envData.documentId) {
      let eSignStatus: string;
      if (status === 'completed') eSignStatus = 'Signed';
      else if (status === 'declined') eSignStatus = 'Declined';
      else eSignStatus = 'Not Required';

      const docUpdates: Record<string, unknown> = { eSignStatus };
      if (status === 'completed') {
        docUpdates.eSignedAt = completedAt ? new Date(completedAt) : new Date();
      }

      await adminDb
        .collection('projects')
        .doc(envData.projectId as string)
        .collection('documents')
        .doc(envData.documentId as string)
        .update(docUpdates);

      // Card F2.5 Subscriptions — if the document is a subscription agreement, reconcile the commitment status
      const docIdStr = String(envData.documentId);
      if (docIdStr.startsWith('sub_agreement_')) {
        const commitmentId = docIdStr.replace('sub_agreement_', '');
        const commitmentRef = adminDb
          .collection('projects')
          .doc(envData.projectId as string)
          .collection('commitments')
          .doc(commitmentId);

        const commitmentSnap = await commitmentRef.get();
        if (commitmentSnap.exists) {
          const commitmentData = commitmentSnap.data()!;
          const currentStatus = commitmentData.status;
          const nextStatus = status === 'completed' ? 'signed' : (status === 'declined' ? 'soft-committed' : currentStatus);

          if (nextStatus !== currentStatus) {
            const transition = {
              fromStatus: currentStatus || null,
              toStatus: nextStatus,
              timestamp: new Date().toISOString(),
              actor: 'DocuSign Connect Webhook',
              evidence: `Envelope ${envelopeId} reconciled with status ${status}`,
            };

            await commitmentRef.update({
              status: nextStatus,
              updatedAt: new Date(),
              transitions: FieldValue.arrayUnion(transition),
            });

            await syncFractionalInvestorFromCommitment(envData.projectId as string, {
              id: commitmentId,
              name: commitmentData.name,
              email: commitmentData.email ?? null,
              amountCents: commitmentData.amountCents,
              status: nextStatus as CommitmentStatus,
            });
          }
        }
      }
    }

    // Send signature completion notification (failure-isolated)
    try {
      const { NotificationService } = await import('@/lib/services/notificationService');
      const { adminAuth } = await import('@/lib/firebase/admin');
      
      const projectSnap = await adminDb.collection('projects').doc(envData.projectId as string).get();
      if (projectSnap.exists) {
        const projectData = projectSnap.data()!;
        const dealAddress = projectData.propertyName || projectData.address?.street || 'the project';
        const ownerUid = projectData.ownerUid || projectData.createdBy;
        
        const signerUser = await adminAuth.getUserByEmail(envData.signerEmail as string).catch(() => null);
        
        // Notify Lead Investor
        if (ownerUid) {
          await NotificationService.createNotification({
            recipientId: ownerUid,
            type: 'DOCUMENT_SIGNED',
            actor: { uid: signerUser?.uid || 'external', name: envData.signerName as string },
            objectReference: {
              projectId: envData.projectId as string,
              dealAddress,
              documentName: envData.documentName as string,
              task: `${envData.signerName} has signed the document '${envData.documentName}'`
            },
            deepLinkUrl: `/dashboard/projects/${envData.projectId}/data-room`
          });
        }
        
        // Notify Signer if they are a registered user
        if (signerUser?.uid && signerUser.uid !== ownerUid) {
          await NotificationService.createNotification({
            recipientId: signerUser.uid,
            type: 'DOCUMENT_SIGNED',
            actor: { uid: ownerUid || 'system', name: 'PaperWorking' },
            objectReference: {
              projectId: envData.projectId as string,
              dealAddress,
              documentName: envData.documentName as string,
              task: `You have successfully signed the document '${envData.documentName}'`
            },
            deepLinkUrl: `/dashboard/projects/${envData.projectId}/data-room`
          });
        }
      }
    } catch (notifErr: any) {
      logger.error('[webhooks/docusign] Failed to send signature completion notifications:', notifErr.message);
    }

    logger.info('[webhooks/docusign] Envelope reconciled', { envelopeId, status });
    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('[webhooks/docusign] Error reconciling envelope', error instanceof Error ? error : undefined);
    // Return 500 so DocuSign retries
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
