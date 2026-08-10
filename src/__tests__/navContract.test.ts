import {
  resolvePrimaryNav,
  resolveAccountNav,
  resolveBottomNav,
  resolveMobileDrawerNav,
  resolveCmdKNav,
  isVendorContext,
  isSubscribedInvestor,
} from '@/lib/navigation/navContract';

describe('Global Navigation Contract §9.3 v7 Single Source of Truth Resolver', () => {
  describe('Persona 1: Investor (Subscribed)', () => {
    const ctx = {
      role: 'Lead Investor',
      accountType: 'investor',
      subscriptionPlan: 'Professional',
      isSubscribed: true,
    };

    it('returns exact primary nav array for subscribed investor', () => {
      const items = resolvePrimaryNav(ctx);
      const labels = items.map((i) => i.label);
      expect(labels).toEqual([
        'Portfolio',
        'Projects',
        'Deals',
        'Insights',
        'Reports',
        'Inbox',
        'Team',
      ]);

      const deals = items.find((i) => i.id === 'deals');
      expect(deals).toBeDefined();
      expect(deals?.isLocked).toBe(false);
      expect(deals?.href).toBe('/dashboard/deals');
      expect(deals?.icon).toBe('handshake');
    });

    it('returns 5-icon bottom bar for subscribed investor', () => {
      const items = resolveBottomNav(ctx);
      const labels = items.map((i) => i.label);
      expect(labels).toEqual(['Portfolio', 'Insights', 'Projects', 'Reports', 'Inbox']);
    });

    it('returns mobile drawer items including unlocked Deals and Team', () => {
      const items = resolveMobileDrawerNav(ctx);
      const labels = items.map((i) => i.label);
      expect(labels).toContain('Deals Marketplace');
      expect(labels).toContain('Team');

      const deals = items.find((i) => i.id === 'deals');
      expect(deals?.isLocked).toBe(false);
    });

    it('includes Deals in Cmd+K search index', () => {
      const items = resolveCmdKNav(ctx);
      const deals = items.find((i) => i.id === 'deals');
      expect(deals).toBeDefined();
    });
  });

  describe('Persona 2: Investor (Unsubscribed)', () => {
    const ctx = {
      role: 'Lead Investor',
      accountType: 'investor',
      subscriptionPlan: 'Free Trial',
      isSubscribed: false,
    };

    it('renders Deals with lock badge for unsubscribed investor', () => {
      const items = resolvePrimaryNav(ctx);
      const deals = items.find((i) => i.id === 'deals');
      expect(deals).toBeDefined();
      expect(deals?.isLocked).toBe(true);
    });

    it('renders Deals with lock badge in mobile drawer for unsubscribed investor', () => {
      const items = resolveMobileDrawerNav(ctx);
      const deals = items.find((i) => i.id === 'deals');
      expect(deals).toBeDefined();
      expect(deals?.isLocked).toBe(true);
    });
  });

  describe('Persona 3: Vendor Account', () => {
    const ctx = {
      role: 'Vendor',
      accountType: 'vendor',
      subscriptionPlan: 'Vendor Network',
      isSubscribed: true,
    };

    it('returns Vendor primary nav with Vendor Marketplace and zero Deals', () => {
      const items = resolvePrimaryNav(ctx);
      const labels = items.map((i) => i.label);
      expect(labels).toEqual([
        'Portfolio',
        'Vendor Marketplace',
        'Insights',
        'Reports',
        'Inbox',
        'Team',
      ]);
      expect(items.find((i) => i.id === 'deals')).toBeUndefined();
    });

    it('returns Vendor 5-icon bottom bar including Marketplace and Team', () => {
      const items = resolveBottomNav(ctx);
      const labels = items.map((i) => i.label);
      expect(labels).toEqual(['Portfolio', 'Marketplace', 'Insights', 'Inbox', 'Team']);
    });

    it('strictly strips Deals from Vendor Cmd+K search index', () => {
      const items = resolveCmdKNav(ctx);
      const deals = items.find((i) => i.id === 'deals');
      expect(deals).toBeUndefined();
    });

    it('strictly strips Deals from Vendor mobile drawer', () => {
      const items = resolveMobileDrawerNav(ctx);
      const deals = items.find((i) => i.id === 'deals');
      expect(deals).toBeUndefined();
    });
  });

  describe('Persona 4: Unauthenticated / Default Context', () => {
    it('correctly classifies investor vs vendor context', () => {
      expect(isVendorContext({ role: 'Vendor' })).toBe(true);
      expect(isVendorContext({ accountType: 'vendor' })).toBe(true);
      expect(isVendorContext({ role: 'Investor' })).toBe(false);
    });
  });
});
