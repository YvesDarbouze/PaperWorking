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
  isPrimary?: boolean;
  requiresSubscription?: boolean;
  isLocked?: boolean;
  badge?: string | number;
  rolesAllowed: ('investor' | 'vendor')[];
}

/**
  * Helper to determine if current persona is a Vendor.
  */
export function isVendorContext(ctx: NavigationContext): boolean {
  if (!ctx) return false;
  const role = (ctx.role || '').toLowerCase();
  const acct = (ctx.accountType || '').toLowerCase();
  const plan = (ctx.subscriptionPlan || '').toLowerCase();
  return (
    role.includes('vendor') ||
    acct === 'vendor' ||
    plan.includes('vendor')
  );
}

/**
  * Helper to determine if Investor is subscribed.
  */
export function isSubscribedInvestor(ctx: NavigationContext): boolean {
  if (isVendorContext(ctx)) return false;
  if (ctx.isSubscribed !== undefined) return ctx.isSubscribed;
  const plan = (ctx.subscriptionPlan || '').toLowerCase();
  if (!plan) return true; // Default mock users to active plan
  return !plan.includes('free') && !plan.includes('none') && !plan.includes('unsubscribed');
}

/**
  * Primary Navigation Items (Desktop Sidebar)
  * Global Navigation Contract §9.3 v7
  */
export function resolvePrimaryNav(ctx: NavigationContext): NavItem[] {
  const isVendor = isVendorContext(ctx);
  const isSubscribed = isSubscribedInvestor(ctx);

  if (isVendor) {
    return [
      {
        id: 'portfolio',
        label: 'Portfolio',
        href: '/dashboard/command-center',
        icon: 'analytics',
        rolesAllowed: ['vendor'],
      },
      {
        id: 'vendor-marketplace',
        label: 'Vendor Marketplace',
        href: '/dashboard/marketplace',
        icon: 'storefront',
        rolesAllowed: ['vendor'],
      },
      {
        id: 'insights',
        label: 'Insights',
        href: '/dashboard/insights',
        icon: 'insights',
        rolesAllowed: ['vendor'],
      },
      {
        id: 'reports',
        label: 'Reports',
        href: '/dashboard/reports',
        icon: 'description',
        rolesAllowed: ['vendor'],
      },
      {
        id: 'inbox',
        label: 'Inbox',
        href: '/dashboard/inbox',
        icon: 'inbox',
        rolesAllowed: ['vendor'],
      },
      {
        id: 'team',
        label: 'Team',
        href: '/dashboard/team',
        icon: 'groups',
        rolesAllowed: ['vendor'],
      },
    ];
  }

  // Investor Persona (Contract §9.3 v7 Matrix)
  return [
    {
      id: 'portfolio',
      label: 'Portfolio',
      href: '/dashboard/command-center',
      icon: 'analytics',
      rolesAllowed: ['investor'],
    },
    {
      id: 'projects',
      label: 'Projects',
      href: '/dashboard/projects',
      icon: 'folder_open',
      rolesAllowed: ['investor'],
    },
    {
      id: 'insights',
      label: 'Insights',
      href: '/dashboard/insights',
      icon: 'insights',
      rolesAllowed: ['investor'],
    },
    {
      id: 'reports',
      label: 'Reports',
      href: '/dashboard/reports',
      icon: 'description',
      rolesAllowed: ['investor'],
    },
    {
      id: 'inbox',
      label: 'Inbox',
      href: '/dashboard/inbox',
      icon: 'inbox',
      rolesAllowed: ['investor'],
    },
    {
      id: 'team',
      label: 'Team',
      href: '/dashboard/team',
      icon: 'groups',
      rolesAllowed: ['investor'],
    },
  ];
}

/**
  * Account Navigation Items
  */
export function resolveAccountNav(_ctx: NavigationContext): NavItem[] {
  return [
    {
      id: 'profile',
      label: 'Profile',
      href: '/dashboard/settings/profile',
      icon: 'account_circle',
      rolesAllowed: ['investor', 'vendor'],
    },
    {
      id: 'billing',
      label: 'Billing',
      href: '/dashboard/settings/billing',
      icon: 'credit_card',
      rolesAllowed: ['investor', 'vendor'],
    },
    {
      id: 'settings',
      label: 'Settings',
      href: '/dashboard/settings',
      icon: 'settings',
      rolesAllowed: ['investor', 'vendor'],
    },
  ];
}

/**
  * Mobile Bottom Bar Items (5 fixed icons for Investors)
  * Contract §9.3 v7: Portfolio, Insights, Projects, Reports, Inbox
  */
export function resolveBottomNav(ctx: NavigationContext): NavItem[] {
  const isVendor = isVendorContext(ctx);
  if (isVendor) {
    return [
      { id: 'portfolio', label: 'Portfolio', href: '/dashboard/command-center', icon: 'analytics', rolesAllowed: ['vendor'] },
      { id: 'marketplace', label: 'Marketplace', href: '/dashboard/marketplace', icon: 'storefront', rolesAllowed: ['vendor'] },
      { id: 'insights', label: 'Insights', href: '/dashboard/insights', icon: 'insights', rolesAllowed: ['vendor'] },
      { id: 'inbox', label: 'Inbox', href: '/dashboard/inbox', icon: 'inbox', rolesAllowed: ['vendor'] },
      { id: 'team', label: 'Team', href: '/dashboard/team', icon: 'groups', rolesAllowed: ['vendor'] },
    ];
  }

  return [
    { id: 'portfolio', label: 'Portfolio', href: '/dashboard/command-center', icon: 'analytics', rolesAllowed: ['investor'] },
    { id: 'insights', label: 'Insights', href: '/dashboard/insights', icon: 'insights', rolesAllowed: ['investor'] },
    { id: 'projects', label: 'Projects', href: '/dashboard/projects', icon: 'folder_open', rolesAllowed: ['investor'] },
    { id: 'reports', label: 'Reports', href: '/dashboard/reports', icon: 'description', rolesAllowed: ['investor'] },
    { id: 'inbox', label: 'Inbox', href: '/dashboard/inbox', icon: 'inbox', rolesAllowed: ['investor'] },
  ];
}

/**
  * Mobile Top Drawer Navigation Items
  */
export function resolveMobileDrawerNav(ctx: NavigationContext): NavItem[] {
  const isVendor = isVendorContext(ctx);
  const isSubscribed = isSubscribedInvestor(ctx);

  if (isVendor) {
    return [
      { id: 'team', label: 'Team', href: '/dashboard/team', icon: 'groups', rolesAllowed: ['vendor'] },
      { id: 'profile', label: 'Profile', href: '/dashboard/settings/profile', icon: 'account_circle', rolesAllowed: ['vendor'] },
      { id: 'billing', label: 'Billing', href: '/dashboard/settings/billing', icon: 'credit_card', rolesAllowed: ['vendor'] },
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
    {
      id: 'vendor-network',
      label: 'Vendor Network',
      href: '/dashboard/team?tab=vendors',
      icon: 'handyman',
      rolesAllowed: ['investor'],
    },
    { id: 'team', label: 'Team', href: '/dashboard/team', icon: 'groups', rolesAllowed: ['investor'] },
    { id: 'profile', label: 'Profile', href: '/dashboard/settings/profile', icon: 'account_circle', rolesAllowed: ['investor'] },
    { id: 'billing', label: 'Billing', href: '/dashboard/settings/billing', icon: 'credit_card', rolesAllowed: ['investor'] },
    { id: 'settings', label: 'Settings', href: '/dashboard/settings', icon: 'settings', rolesAllowed: ['investor'] },
  ];
}

/**
  * Cmd+K Search Command Indexer
  * Strictly excludes Deals for Vendor accounts.
  */
export function resolveCmdKNav(ctx: NavigationContext): NavItem[] {
  const primary = resolvePrimaryNav(ctx);
  const account = resolveAccountNav(ctx);
  const isVendor = isVendorContext(ctx);

  const items = [...primary, ...account];

  if (!isVendor) {
    items.push({
      id: 'vendor-network',
      label: 'Vendor Network',
      href: '/dashboard/team?tab=vendors',
      icon: 'handyman',
      rolesAllowed: ['investor'],
    });
  }

  return items;
}

/**
  * Breadcrumb Resolver
  */
export function getBreadcrumbPath(pathname: string): { label: string; href: string }[] {
  const crumbs: { label: string; href: string }[] = [
    { label: 'Dashboard', href: '/dashboard/command-center' },
  ];

  if (pathname === '/dashboard/command-center') {
    crumbs.push({ label: 'Portfolio', href: '/dashboard/command-center' });
  } else if (pathname.startsWith('/dashboard/deals')) {
    crumbs.push({ label: 'Deals', href: '/dashboard/deals' });
  } else if (pathname.startsWith('/dashboard/marketplace')) {
    crumbs.push({ label: 'Vendor Marketplace', href: '/dashboard/marketplace' });
  } else if (pathname.startsWith('/dashboard/projects')) {
    crumbs.push({ label: 'Projects', href: '/dashboard/projects' });
  } else if (pathname.startsWith('/dashboard/insights')) {
    crumbs.push({ label: 'Insights', href: '/dashboard/insights' });
  } else if (pathname.startsWith('/dashboard/reports')) {
    crumbs.push({ label: 'Reports', href: '/dashboard/reports' });
  } else if (pathname.startsWith('/dashboard/inbox')) {
    crumbs.push({ label: 'Inbox', href: '/dashboard/inbox' });
  } else if (pathname.startsWith('/dashboard/team')) {
    crumbs.push({ label: 'Team', href: '/dashboard/team' });
  } else if (pathname.startsWith('/dashboard/settings/profile')) {
    crumbs.push({ label: 'Account', href: '/dashboard/settings' });
    crumbs.push({ label: 'Profile', href: '/dashboard/settings/profile' });
  } else if (pathname.startsWith('/dashboard/settings/billing')) {
    crumbs.push({ label: 'Account', href: '/dashboard/settings' });
    crumbs.push({ label: 'Billing', href: '/dashboard/settings/billing' });
  } else if (pathname.startsWith('/dashboard/settings')) {
    crumbs.push({ label: 'Account', href: '/dashboard/settings' });
    crumbs.push({ label: 'Settings', href: '/dashboard/settings' });
  }

  return crumbs;
}
