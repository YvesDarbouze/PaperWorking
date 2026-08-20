export interface ReilProjectAccessRecord {
  createdById: string;
  collaborators?: Array<{ userId: string }>;
}

export function canReadReilProject(project: ReilProjectAccessRecord, uid: string): boolean {
  if (project.createdById === uid) return true;
  return (project.collaborators || []).some((collaborator) => collaborator.userId === uid);
}

export function canWriteReilProject(project: ReilProjectAccessRecord, uid: string): boolean {
  return project.createdById === uid;
}
