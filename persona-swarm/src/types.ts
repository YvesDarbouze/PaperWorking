export interface PersonaProjectBlueprint {
  title?: string;
  name?: string;
  address: string;
  currentPhase?: string;
  purchasePrice?: number;
  renovationBudget?: number;
  rehabCost?: number;
  arv?: number;
  assetType?: string;
}

export interface InteractionEdge {
  id: string;
  tier: string;
  from: string;
  to: string;
  type?: string;
  details?: string;
  message?: string;
}

export interface InteractionGraph {
  edges: InteractionEdge[];
  inviteMatrix: Record<string, string[]>;
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Unknown error';
}

export function firebaseError(err: unknown): { code?: string; message: string } {
  if (typeof err === 'object' && err !== null) {
    const e = err as { code?: string; message?: string };
    return { code: e.code, message: e.message ?? 'Unknown error' };
  }
  return { message: 'Unknown error' };
}
