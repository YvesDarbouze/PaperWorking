import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import {
  AuthorizationService,
  AuthzForbiddenError,
  type AuthUser,
} from '@paperworking/authz';
import {
  buildDemoPortfolioReport,
  createProfileCommandService,
  createProfileReadService,
  createReportsGenerateService,
  createReportsReadService,
  ProfileForbiddenError,
  ProfileNotFoundError,
} from '@paperworking/services';
import { FIRESTORE_COLLECTIONS, resetFirestoreAdminForTests } from '../admin.js';
import { createFirestoreAuthzStore } from '../create-firestore-authz-store.js';
import { createFirestoreProfileSettingsRepository } from '../create-firestore-profile-settings-repository.js';
import { createFirestoreReportsReadRepository } from '../create-firestore-reports-read-repository.js';
import { createFirestoreProjectKpiReadRepository } from '../create-firestore-project-kpi-read-repository.js';
import { createMockFirestoreFactory, MockFirestore, ts } from './mock-firestore.js';
import { createProfileSettingsRepository } from '../../runtime/profile-data-store.js';
import { createReportsReadRepository } from '../../runtime/reports-data-store.js';

describe('Firestore profile settings and reports repositories', () => {
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
    mock.seed(FIRESTORE_COLLECTIONS.organizationMembers, [
      {
        id: 'org-1_uid-owner',
        data: {
          id: 'org-1_uid-owner',
          organizationId: 'org-1',
          userId: 'uid-owner',
          role: 'Lead Investor',
          status: 'active',
          createdAt: ts('2026-01-01'),
          updatedAt: ts('2026-01-01'),
        },
      },
    ]);
    mock.seed(FIRESTORE_COLLECTIONS.users, [
      {
        id: 'uid-owner',
        data: {
          uid: 'uid-owner',
          email: 'owner@example.com',
          name: 'Owner Name',
          displayName: 'Owner Name',
          phone: '+1-555-0100',
          timezone: 'America/Chicago',
          companyName: 'Owner Capital',
          avatarUrl: 'https://example.com/owner.png',
          accountType: 'investor',
          role: 'investor',
          createdAt: ts('2026-01-01'),
          updatedAt: ts('2026-01-02'),
        },
      },
      {
        id: 'legacy-doc-id',
        data: {
          uid: 'uid-legacy',
          legacyFirebaseUid: 'uid-legacy',
          email: 'legacy@example.com',
          displayName: 'Legacy User',
          accountType: 'investor',
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
          title: '123 Main St',
          address: '123 Main St',
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
          title: '456 Oak Ave',
          address: '456 Oak Ave',
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
          title: 'Foreign Property',
          address: '999 Other Rd',
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

  describe('profile settings', () => {
    it('constructs profile router without DATABASE_URL', () => {
      expect(() => createProfileSettingsRepository()).not.toThrow();
    });

    it('reads own profile from /users/{uid}', async () => {
      const repository = createFirestoreProfileSettingsRepository(firestoreFactory());
      const service = createProfileReadService({ repository });
      const result = await service.getProfile(owner);

      expect(result.success).toBe(true);
      expect(result.section).toBe('profile');
      expect(result.settings).toEqual({
        email: 'owner@example.com',
        name: 'Owner Name',
        displayName: 'Owner Name',
        phone: '+1-555-0100',
        timezone: 'America/Chicago',
        companyName: 'Owner Capital',
        avatarUrl: 'https://example.com/owner.png',
        accountType: 'investor',
      });
      expect(result.settings).not.toHaveProperty('role');
      expect(result.settings).not.toHaveProperty('settings');
    });

    it('resolves profile by legacyFirebaseUid without trusting body uid', async () => {
      const repository = createFirestoreProfileSettingsRepository(firestoreFactory());
      const row = await repository.findByAuthUid('uid-legacy');
      expect(row?.id).toBe('uid-legacy');
      expect(row?.email).toBe('legacy@example.com');
    });

    it('updates allowed profile fields on /users/{uid}', async () => {
      const repository = createFirestoreProfileSettingsRepository(firestoreFactory());
      const command = createProfileCommandService({ repository });

      const result = await command.updateProfile(owner, {
        phone: '+1-555-0199',
        companyName: 'Updated Capital',
        timezone: 'America/New_York',
      });

      expect(result.settings.phone).toBe('+1-555-0199');
      expect(result.settings.companyName).toBe('Updated Capital');
      expect(result.settings.timezone).toBe('America/New_York');

      const stored = await repository.findByAuthUid('uid-owner');
      expect(stored?.phone).toBe('+1-555-0199');
      expect(stored?.companyName).toBe('Updated Capital');
    });

    it('maps firstName/lastName to name and displayName', async () => {
      const repository = createFirestoreProfileSettingsRepository(firestoreFactory());
      const command = createProfileCommandService({ repository });

      const result = await command.updateProfile(owner, {
        firstName: 'Jane',
        lastName: 'Doe',
      });

      expect(result.settings.name).toBe('Jane Doe');
      expect(result.settings.displayName).toBe('Jane Doe');
    });

    it('rejects attempts to modify protected fields', async () => {
      const repository = createFirestoreProfileSettingsRepository(firestoreFactory());
      const command = createProfileCommandService({ repository });

      await expect(command.updateProfile(owner, { role: 'admin' })).rejects.toBeInstanceOf(
        ProfileForbiddenError,
      );
      await expect(command.updateProfile(owner, { accountType: 'admin' })).rejects.toBeInstanceOf(
        ProfileForbiddenError,
      );
    });

    it('returns safe DTO when user document is missing', async () => {
      const repository = createFirestoreProfileSettingsRepository(firestoreFactory());
      const service = createProfileReadService({ repository });
      const result = await service.getProfile(outsider);

      expect(result.settings.email).toBe('outsider@example.com');
      expect(result.settings.name).toBeNull();
    });

    it('throws ProfileNotFoundError when updating missing user document', async () => {
      const repository = createFirestoreProfileSettingsRepository(firestoreFactory());
      const command = createProfileCommandService({ repository });

      await expect(command.updateProfile(outsider, { phone: '+1-555-0000' })).rejects.toBeInstanceOf(
        ProfileNotFoundError,
      );
    });
  });

  describe('reports read', () => {
    it('constructs reports router without DATABASE_URL', () => {
      expect(() => createReportsReadRepository()).not.toThrow();
    });

    it('builds portfolio report from accessible Firestore projects', async () => {
      const service = createReportsReadService({
        authz: authz(),
        repository: createFirestoreReportsReadRepository(firestoreFactory()),
      });

      const result = await service.getPortfolioReport(owner);
      expect(result.success).toBe(true);
      expect(result.report.projectCount).toBe(2);
      expect(result.report.totalPurchasePrice).toBe(650000);
      expect(result.report.projects.map((p) => p.id).sort()).toEqual(['proj-1', 'proj-2']);
      expect(result.overview.totalActiveProjects).toBe(2);
      expect(result.overview.totalPortfolioValue).toBe(650000);
    });

    it('excludes another organization projects from period report', async () => {
      const service = createReportsReadService({
        authz: authz(),
        repository: createFirestoreReportsReadRepository(firestoreFactory()),
      });

      const result = await service.getPeriodReport(owner, 'monthly');
      expect(result.totals.projects).toBe(2);
      expect(result.totals.purchaseVolume).toBe(650000);
      expect(result.transactions).toEqual([]);
    });

    it('scopes single-project period report through authz', async () => {
      const service = createReportsReadService({
        authz: authz(),
        repository: createFirestoreReportsReadRepository(firestoreFactory()),
      });

      const scoped = await service.getPeriodReport(owner, 'monthly', { projectId: 'proj-1' });
      expect(scoped.totals.projects).toBe(1);
      expect(scoped.totals.purchaseVolume).toBe(400000);

      await expect(
        service.getPeriodReport(outsider, 'monthly', { projectId: 'proj-1' }),
      ).rejects.toBeInstanceOf(AuthzForbiddenError);
    });

    it('returns empty portfolio for user without accessible projects', async () => {
      const service = createReportsReadService({
        authz: authz(),
        repository: createFirestoreReportsReadRepository(firestoreFactory()),
      });

      const result = await service.getPortfolioReport(outsider);
      expect(result.report.projectCount).toBe(0);
      expect(result.report.totalPurchasePrice).toBe(0);
    });
  });

  describe('reports generate', () => {
    it('buildDemoPortfolioReport remains available for test/fixture use only', async () => {
      const report = await buildDemoPortfolioReport('quarterly', 'csv');
      expect(report.reportId).toMatch(/^report_quarterly_/);
      expect(report.metrics.projectId).toBe('proj_demo_1');
      expect(report.csvContent).toContain('NOI');
    });

    it('generate service uses live Firestore-backed portfolio data', async () => {
      const service = createReportsGenerateService({
        authz: authz(),
        pdfExport: {
          exportPdf: async () => Buffer.from('pdf'),
        },
        reportsRepository: createFirestoreReportsReadRepository(firestoreFactory()),
        kpiRepository: createFirestoreProjectKpiReadRepository(firestoreFactory()),
      });

      const csv = await service.generateExport(owner, { format: 'csv', type: 'monthly' });
      expect(csv.contentType).toBe('text/csv');
      expect(typeof csv.body).toBe('string');
      expect(String(csv.body)).toContain('123 Main');
      expect(String(csv.body)).not.toContain('proj_demo_1');
    });
  });
});
