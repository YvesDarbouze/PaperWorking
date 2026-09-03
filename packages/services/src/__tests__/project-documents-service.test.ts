import { describe, expect, it, jest } from '@jest/globals';
import {
  AuthorizationService,
  AuthzForbiddenError,
  type AuthUser,
  type AuthzStore,
} from '@paperworking/authz';
import type { FileStoragePort } from '../storage/file-storage-port.js';
import { createProjectDocumentsCommandService } from '../projects/project-documents-command-service.js';
import type { ProjectDocumentsRepository } from '../projects/project-documents-repository.js';

const owner: AuthUser = {
  uid: 'owner-1',
  email: 'owner@example.com',
  accountType: 'investor',
  isAdmin: false,
};

function makeStore(overrides: Partial<AuthzStore> = {}): AuthzStore {
  return {
    findOrganizationsOwnedBy: async () => [],
    findActiveOrgMemberships: async () => [],
    findProjectById: async () => ({
      id: 'proj-1',
      userId: 'owner-1',
      organizationId: 'org-1',
      visibility: 'private',
      status: 'active',
    }),
    findActiveProjectMember: async () => null,
    findDealById: async () => null,
    findActiveProjectMemberByUserId: async () => null,
    findActiveOrgMember: async () => null,
    findOrganizationOwnedBy: async () => null,
    findActiveOrgMemberInOrgs: async () => null,
    findOrganizationOwnedByUserInOrgs: async () => null,
    findMessageInThreadForUser: async () => null,
    findAnyMessageInThread: async () => null,
    ...overrides,
  };
}

function makeStorage(overrides: Partial<FileStoragePort> = {}): FileStoragePort {
  const objects = new Map<string, Buffer>();
  return {
    putObject: jest.fn(async ({ key, data }) => {
      objects.set(key, data);
    }),
    deleteObject: jest.fn(async ({ key }) => {
      objects.delete(key);
    }),
    getSignedDownloadUrl: jest.fn(async ({ key }) => `https://signed.example/${key}`),
    objectExists: jest.fn(async ({ key }) => objects.has(key)),
    ...overrides,
  };
}

function makeRepository(
  overrides: Partial<ProjectDocumentsRepository> = {},
): ProjectDocumentsRepository {
  const rows: Array<{
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
  }> = [];

  return {
    listByProject: jest.fn(async (projectId) =>
      rows.filter((row) => row.projectId === projectId),
    ),
    findById: jest.fn(async (projectId, documentId) =>
      rows.find((row) => row.projectId === projectId && row.id === documentId) ?? null,
    ),
    create: jest.fn(async (data) => {
      const row = {
        ...data,
        metadata: data.metadata ?? {},
        mimeType: data.mimeType,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      rows.push(row);
      return row;
    }),
    deleteById: jest.fn(async () => null),
    ...overrides,
  };
}

describe('ProjectDocumentsCommandService', () => {
  it('uploads bytes then persists metadata with server-generated storage path', async () => {
    const storage = makeStorage();
    const repository = makeRepository();
    const service = createProjectDocumentsCommandService({
      authz: new AuthorizationService(makeStore()),
      repository,
      storage,
    });

    const pdf = Buffer.from('%PDF-1.4 test');
    const result = await service.uploadDocument(owner, 'proj-1', {
      fileName: 'report.pdf',
      mimeType: 'application/pdf',
      sizeBytes: pdf.length,
      data: pdf,
    });

    expect(result.success).toBe(true);
    expect(result.document.projectId).toBe('proj-1');
    expect(result.document.uploadedBy).toBe('owner-1');
    expect(result.document).not.toHaveProperty('storageKey');
    expect(storage.putObject).toHaveBeenCalledWith(
      expect.objectContaining({
        key: expect.stringMatching(/^projects\/proj-1\/documents\/[0-9a-f-]+\/report\.pdf$/),
        contentType: 'application/pdf',
      }),
    );
    expect(repository.create).toHaveBeenCalled();
  });

  it('cleans up storage object when metadata write fails', async () => {
    const storage = makeStorage();
    const repository = makeRepository({
      create: async () => {
        throw new Error('db failed');
      },
    });
    const service = createProjectDocumentsCommandService({
      authz: new AuthorizationService(makeStore()),
      repository,
      storage,
    });

    await expect(
      service.uploadDocument(owner, 'proj-1', {
        fileName: 'report.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 10,
        data: Buffer.from('%PDF'),
      }),
    ).rejects.toThrow('db failed');

    expect(storage.deleteObject).toHaveBeenCalled();
  });

  it('rejects oversize uploads', async () => {
    const service = createProjectDocumentsCommandService({
      authz: new AuthorizationService(makeStore()),
      repository: makeRepository(),
      storage: makeStorage(),
    });

    await expect(
      service.uploadDocument(owner, 'proj-1', {
        fileName: 'report.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 26 * 1024 * 1024,
        data: Buffer.alloc(1),
      }),
    ).rejects.toThrow(/maximum size/i);
  });

  it('denies foreign project upload', async () => {
    const service = createProjectDocumentsCommandService({
      authz: new AuthorizationService(
        makeStore({
          findProjectById: async () => ({
            id: 'proj-1',
            userId: 'other-user',
            organizationId: 'org-1',
            visibility: 'private',
            status: 'active',
          }),
        }),
      ),
      repository: makeRepository(),
      storage: makeStorage(),
    });

    await expect(
      service.uploadDocument(owner, 'proj-1', {
        fileName: 'report.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 10,
        data: Buffer.from('%PDF'),
      }),
    ).rejects.toBeInstanceOf(AuthzForbiddenError);
  });
});

describe('ProjectDocumentsReadService', () => {
  it('lists authorized project documents', async () => {
    const { createProjectDocumentsReadService } = await import(
      '../projects/project-documents-read-service.js'
    );
    const repository = makeRepository();
    await repository.create({
      id: 'doc-1',
      projectId: 'proj-1',
      name: 'report.pdf',
      mimeType: 'application/pdf',
      storageKey: 'projects/proj-1/documents/doc-1/report.pdf',
      sizeBytes: 100,
      uploadedBy: 'owner-1',
    });

    const service = createProjectDocumentsReadService({
      authz: new AuthorizationService(makeStore()),
      repository,
      storage: makeStorage(),
    });

    const result = await service.listDocuments(owner, 'proj-1');
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0]?.name).toBe('report.pdf');
  });

  it('returns signed download URL without exposing raw storage path in DTO', async () => {
    const { createProjectDocumentsReadService } = await import(
      '../projects/project-documents-read-service.js'
    );
    const repository = makeRepository();
    await repository.create({
      id: 'doc-1',
      projectId: 'proj-1',
      name: 'report.pdf',
      mimeType: 'application/pdf',
      storageKey: 'projects/proj-1/documents/doc-1/report.pdf',
      sizeBytes: 100,
      uploadedBy: 'owner-1',
    });

    const storage = makeStorage();
    const service = createProjectDocumentsReadService({
      authz: new AuthorizationService(makeStore()),
      repository,
      storage,
    });

    const result = await service.getDocumentAccess(owner, 'proj-1', 'doc-1');
    expect(result.downloadUrl).toContain('https://signed.example/');
    expect(JSON.stringify(result.document)).not.toContain('storageKey');
  });

  it('rejects foreign project document access', async () => {
    const { createProjectDocumentsReadService } = await import(
      '../projects/project-documents-read-service.js'
    );
    const service = createProjectDocumentsReadService({
      authz: new AuthorizationService(
        makeStore({
          findProjectById: async () => ({
            id: 'proj-1',
            userId: 'other-user',
            organizationId: 'org-1',
            visibility: 'private',
            status: 'active',
          }),
        }),
      ),
      repository: makeRepository(),
      storage: makeStorage(),
    });

    await expect(service.getDocumentAccess(owner, 'proj-1', 'doc-1')).rejects.toBeInstanceOf(
      AuthzForbiddenError,
    );
  });
});
