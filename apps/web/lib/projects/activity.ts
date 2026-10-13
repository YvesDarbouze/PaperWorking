import { getProjectFromStore, updateProjectInStore } from './project-store';
import type { ProjectActivityEntry } from './types';

export const PROJECT_ACTIVITY_LIMIT = 500;

export interface ProjectActivityInput {
  actorUid: string;
  actorName: string;
  kind: string;
  summary: string;
  targetId?: string;
  vendorVisible: boolean;
}

/** Appends an attributed, time-stamped entry (newest first, capped at 500). */
export async function recordProjectActivity(
  projectId: string,
  input: ProjectActivityInput,
): Promise<ProjectActivityEntry | null> {
  const project = await getProjectFromStore(projectId);
  if (!project) return null;

  const entry: ProjectActivityEntry = {
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    at: new Date().toISOString(),
    actorUid: input.actorUid,
    actorName: input.actorName,
    kind: input.kind,
    summary: input.summary.slice(0, 500),
    ...(input.targetId ? { targetId: input.targetId } : {}),
    vendorVisible: input.vendorVisible,
  };

  const activity = [entry, ...(project.activity ?? [])].slice(0, PROJECT_ACTIVITY_LIMIT);
  await updateProjectInStore(projectId, { activity });
  return entry;
}
