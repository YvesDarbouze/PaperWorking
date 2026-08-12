'use server';

import { cookies } from 'next/headers';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { authorize, AdminAction } from '@/lib/authz/authorize';
import { logAdminAudit, verifyAuditHashChain } from '@/lib/audit/auditLogger';

/* ═══════════════════════════════════════════════════════
   Admin Server Actions — Live Firestore + Stripe + Prisma Data
   Single Source of Truth: Authorized via src/lib/authz/authorize.ts
   ═══════════════════════════════════════════════════════ */

// ── Types ────────────────────────────────────────────

export interface AdminUserStats {
  totalUsers: number;
  newUsersLast30Days: number;
  activeSubscriptions: number;
  trialUsers: number;
  churnedLast30Days: number;
  pastDueUsers: number;
  planDistribution: { name: string; count: number; color: string }[];
  recentUsers: {
    id: string;
    displayName: string;
    email: string;
    role: string;
    accountType: string;
    subscriptionPlan: string;
    subscriptionStatus: string;
    createdAt: string;
    lastLoginAt: string;
    projectCount: number;
  }[];
}

export interface AdminRevenueStats {
  mrr: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  monthOverMonthGrowth: number;
  arr: number;
  recentSubscriptions: {
    id: string;
    userId: string;
    userName: string;
    email: string;
    plan: string;
    status: string;
    mrr: number;
    startDate: string;
    nextBillingDate: string;
    paymentMethod: string;
  }[];
}

export interface ActivityItem {
  id: string;
  type: 'signup' | 'upgrade' | 'ticket' | 'churn' | 'payment';
  message: string;
  timestamp: string;
}

export interface AdminActivityStats {
  totalProjects: number;
  activeProjects: number;
  projectsCreatedLast30Days: number;
  totalCapitalTracked: number;
  recentActivity: ActivityItem[];
}

export interface AdminAuditEntry {
  id: string;
  sequenceNumber?: string;
  action: string;
  actor: string;
  actorEmail: string;
  actorRole?: string;
  target: string;
  details: string;
  ipAddress: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
  status?: string;
  previousHash?: string;
  entryHash?: string;
}

export interface AdminTicketEntry {
  id: string;
  subject: string;
  requesterName: string;
  requesterEmail: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
  category: string;
  createdAt: string;
  updatedAt: string;
  assignee: string;
}

// ── Constants ────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
  Individual: '#A5A5A5',
  Team: '#595959',
  'Vendor Network': '#0d0d0d',
};
const DEFAULT_PLAN_COLOR = '#CCCCCC';

// ── Helpers ──────────────────────────────────────────

async function getSessionToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get('__session')?.value || null;
  } catch {
    return null;
  }
}

function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: '2026-04-22.dahlia' as any });
}

function formatDate(ts: any): string {
  if (!ts) return '';
  if (ts._seconds !== undefined) {
    return new Date(ts._seconds * 1000).toISOString().split('T')[0];
  }
  if (typeof ts.toDate === 'function') {
    return ts.toDate().toISOString().split('T')[0];
  }
  if (typeof ts === 'string') return ts;
  if (ts instanceof Date) return ts.toISOString().split('T')[0];
  return String(ts);
}

function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin} minutes ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hours ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays} days ago`;
}

// ── getAdminUserStats ────────────────────────────────

const EMPTY_USER_STATS: AdminUserStats = {
  totalUsers: 0,
  newUsersLast30Days: 0,
  activeSubscriptions: 0,
  trialUsers: 0,
  churnedLast30Days: 0,
  pastDueUsers: 0,
  planDistribution: [],
  recentUsers: [],
};

export async function getAdminUserStats(): Promise<AdminUserStats> {
  const token = await getSessionToken();
  const authz = await authorize(token, 'admin:view_users');
  if (!authz.authorized) return EMPTY_USER_STATS;

  try {
    const { adminDb } = await import('@/lib/firebase/admin');
    const usersSnap = await adminDb.collection('users').get();

    if (usersSnap.empty) return EMPTY_USER_STATS;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let newUsersLast30 = 0;
    let activeSubscriptions = 0;
    let trialUsers = 0;
    let churnedLast30 = 0;
    let pastDueUsers = 0;
    const planCounts: Record<string, number> = {};
    const users: AdminUserStats['recentUsers'] = [];

    usersSnap.docs.forEach((doc) => {
      const d = doc.data();

      // Test Account Governance: Exclude synthetic investor crew accounts from metrics/analytics
      if (d.is_test_account === true || d.persona_key || (d.email && (d.email.includes('+crew') || d.email.endsWith('@paperworking.co')))) {
        return;
      }

      const plan = d.subscriptionPlan || 'None';
      const status = d.subscriptionStatus || '';
      const createdAt = d.createdAt;

      planCounts[plan] = (planCounts[plan] || 0) + 1;
      if (status === 'active') activeSubscriptions++;
      if (status === 'trialing') trialUsers++;
      if (status === 'past_due') pastDueUsers++;

      let createdDate: Date | null = null;
      if (createdAt) {
        if (typeof createdAt.toDate === 'function') {
          createdDate = createdAt.toDate();
        } else if (createdAt._seconds !== undefined) {
          createdDate = new Date(createdAt._seconds * 1000);
        } else if (typeof createdAt === 'string') {
          createdDate = new Date(createdAt);
        }
      }
      if (createdDate && createdDate >= thirtyDaysAgo) newUsersLast30++;

      if (status === 'canceled') {
        const canceledAt = d.canceledAt || d.updatedAt;
        let cancelDate: Date | null = null;
        if (canceledAt) {
          if (typeof canceledAt.toDate === 'function') {
            cancelDate = canceledAt.toDate();
          } else if (canceledAt._seconds !== undefined) {
            cancelDate = new Date(canceledAt._seconds * 1000);
          } else if (typeof canceledAt === 'string') {
            cancelDate = new Date(canceledAt);
          }
        }
        if (cancelDate && cancelDate >= thirtyDaysAgo) churnedLast30++;
      }

      users.push({
        id: doc.id,
        displayName: d.displayName || d.name || 'Unknown',
        email: d.email || '',
        role: d.role || '',
        accountType: d.accountType || 'investor',
        subscriptionPlan: plan,
        subscriptionStatus: status || 'inactive',
        createdAt: formatDate(createdAt),
        lastLoginAt: formatDate(d.lastLoginAt || d.lastSignInTime),
        projectCount: d.projectCount || 0,
      });
    });

    const planDistribution = Object.entries(planCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        count,
        color: PLAN_COLORS[name] || DEFAULT_PLAN_COLOR,
      }));

    users.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));

    await logAdminAudit({
      actorUid: authz.user!.uid,
      actorEmail: authz.user!.email,
      actorRole: authz.user!.role,
      action: 'admin:view_users',
      targetResource: 'users',
      status: 'SUCCESS',
      severity: 'info',
    });

    return {
      totalUsers: users.length,
      newUsersLast30Days: newUsersLast30,
      activeSubscriptions,
      trialUsers,
      churnedLast30Days: churnedLast30,
      pastDueUsers,
      planDistribution,
      recentUsers: users,
    };
  } catch (error) {
    console.error('[getAdminUserStats] Failed:', error);
    return EMPTY_USER_STATS;
  }
}

// ── getAdminRevenueStats ─────────────────────────────

const EMPTY_REVENUE_STATS: AdminRevenueStats = {
  mrr: 0,
  revenueThisMonth: 0,
  revenueLastMonth: 0,
  monthOverMonthGrowth: 0,
  arr: 0,
  recentSubscriptions: [],
};

export async function getAdminRevenueStats(): Promise<AdminRevenueStats> {
  const token = await getSessionToken();
  const authz = await authorize(token, 'admin:view_subscriptions');
  if (!authz.authorized) return EMPTY_REVENUE_STATS;

  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return EMPTY_REVENUE_STATS;
    }

    let mrr = 0;
    const recentSubscriptions: AdminRevenueStats['recentSubscriptions'] = [];

    const allSubs: Stripe.Subscription[] = [];
    for await (const sub of stripe.subscriptions.list({ status: 'all', limit: 100, expand: ['data.customer'] })) {
      allSubs.push(sub);
    }

    for (const sub of allSubs) {
      const monthlyAmount = sub.items.data.reduce((sum, item) => {
        const price = item.price;
        if (!price?.unit_amount) return sum;
        const amt = price.unit_amount / 100;
        if (price.recurring?.interval === 'year') return sum + amt / 12;
        return sum + amt;
      }, 0);

      if (sub.status === 'active' || sub.status === 'trialing') {
        mrr += monthlyAmount;
      }

      const customer = sub.customer as Stripe.Customer;
      const customerEmail = typeof customer === 'string' ? '' : (customer?.email || '');
      const customerName = typeof customer === 'string' ? '' : (customer?.name || customerEmail);

      let planName = sub.items.data[0]?.price?.nickname || 'Unknown';
      const metadata = sub.metadata || {};
      if (metadata.planName) planName = metadata.planName;

      recentSubscriptions.push({
        id: sub.id,
        userId: typeof customer === 'string' ? customer : (customer?.id || ''),
        userName: customerName,
        email: customerEmail,
        plan: planName,
        status: sub.status,
        mrr: Math.round(monthlyAmount),
        startDate: new Date(sub.start_date * 1000).toISOString().split('T')[0],
        nextBillingDate: (sub as any).current_period_end
          ? new Date((sub as any).current_period_end * 1000).toISOString().split('T')[0]
          : '',
        paymentMethod: sub.default_payment_method
          ? `•••• ${(sub.default_payment_method as any)?.card?.last4 || '****'}`
          : '—',
      });
    }

    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    let revenueThisMonth = 0;
    let revenueLastMonth = 0;

    for await (const charge of stripe.charges.list({
      created: { gte: Math.floor(startOfLastMonth.getTime() / 1000) },
      limit: 100,
    })) {
      if (charge.status !== 'succeeded') continue;
      const chargeDate = new Date(charge.created * 1000);
      const amount = charge.amount / 100;
      if (chargeDate >= startOfThisMonth) {
        revenueThisMonth += amount;
      } else if (chargeDate >= startOfLastMonth) {
        revenueLastMonth += amount;
      }
    }

    const monthOverMonthGrowth = revenueLastMonth > 0
      ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100
      : 0;

    return {
      mrr: Math.round(mrr),
      revenueThisMonth: Math.round(revenueThisMonth),
      revenueLastMonth: Math.round(revenueLastMonth),
      monthOverMonthGrowth: Math.round(monthOverMonthGrowth * 10) / 10,
      arr: Math.round(mrr * 12),
      recentSubscriptions,
    };
  } catch (error) {
    console.error('[getAdminRevenueStats] Failed:', error);
    return EMPTY_REVENUE_STATS;
  }
}

// ── getAdminActivityStats ────────────────────────────

const EMPTY_ACTIVITY_STATS: AdminActivityStats = {
  totalProjects: 0,
  activeProjects: 0,
  projectsCreatedLast30Days: 0,
  totalCapitalTracked: 0,
  recentActivity: [],
};

export async function getAdminActivityStats(): Promise<AdminActivityStats> {
  const token = await getSessionToken();
  const authz = await authorize(token, 'admin:view_overview');
  if (!authz.authorized) return EMPTY_ACTIVITY_STATS;

  try {
    const { adminDb } = await import('@/lib/firebase/admin');
    const projectsSnap = await adminDb.collection('projects').get();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let activeProjects = 0;
    let projectsCreatedLast30 = 0;
    let totalCapital = 0;

    projectsSnap.docs.forEach((doc) => {
      const d = doc.data();
      const status = d.status;
      if (status === 'fund' || status === 'hold') {
        activeProjects++;
      }

      const purchasePrice = d.purchasePrice || d.acquisitionPrice || 0;
      const rehabBudget = d.rehabBudget || d.totalRehabBudget || 0;
      totalCapital += purchasePrice + rehabBudget;

      const createdAt = d.createdAt;
      let createdDate: Date | null = null;
      if (createdAt) {
        if (typeof createdAt.toDate === 'function') createdDate = createdAt.toDate();
        else if (createdAt._seconds !== undefined) createdDate = new Date(createdAt._seconds * 1000);
        else if (createdAt instanceof Date) createdDate = createdAt;
        else if (typeof createdAt === 'string') createdDate = new Date(createdAt);
      }
      if (createdDate && createdDate >= thirtyDaysAgo) projectsCreatedLast30++;
    });

    const activity: AdminActivityStats['recentActivity'] = [];

    // Query Postgres AdminAuditLog for recent activity
    try {
      const dbLogs = await prisma.adminAuditLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 10,
      });

      dbLogs.forEach((l) => {
        let type: 'signup' | 'upgrade' | 'ticket' | 'churn' | 'payment' = 'signup';
        if (l.action.includes('subscription') || l.action.includes('upgrade')) type = 'upgrade';
        else if (l.action.includes('ticket')) type = 'ticket';
        else if (l.action.includes('churn') || l.action.includes('cancel')) type = 'churn';
        else if (l.action.includes('payment') || l.action.includes('billing')) type = 'payment';

        activity.push({
          id: l.id,
          type,
          message: `${l.actorEmail || l.actorUid}: ${l.action} (${l.status})`,
          timestamp: timeAgo(l.timestamp),
        });
      });
    } catch {
      // Postgres query fallback
    }

    return {
      totalProjects: projectsSnap.size,
      activeProjects,
      projectsCreatedLast30Days: projectsCreatedLast30,
      totalCapitalTracked: totalCapital,
      recentActivity: activity,
    };
  } catch (error) {
    console.error('[getAdminActivityStats] Failed:', error);
    return EMPTY_ACTIVITY_STATS;
  }
}

// ── getAdminAuditLogs ────────────────────────────────

export async function getAdminAuditLogs(): Promise<(AdminAuditEntry & { hashChainIntact?: boolean })[]> {
  const token = await getSessionToken();
  const authz = await authorize(token, 'admin:view_audit_logs');
  if (!authz.authorized) return [];

  try {
    // 1. Verify hash chain integrity
    const hashCheck = await verifyAuditHashChain(200);

    // 2. Fetch logs from Postgres
    const dbLogs = await prisma.adminAuditLog.findMany({
      orderBy: { sequenceNumber: 'desc' },
      take: 200,
    });

    if (dbLogs.length > 0) {
      return dbLogs.map((l) => ({
        id: l.id,
        sequenceNumber: l.sequenceNumber.toString(),
        action: l.action,
        actor: l.actorUid,
        actorEmail: l.actorEmail,
        actorRole: l.actorRole,
        target: l.targetResource + (l.targetResourceId ? `:${l.targetResourceId}` : ''),
        details: l.reasonCode ? `Reason: ${l.reasonCode}` : (l.metadata ? JSON.stringify(l.metadata) : 'Executed successfully'),
        ipAddress: l.ipAddress,
        timestamp: l.timestamp.toISOString(),
        severity: (['info', 'warning', 'critical'].includes(l.severity) ? l.severity : 'info') as 'info' | 'warning' | 'critical',
        status: l.status,
        previousHash: l.previousHash,
        entryHash: l.entryHash,
        hashChainIntact: hashCheck.intact,
      }));
    }

    // 3. Fallback: fetch Firestore audit_logs if Postgres has 0 logs
    const { adminDb } = await import('@/lib/firebase/admin');
    const snap = await adminDb.collection('audit_logs').orderBy('timestamp', 'desc').limit(200).get();

    return (snap.docs || []).map((doc) => {
      const d = doc.data();
      let ts = '';
      if (d.timestamp?.toDate) ts = d.timestamp.toDate().toISOString();
      else if (d.timestamp?._seconds) ts = new Date(d.timestamp._seconds * 1000).toISOString();
      else ts = d.timestamp || '';

      return {
        id: doc.id,
        action: d.action || '',
        actor: d.actor || '',
        actorEmail: d.actorEmail || d.email || '',
        target: d.target || '',
        details: d.details || '',
        ipAddress: d.ipAddress || d.ip || '127.0.0.1',
        timestamp: ts,
        severity: (['info', 'warning', 'critical'].includes(d.severity) ? d.severity : 'info') as 'info' | 'warning' | 'critical',
        status: 'SUCCESS',
        hashChainIntact: true,
      };
    });
  } catch (error) {
    console.error('[getAdminAuditLogs] Failed:', error);
    return [];
  }
}

// ── exportAdminAuditLogs ─────────────────────────────

export async function exportAdminAuditLogs(): Promise<{ csvData: string; error?: string }> {
  const token = await getSessionToken();
  const authz = await authorize(token, 'admin:export_audit_logs');
  if (!authz.authorized || !authz.user) {
    return { csvData: '', error: authz.reason || 'Unauthorized' };
  }

  const logs = await getAdminAuditLogs();

  const headers = ['Sequence', 'Timestamp', 'Actor Email', 'Actor Role', 'Action', 'Target', 'Status', 'IP Address', 'Severity', 'Previous Hash', 'Entry Hash'];
  const rows = logs.map((l) => [
    l.sequenceNumber || '',
    l.timestamp,
    l.actorEmail,
    l.actorRole || '',
    l.action,
    l.target,
    l.status || 'SUCCESS',
    l.ipAddress,
    l.severity,
    l.previousHash || '',
    l.entryHash || '',
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');

  await logAdminAudit({
    actorUid: authz.user.uid,
    actorEmail: authz.user.email,
    actorRole: authz.user.role,
    action: 'admin:export_audit_logs',
    targetResource: 'audit_logs',
    status: 'SUCCESS',
    severity: 'info',
  });

  return { csvData: csvContent };
}

// ── getAdminTickets ──────────────────────────────────

export async function getAdminTickets(): Promise<AdminTicketEntry[]> {
  const token = await getSessionToken();
  const authz = await authorize(token, 'admin:view_tickets');
  if (!authz.authorized) return [];

  try {
    const { adminDb } = await import('@/lib/firebase/admin');

    const snap = await adminDb
      .collection('support_tickets')
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get();

    return (snap.docs || []).map((doc) => {
      const d = doc.data();
      return {
        id: d.ticketId || doc.id,
        subject: d.subject || '',
        requesterName: d.requesterName || d.userName || '',
        requesterEmail: d.requesterEmail || d.email || '',
        priority: (['low', 'medium', 'high', 'urgent'].includes(d.priority) ? d.priority : 'medium') as AdminTicketEntry['priority'],
        status: (['open', 'in_progress', 'waiting', 'resolved', 'closed'].includes(d.status) ? d.status : 'open') as AdminTicketEntry['status'],
        category: d.category || 'General',
        createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : (d.createdAt || ''),
        updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate().toISOString() : (d.updatedAt || ''),
        assignee: d.assignee || 'Unassigned',
      };
    });
  } catch (error) {
    console.error('[getAdminTickets] Failed:', error);
    return [];
  }
}
