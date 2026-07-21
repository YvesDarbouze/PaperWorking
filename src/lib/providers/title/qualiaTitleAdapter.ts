import { ManualTitleAdapter } from './manualTitleAdapter';
import type { TitleProvider } from './titleProvider';
import type { TitleWorkflowState, TitleCommitmentData } from '@/types/schema';

export class QualiaTitleAdapter extends ManualTitleAdapter implements TitleProvider {
  override async openOrder(projectId: string, actorUid: string, actorName: string): Promise<TitleWorkflowState> {
    // Open order manually first
    const baseState = await super.openOrder(projectId, actorUid, actorName);

    // Simulate Qualia's webhook/response populating a commitment automatically
    const qualiaState: TitleWorkflowState = {
      ...baseState,
      status: 'commitment_received',
      commitment: {
        policyAmount: 250000,
        effectiveDate: new Date().toISOString().split('T')[0],
        exceptionsCount: 2,
        commitmentDocumentUrl: 'https://api.qualia.com/v1/mock-commitment.pdf',
        commitmentDocumentName: 'qualia_commitment_29013.pdf',
      },
      defects: [
        {
          id: 'qualia-defect-1',
          description: 'Prior unresolved mortgage of record (Stewart Title exception 4)',
          status: 'pending',
        },
        {
          id: 'qualia-defect-2',
          description: 'Municipal utility easement boundary discrepancy',
          status: 'pending',
        },
      ],
    };

    const { adminDb } = await import('@/lib/firebase/admin');
    const { FieldValue } = await import('firebase-admin/firestore');

    await adminDb.collection('projects').doc(projectId).update({
      'closingRoom.titleWorkflow': qualiaState,
      'closingRoom.chainOfTitleStatus': 'failed', // Failed because we have pending defects
      updatedAt: FieldValue.serverTimestamp(),
    });

    return qualiaState;
  }
}
