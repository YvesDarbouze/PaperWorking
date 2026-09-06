import type { AuthUser, AuthorizationService } from '@paperworking/authz';
import { assertAdminUser } from './assert-admin.js';
import { formatAccountTypeLabel } from './admin-account-types.js';
import type { AdminReadRepository } from './admin-read-repository.js';

export type AdminOpsReadServiceDeps = {
  authz: AuthorizationService;
  repository: AdminReadRepository;
};

function formatSubscriptionCustomer(row: {
  userId?: string | null;
  customerEmail?: string | null;
  customerName?: string | null;
}): string {
  const email = (row.customerEmail || '').trim();
  const name = (row.customerName || '').trim();
  if (name && email) return `${name} (${email})`;
  if (email) return email;
  if (name) return name;
  const uid = (row.userId || '').trim();
  return uid || '—';
}

function mapAuditSeverity(status: string): 'info' | 'warning' | 'critical' {
  const normalized = status.trim().toLowerCase();
  if (normalized === 'critical' || normalized === 'failed' || normalized === 'error') {
    return 'critical';
  }
  if (normalized === 'warning') return 'warning';
  return 'info';
}

function safeUserRow(row: {
  id: string;
  documentId: string;
  email: string;
  name: string | null;
  displayName: string | null;
  accountType: string | null;
  jobTitle: string | null;
  orgRole: string | null;
  createdAt: Date;
}) {
  const accountType = (row.accountType || 'investor').trim().toLowerCase();
  return {
    id: row.id,
    documentId: row.documentId,
    displayName: row.displayName || row.name || row.email,
    email: row.email,
    accountType,
    accountTypeLabel: formatAccountTypeLabel(accountType),
    jobTitle: row.jobTitle?.trim() || '—',
    orgRole: row.orgRole?.trim() || '—',
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

    if (normalized === 'projects') {
      const items = await this.deps.repository.listRecentProjects(100);
      return {
        ...base,
        total: projects,
        projects: items.map((row) => ({
          id: row.id,
          name: row.name,
          ownerId: row.ownerId || '—',
          status: row.status,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        })),
      };
    }

    if (normalized === 'organizations') {
      const orgTotal = await this.deps.repository.countOrganizations();
      const items = await this.deps.repository.listRecentOrganizations(100);
      return {
        ...base,
        total: orgTotal,
        organizations: items.map((row) => ({
          id: row.id,
          name: row.name,
          ownerId: row.ownerId || '—',
          memberCount: row.memberCount,
          createdAt: row.createdAt.toISOString(),
        })),
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
          customer: formatSubscriptionCustomer({
            userId: typeof s.userId === 'string' ? s.userId : null,
            customerEmail: typeof s.customerEmail === 'string' ? s.customerEmail : null,
            customerName: typeof s.customerName === 'string' ? s.customerName : null,
          }),
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
      const events = await this.deps.repository.listRecentAuditEvents(100);
      const logs = events.map((row, index) => {
        const severity = mapAuditSeverity(row.status);
        const target = [row.targetResource, row.targetResourceId].filter(Boolean).join(':') || '—';
        return {
          id: row.id,
          seq: events.length - index,
          severity,
          action: row.action || '—',
          actor: row.actorEmail || 'system',
          target,
          details: row.status || '—',
          ip: row.ip || '—',
          at: row.timestamp.toISOString(),
          hash: row.entryHash ? row.entryHash.slice(0, 12) : '—',
        };
      });

      return {
        ...base,
        chainIntact: true,
        critical: logs.filter((log) => log.severity === 'critical').length,
        warnings: logs.filter((log) => log.severity === 'warning').length,
        total: logs.length,
        logs,
      };
    }

    if (normalized === 'marketplace') {
      const [items, liveVendors, listingCount] = await Promise.all([
        this.deps.repository.listRecentListings(100),
        this.deps.repository.countVendors(),
        this.deps.repository.countListings(),
      ]);

      const publishedCount = items.filter((item) => {
        const status = String(item.status ?? '').trim().toLowerCase();
        const visibility = String(item.visibility ?? '').trim().toLowerCase();
        return status === 'published' || visibility === 'marketplace';
      }).length;

      return {
        ...base,
        liveVendors,
        monthlyVolume: 0,
        openPipeline: listingCount,
        matchRate: listingCount > 0 ? Math.round((publishedCount / listingCount) * 100) : 0,
        avgLatencyHours: 0,
        jurisdictionVariance: [],
        funnel: [
          { step: 'Total listings', count: listingCount },
          { step: 'Recent feed', count: items.length },
          { step: 'Published / marketplace', count: publishedCount },
        ],
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
