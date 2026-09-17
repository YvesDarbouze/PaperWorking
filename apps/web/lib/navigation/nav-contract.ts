export interface NavigationContext {
  role?: string | null;
  accountType?: 'investor' | 'vendor' | string | null;
  subscriptionPlan?: string | null;
  isSubscribed?: boolean;
}

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  requiresSubscription?: boolean;
  isLocked?: boolean;
  rolesAllowed: ('investor' | 'vendor')[];
}

export function isVendorContext(ctx: NavigationContext): boolean {
  const role = (ctx.role || '').toLowerCase();
  const acct = (ctx.accountType || '').toLowerCase();
  const plan = (ctx.subscriptionPlan || '').toLowerCase();
  return role.includes('vendor') || acct === 'vendor' || plan.includes('vendor');
}

export function isSubscribedInvestor(ctx: NavigationContext): boolean {
  if (isVendorContext(ctx)) return false;
  if (ctx.isSubscribed !== undefined) return ctx.isSubscribed;
  const plan = (ctx.subscriptionPlan || '').toLowerCase();
  if (!plan) return true;
  return !plan.includes('free') && !plan.includes('none') && !plan.includes('unsubscribed');
}

export function resolvePrimaryNav(ctx: NavigationContext): NavItem[] {
  const isVendor = isVendorContext(ctx);
  const isSubscribed = isSubscribedInvestor(ctx);

  if (isVendor) {
    return [
      { id: 'portfolio', label: 'Portfolio', href: '/dashboard', icon: 'analytics', rolesAllowed: ['vendor'] },
      { id: 'vendor-marketplace', label: 'Vendor Marketplace', href: '/dashboard/marketplace', icon: 'storefront', rolesAllowed: ['vendor'] },
      { id: 'insights', label: 'Insights', href: '/dashboard/insights', icon: 'insights', rolesAllowed: ['vendor'] },
      { id: 'reports', label: 'Reports', href: '/dashboard/reports', icon: 'description', rolesAllowed: ['vendor'] },
      { id: 'inbox', label: 'Inbox', href: '/dashboard/inbox', icon: 'inbox', rolesAllowed: ['vendor'] },
      { id: 'team', label: 'Team', href: '/dashboard/team', icon: 'groups', rolesAllowed: ['vendor'] },
    ];
  }

  return [
    { id: 'portfolio', label: 'Portfolio', href: '/dashboard', icon: 'analytics', rolesAllowed: ['investor'] },
    { id: 'projects', label: 'Projects', href: '/projects', icon: 'folder_open', rolesAllowed: ['investor'] },
    {
      id: 'marketplace',
      label: 'Vendor Directory',
      href: '/dashboard/marketplace',
      icon: 'storefront',
      rolesAllowed: ['investor'],
    },
    {
      id: 'deals',
      label: 'Deals Marketplace',
      href: '/dashboard/deals',
      icon: 'handshake',
      requiresSubscription: true,
      isLocked: !isSubscribed,
      rolesAllowed: ['investor'],
    },
    { id: 'insights', label: 'Insights', href: '/dashboard/insights', icon: 'insights', rolesAllowed: ['investor'] },
    { id: 'reports', label: 'Reports', href: '/dashboard/reports', icon: 'description', rolesAllowed: ['investor'] },
    { id: 'inbox', label: 'Inbox', href: '/dashboard/inbox', icon: 'inbox', rolesAllowed: ['investor'] },
    { id: 'team', label: 'Team', href: '/dashboard/team', icon: 'groups', rolesAllowed: ['investor'] },
  ];
}

export function resolveAccountNav(_ctx: NavigationContext): NavItem[] {
  return [
    { id: 'profile', label: 'Profile', href: '/dashboard/profile', icon: 'account_circle', rolesAllowed: ['investor', 'vendor'] },
    { id: 'settings', label: 'Settings', href: '/dashboard/settings', icon: 'settings', rolesAllowed: ['investor', 'vendor'] },
  ];
}

export function resolveBottomNav(ctx: NavigationContext): NavItem[] {
  if (isVendorContext(ctx)) {
    return [
      { id: 'projects', label: 'Projects', href: '/projects', icon: 'folder_open', rolesAllowed: ['vendor'] },
      { id: 'calculator', label: 'Deal Calculator', href: '/deal-calculator', icon: 'calculate', rolesAllowed: ['vendor'] },
      { id: 'portfolio', label: 'Portfolio', href: '/dashboard', icon: 'analytics', rolesAllowed: ['vendor'] },
      { id: 'support', label: 'Support', href: '/support', icon: 'smart_toy', rolesAllowed: ['vendor'] },
      { id: 'more', label: 'More', href: '#more', icon: 'menu', rolesAllowed: ['vendor'] },
    ];
  }

  return [
    { id: 'projects', label: 'Projects', href: '/projects', icon: 'folder_open', rolesAllowed: ['investor'] },
    { id: 'calculator', label: 'Deal Calculator', href: '/deal-calculator', icon: 'calculate', rolesAllowed: ['investor'] },
    { id: 'portfolio', label: 'Portfolio', href: '/dashboard', icon: 'analytics', rolesAllowed: ['investor'] },
    { id: 'support', label: 'Support', href: '/support', icon: 'smart_toy', rolesAllowed: ['investor'] },
    { id: 'more', label: 'More', href: '#more', icon: 'menu', rolesAllowed: ['investor'] },
  ];
}

export function resolveDrawerNav(ctx: NavigationContext): NavItem[] {
  const isVendor = isVendorContext(ctx);
  const isSubscribed = isSubscribedInvestor(ctx);

  if (isVendor) {
    return [
      { id: 'marketplace', label: 'Vendor Marketplace', href: '/dashboard/marketplace', icon: 'storefront', rolesAllowed: ['vendor'] },
      { id: 'vendor-portal', label: 'Vendor Portal / RFPs', href: '/vendor-portal', icon: 'request_quote', rolesAllowed: ['vendor'] },
      { id: 'insights', label: 'Insights', href: '/dashboard/insights', icon: 'insights', rolesAllowed: ['vendor'] },
      { id: 'reports', label: 'Reports', href: '/dashboard/reports', icon: 'description', rolesAllowed: ['vendor'] },
      { id: 'inbox', label: 'Inbox', href: '/dashboard/inbox', icon: 'inbox', rolesAllowed: ['vendor'] },
      { id: 'team', label: 'Team', href: '/dashboard/team', icon: 'groups', rolesAllowed: ['vendor'] },
      { id: 'profile', label: 'Profile', href: '/dashboard/profile', icon: 'account_circle', rolesAllowed: ['vendor'] },
      { id: 'settings', label: 'Settings', href: '/dashboard/settings', icon: 'settings', rolesAllowed: ['vendor'] },
    ];
  }

  return [
    {
      id: 'deals',
      label: 'Deals Marketplace',
      href: '/dashboard/deals',
      icon: 'handshake',
      requiresSubscription: true,
      isLocked: !isSubscribed,
      rolesAllowed: ['investor'],
    },
    { id: 'insights', label: 'Portfolio Insights', href: '/dashboard/insights', icon: 'insights', rolesAllowed: ['investor'] },
    { id: 'reports', label: 'Reports & Statements', href: '/dashboard/reports', icon: 'description', rolesAllowed: ['investor'] },
    { id: 'inbox', label: 'Inbox & Notifications', href: '/dashboard/inbox', icon: 'inbox', rolesAllowed: ['investor'] },
    { id: 'team', label: 'Team Members', href: '/dashboard/team', icon: 'groups', rolesAllowed: ['investor'] },
    { id: 'marketplace', label: 'Vendor Directory', href: '/dashboard/marketplace', icon: 'storefront', rolesAllowed: ['investor'] },
    { id: 'vendor-portal', label: 'Submit RFP / Quote', href: '/vendor-portal', icon: 'request_quote', rolesAllowed: ['investor'] },
    { id: 'profile', label: 'Profile', href: '/dashboard/profile', icon: 'account_circle', rolesAllowed: ['investor'] },
    { id: 'settings', label: 'Settings & Billing', href: '/dashboard/settings', icon: 'settings', rolesAllowed: ['investor'] },
  ];
}

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard': 'Portfolio',
  '/dashboard/command-center': 'Portfolio',
  '/projects': 'Projects',
  '/dashboard/projects': 'Projects',
  '/deal-calculator': 'Deal Calculator',
  '/support': 'Support',
  '/dashboard/deals': 'Deals Marketplace',
  '/dashboard/inbox': 'Inbox',
  '/dashboard/team': 'Team',
  '/dashboard/reports': 'Reports',
  '/dashboard/insights': 'Insights',
  '/dashboard/marketplace': 'Vendor Marketplace',
  '/dashboard/profile': 'Profile',
  '/dashboard/settings': 'Settings',
  '/vendor-portal': 'Vendor Portal',
};

export function getPageLabel(pathname: string): string {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
  const sorted = Object.keys(ROUTE_LABELS).sort((a, b) => b.length - a.length);
  for (const route of sorted) {
    if (route === '/dashboard') {
      // Exact only — avoid matching every /dashboard/* child as Portfolio
      continue;
    }
    if (pathname.startsWith(route)) return ROUTE_LABELS[route];
  }
  return 'Dashboard';
}

/** Active highlight for sidebar / bottom nav items. */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === '/dashboard') return false;
  if (href === '/projects' && pathname.startsWith('/project')) return true;
  return pathname.startsWith(`${href}/`);
}

/** Determines whether the current route belongs to one of the mobile drawer items. */
export function isDrawerRouteActive(pathname: string, drawerItems: NavItem[]): boolean {
  return drawerItems.some((item) => isNavItemActive(pathname, item.href));
}

