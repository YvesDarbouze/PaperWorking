import type { AuthUser, AuthorizationService } from '@paperworking/authz';
import { assertAdminUser } from './assert-admin.js';
import type { AdminReadRepository } from './admin-read-repository.js';

export type AdminOpsReadServiceDeps = {
  authz: AuthorizationService;
  repository: AdminReadRepository;
};

function safeUserRow(row: {
  id: string;
  email: string;
  name: string | null;
  displayName: string | null;
  accountType: string | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    displayName: row.displayName || row.name || row.email,
    email: row.email,
    role: row.accountType || 'investor',
    subscriptionPlan: '—',
    subscriptionStatus: 'unknown',
    projectCount: 0,
    lastLoginAt: row.createdAt.toISOString(),
    joinedAt: row.createdAt.toISOString(),
  };
}

function emptyAnalyticsSection() {
  return {
    userGrowth: { thisMonth: 0, lastMonth: 0, wow: '0%' },
    revenueSnapshot: { mrr: 0, growth: '0%' },
    retention: { d30: 0, d90: 0, d180: 0 },
    platformActivity: { projectsCreated: 0, dealsPublished: 0, messages: 0 },
    featureAdoption: [] as Array<{ name: string; pct: number }>,
    accountTypes: [] as Array<{ name: string; count: number }>,
    plaid: {
      connected: 0,
      needsReauth: 0,
      healthyPct: 0,
      connections: [] as Array<{ id: string; user: string; institution: string; status: string }>,
    },
    support: { frtHours: 0, fcrPct: 0, csat: 0, volume: 0 },
  };
}

/**
 * GET /api/admin/ops — section-scoped admin telemetry (DB-backed where available).
 */
export class AdminOpsReadService {
  constructor(private readonly deps: AdminOpsReadServiceDeps) {}

  async getOpsSection(user: AuthUser, section?: string) {
    assertAdminUser(user, this.deps.authz);
    const normalized = (section || 'overview').trim().toLowerCase();

    const [users, subscriptions, projects, listings, audits] = await Promise.all([
      this.deps.repository.countUsers(),
      this.deps.repository.countSubscriptions(),
      this.deps.repository.countProjects(),
      this.deps.repository.countListings(),
      this.deps.repository.listRecentAuditEvents(50),
    ]);

    const base = {
      success: true as const,
      section: normalized,
      kpis: {
        users,
        subscriptions,
        projects,
        listings,
        auditEvents: audits.length,
      },
    };

    if (normalized === 'users') {
      const list = await this.deps.repository.listRecentUsers(100);
      const mapped = list.map(safeUserRow);
      return {
        ...base,
        total: users,
        active: mapped.length,
        pastDue: 0,
        churned: 0,
        users: mapped,
      };
    }

    if (normalized === 'billing' || normalized === 'subscriptions') {
      const subs = await this.deps.repository.listRecentSubscriptions(100);
      return {
        ...base,
        mrr: 0,
        arr: 0,
        active: subscriptions,
        atRisk: 0,
        planBreakdown: [],
        recent: subs.map((s) => ({
          id: String(s.id ?? ''),
          customer: String(s.userId ?? '—'),
          plan: String(s.plan ?? '—'),
          status: String(s.status ?? 'unknown'),
          mrr: 0,
          renewsAt: s.updatedAt instanceof Date ? s.updatedAt.toISOString().slice(0, 10) : '—',
        })),
        dunning: [],
        subscriptions: subs,
      };
    }

    if (normalized === 'audit') {
      return {
        ...base,
        audit: audits.map((row) => ({
          id: row.id,
          timestamp: row.timestamp.toISOString(),
          actorEmail: row.actorEmail,
          action: row.action,
          targetResource: row.targetResource,
          targetResourceId: row.targetResourceId,
          status: row.status,
        })),
      };
    }

    if (normalized === 'marketplace') {
      const items = await this.deps.repository.listRecentListings(100);
      return {
        ...base,
        listings: items,
      };
    }

    if (normalized === 'analytics') {
      return { ...base, ...emptyAnalyticsSection() };
    }

    if (normalized === 'tickets') {
      return { ...base, tickets: [] as unknown[] };
    }

    // overview + unknown sections — DB rollup shell with zeroed revenue placeholders
    return {
      ...base,
      mrr: 0,
      revenueThisMonth: 0,
      revenueLastMonth: 0,
      kpis: [
        { label: 'Total Users', value: String(users), change: 0, changeLabel: 'DB rollup' },
        { label: 'Subscriptions', value: String(subscriptions), change: 0, changeLabel: 'DB rollup' },
        { label: 'Projects', value: String(projects), change: 0, changeLabel: 'DB rollup' },
        { label: 'Listings', value: String(listings), change: 0, changeLabel: 'DB rollup' },
      ],
      plans: [],
      activity: audits.slice(0, 10).map((row) => ({
        id: row.id,
        type: 'audit',
        message: `${row.action} — ${row.targetResource}`,
        timestamp: row.timestamp.toISOString(),
      })),
      audit: audits.slice(0, 10).map((row) => ({
        id: row.id,
        timestamp: row.timestamp.toISOString(),
        actorEmail: row.actorEmail,
        action: row.action,
        status: row.status,
      })),
    };
  }
}

export function createAdminOpsReadService(deps: AdminOpsReadServiceDeps): AdminOpsReadService {
  return new AdminOpsReadService(deps);
}
