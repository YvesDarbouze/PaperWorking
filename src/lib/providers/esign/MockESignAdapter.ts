/**
 * Mock E-Sign Adapter
 *
 * Used when ESIGN_PROVIDER=mock (the default when no DocuSign credentials
 * are configured). Satisfies the IESignProvider interface so the entire
 * call path is exercised without a live DocuSign account.
 *
 * Behaviour:
 *  - createEnvelope  → stores the envelope doc in Firestore with status 'sent'
 *                      (no external HTTP call; no timer; no fake success)
 *  - getEnvelopeStatus → reads status from Firestore
 *  - voidEnvelope      → writes 'voided' to Firestore
 *
 * Because status is Firestore-backed you can promote a mock envelope to
 * 'completed' by writing directly in the Firebase console — useful for e2e tests.
 */

import type {
  IESignProvider,
  CreateEnvelopeParams,
  CreateEnvelopeResult,
  GetEnvelopeStatusResult,
} from './types';

export class MockESignAdapter implements IESignProvider {
  readonly providerName = 'mock' as const;

  async createEnvelope(params: CreateEnvelopeParams): Promise<CreateEnvelopeResult> {
    const { adminDb } = await import('@/lib/firebase/admin');
    const envelopeId = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = new Date().toISOString();

    await adminDb
      .collection('projects')
      .doc(params.projectId)
      .collection('esign_envelopes')
      .doc(envelopeId)
      .set({
        envelopeId,
        provider: 'mock',
        documentId:   params.documentId,
        documentName: params.documentName,
        signerRole:   params.signerRole,
        signerEmail:  params.signerEmail,
        signerName:   params.signerName,
        status:       'sent',
        createdAt,
        updatedAt:    createdAt,
      });

    return { envelopeId, status: 'sent', createdAt };
  }

  async getEnvelopeStatus(envelopeId: string): Promise<GetEnvelopeStatusResult> {
    // The envelopeId encodes no project info for mock — scan is acceptable
    // because this adapter is dev/test only and volume is tiny.
    const { adminDb } = await import('@/lib/firebase/admin');
    const snap = await adminDb
      .collectionGroup('esign_envelopes')
      .where('envelopeId', '==', envelopeId)
      .limit(1)
      .get();

    if (snap.empty) {
      return { envelopeId, status: 'error' };
    }

    const d = snap.docs[0].data();
    return {
      envelopeId,
      status:      d.status ?? 'sent',
      completedAt: d.completedAt ?? undefined,
      signerName:  d.signerName ?? undefined,
    };
  }

  async voidEnvelope(envelopeId: string): Promise<void> {
    const { adminDb } = await import('@/lib/firebase/admin');
    const snap = await adminDb
      .collectionGroup('esign_envelopes')
      .where('envelopeId', '==', envelopeId)
      .limit(1)
      .get();

    if (!snap.empty) {
      await snap.docs[0].ref.update({ status: 'voided', updatedAt: new Date().toISOString() });
    }
  }
}
