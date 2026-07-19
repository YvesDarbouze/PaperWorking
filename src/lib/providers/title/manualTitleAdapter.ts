import { adminDb } from '@/lib/firebase/admin';
import type { TitleProvider } from './titleProvider';
import type { TitleWorkflowState, TitleCommitmentData, TitleDefect } from '@/types/schema';
import { FieldValue } from 'firebase-admin/firestore';

export class ManualTitleAdapter implements TitleProvider {
  async getWorkflowState(projectId: string): Promise<TitleWorkflowState> {
    const doc = await adminDb.collection('projects').doc(projectId).get();
    if (!doc.exists) {
      throw new Error('Project not found');
    }
    const data = doc.data();
    return data?.closingRoom?.titleWorkflow || { status: 'order_opened' };
  }

  async openOrder(projectId: string, actorUid: string, actorName: string): Promise<TitleWorkflowState> {
    const state: TitleWorkflowState = {
      status: 'order_opened',
      orderOpenedAt: new Date().toISOString(),
      orderOpenedByUid: actorUid,
      orderOpenedByName: actorName,
      defects: [],
    };

    await adminDb.collection('projects').doc(projectId).update({
      'closingRoom.titleWorkflow': state,
      'closingRoom.chainOfTitleStatus': 'pending',
      updatedAt: FieldValue.serverTimestamp(),
    });

    return state;
  }

  async receiveCommitment(
    projectId: string,
    data: TitleCommitmentData,
    actorUid: string,
    actorName: string
  ): Promise<TitleWorkflowState> {
    const currentState = await this.getWorkflowState(projectId);

    const state: TitleWorkflowState = {
      ...currentState,
      status: 'commitment_received',
      commitment: data,
    };

    await adminDb.collection('projects').doc(projectId).update({
      'closingRoom.titleWorkflow': state,
      'closingRoom.chainOfTitleStatus': 'pending',
      updatedAt: FieldValue.serverTimestamp(),
    });

    return state;
  }

  async addDefect(
    projectId: string,
    description: string,
    actorUid: string,
    actorName: string
  ): Promise<TitleWorkflowState> {
    const currentState = await this.getWorkflowState(projectId);
    const defects = [...(currentState.defects || [])];

    const newDefect: TitleDefect = {
      id: crypto.randomUUID(),
      description,
      status: 'pending',
    };
    defects.push(newDefect);

    const state: TitleWorkflowState = {
      ...currentState,
      status: 'defects_identified',
      defects,
    };

    await adminDb.collection('projects').doc(projectId).update({
      'closingRoom.titleWorkflow': state,
      'closingRoom.chainOfTitleStatus': 'failed', // Failed while defects are open
      updatedAt: FieldValue.serverTimestamp(),
    });

    return state;
  }

  async resolveDefect(
    projectId: string,
    defectId: string,
    notes: string,
    documentUrl: string | null,
    documentName: string | null,
    actorUid: string,
    actorName: string
  ): Promise<TitleWorkflowState> {
    const currentState = await this.getWorkflowState(projectId);
    const defects = (currentState.defects || []).map((d) => {
      if (d.id !== defectId) return d;
      return {
        ...d,
        status: 'resolved' as const,
        notes,
        documentUrl,
        documentName,
        resolvedAt: new Date().toISOString(),
        resolvedByUid: actorUid,
        resolvedByName: actorName,
      };
    });

    // Check if all defects resolved
    const allCured = defects.every((d) => d.status === 'resolved');
    const newStatus = allCured ? 'cleared' as const : 'defects_identified' as const;
    const chainStatus = allCured ? 'verified' as const : 'failed' as const;

    const state: TitleWorkflowState = {
      ...currentState,
      status: newStatus,
      defects,
      ...(allCured && {
        clearedAt: new Date().toISOString(),
        clearedByUid: actorUid,
        clearedByName: actorName,
      }),
    };

    await adminDb.collection('projects').doc(projectId).update({
      'closingRoom.titleWorkflow': state,
      'closingRoom.chainOfTitleStatus': chainStatus,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return state;
  }

  async clearTitle(projectId: string, actorUid: string, actorName: string): Promise<TitleWorkflowState> {
    const currentState = await this.getWorkflowState(projectId);

    // Verify all defects are cured
    const hasPendingDefects = (currentState.defects || []).some((d) => d.status === 'pending');
    if (hasPendingDefects) {
      throw new Error('Cannot clear title with unresolved defects');
    }

    const state: TitleWorkflowState = {
      ...currentState,
      status: 'cleared',
      clearedAt: new Date().toISOString(),
      clearedByUid: actorUid,
      clearedByName: actorName,
    };

    await adminDb.collection('projects').doc(projectId).update({
      'closingRoom.titleWorkflow': state,
      'closingRoom.chainOfTitleStatus': 'verified',
      updatedAt: FieldValue.serverTimestamp(),
    });

    return state;
  }
}
