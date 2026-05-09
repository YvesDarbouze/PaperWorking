const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto('http://localhost:3000/dashboard/projects', { waitUntil: 'networkidle' });
    console.log("Projects page loaded.");
    const content = await page.content();
    if (content.includes('Maximum update depth exceeded')) {
      console.log('ERROR: Maximum update depth exceeded');
    } else {
      console.log('SUCCESS: No infinite loop detected on /dashboard/projects');
    }
  } catch (err) {
    console.error("Error:", err);
  }
  await browser.close();
})();
