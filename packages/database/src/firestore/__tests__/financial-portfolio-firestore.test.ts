import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import {
  AuthorizationService,
  AuthzForbiddenError,
  type AuthUser,
} from '@paperworking/authz';
import {
  aggregatePortfolioMetricsFromProjects,
  createPortfolioInsightsReadService,
  createPortfolioMetricsReadService,
  createProjectKpiReadService,
} from '@paperworking/services';
import { FIRESTORE_COLLECTIONS, resetFirestoreAdminForTests } from '../admin.js';
import { createFirestoreAuthzStore } from '../create-firestore-authz-store.js';
import { createFirestoreFinancialTransactionsRepository } from '../create-firestore-financial-transactions-repository.js';
import { createFirestorePortfolioInsightsReadRepository } from '../create-firestore-portfolio-insights-read-repository.js';
import { createFirestorePortfolioMetricsReadRepository } from '../create-firestore-portfolio-metrics-read-repository.js';
import { createFirestoreProjectKpiReadRepository } from '../create-firestore-project-kpi-read-repository.js';
import { createMockFirestoreFactory, MockFirestore, ts } from './mock-firestore.js';
import {
  createPortfolioInsightsReadRepository,
  createPortfolioMetricsReadRepository,
  createProjectKpiReadRepository,
} from '../../runtime/portfolio-data-store.js';
import { createProjectKpiReadRepository as createProjectKpiRouter } from '../../runtime/projects-data-store.js';

describe('Firestore financial transactions, portfolio metrics, and insights', () => {
  let mock: MockFirestore;
  const previousMode = process.env.DATABASE_READ_MODE;
  const previousDatabaseUrl = process.env.DATABASE_URL;

  const owner: AuthUser = {
    uid: 'uid-owner',
    email: 'owner@example.com',
    accountType: 'investor',
    isAdmin: false,
  };

  const outsider: AuthUser = {
    uid: 'uid-outsider',
    email: 'outsider@example.com',
    accountType: 'investor',
    isAdmin: false,
  };

  beforeEach(() => {
    resetFirestoreAdminForTests();
    process.env.DATABASE_READ_MODE = 'firestore';
    delete process.env.DATABASE_URL;

    mock = new MockFirestore();
    mock.seed(FIRESTORE_COLLECTIONS.organizations, [
      {
        id: 'org-1',
        data: {
          id: 'org-1',
          name: 'Owner Org',
          ownerUid: 'uid-owner',
          ownerId: 'uid-owner',
          createdAt: ts('2026-01-01'),
          updatedAt: ts('2026-01-01'),
        },
      },
      {
        id: 'org-2',
        data: {
          id: 'org-2',
          name: 'Foreign Org',
          ownerUid: 'uid-other',
          ownerId: 'uid-other',
          createdAt: ts('2026-01-01'),
          updatedAt: ts('2026-01-01'),
        },
      },
    ]);
    mock.seed(FIRESTORE_COLLECTIONS.projects, [
      {
        id: 'proj-1',
        data: {
          id: 'proj-1',
          organizationId: 'org-1',
          ownerId: 'uid-owner',
          userId: 'uid-owner',
          name: '123 Main',
          city: 'Austin',
          status: 'active',
          lifecyclePhase: 'acquisition',
          currentPhase: 1,
          purchasePrice: 400000,
          createdAt: ts('2026-01-01'),
          updatedAt: ts('2026-01-02'),
        },
      },
      {
        id: 'proj-2',
        data: {
          id: 'proj-2',
          organizationId: 'org-1',
          ownerId: 'uid-owner',
          userId: 'uid-owner',
          name: '456 Oak',
          city: 'Dallas',
          status: 'hold',
          lifecyclePhase: 'hold',
          currentPhase: 3,
          purchasePrice: 250000,
          createdAt: ts('2026-01-01'),
          updatedAt: ts('2026-01-02'),
        },
      },
      {
        id: 'proj-foreign',
        data: {
          id: 'proj-foreign',
          organizationId: 'org-2',
          ownerId: 'uid-other',
          userId: 'uid-other',
          name: 'Foreign',
          city: 'Houston',
          status: 'active',
          lifecyclePhase: 'acquisition',
          currentPhase: 1,
          purchasePrice: 900000,
          createdAt: ts('2026-01-01'),
          updatedAt: ts('2026-01-02'),
        },
      },
    ]);
  });

  afterEach(() => {
    resetFirestoreAdminForTests();
    if (previousMode === undefined) delete process.env.DATABASE_READ_MODE;
    else process.env.DATABASE_READ_MODE = previousMode;
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
  });

  function firestoreFactory() {
    return createMockFirestoreFactory(mock);
  }

  function authz() {
    return new AuthorizationService(createFirestoreAuthzStore(firestoreFactory()));
  }

  it('constructs portfolio and KPI routers without DATABASE_URL', () => {
    expect(() => createProjectKpiRouter()).not.toThrow();
    expect(() => createPortfolioMetricsReadRepository()).not.toThrow();
    expect(() => createPortfolioInsightsReadRepository()).not.toThrow();
  });

  it('creates, lists, and reads ledger items with amount and date conversion', async () => {
    const ledger = createFirestoreFinancialTransactionsRepository(firestoreFactory());

    const created = await ledger.create({
      projectId: 'proj-1',
      id: 'txn-1',
      merchantName: 'Home Depot',
      reiCategory: 'MAINTENANCE_REPAIR',
      amountCents: 12550,
      transactionDate: '2026-02-01T12:00:00.000Z',
      reviewedByUser: true,
      userId: 'uid-owner',
    });

    expect(created.amountCents).toBe(12550);
    expect(created.projectId).toBe('proj-1');
    expect(created.organizationId).toBe('org-1');

    const listed = await ledger.listByProject('proj-1');
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe('txn-1');

    const found = await ledger.findById('proj-1', 'txn-1');
    expect(found?.merchantName).toBe('Home Depot');
    expect(found?.transactionDate.toISOString()).toBe('2026-02-01T12:00:00.000Z');
  });

  it('rejects cross-project ledger lookup', async () => {
    const ledger = createFirestoreFinancialTransactionsRepository(firestoreFactory());
    await ledger.create({
      projectId: 'proj-1',
      id: 'txn-secret',
      payee: 'Secret Vendor',
      amount: 100,
      reviewedByUser: true,
      userId: 'uid-owner',
    });

    expect(await ledger.findById('proj-foreign', 'txn-secret')).toBeNull();
  });

  it('feeds KPI recent activity from Firestore ledger items', async () => {
    const ledger = createFirestoreFinancialTransactionsRepository(firestoreFactory());
    await ledger.create({
      projectId: 'proj-1',
      id: 'txn-approved',
      payee: 'Rent Collector',
      reiCategory: 'RENT_INCOME',
      amountCents: 200000,
      transactionDate: '2026-03-01T00:00:00.000Z',
      reviewedByUser: true,
      userId: 'uid-owner',
    });
    await ledger.create({
      projectId: 'proj-1',
      id: 'txn-draft',
      payee: 'Draft Vendor',
      amountCents: 5000,
      transactionDate: '2026-03-02T00:00:00.000Z',
      reviewedByUser: false,
      userId: 'uid-owner',
    });

    const service = createProjectKpiReadService({
      authz: authz(),
      repository: createFirestoreProjectKpiReadRepository(firestoreFactory()),
    });

    const result = await service.getCurrentProjectKpis(owner, 'proj-1');
    expect(result.recentActivityStatus).toBe('actual');
    expect(result.recentActivity).toHaveLength(1);
    expect(result.recentActivity[0]?.payee).toBe('Rent Collector');
    expect(result.recentActivity[0]?.amount).toBe(2000);
  });

  it('aggregates portfolio metrics for owner org and excludes foreign projects', async () => {
    const metricsService = createPortfolioMetricsReadService({
      authz: authz(),
      repository: createFirestorePortfolioMetricsReadRepository(firestoreFactory()),
    });

    const ownerMetrics = await metricsService.getPortfolioMetrics(owner);
    expect(ownerMetrics.metrics.projectCount).toBe(2);
    expect(ownerMetrics.metrics.totalPurchasePrice).toBe(650000);
    expect(ownerMetrics.metrics.byPhase.acquisition).toBe(1);
    expect(ownerMetrics.metrics.byPhase.hold).toBe(1);

    const outsiderMetrics = createPortfolioMetricsReadService({
      authz: authz(),
      repository: createFirestorePortfolioMetricsReadRepository(firestoreFactory()),
    });
    await expect(outsiderMetrics.getPortfolioMetrics(outsider)).resolves.toMatchObject({
      metrics: { projectCount: 0, totalPurchasePrice: 0 },
    });
  });

  it('computes portfolio insights from accessible Firestore projects', async () => {
    const insightsService = createPortfolioInsightsReadService({
      authz: authz(),
      repository: createFirestorePortfolioInsightsReadRepository(firestoreFactory()),
    });

    const result = await insightsService.getPortfolioInsights(owner);
    expect(result.dataQuality).toBe('project_rollup');
    expect(result.insights.projectCount).toBe(2);
    expect(result.insights.totalExposure).toBe(650000);
    expect(result.insights.topCities.map((row) => row.city).sort()).toEqual(['Austin', 'Dallas']);
    expect(result.insights.trends.acquisitionPipeline).toBe(1);
    expect(result.insights.trends.holdAssets).toBe(1);
  });

  it('matches aggregatePortfolioMetricsFromProjects output for scoped rows', async () => {
    const repository = createFirestorePortfolioMetricsReadRepository(firestoreFactory());
    const rows = await repository.listAccessibleProjects({
      OR: [{ userId: 'uid-owner' }, { organizationId: { in: ['org-1'] } }],
    });
    const aggregated = aggregatePortfolioMetricsFromProjects(rows);
    expect(aggregated.metrics.projectCount).toBe(2);
    expect(aggregated.portfolio.totalPortfolioValue).toBe(650000);
  });

  it('rejects cross-org portfolio access through authz', async () => {
    const authorization = authz();
    await expect(
      authorization.assertProjectAccess(outsider, 'proj-1', 'projects.read'),
    ).rejects.toBeInstanceOf(AuthzForbiddenError);
  });
});
