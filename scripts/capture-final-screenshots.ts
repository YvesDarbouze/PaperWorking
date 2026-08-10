import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function capture() {
  const outDir = path.join(process.cwd(), '.agents', 'walkthrough-assets', 'final');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const viewports = [
    { name: '375px', width: 375, height: 812 },
    { name: '768px', width: 768, height: 1024 },
    { name: '1280px', width: 1280, height: 800 },
  ];

  const targets = [
    { slug: 'home', url: 'http://localhost:3000/' },
    { slug: 'how-it-works', url: 'http://localhost:3000/how-it-works' },
    { slug: 'marketplaces-deals', url: 'http://localhost:3000/marketplaces#deals' },
    { slug: 'marketplaces-vendors', url: 'http://localhost:3000/marketplaces#vendors' },
    { slug: 'pricing-annual', url: 'http://localhost:3000/pricing' },
    { slug: 'pricing-monthly', url: 'http://localhost:3000/pricing', action: async (page: any) => {
      const toggle = page.getByRole('button', { name: /monthly/i });
      if (await toggle.isVisible()) await toggle.click();
    }},
    { slug: 'support-search', url: 'http://localhost:3000/support', action: async (page: any) => {
      const input = page.getByPlaceholder(/search|figure/i).first();
      if (await input.isVisible()) {
        await input.fill('deal');
        await page.waitForTimeout(300);
      }
    }},
    { slug: 'dashboard-command-center', url: 'http://localhost:3000/dashboard/command-center' },
    { slug: 'investor-profile', url: 'http://localhost:3000/marketplace/investors/inv-1' },
    { slug: 'deal-detail', url: 'http://localhost:3000/dashboard/deals/austin-duplex-4208' },
  ];

  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();

    for (const t of targets) {
      try {
        await page.goto(t.url, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);
        if (t.action) {
          await t.action(page);
          await page.waitForTimeout(300);
        }
        const fileName = `${t.slug}-${vp.name}.png`;
        const filePath = path.join(outDir, fileName);
        await page.screenshot({ path: filePath, fullPage: false });
        console.log(`Saved: ${filePath}`);
      } catch (err: any) {
        console.error(`Error capturing ${t.slug} @ ${vp.name}: ${err.message}`);
      }
    }
    await context.close();
  }

  await browser.close();
  console.log('Capture complete!');
}

capture().catch(err => console.error(err));
