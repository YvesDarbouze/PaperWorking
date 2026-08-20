import { describe, expect, it } from '@jest/globals';
import { handleUploadPost } from '../routes/upload/handler.js';
import { handleEntitlementsProjectCountGet } from '../routes/entitlements/project-count/handler.js';
import { handleTasksAssignPost } from '../routes/tasks/assign/handler.js';
import { handlePlacesValidatePost } from '../routes/places/validate/handler.js';
import { handleProjectVisibilityPatch } from '../routes/projects/visibility/handler.js';
import { handleReconciliationItemAdjustPost } from '../routes/reconciliations/items/adjust/handler.js';
import { handleReconciliationReportGet } from '../routes/reconciliations/report/handler.js';
import { handleRentHistoryImportPost } from '../routes/rent-history/import/handler.js';
import { handleStreetViewGet, handleStreetViewPost } from '../routes/street-view/handler.js';

const adminAuth = { uid: 'user-1' };

describe('Phase 4p route handlers', () => {
  it('POST /api/upload validates and returns storage metadata', async () => {
    const result = await handleUploadPost(
      { fileName: 'offer.pdf', fileSizeBytes: 1024, projectId: 'proj-1' },
      {
        requireAuth: async () => adminAuth,
        generateFileId: () => 'file_test',
        now: () => new Date('2026-01-01T00:00:00.000Z'),
      },
    );
    expect(result.status).toBe(201);
    expect((result.body as { file_id: string }).file_id).toBe('file_test');
  });

  it('GET /api/entitlements/project-count returns count', async () => {
    const result = await handleEntitlementsProjectCountGet({
      requireAuth: async () => adminAuth,
      countActiveProjects: async () => 3,
    });
    expect(result.status).toBe(200);
    expect((result.body as { count: number }).count).toBe(3);
  });

  it('POST /api/tasks/assign blocks investor accounts', async () => {
    const result = await handleTasksAssignPost(
      { taskId: 't1', assigneeUid: 'u2' },
      {
        requireAuth: async () => adminAuth,
        getUserAccountType: async () => 'investor',
      },
    );
    expect(result.status).toBe(403);
  });

  it('POST /api/tasks/assign creates assignment for team accounts', async () => {
    const result = await handleTasksAssignPost(
      { taskId: 't1', assigneeUid: 'u2', projectId: 'p1' },
      {
        requireAuth: async () => adminAuth,
        getUserAccountType: async () => 'investment_team',
        createTaskAssignment: async () => 'assign-1',
      },
    );
    expect(result.status).toBe(200);
    expect((result.body as { assignmentId: string }).assignmentId).toBe('assign-1');
  });

  it('POST /api/places/validate uses fallback on API failure', async () => {
    const result = await handlePlacesValidatePost(
      { address: '123 Main St, Austin, TX 78701' },
      {
        requireAuth: async () => adminAuth,
        mapsApiKey: 'key',
        validateAddress: async () => {
          throw new Error('upstream down');
        },
      },
    );
    expect(result.status).toBe(200);
    expect((result.body as { verdict: { fallback: boolean } }).verdict.fallback).toBe(true);
  });

  it('PATCH /api/projects/[id]/visibility updates flag', async () => {
    const result = await handleProjectVisibilityPatch(
      'proj-1',
      { isPublic: true },
      {
        requireAuth: async () => adminAuth,
        updateVisibility: async () => ({ ok: true as const, isPublicOnMarketplace: true }),
      },
    );
    expect(result.status).toBe(200);
    expect((result.body as { isPublicOnMarketplace: boolean }).isPublicOnMarketplace).toBe(true);
  });

  it('POST reconciliation adjust + GET report handlers', async () => {
    const adjust = await handleReconciliationItemAdjustPost(
      'item-1',
      { amount: 100, category: 'fees' },
      {
        requireAuth: async () => adminAuth,
        adjustItem: async () => ({ id: 'period-1', status: 'OPEN' }),
      },
    );
    expect(adjust.status).toBe(200);

    const reportJson = await handleReconciliationReportGet(
      'period-1',
      { format: 'json' },
      {
        requireAuth: async () => adminAuth,
        generateReport: async () => ({ format: 'json', report: { periodId: 'period-1' } }),
      },
    );
    expect(reportJson.status).toBe(200);

    const reportPdf = await handleReconciliationReportGet(
      'period-1',
      { format: 'pdf' },
      {
        requireAuth: async () => adminAuth,
        generateReport: async () => ({
          format: 'pdf',
          buffer: new Uint8Array([1, 2, 3]),
        }),
      },
    );
    expect(reportPdf.status).toBe(200);
    expect(reportPdf.headers?.['Content-Type']).toBe('application/pdf');
  });

  it('POST /api/rent-history/import returns rent payments', async () => {
    const result = await handleRentHistoryImportPost(
      { projectId: 'proj-1' },
      {
        requireAuth: async () => adminAuth,
        verifyAccess: async () => ({ ok: true, address: '123 Main' }),
        fetchRentalHistory: async () => [
          { price: 2500, listedDate: '2026-01-01', removedDate: '2026-03-01' },
        ],
      },
    );
    expect(result.status).toBe(200);
    expect((result.body as { rentPayments: unknown[] }).rentPayments.length).toBeGreaterThan(0);
  });

  it('GET/POST /api/street-view handlers', async () => {
    const getResult = await handleStreetViewGet(
      { lat: 30.2, lng: -97.7 },
      {
        requireAuth: async () => adminAuth,
        placesApiKey: 'key',
        fetchImage: async () => ({
          ok: true,
          status: 200,
          buffer: new ArrayBuffer(4),
          contentType: 'image/jpeg',
        }),
      },
    );
    expect(getResult.status).toBe(200);

    const postResult = await handleStreetViewPost(
      { lat: 30.2, lng: -97.7 },
      {
        getStreetViewImage: async () => ({
          imageUrl: 'https://maps.example/img',
          metadata: { lat: 30.2, lng: -97.7 },
          available: true,
        }),
      },
    );
    expect(postResult.status).toBe(200);
    expect((postResult.body as { available: boolean }).available).toBe(true);
  });
});
