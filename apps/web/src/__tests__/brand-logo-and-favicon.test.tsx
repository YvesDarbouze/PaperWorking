import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import fs from 'fs';
import path from 'path';

const { default: PaperWorkingIcon } = await import('../../components/brand/icons/PaperWorkingIcon.js');
const { default: PaperWorkingLogotype } = await import('../../components/brand/icons/PaperWorkingLogotype.js');
const { default: Logo } = await import('../../components/marketing/Logo.js');
const {
  resolvePrimaryNav,
  resolveAccountNav,
  resolveDrawerNav,
  isDrawerRouteActive,
} = await import('../../lib/navigation/nav-contract.js');

describe('Brand Logo, Favicon & Responsive Navigation Verification', () => {
  describe('1. PaperWorkingIcon (New Inbox Tray Vector)', () => {
    it('renders the new inbox tray shape with viewBox 0 0 800 300', () => {
      const html = renderToString(<PaperWorkingIcon />);
      expect(html).toContain('viewBox="0 0 800 300"');
      expect(html).toContain('M 28 0 H 172');
      expect(html).toContain('H 572');
      expect(html).toContain('H 772');
    });

    it('does NOT contain the legacy 3 floating rectangle lines', () => {
      const html = renderToString(<PaperWorkingIcon />);
      expect(html).not.toContain('<rect');
    });
  });

  describe('2. PaperWorkingLogotype (New Inbox Tray + Proportional Wordmark)', () => {
    it('renders viewBox 0 0 400 51.38 with the new inbox tray aligned with baseline', () => {
      const html = renderToString(<PaperWorkingLogotype />);
      expect(html).toContain('viewBox="0 0 400 51.38"');
      expect(html).toContain('M 2.59 24.03 H 10.14');
    });

    it('does NOT contain the legacy 3 floating rects in the logotype', () => {
      const html = renderToString(<PaperWorkingLogotype />);
      expect(html).not.toContain('<rect');
    });
  });

  describe('3. Responsive Logo Component & Mobile Brand Wordmark Visibility (Bug_52)', () => {
    it('renders full PaperWorkingLogotype (icon + brand wordmark) on both mobile and desktop without hiding wordmark on mobile', () => {
      const html = renderToString(<Logo href="/" size="h-8" />);
      expect(html).toContain('viewBox="0 0 400 51.38"');
      expect(html).not.toContain('hidden select-none md:block');
      expect(html).not.toContain('viewBox="0 0 800 300"');
    });

    it('renders proportionally scaled full logotype (132x17) for dashboard sidebar and mobile hamburger drawer (size={22} variant="full")', () => {
      const html = renderToString(
        <Logo href="/dashboard" tone="dashboard" theme="dark" size={22} variant="full" />
      );
      expect(html).toContain('viewBox="0 0 400 51.38"');
      expect(html).toContain('width="132"');
      expect(html).toContain('height="17"');
      expect(html).not.toContain('viewBox="0 0 800 300"');
    });

    it('configures DashboardMobileDrawer header with variant="full" and size={22} matching DashboardSidebar (Bug_52)', () => {
      const drawerFile = path.resolve(
        process.cwd(),
        'components/dashboard/DashboardMobileDrawer.tsx'
      );
      const drawerSrc = fs.readFileSync(drawerFile, 'utf-8');
      expect(drawerSrc).toContain(
        '<Logo href="/dashboard" tone="dashboard" theme="dark" size={22} variant="full" />'
      );
      expect(drawerSrc).not.toContain('variant="icon"');
    });

    it('renders single icon when variant="icon" is explicitly specified', () => {
      const html = renderToString(<Logo variant="icon" size={24} />);
      expect(html).toContain('viewBox="0 0 800 300"');
      expect(html).not.toContain('viewBox="0 0 400 51.38"');
    });

    it('uses correct 800/300 aspect ratio for icon dimensions', () => {
      const html = renderToString(<Logo variant="icon" size={30} />);
      // 30 * (800 / 300) = 80
      expect(html).toContain('height="30"');
      expect(html).toContain('width="80"');
    });
  });

  describe('4. Favicon & White Icon Assets Verification', () => {
    it('configures metadata.icons in layout.tsx with the White Icon and favicon.ico', () => {
      const layoutFile = path.resolve(process.cwd(), 'app/layout.tsx');
      const layoutSrc = fs.readFileSync(layoutFile, 'utf-8');

      expect(layoutSrc).toContain("icons:");
      expect(layoutSrc).toContain("url: '/favicon.ico'");
      expect(layoutSrc).toContain("url: '/brand/icon-white.svg'");
      expect(layoutSrc).toContain("url: '/brand/icon-white.png'");
      expect(layoutSrc).toContain("apple: '/apple-touch-icon.png'");
    });

    it('ensures all required brand assets exist on disk in public/brand and public/', () => {
      const brandDir = path.resolve(process.cwd(), 'public/brand');
      const publicDir = path.resolve(process.cwd(), 'public');
      const appDir = path.resolve(process.cwd(), 'app');

      expect(fs.existsSync(path.join(brandDir, 'icon-white.png'))).toBe(true);
      expect(fs.existsSync(path.join(brandDir, 'icon-dark.png'))).toBe(true);
      expect(fs.existsSync(path.join(brandDir, 'logo-light.png'))).toBe(true);
      expect(fs.existsSync(path.join(brandDir, 'logo-dark.png'))).toBe(true);
      expect(fs.existsSync(path.join(brandDir, 'icon.svg'))).toBe(true);
      expect(fs.existsSync(path.join(brandDir, 'icon-white.svg'))).toBe(true);
      expect(fs.existsSync(path.join(brandDir, 'logotype.svg'))).toBe(true);
      expect(fs.existsSync(path.join(brandDir, 'logotype-white.svg'))).toBe(true);

      expect(fs.existsSync(path.join(publicDir, 'favicon.ico'))).toBe(true);
      expect(fs.existsSync(path.join(publicDir, 'icon.png'))).toBe(true);
      expect(fs.existsSync(path.join(publicDir, 'apple-touch-icon.png'))).toBe(true);

      expect(fs.existsSync(path.join(appDir, 'icon.png'))).toBe(true);
      expect(fs.existsSync(path.join(appDir, 'favicon.ico'))).toBe(true);
    });
  });

  describe('5. Mobile Hamburger Drawer & Desktop Sidebar Option Arrangement Parity (Bug_53)', () => {
    it('aligns Investor mobile drawer navigation order and labels 1:1 with Desktop Workspace + Account sections', () => {
      const ctx = { accountType: 'investor' as const, isSubscribed: true };
      const desktopOrdered = [...resolvePrimaryNav(ctx), ...resolveAccountNav(ctx)];
      const mobileDrawer = resolveDrawerNav(ctx);

      expect(mobileDrawer.map((item) => item.label)).toEqual(
        desktopOrdered.map((item) => item.label)
      );
      expect(mobileDrawer.map((item) => item.href)).toEqual(
        desktopOrdered.map((item) => item.href)
      );
      expect(mobileDrawer.map((item) => item.label)).toEqual([
        'Portfolio',
        'Projects',
        'Vendor Directory',
        'Deals Marketplace',
        'Insights',
        'Reports',
        'Inbox',
        'Team',
        'Profile',
        'Settings',
      ]);
    });

    it('aligns Vendor mobile drawer navigation order and labels 1:1 with Desktop Workspace + Account sections', () => {
      const ctx = { accountType: 'vendor' as const, role: 'vendor' };
      const desktopOrdered = [...resolvePrimaryNav(ctx), ...resolveAccountNav(ctx)];
      const mobileDrawer = resolveDrawerNav(ctx);

      expect(mobileDrawer.map((item) => item.label)).toEqual(
        desktopOrdered.map((item) => item.label)
      );
      expect(mobileDrawer.map((item) => item.href)).toEqual(
        desktopOrdered.map((item) => item.href)
      );
    });

    it('renders Workspace and Account section headers in DashboardMobileDrawer matching DashboardSidebar', () => {
      const drawerFile = path.resolve(
        process.cwd(),
        'components/dashboard/DashboardMobileDrawer.tsx'
      );
      const drawerSrc = fs.readFileSync(drawerFile, 'utf-8');
      expect(drawerSrc).toContain('resolvePrimaryNav');
      expect(drawerSrc).toContain('resolveAccountNav');
      expect(drawerSrc).toContain('Workspace');
      expect(drawerSrc).toContain('Account');
    });

    it('keeps isDrawerRouteActive false for dedicated bottom-nav routes and true for overflow drawer routes', () => {
      const drawerItems = resolveDrawerNav({ accountType: 'investor', isSubscribed: true });
      expect(isDrawerRouteActive('/dashboard', drawerItems)).toBe(false);
      expect(isDrawerRouteActive('/projects', drawerItems)).toBe(false);
      expect(isDrawerRouteActive('/deal-calculator', drawerItems)).toBe(false);
      expect(isDrawerRouteActive('/support', drawerItems)).toBe(false);
      expect(isDrawerRouteActive('/dashboard/marketplace', drawerItems)).toBe(true);
      expect(isDrawerRouteActive('/dashboard/deals', drawerItems)).toBe(true);
      expect(isDrawerRouteActive('/dashboard/insights', drawerItems)).toBe(true);
      expect(isDrawerRouteActive('/dashboard/settings', drawerItems)).toBe(true);
    });
  });
});

