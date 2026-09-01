export type ProjectDocumentRow = {
  id: string;
  projectId: string;
  name: string;
  mimeType: string | null;
  storageKey: string | null;
  sizeBytes: number | null;
  uploadedBy: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export type ProjectDocumentsRepository = {
  listByProject(projectId: string): Promise<ProjectDocumentRow[]>;
  findById(projectId: string, documentId: string): Promise<ProjectDocumentRow | null>;
  create(data: {
    id: string;
    projectId: string;
    name: string;
    mimeType: string;
    storageKey: string;
    sizeBytes: number;
    uploadedBy: string;
    metadata?: Record<string, unknown>;
  }): Promise<ProjectDocumentRow>;
  deleteById(projectId: string, documentId: string): Promise<ProjectDocumentRow | null>;
};
