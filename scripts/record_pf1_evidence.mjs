import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'pf1_artifacts');
const ASSETS_DIR = path.join(process.cwd(), 'docs', 'spec', 'assets');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

async function recordPF1Evidence() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: {
      cookies: [
        { name: '__session', value: 'mock_session_token_123', domain: 'localhost', path: '/' },
        { name: '__acct', value: 'investor', domain: 'localhost', path: '/' },
      ],
      origins: [],
    },
  });

  const page = await context.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  // 1. Initial view: Portfolio
  await page.goto('http://localhost:3000/dashboard/command-center', { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1000);

  const sidebar = page.locator('aside').first();
  if (await sidebar.isVisible().catch(() => false)) {
    await sidebar.screenshot({ path: path.join(OUTPUT_DIR, 'pf-1-sidebar-after.png') });
    await sidebar.screenshot({ path: path.join(ASSETS_DIR, 'pf-1-sidebar-after.png') });
  }

  // 2. Direct route verification sweep across all 10 items
  const routes = [
    { name: 'Portfolio', href: '/dashboard/command-center' },
    { name: 'Projects', href: '/dashboard/projects' },
    { name: 'Data Room', href: '/dashboard/data-room' },
    { name: 'Insights', href: '/dashboard/insights' },
    { name: 'Reports', href: '/dashboard/reports' },
    { name: 'Inbox', href: '/dashboard/inbox' },
    { name: 'Team', href: '/dashboard/team' },
    { name: 'Profile', href: '/dashboard/settings/profile' },
    { name: 'Billing', href: '/dashboard/settings/billing' },
    { name: 'Settings', href: '/dashboard/settings' },
  ];

  const results = [];
  for (const route of routes) {
    let success = false;
    try {
      const res = await page.goto(`http://localhost:3000${route.href}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      success = res ? res.ok() : false;
    } catch (e) {
      success = false;
    }
    results.push({ ...route, verifiedReachable: success, url: page.url() });
  }

  const dispositionTable = {
    groups: [
      {
        name: 'PORTFOLIO',
        items: [
          { label: 'Portfolio', route: '/dashboard/command-center', icon: 'space_dashboard', disposition: 'KEPT' },
          { label: 'Projects', route: '/dashboard/projects', icon: 'folder', disposition: 'KEPT' },
          { label: 'Data Room', route: '/dashboard/data-room', icon: 'folder_shared', disposition: 'KEPT (Decision D1)' },
          { label: 'Insights', route: '/dashboard/insights', icon: 'monitoring', disposition: 'KEPT' },
          { label: 'Reports', route: '/dashboard/reports', icon: 'bar_chart_4_bars', disposition: 'KEPT' },
          { label: 'Inbox', route: '/dashboard/inbox', icon: 'inbox', disposition: 'KEPT' },
          { label: 'Team', route: '/dashboard/team', icon: 'group', disposition: 'KEPT' },
        ]
      },
      {
        name: 'ACCOUNT',
        items: [
          { label: 'Profile', route: '/dashboard/settings/profile', icon: 'account_circle', disposition: 'KEPT' },
          { label: 'Billing', route: '/dashboard/settings/billing', icon: 'payments', disposition: 'KEPT' },
          { label: 'Settings', route: '/dashboard/settings', icon: 'settings', disposition: 'KEPT' },
        ]
      }
    ],
    sweepResults: results,
  };

  console.log('PF-1 Route Disposition Table:', JSON.stringify(dispositionTable, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'pf1_route_disposition.json'), JSON.stringify(dispositionTable, null, 2));

  await browser.close();
}

recordPF1Evidence().catch(err => {
  console.error(err);
  process.exit(1);
});
