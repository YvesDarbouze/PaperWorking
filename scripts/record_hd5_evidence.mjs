import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = '/Users/yvesdarbouze/.gemini/antigravity/brain/48455cc3-a24d-4527-a3cf-a86550ac26fa/hd5_artifacts';
const PUBLIC_DIR = '/Users/yvesdarbouze/Documents/PaperWorking/public/hd5_artifacts';

fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
fs.mkdirSync(PUBLIC_DIR, { recursive: true });

async function saveArtifacts(page, filename) {
  const p1 = path.join(ARTIFACTS_DIR, filename);
  const p2 = path.join(PUBLIC_DIR, filename);
  await page.screenshot({ path: p1, fullPage: true });
  await page.screenshot({ path: p2, fullPage: true });
  console.log(`Saved screenshot: ${filename}`);
}

async function run() {
  const browser = await chromium.launch({ headless: true });

  console.log('--- Step 3.1: RENT vs SALE Hold Boards ---');
  // RENT board
  const ctxRent = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const pageRent = await ctxRent.newPage();
  await pageRent.goto('http://localhost:3000/dashboard/projects/demo/phase-3?strategy=RENT&userId=hd5_user_rent', { waitUntil: 'domcontentloaded' });
  await pageRent.waitForTimeout(1500);
  await saveArtifacts(pageRent, 'hd5_1_rent_board_h5_reveal.png');

  // SALE board
  const ctxSale = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const pageSale = await ctxSale.newPage();
  await pageSale.goto('http://localhost:3000/dashboard/projects/demo/phase-3?strategy=SALE&userId=hd5_user_sale', { waitUntil: 'domcontentloaded' });
  await pageSale.waitForTimeout(1500);
  await saveArtifacts(pageSale, 'hd5_2_sale_board_h5_reveal.png');

  console.log('--- Step 3.2: Save Mid-Card -> Leave -> Return -> Resume ---');
  const ctxSaveResume = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    recordVideo: { dir: ARTIFACTS_DIR, size: { width: 1400, height: 900 } },
  });
  const pageSR = await ctxSaveResume.newPage();
  
  // Clear any existing local storage for this test user
  await pageSR.goto('http://localhost:3000/dashboard/projects/demo/phase-3?strategy=RENT&userId=hd5_user_saveresume', { waitUntil: 'domcontentloaded' });
  await pageSR.waitForTimeout(1000);
  await pageSR.evaluate(() => localStorage.clear());
  await pageSR.reload({ waitUntil: 'domcontentloaded' });
  await pageSR.waitForTimeout(1500);

  // Kickoff banner & empty states screenshot
  await saveArtifacts(pageSR, 'hd5_3_kickoff_honest_empty_states.png');

  // Click card H1.1 ("What level of work does this property need?")
  await pageSR.click('text=What level of work does this property need?');
  await pageSR.waitForTimeout(500);
  await saveArtifacts(pageSR, 'hd5_4_midcard_modal_opened.png');

  // Type draft entry
  const draftText = 'HD-5 Mid-Card Saved Entry — Budget $45,000, 6 weeks duration. (Saved at 2026-07-21)';
  await pageSR.fill('textarea', draftText);
  await pageSR.waitForTimeout(500);
  await saveArtifacts(pageSR, 'hd5_5_midcard_draft_typed.png');

  // Save & Resume Later
  await pageSR.click('button:has-text("Save & Resume Later")');
  await pageSR.waitForTimeout(800);
  await saveArtifacts(pageSR, 'hd5_6_card_badge_saved.png');

  // Leave workspace (navigate away to /dashboard/projects)
  await pageSR.goto('http://localhost:3000/dashboard/projects', { waitUntil: 'domcontentloaded' });
  await pageSR.waitForTimeout(1000);
  await saveArtifacts(pageSR, 'hd5_7_left_workspace.png');

  // Return to workspace
  await pageSR.goto('http://localhost:3000/dashboard/projects/demo/phase-3?strategy=RENT&userId=hd5_user_saveresume', { waitUntil: 'domcontentloaded' });
  await pageSR.waitForTimeout(1500);
  await saveArtifacts(pageSR, 'hd5_8_returned_to_workspace.png');

  // Reopen card H1.1 to verify resumed state
  await pageSR.click('text=What level of work does this property need?');
  await pageSR.waitForTimeout(500);
  await saveArtifacts(pageSR, 'hd5_9_resumed_card_draft_preserved.png');

  // Close modal
  await pageSR.click('button:has-text("Cancel")');
  await pageSR.waitForTimeout(500);
  await ctxSaveResume.close();

  console.log('--- Step 4: Dismissal Proof (Multi-User / Cross-Browser) ---');
  const testUserA = 'hd5_user_A_' + Date.now();
  const testUserB = 'hd5_user_B_' + Date.now();

  // Browser 1 — User A opens page, banner visible
  const ctxUserA1 = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const pageA1 = await ctxUserA1.newPage();
  await pageA1.goto(`http://localhost:3000/dashboard/projects/demo/phase-3?userId=${testUserA}`, { waitUntil: 'domcontentloaded' });
  await pageA1.waitForTimeout(1500);
  await saveArtifacts(pageA1, 'hd5_10_userA_browser1_banner_visible.png');

  // User A dismisses banner in Browser 1
  await pageA1.click('button[aria-label="Dismiss welcome banner"]');
  await pageA1.waitForTimeout(1000);
  await saveArtifacts(pageA1, 'hd5_11_userA_browser1_dismissed.png');

  // Browser 2 — User A opens page in separate browser context, banner STILL DISMISSED!
  const ctxUserA2 = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const pageA2 = await ctxUserA2.newPage();
  await pageA2.goto(`http://localhost:3000/dashboard/projects/demo/phase-3?userId=${testUserA}`, { waitUntil: 'domcontentloaded' });
  await pageA2.waitForTimeout(1500);
  await saveArtifacts(pageA2, 'hd5_12_userA_browser2_still_dismissed.png');

  // Browser 3 — User B opens page in separate browser context, banner SHOWS FOR USER B!
  const ctxUserB = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const pageB = await ctxUserB.newPage();
  await pageB.goto(`http://localhost:3000/dashboard/projects/demo/phase-3?userId=${testUserB}`, { waitUntil: 'domcontentloaded' });
  await pageB.waitForTimeout(1500);
  await saveArtifacts(pageB, 'hd5_13_userB_browser3_banner_shows.png');

  await browser.close();

  // Copy recorded video to public folder as well
  const videoFiles = fs.readdirSync(ARTIFACTS_DIR).filter(f => f.endsWith('.webm'));
  if (videoFiles.length > 0) {
    const mainVideo = videoFiles[0];
    const srcVid = path.join(ARTIFACTS_DIR, mainVideo);
    const dstVid1 = path.join(ARTIFACTS_DIR, 'hd5_save_resume_flow.webm');
    const dstVid2 = path.join(PUBLIC_DIR, 'hd5_save_resume_flow.webm');
    fs.copyFileSync(srcVid, dstVid1);
    fs.copyFileSync(srcVid, dstVid2);
    console.log(`Saved video recording: hd5_save_resume_flow.webm`);
  }

  console.log('All HD-5 runtime artifacts captured successfully!');
}

run().catch(err => {
  console.error('Artifact generation failed:', err);
  process.exit(1);
});
