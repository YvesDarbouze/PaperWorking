import { chromium } from '@playwright/test';
import path from 'path';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Abort external fonts/styles that might time out due to network isolation
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com') || url.includes('material-symbols')) {
      route.abort();
    } else {
      route.continue();
    }
  });

  const artifactDir = '/Users/yvesdarbouze/.gemini/antigravity/brain/af1debb9-d11f-40f9-879a-a8b906729df3';
  const mode = process.argv[2] || 'after'; // 'before' or 'after'

  await page.setViewportSize({ width: 1280, height: 1200 });

  if (mode === 'before') {
    console.log('Capturing BEFORE screenshots...');
    
    // Landing page
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // 1. Landing Hero (before)
    const hero = page.locator('section').first();
    await hero.screenshot({ path: path.join(artifactDir, 'hero_before.png') });
    
    // 2. Reinforcing Statement (before)
    const reinforcing = page.locator('blockquote').first().locator('..');
    await reinforcing.screenshot({ path: path.join(artifactDir, 'reinforcing_before.png') });

    // 3. Final CTA (before)
    const finalCta = page.locator('section').filter({ hasText: 'Real-estate-native project management' });
    await finalCta.screenshot({ path: path.join(artifactDir, 'final_cta_before.png') });

    // 4. Pricing Ratings (before)
    await page.goto('http://localhost:3000/pricing', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const pricingBottom = page.locator('span:has-text("reviews")').first().locator('..').locator('..');
    try {
      await pricingBottom.screenshot({ path: path.join(artifactDir, 'pricing_rating_before.png') });
    } catch (e) {
      // If locator fails, take a full page screenshot at the bottom
      await page.screenshot({ path: path.join(artifactDir, 'pricing_rating_before.png') });
    }
  } else {
    console.log('Capturing AFTER screenshots...');
    
    // Landing page
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // 1. Landing Hero (after)
    const hero = page.locator('section').first();
    await hero.screenshot({ path: path.join(artifactDir, 'hero_after.png') });
    
    // 2. Reinforcing Statement (after)
    const reinforcing = page.locator('blockquote').first().locator('..');
    await reinforcing.screenshot({ path: path.join(artifactDir, 'reinforcing_after.png') });

    // 3. Final CTA (after)
    const finalCta = page.locator('section').filter({ hasText: 'Real-estate-native project management' });
    await finalCta.screenshot({ path: path.join(artifactDir, 'final_cta_after.png') });

    // 4. Pricing Ratings (after)
    await page.goto('http://localhost:3000/pricing', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Take pricing screenshot showing the clean bottom (no Google review badge)
    await page.screenshot({ path: path.join(artifactDir, 'pricing_rating_after.png') });
  }

  await browser.close();
  console.log(`Screenshots for ${mode} completed successfully!`);
}

main().catch(console.error);
