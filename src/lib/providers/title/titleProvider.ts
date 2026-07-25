import type { TitleWorkflowState, TitleCommitmentData } from '@/types/schema';

export interface TitleProvider {
  openOrder(projectId: string, actorUid: string, actorName: string): Promise<TitleWorkflowState>;
  receiveCommitment(
    projectId: string,
    data: TitleCommitmentData,
    actorUid: string,
    actorName: string
  ): Promise<TitleWorkflowState>;
  addDefect(
    projectId: string,
    description: string,
    actorUid: string,
    actorName: string
  ): Promise<TitleWorkflowState>;
  resolveDefect(
    projectId: string,
    defectId: string,
    notes: string,
    documentUrl: string | null,
    documentName: string | null,
    actorUid: string,
    actorName: string
  ): Promise<TitleWorkflowState>;
  clearTitle(projectId: string, actorUid: string, actorName: string): Promise<TitleWorkflowState>;
  getWorkflowState(projectId: string): Promise<TitleWorkflowState>;
}
