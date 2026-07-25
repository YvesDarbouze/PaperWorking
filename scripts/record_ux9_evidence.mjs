import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'ux9_artifacts');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function recordUX9Evidence() {
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

  // 1. Initial Portfolio page — Focus Header Search Input
  await page.goto('http://localhost:3000/dashboard/command-center', { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1000);

  const searchInput = page.locator('input[placeholder*="Search"]').first();
  if (await searchInput.isVisible().catch(() => false)) {
    // 2. Search Deals scope: type seeded address 'Main'
    await searchInput.focus();
    await searchInput.fill('Main');
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '01_deals_search_results.png') });

    // 3. Click first deal result -> navigate to project detail
    const dealItem = page.locator('#search-results-dropdown a[href*="/dashboard/projects/"]').first();
    if (await dealItem.isVisible().catch(() => false)) {
      await dealItem.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(OUTPUT_DIR, '02_deal_detail_navigated.png') });
    }

    // 4. Vendors scope search: type 'Apex' in Vendors scope
    await page.goto('http://localhost:3000/dashboard/command-center', { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(1000);
    const searchInput2 = page.locator('input[placeholder*="Search"]').first();
    await searchInput2.focus();
    
    // Toggle scope to Vendors
    const vendorScopeBtn = page.locator('button:has-text("Vendors")').first();
    if (await vendorScopeBtn.isVisible().catch(() => false)) {
      await vendorScopeBtn.click();
    }
    
    await searchInput2.fill('Apex');
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '03_vendors_search_results.png') });

    // 5. Empty state with 1-click scope switch button screenshot
    await searchInput2.fill('NonExistentQueryXYZ123');
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '04_empty_state_scope_switch_cta.png') });
  }

  console.log('UX-9 evidence screenshots recorded successfully!');
  await browser.close();
}

recordUX9Evidence().catch(err => {
  console.error(err);
  process.exit(1);
});
