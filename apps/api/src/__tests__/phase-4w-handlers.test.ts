import { describe, expect, it } from '@jest/globals';
import { handleEventsStreamGet } from '../routes/events/stream/handler.js';
import {
  handleAdminAgentCrewByIdDelete,
  handleAdminAgentCrewByIdGet,
} from '../routes/admin/agent-crew/by-id/handler.js';
import { handleAdminAgentCrewPurgeAllDelete } from '../routes/admin/agent-crew/purge-all/handler.js';
import { handleAdminAgentCrewImpersonatePost } from '../routes/admin/agent-crew/impersonate/handler.js';
import {
  handleProjectsDocumentsGet,
  handleProjectsDocumentsPost,
} from '../routes/projects/documents/handler.js';
import { handleProjectsDocumentDownloadGet } from '../routes/projects/documents/download/handler.js';
import { handleProjectsInquiryPatch } from '../routes/projects/inquiries/handler.js';
import {
  handleFinancialTransactionsGet,
  handleFinancialTransactionsPost,
} from '../routes/financial/transactions/handler.js';
import { handleProjectsCapitalStackExportGet } from '../routes/projects/capital-stack/export/handler.js';

const auth = { uid: 'user-1', email: 'user@test.com' };
const admin = { uid: 'admin-1', email: 'admin@test.com', isAdmin: true };

describe('Phase 4w handlers', () => {
  it('events stream SSE handler', async () => {
    const subscribed: string[] = [];
    const result = await handleEventsStreamGet(
      { projectId: 'p1' },
      {
        requireAuth: async () => auth,
        subscribe: (channel) => subscribed.push(channel),
        unsubscribe: () => undefined,
      },
    );
    expect(result.status).toBe(200);
    expect(result.headers?.['content-type']).toBe('text/event-stream');
    expect(subscribed.length).toBeGreaterThan(0);
  });

  it('admin agent-crew by-id, purge-all, impersonate', async () => {
    const get = await handleAdminAgentCrewByIdGet('agent-1', {
      requireAdmin: async () => admin,
      loadAgent: async () => ({ id: 'agent-1', email: 'a@test.com' }),
    });
    expect(get.status).toBe(200);

    const del = await handleAdminAgentCrewByIdDelete('agent-1', {
      requireAdmin: async () => admin,
      deleteAgent: async () => ({ message: 'deleted' }),
    });
    expect(del.status).toBe(200);

    const purge = await handleAdminAgentCrewPurgeAllDelete({
      requireAdmin: async () => admin,
      purgeAll: async () => ({
        usersDeleted: 1,
        projectsDeleted: 2,
        listingsDeleted: 3,
        messagesDeleted: 4,
        subscriptionsCanceled: 5,
      }),
    });
    expect(purge.status).toBe(200);

    const impersonate = await handleAdminAgentCrewImpersonatePost('agent-1', {
      requireAdmin: async () => admin,
      loadAgent: async () => ({
        id: 'agent-1',
        email: 'agent@test.com',
        name: 'Agent',
        persona: 'investor',
      }),
    });
    expect(impersonate.status).toBe(200);
    expect(impersonate.cookies?.length).toBeGreaterThan(0);
  });

  it('projects documents get/post and download', async () => {
    const list = await handleProjectsDocumentsGet('p1', {
      requireAuth: async () => auth,
      verifyAccess: async () => ({ authorized: true, role: 'Lead Investor', project: {} }),
      listDocuments: async () => [{ id: 'doc-1' }],
    });
    expect(list.status).toBe(200);

    const upload = await handleProjectsDocumentsPost(
      'p1',
      {
        file: {
          name: 'report.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1024,
          buffer: new Uint8Array([1, 2, 3]),
        },
        documentType: 'other',
      },
      {
        requireAuth: async () => auth,
        verifyAccess: async () => ({ authorized: true, role: 'Lead Investor', project: {} }),
        uploadDocument: async () => ({
          docId: 'doc-1',
          downloadUrl: '/api/projects/p1/documents/doc-1/download',
          storagePath: 'projects/p1/documents/doc-1/report.pdf',
          phase: 'phase-2',
        }),
      },
    );
    expect(upload.status).toBe(201);

    const download = await handleProjectsDocumentDownloadGet('p1', 'doc-1', { name: 'report.pdf' }, {
      requireAuth: async () => auth,
      resolveDownload: async () => ({
        authorized: true,
        fileType: 'application/pdf',
        fileName: 'report.pdf',
        content: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      }),
    });
    expect(download.status).toBe(200);
  });

  it('projects inquiry patch and capital stack export', async () => {
    const patch = await handleProjectsInquiryPatch(
      'p1',
      'inq-1',
      { isShared: true },
      {
        requireAuth: async () => auth,
        verifyAccess: async () => ({
          authorized: true,
          project: { activeListingId: 'l1', version: 2, visibilityMode: 'PRIVATE' },
        }),
        loadInquiry: async () => ({ isShared: false, message: 'Question?' }),
        updateInquiry: async () => undefined,
      },
    );
    expect(patch.status).toBe(200);

    const exportPdf = await handleProjectsCapitalStackExportGet('p1', {
      requireAuth: async () => auth,
      verifyAccess: async () => ({ authorized: true, address: '123 Main St' }),
      loadExportData: async () => ({
        projectData: { address: '123 Main St', financials: {} },
        commitments: [],
      }),
      generatePdf: async () => new Uint8Array([0x25, 0x50, 0x44, 0x46]),
    });
    expect(exportPdf.status).toBe(200);
  });

  it('financial transactions get/post', async () => {
    const list = await handleFinancialTransactionsGet(
      { page: '1', pageSize: '25' },
      {
        requireAuth: async () => auth,
        listTransactions: async () => ({
          rows: [{ id: 'tx-1', amount: '100.00' }],
          total: 1,
        }),
      },
    );
    expect(list.status).toBe(200);

    const create = await handleFinancialTransactionsPost(
      {
        projectId: 'p1',
        amount: 250,
        direction: 'CREDIT',
        transactionDate: '2026-01-15',
      },
      {
        requireAuth: async () => auth,
        verifyProject: async () => true,
        createTransaction: async () => ({ id: 'tx-2', amount: '250.00', projectId: 'p1' }),
      },
    );
    expect(create.status).toBe(200);
  });
});
