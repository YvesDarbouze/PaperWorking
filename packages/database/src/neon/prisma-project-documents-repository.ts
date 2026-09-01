import type { ApiPrismaClient } from '../client.js';

/** Prisma-backed project document metadata repository. */
export function createPrismaProjectDocumentsRepository(prisma: ApiPrismaClient) {
  return {
    async listByProject(projectId: string) {
      return prisma.projectDocument.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
      });
    },

    async findById(projectId: string, documentId: string) {
      return prisma.projectDocument.findFirst({
        where: { id: documentId, projectId },
      });
    },

    async create(data: {
      id: string;
      projectId: string;
      name: string;
      mimeType: string;
      storageKey: string;
      sizeBytes: number;
      uploadedBy: string;
      metadata?: Record<string, unknown>;
    }) {
      return prisma.projectDocument.create({
        data: {
          id: data.id,
          projectId: data.projectId,
          name: data.name,
          mimeType: data.mimeType,
          storageKey: data.storageKey,
          sizeBytes: data.sizeBytes,
          uploadedBy: data.uploadedBy,
          metadata: data.metadata ?? {},
        },
      });
    },

    async deleteById(projectId: string, documentId: string) {
      const existing = await prisma.projectDocument.findFirst({
        where: { id: documentId, projectId },
      });
      if (!existing) return null;
      await prisma.projectDocument.delete({ where: { id: documentId } });
      return existing;
    },
  };
}
