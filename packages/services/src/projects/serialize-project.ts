import type { StoredProject } from '@paperworking/authz';
import { phaseNumberToName } from './phase-utils.js';

export type SerializedProject = Omit<StoredProject, 'currentPhase'> & {
  propertyName: string;
  currentPhase: string;
  currentPhaseNumber: number;
};

/** Matches Nest ProjectsService.serializeProject response shape. */
export function serializeProject(project: StoredProject): SerializedProject {
  const phaseNumber = project.currentPhase ?? 1;
  return {
    ...project,
    propertyName: project.name || project.title || '',
    currentPhase: phaseNumberToName(phaseNumber),
    currentPhaseNumber: phaseNumber,
  };
}
