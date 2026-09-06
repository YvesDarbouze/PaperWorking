export const ADMIN_PRIMARY_NAV = [
  { id: 'overview', label: 'Overview', href: '/admin', icon: 'dashboard', exact: true as const },
  { id: 'users', label: 'Users', href: '/admin/users', icon: 'group' },
  { id: 'organizations', label: 'Organizations', href: '/admin/organizations', icon: 'corporate_fare' },
  { id: 'projects', label: 'Projects', href: '/admin/projects', icon: 'folder_open' },
  { id: 'subscriptions', label: 'Billing', href: '/admin/subscriptions', icon: 'credit_card' },
  { id: 'tickets', label: 'Tickets', href: '/admin/tickets', icon: 'confirmation_number' },
  { id: 'audit', label: 'Audit Logs', href: '/admin/audit', icon: 'shield' },
  { id: 'analytics', label: 'Analytics', href: '/admin/analytics', icon: 'bar_chart' },
] as const;

export const ADMIN_SECONDARY_NAV = [
  { id: 'marketplace', label: 'Marketplace', href: '/admin/marketplace', icon: 'storefront' },
  { id: 'integrations', label: 'Integrations', href: '/admin/integrations', icon: 'hub' },
  { id: 'agent-crew', label: 'Agent crew', href: '/admin/agent-crew', icon: 'smart_toy' },
  { id: 'lender-config', label: 'Lender config', href: '/admin/lender-config', icon: 'account_balance' },
] as const;

export const ADMIN_ROUTE_LABELS: Record<string, string> = {
  '/admin': 'Overview',
  '/admin/users': 'User Management',
  '/admin/organizations': 'Organizations',
  '/admin/projects': 'Projects',
  '/admin/subscriptions': 'Billing & Subscriptions',
  '/admin/tickets': 'Support Tickets',
  '/admin/audit': 'Audit Logs',
  '/admin/analytics': 'Analytics',
  '/admin/marketplace': 'Marketplace Ops',
  '/admin/integrations': 'Integrations',
  '/admin/agent-crew': 'Agent Crew',
  '/admin/lender-config': 'Lender Config',
};
