import { getProfileFromBff } from '@/lib/settings/profile-api';
import { bffFetch, bffJson } from '@/lib/api/bff-fetch';
import { getBillingSummaryFromBff } from '@/lib/billing/billing-api';
import type { InboxThread } from '@/lib/inbox/types';
import { toUiMemberStatus } from '@/lib/team/roles';

export type DashboardOverviewLive = {
  portfolioSummary: {
    activeDeals: number;
    portfolioValue: string;
    totalNoi: string;
    monthlyCashFlow: string;
    capitalDeployed: string;
    portfolioIrr: string;
  };
  projectSummaries: Array<{ id: string; name: string; status?: string | null }>;
  profileCard: {
    displayName: string;
    role: string;
    followers: number;
  };
  /** Non-metric sections stay empty in API mode — no seed fill. */
  pipelineSnapshot: unknown[];
  attentionItems: unknown[];
  assignedTasks: unknown[];
  operationalAlerts: unknown[];
  recentActivity: unknown[];
  recentMessages: unknown[];
  topPerformers: unknown[];
  activeProjectProgress: unknown[];
  phaseLegend: unknown[];
};

function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `$${Math.round(value / 1000)}K`;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function mapInboxThread(raw: Record<string, unknown>): InboxThread {
  return {
    id: String(raw.id ?? ''),
    tab: (raw.tab as InboxThread['tab']) || 'all',
    type: (raw.type as InboxThread['type']) || 'SYSTEM',
    subject: String(raw.subject ?? raw.title ?? ''),
    project: String(raw.project ?? ''),
    from: String(raw.from ?? raw.sender ?? ''),
    fromRole: raw.fromRole ? String(raw.fromRole) : undefined,
    preview: String(raw.preview ?? raw.body ?? ''),
    body: String(raw.body ?? ''),
    unread: Boolean(raw.unread ?? !raw.read),
    receivedAt: String(raw.receivedAt ?? raw.createdAt ?? new Date().toISOString()),
    deepLinkUrl: raw.deepLinkUrl ? String(raw.deepLinkUrl) : undefined,
    actionable: Boolean(raw.actionable),
  };
}

/**
 * API provider — NestJS only. Never falls back to mockdata.
 * Empty arrays / empty objects are valid production states.
 */
export const apiProvider = {
  async dashboardOverview(): Promise<DashboardOverviewLive> {
    const empty: DashboardOverviewLive = {
      portfolioSummary: {
        activeDeals: 0,
        portfolioValue: '—',
        totalNoi: '—',
        monthlyCashFlow: '—',
        capitalDeployed: '—',
        portfolioIrr: '—',
      },
      projectSummaries: [],
      profileCard: { displayName: 'Investor', role: 'Investor', followers: 0 },
      pipelineSnapshot: [],
      attentionItems: [],
      assignedTasks: [],
      operationalAlerts: [],
      recentActivity: [],
      recentMessages: [],
      topPerformers: [],
      activeProjectProgress: [],
      phaseLegend: [],
    };

    const [metricsRes, profileRes, projectsRes] = await Promise.all([
      bffFetch('/api/portfolio/metrics?period=monthly', { credentials: 'include', cache: 'no-store' }),
      bffFetch('/api/marketplace/profile', { credentials: 'include', cache: 'no-store' }),
      bffFetch('/api/projects', { credentials: 'include', cache: 'no-store' }),
    ]);

    if (metricsRes.ok) {
      const body = (await metricsRes.json()) as {
        portfolio?: {
          totalActiveProjects?: number;
          totalPortfolioValue?: number;
          portfolioNoi?: number | null;
          portfolioCashFlow?: number | null;
          totalCashInvested?: number;
          portfolioCapRate?: number | null;
        };
        metrics?: {
          projectCount?: number;
          totalPurchasePrice?: number;
          activeCount?: number;
        };
      };
      const p =
        body.portfolio ??
        (body.metrics
          ? {
              totalActiveProjects: body.metrics.activeCount ?? body.metrics.projectCount,
              totalPortfolioValue: body.metrics.totalPurchasePrice,
              totalCashInvested: body.metrics.totalPurchasePrice,
              portfolioNoi: null,
              portfolioCashFlow: null,
              portfolioCapRate: null,
            }
          : undefined);
      if (p) {
        empty.portfolioSummary = {
          activeDeals: p.totalActiveProjects ?? 0,
          portfolioValue: p.totalPortfolioValue != null ? formatUsd(p.totalPortfolioValue) : '—',
          totalNoi: p.portfolioNoi != null ? formatUsd(p.portfolioNoi) : '—',
          monthlyCashFlow: p.portfolioCashFlow != null ? formatUsd(p.portfolioCashFlow) : '—',
          capitalDeployed: p.totalCashInvested != null ? formatUsd(p.totalCashInvested) : '—',
          portfolioIrr: p.portfolioCapRate != null ? `${p.portfolioCapRate.toFixed(1)}%` : '—',
        };
      }
    }

    if (profileRes.ok) {
      const body = (await profileRes.json()) as {
        profile?: { displayName?: string; followerCount?: number };
      };
      if (body.profile?.displayName) {
        empty.profileCard.displayName = body.profile.displayName;
      }
      if (body.profile?.followerCount != null) {
        empty.profileCard.followers = body.profile.followerCount;
      }
    }

    if (projectsRes.ok) {
      const body = (await projectsRes.json()) as {
        projects?: Array<{ id: string; name?: string; title?: string; status?: string | null }>;
      };
      empty.projectSummaries = (body.projects ?? []).map((p) => ({
        id: p.id,
        name: p.name || p.title || p.id,
        status: p.status,
      }));
    }

    return empty;
  },

  async inboxThreads(): Promise<InboxThread[]> {
    const res = await bffFetch('/api/inbox', { credentials: 'include' });
    if (!res.ok) throw new Error(`Inbox API ${res.status}`);
    const data = (await res.json()) as { threads?: Record<string, unknown>[] };
    if (!Array.isArray(data.threads)) return [];
    return data.threads.map(mapInboxThread);
  },

  async teamMembers(): Promise<{
    members: Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      type: 'Internal' | 'External';
      status: 'Active' | 'Invited' | 'Suspended' | 'Removed';
      projects: number;
      lastActive: string;
      invitedAt?: string;
      isYou?: boolean;
    }>;
    seats: { used: number; limit: number; tierLabel: string };
  }> {
    const res = await bffFetch('/api/team/members', { credentials: 'include' });
    if (!res.ok) throw new Error(`Team API ${res.status}`);
    const data = (await res.json()) as {
      members?: Array<Record<string, unknown>>;
      invites?: unknown[];
    };
    const raw = Array.isArray(data.members) ? data.members : [];
    const members = raw.map((m) => ({
      id: String(m.id ?? m.userId ?? ''),
      name: String(m.name ?? m.displayName ?? m.email ?? 'Member'),
      email: String(m.email ?? ''),
      role: String(m.role ?? 'Member'),
      type: (m.type === 'External' ? 'External' : 'Internal') as 'Internal' | 'External',
      status: toUiMemberStatus(String(m.status ?? 'active')),
      projects: Number(m.projects ?? 0),
      lastActive: String(m.lastActive ?? '—'),
      invitedAt: m.invitedAt ? String(m.invitedAt) : undefined,
      isYou: Boolean(m.isYou),
    }));
    return {
      members,
      seats: {
        used: members.length,
        limit: Math.max(members.length, 5),
        tierLabel: 'Team',
      },
    };
  },

  async billingPreview() {
    return getBillingSummaryFromBff();
  },

  async profilePreview() {
    return getProfileFromBff();
  },

  async projects() {
    const data = await bffJson<{ projects?: unknown[] }>('/api/projects');
    return Array.isArray(data.projects) ? data.projects : [];
  },

  async projectById(id: string) {
    return bffJson(`/api/projects/${encodeURIComponent(id)}`);
  },
};
