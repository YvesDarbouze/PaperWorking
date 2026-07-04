'use server';

import { cookies } from 'next/headers';
import Stripe from 'stripe';

/* ═══════════════════════════════════════════════════════
   Admin Server Actions — Live Firestore + Stripe Data

   Every function:
     1. Verifies the __session cookie via Firebase Admin
     2. Checks the caller has an admin role
     3. Queries Firestore / Stripe for real data
     4. Returns a serializable result (no Firestore refs)

   Graceful degradation: returns empty/zero results rather
   than throwing, so the UI can render real zeros.
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
  action: string;
  actor: string;
  actorEmail: string;
  target: string;
  details: string;
  ipAddress: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
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

const ADMIN_ROLES = ['Platform Admin', 'Admin', 'Lead Investor'];

const PLAN_COLORS: Record<string, string> = {
  Individual: '#A5A5A5',
  Team: '#595959',
  'Vendor Network': '#0d0d0d',
};
const DEFAULT_PLAN_COLOR = '#CCCCCC';

// ── Helpers ──────────────────────────────────────────

async function verifyAdmin(): Promise<{ uid: string } | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('__session');
    if (!session?.value) return null;

    const { adminAuth, adminDb } = await import('@/lib/firebase/admin');
    const decoded = await adminAuth.verifyIdToken(session.value);
    if (!decoded.uid) return null;

    // Check role from Firestore user doc
    const userSnap = await adminDb.collection('users').doc(decoded.uid).get();
    const userData = userSnap.data();
    const role = userData?.role || '';

    if (!ADMIN_ROLES.includes(role)) return null;

    return { uid: decoded.uid };
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
  // Firestore Timestamp
  if (ts._seconds !== undefined) {
    return new Date(ts._seconds * 1000).toISOString().split('T')[0];
  }
  // Firestore Timestamp .toDate()
  if (typeof ts.toDate === 'function') {
    return ts.toDate().toISOString().split('T')[0];
  }
  // Already a string
  if (typeof ts === 'string') return ts;
  // JS Date
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
  const admin = await verifyAdmin();
  if (!admin) return EMPTY_USER_STATS;

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
      const plan = d.subscriptionPlan || 'None';
      const status = d.subscriptionStatus || '';
      const createdAt = d.createdAt;

      // Count plan distribution
      planCounts[plan] = (planCounts[plan] || 0) + 1;

      // Count subscription statuses
      if (status === 'active') activeSubscriptions++;
      if (status === 'trialing') trialUsers++;
      if (status === 'past_due') pastDueUsers++;

      // New users last 30 days
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

      // Churned last 30 days
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

    // Build plan distribution with colors
    const planDistribution = Object.entries(planCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        count,
        color: PLAN_COLORS[name] || DEFAULT_PLAN_COLOR,
      }));

    // Sort users by createdAt descending
    users.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));

    return {
      totalUsers: usersSnap.size,
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
  const admin = await verifyAdmin();
  if (!admin) return EMPTY_REVENUE_STATS;

  try {
    const stripe = getStripeClient();
    if (!stripe) {
      console.warn('[getAdminRevenueStats] STRIPE_SECRET_KEY not set — returning empty');
      return EMPTY_REVENUE_STATS;
    }

    const { adminDb } = await import('@/lib/firebase/admin');

    // Get MRR from active Stripe subscriptions
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
        // Normalize annual to monthly
        if (price.recurring?.interval === 'year') return sum + amt / 12;
        return sum + amt;
      }, 0);

      if (sub.status === 'active' || sub.status === 'trialing') {
        mrr += monthlyAmount;
      }

      const customer = sub.customer as Stripe.Customer;
      const customerEmail = typeof customer === 'string' ? '' : (customer?.email || '');
      const customerName = typeof customer === 'string' ? '' : (customer?.name || customerEmail);

      // Try to match with Firestore user for plan name
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

    // Revenue this month and last month from Stripe charges
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
  const admin = await verifyAdmin();
  if (!admin) return EMPTY_ACTIVITY_STATS;

  try {
    const { adminDb } = await import('@/lib/firebase/admin');

    // Query ALL projects (platform-wide)
    const projectsSnap = await adminDb.collection('projects').get();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let activeProjects = 0;
    let projectsCreatedLast30 = 0;
    let totalCapital = 0;

    projectsSnap.docs.forEach((doc) => {
      const d = doc.data();
      const status = (d.status || '').toLowerCase();

      if (status === 'active' || status === 'in_progress' || status === 'rehab' || status === 'under_contract') {
        activeProjects++;
      }

      // Capital tracked
      const purchasePrice = d.purchasePrice || d.acquisitionPrice || 0;
      const rehabBudget = d.rehabBudget || d.totalRehabBudget || 0;
      totalCapital += purchasePrice + rehabBudget;

      // Created last 30 days
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

    // Build recent activity from audit_logs collection (if it exists)
    const activity: AdminActivityStats['recentActivity'] = [];
    try {
      const auditSnap = await adminDb
        .collection('audit_logs')
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get();

      auditSnap.docs.forEach((doc) => {
        const d = doc.data();
        const action = d.action || '';
        let type: 'signup' | 'upgrade' | 'ticket' | 'churn' | 'payment' = 'signup';
        if (action.includes('subscription') || action.includes('upgrade')) type = 'upgrade';
        else if (action.includes('ticket')) type = 'ticket';
        else if (action.includes('cancel') || action.includes('churn')) type = 'churn';
        else if (action.includes('payment') || action.includes('billing') || action.includes('charge')) type = 'payment';
        else if (action.includes('signup') || action.includes('created') || action.includes('login')) type = 'signup';

        let ts: Date;
        if (d.timestamp?.toDate) ts = d.timestamp.toDate();
        else if (d.timestamp?._seconds) ts = new Date(d.timestamp._seconds * 1000);
        else ts = new Date(d.timestamp || now);

        activity.push({
          id: doc.id,
          type,
          message: d.details || d.message || `${d.actor || 'System'}: ${action}`,
          timestamp: timeAgo(ts),
        });
      });
    } catch {
      // audit_logs collection may not exist yet — that's fine
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

export async function getAdminAuditLogs(): Promise<AdminAuditEntry[]> {
  const admin = await verifyAdmin();
  if (!admin) return [];

  try {
    const { adminDb } = await import('@/lib/firebase/admin');

    const snap = await adminDb
      .collection('audit_logs')
      .orderBy('timestamp', 'desc')
      .limit(200)
      .get();

    return snap.docs.map((doc) => {
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
        ipAddress: d.ipAddress || d.ip || '—',
        timestamp: ts,
        severity: (['info', 'warning', 'critical'].includes(d.severity) ? d.severity : 'info') as 'info' | 'warning' | 'critical',
      };
    });
  } catch (error) {
    console.error('[getAdminAuditLogs] Failed:', error);
    return [];
  }
}

// ── getAdminTickets ──────────────────────────────────

export async function getAdminTickets(): Promise<AdminTicketEntry[]> {
  const admin = await verifyAdmin();
  if (!admin) return [];

  try {
    const { adminDb } = await import('@/lib/firebase/admin');

    const snap = await adminDb
      .collection('support_tickets')
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get();

    return snap.docs.map((doc) => {
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
