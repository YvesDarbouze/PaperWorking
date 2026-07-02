/* ═══════════════════════════════════════════════════════
   PaperWorking — Admin Panel Mock Data
   
   ⚠️  DEPRECATED — NOT IMPORTED ANYWHERE
   
   All admin pages now use live Firestore + Stripe data via
   server actions in src/actions/admin.ts:
     • getAdminUserStats()     → users, plans, churn
     • getAdminRevenueStats()  → MRR, ARR, subscriptions
     • getAdminActivityStats() → projects, activity feed
     • getAdminAuditLogs()     → audit_logs collection
     • getAdminTickets()       → support_tickets collection
   
   This file is kept as a **type reference** and **seed data
   template** only. Do NOT import from this file in pages.
   If you need to seed Firestore for local dev, use the
   shapes below as a guide.
   ═══════════════════════════════════════════════════════ */

/**
 * @deprecated Use types from '@/actions/admin' instead.
 * This file is retained only as a data-shape reference.
 */

export interface AdminUser {
  id: string;
  displayName: string;
  email: string;
  role: string;
  accountType: 'investor' | 'vendor';
  subscriptionPlan: string;
  subscriptionStatus: 'active' | 'inactive' | 'past_due' | 'canceled' | 'trialing';
  createdAt: string;
  lastLoginAt: string;
  projectCount: number;
}

export interface Subscription {
  id: string;
  userId: string;
  userName: string;
  email: string;
  plan: string;
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  mrr: number;
  startDate: string;
  nextBillingDate: string;
  paymentMethod: string;
}

export interface SupportTicket {
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

export interface AuditLogEntry {
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

export interface KPIMetric {
  label: string;
  value: string;
  change: number;
  changeLabel: string;
  sparkline: number[];
}

// ── KPI Metrics ──────────────────────────────────────
export const kpiMetrics: KPIMetric[] = [
  {
    label: 'Monthly Recurring Revenue',
    value: '$24,850',
    change: 12.4,
    changeLabel: 'vs last month',
    sparkline: [14, 16, 15, 18, 17, 20, 19, 22, 21, 23, 24, 24.8],
  },
  {
    label: 'Active Users',
    value: '1,247',
    change: 8.2,
    changeLabel: 'vs last month',
    sparkline: [900, 950, 980, 1010, 1050, 1080, 1100, 1140, 1180, 1200, 1230, 1247],
  },
  {
    label: 'Churn Rate',
    value: '2.1%',
    change: -0.3,
    changeLabel: 'vs last month',
    sparkline: [3.2, 3.0, 2.8, 2.9, 2.7, 2.5, 2.6, 2.4, 2.3, 2.2, 2.1, 2.1],
  },
  {
    label: 'Open Tickets',
    value: '23',
    change: -15.0,
    changeLabel: 'vs last week',
    sparkline: [42, 38, 35, 33, 30, 28, 27, 26, 25, 24, 23, 23],
  },
  {
    label: 'Avg. Resolution Time',
    value: '4.2h',
    change: -22.0,
    changeLabel: 'vs last month',
    sparkline: [8, 7.5, 7, 6.5, 6, 5.8, 5.5, 5.2, 4.8, 4.5, 4.3, 4.2],
  },
  {
    label: 'Total Projects',
    value: '3,891',
    change: 6.1,
    changeLabel: 'vs last month',
    sparkline: [3200, 3300, 3350, 3420, 3500, 3560, 3620, 3700, 3750, 3810, 3860, 3891],
  },
];

// ── Users ────────────────────────────────────────────
export const adminUsers: AdminUser[] = [
  { id: 'u1', displayName: 'Marcus Chen', email: 'marcus@investco.com', role: 'Lead Investor', accountType: 'investor', subscriptionPlan: 'Team', subscriptionStatus: 'active', createdAt: '2025-11-15', lastLoginAt: '2026-05-11', projectCount: 14 },
  { id: 'u2', displayName: 'Sarah Williams', email: 'sarah@rehabpros.com', role: 'Lead Investor', accountType: 'investor', subscriptionPlan: 'Individual', subscriptionStatus: 'active', createdAt: '2025-12-03', lastLoginAt: '2026-05-10', projectCount: 7 },
  { id: 'u3', displayName: 'James Rodriguez', email: 'james@reiventures.com', role: 'Lead Investor', accountType: 'investor', subscriptionPlan: 'Team', subscriptionStatus: 'active', createdAt: '2026-01-20', lastLoginAt: '2026-05-11', projectCount: 22 },
  { id: 'u4', displayName: 'Emily Foster', email: 'emily@plumbright.com', role: 'Vendor', accountType: 'vendor', subscriptionPlan: 'Vendor Network', subscriptionStatus: 'active', createdAt: '2026-02-10', lastLoginAt: '2026-05-09', projectCount: 0 },
  { id: 'u5', displayName: 'David Park', email: 'david@flipmaster.io', role: 'Lead Investor', accountType: 'investor', subscriptionPlan: 'Individual', subscriptionStatus: 'past_due', createdAt: '2026-01-05', lastLoginAt: '2026-04-28', projectCount: 3 },
  { id: 'u6', displayName: 'Lisa Nguyen', email: 'lisa@capitalrei.com', role: 'Lead Investor', accountType: 'investor', subscriptionPlan: 'Team', subscriptionStatus: 'active', createdAt: '2025-10-22', lastLoginAt: '2026-05-11', projectCount: 31 },
  { id: 'u7', displayName: 'Tom Bradley', email: 'tom@bradleylaw.com', role: 'Vendor', accountType: 'vendor', subscriptionPlan: 'Vendor Network', subscriptionStatus: 'trialing', createdAt: '2026-04-15', lastLoginAt: '2026-05-08', projectCount: 0 },
  { id: 'u8', displayName: 'Rachel Kim', email: 'rachel@homevest.co', role: 'Lead Investor', accountType: 'investor', subscriptionPlan: 'Individual', subscriptionStatus: 'canceled', createdAt: '2025-09-01', lastLoginAt: '2026-03-15', projectCount: 5 },
  { id: 'u9', displayName: 'Alex Martinez', email: 'alex@buildright.com', role: 'General Contractor', accountType: 'vendor', subscriptionPlan: 'Vendor Network', subscriptionStatus: 'active', createdAt: '2026-03-01', lastLoginAt: '2026-05-10', projectCount: 0 },
  { id: 'u10', displayName: 'Priya Sharma', email: 'priya@reifund.io', role: 'Lead Investor', accountType: 'investor', subscriptionPlan: 'Team', subscriptionStatus: 'active', createdAt: '2026-02-28', lastLoginAt: '2026-05-11', projectCount: 18 },
];

// ── Subscriptions ────────────────────────────────────
export const subscriptions: Subscription[] = [
  { id: 's1', userId: 'u1', userName: 'Marcus Chen', email: 'marcus@investco.com', plan: 'Team', status: 'active', mrr: 79, startDate: '2025-11-15', nextBillingDate: '2026-06-15', paymentMethod: 'Visa •••• 4242' },
  { id: 's2', userId: 'u2', userName: 'Sarah Williams', email: 'sarah@rehabpros.com', plan: 'Individual', status: 'active', mrr: 29, startDate: '2025-12-03', nextBillingDate: '2026-06-03', paymentMethod: 'Mastercard •••• 8888' },
  { id: 's3', userId: 'u3', userName: 'James Rodriguez', email: 'james@reiventures.com', plan: 'Team', status: 'active', mrr: 79, startDate: '2026-01-20', nextBillingDate: '2026-06-20', paymentMethod: 'Visa •••• 1234' },
  { id: 's4', userId: 'u4', userName: 'Emily Foster', email: 'emily@plumbright.com', plan: 'Vendor Network', status: 'active', mrr: 49, startDate: '2026-02-10', nextBillingDate: '2026-06-10', paymentMethod: 'Amex •••• 0001' },
  { id: 's5', userId: 'u5', userName: 'David Park', email: 'david@flipmaster.io', plan: 'Individual', status: 'past_due', mrr: 29, startDate: '2026-01-05', nextBillingDate: '2026-05-05', paymentMethod: 'Visa •••• 9999' },
  { id: 's6', userId: 'u6', userName: 'Lisa Nguyen', email: 'lisa@capitalrei.com', plan: 'Team', status: 'active', mrr: 79, startDate: '2025-10-22', nextBillingDate: '2026-06-22', paymentMethod: 'Mastercard •••• 5555' },
  { id: 's7', userId: 'u7', userName: 'Tom Bradley', email: 'tom@bradleylaw.com', plan: 'Vendor Network', status: 'trialing', mrr: 0, startDate: '2026-04-15', nextBillingDate: '2026-05-15', paymentMethod: '—' },
  { id: 's8', userId: 'u10', userName: 'Priya Sharma', email: 'priya@reifund.io', plan: 'Team', status: 'active', mrr: 79, startDate: '2026-02-28', nextBillingDate: '2026-06-28', paymentMethod: 'Visa •••• 7777' },
];

// ── Support Tickets ──────────────────────────────────
export const supportTickets: SupportTicket[] = [
  { id: 'TK-1042', subject: 'Cannot access Phase 3 rehab tracker', requesterName: 'Marcus Chen', requesterEmail: 'marcus@investco.com', priority: 'high', status: 'open', category: 'Bug Report', createdAt: '2026-05-11T14:22:00Z', updatedAt: '2026-05-11T14:22:00Z', assignee: 'Support Team' },
  { id: 'TK-1041', subject: 'Billing charge duplicate on Team plan', requesterName: 'Lisa Nguyen', requesterEmail: 'lisa@capitalrei.com', priority: 'urgent', status: 'in_progress', category: 'Billing', createdAt: '2026-05-11T10:15:00Z', updatedAt: '2026-05-11T12:30:00Z', assignee: 'Alex M.' },
  { id: 'TK-1040', subject: 'Feature request: bulk property import', requesterName: 'James Rodriguez', requesterEmail: 'james@reiventures.com', priority: 'low', status: 'open', category: 'Feature Request', createdAt: '2026-05-10T22:00:00Z', updatedAt: '2026-05-10T22:00:00Z', assignee: 'Unassigned' },
  { id: 'TK-1039', subject: 'PDF export missing settlement line items', requesterName: 'Sarah Williams', requesterEmail: 'sarah@rehabpros.com', priority: 'medium', status: 'waiting', category: 'Bug Report', createdAt: '2026-05-10T16:45:00Z', updatedAt: '2026-05-11T09:00:00Z', assignee: 'Support Team' },
  { id: 'TK-1038', subject: 'Team member invitation email not sending', requesterName: 'Priya Sharma', requesterEmail: 'priya@reifund.io', priority: 'high', status: 'in_progress', category: 'Bug Report', createdAt: '2026-05-10T11:20:00Z', updatedAt: '2026-05-11T08:15:00Z', assignee: 'Alex M.' },
  { id: 'TK-1037', subject: 'How to connect Stripe for vendor payments?', requesterName: 'Emily Foster', requesterEmail: 'emily@plumbright.com', priority: 'low', status: 'resolved', category: 'General Inquiry', createdAt: '2026-05-09T15:30:00Z', updatedAt: '2026-05-10T10:00:00Z', assignee: 'Support Team' },
  { id: 'TK-1036', subject: 'MLS data sync stuck on "processing"', requesterName: 'David Park', requesterEmail: 'david@flipmaster.io', priority: 'medium', status: 'open', category: 'Bug Report', createdAt: '2026-05-09T09:10:00Z', updatedAt: '2026-05-09T09:10:00Z', assignee: 'Unassigned' },
  { id: 'TK-1035', subject: 'Need contractor onboarding documentation', requesterName: 'Alex Martinez', requesterEmail: 'alex@buildright.com', priority: 'low', status: 'closed', category: 'General Inquiry', createdAt: '2026-05-08T14:00:00Z', updatedAt: '2026-05-09T11:00:00Z', assignee: 'Support Team' },
];

// ── Audit Logs ───────────────────────────────────────
export const auditLogs: AuditLogEntry[] = [
  { id: 'al1', action: 'user.login', actor: 'Marcus Chen', actorEmail: 'marcus@investco.com', target: 'Session', details: 'Successful login via email/password', ipAddress: '72.134.22.101', timestamp: '2026-05-11T17:10:00Z', severity: 'info' },
  { id: 'al2', action: 'subscription.updated', actor: 'System', actorEmail: 'system@paperworking.co', target: 'Lisa Nguyen', details: 'Plan upgraded from Individual to Team', ipAddress: '—', timestamp: '2026-05-11T16:45:00Z', severity: 'info' },
  { id: 'al3', action: 'user.password_reset', actor: 'David Park', actorEmail: 'david@flipmaster.io', target: 'Self', details: 'Password reset requested', ipAddress: '98.45.12.77', timestamp: '2026-05-11T15:30:00Z', severity: 'warning' },
  { id: 'al4', action: 'project.deleted', actor: 'James Rodriguez', actorEmail: 'james@reiventures.com', target: 'Project #PRJ-0047', details: 'Permanent deletion of archived project', ipAddress: '104.22.55.88', timestamp: '2026-05-11T14:20:00Z', severity: 'warning' },
  { id: 'al5', action: 'admin.role_changed', actor: 'Platform Admin', actorEmail: 'admin@paperworking.co', target: 'Tom Bradley', details: 'Role changed from Standard to Vendor', ipAddress: '10.0.1.50', timestamp: '2026-05-11T13:00:00Z', severity: 'critical' },
  { id: 'al6', action: 'user.login_failed', actor: 'Unknown', actorEmail: 'unknown@test.com', target: 'Session', details: 'Failed login attempt — invalid credentials (3rd attempt)', ipAddress: '185.220.101.42', timestamp: '2026-05-11T12:15:00Z', severity: 'critical' },
  { id: 'al7', action: 'billing.payment_failed', actor: 'System', actorEmail: 'system@paperworking.co', target: 'David Park', details: 'Visa •••• 9999 declined — insufficient funds', ipAddress: '—', timestamp: '2026-05-11T11:00:00Z', severity: 'warning' },
  { id: 'al8', action: 'user.created', actor: 'System', actorEmail: 'system@paperworking.co', target: 'Tom Bradley', details: 'New user registration via Google SSO', ipAddress: '73.15.88.201', timestamp: '2026-05-11T10:30:00Z', severity: 'info' },
  { id: 'al9', action: 'document.uploaded', actor: 'Sarah Williams', actorEmail: 'sarah@rehabpros.com', target: 'Project #PRJ-0102', details: 'Uploaded "Closing Disclosure.pdf" (2.4 MB)', ipAddress: '68.44.120.33', timestamp: '2026-05-11T09:45:00Z', severity: 'info' },
  { id: 'al10', action: 'api.rate_limited', actor: 'System', actorEmail: 'system@paperworking.co', target: 'API Gateway', details: 'Rate limit exceeded for IP 185.220.101.42 — 429 returned', ipAddress: '185.220.101.42', timestamp: '2026-05-11T08:00:00Z', severity: 'critical' },
];

// ── Revenue Chart Data ───────────────────────────────
export const revenueChartData = [
  { month: 'Dec', mrr: 8200, users: 420 },
  { month: 'Jan', mrr: 11400, users: 580 },
  { month: 'Feb', mrr: 14100, users: 720 },
  { month: 'Mar', mrr: 16800, users: 870 },
  { month: 'Apr', mrr: 21200, users: 1080 },
  { month: 'May', mrr: 24850, users: 1247 },
];

// ── Plan Distribution ────────────────────────────────
export const planDistribution = [
  { name: 'Individual', count: 412, color: '#A5A5A5' },
  { name: 'Team', count: 287, color: '#595959' },
  { name: 'Vendor Network', count: 148, color: '#0d0d0d' },
  { name: 'Free / None', count: 400, color: '#CCCCCC' },
];

// ── Recent Activity Feed ─────────────────────────────
export interface ActivityItem {
  id: string;
  type: 'signup' | 'upgrade' | 'ticket' | 'churn' | 'payment';
  message: string;
  timestamp: string;
}

export const recentActivity: ActivityItem[] = [
  { id: 'a1', type: 'signup', message: 'Tom Bradley signed up via Google SSO', timestamp: '2 hours ago' },
  { id: 'a2', type: 'upgrade', message: 'Lisa Nguyen upgraded to Team plan', timestamp: '3 hours ago' },
  { id: 'a3', type: 'ticket', message: 'New urgent ticket: Billing charge duplicate', timestamp: '5 hours ago' },
  { id: 'a4', type: 'payment', message: 'Payment failed for David Park (Visa •••• 9999)', timestamp: '6 hours ago' },
  { id: 'a5', type: 'signup', message: 'Alex Martinez joined as Vendor', timestamp: '1 day ago' },
  { id: 'a6', type: 'churn', message: 'Rachel Kim canceled Individual plan', timestamp: '2 days ago' },
  { id: 'a7', type: 'upgrade', message: 'Priya Sharma upgraded to Team plan', timestamp: '3 days ago' },
  { id: 'a8', type: 'ticket', message: 'Ticket TK-1037 resolved — Stripe vendor payments', timestamp: '3 days ago' },
];
