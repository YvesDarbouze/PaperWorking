import * as dotenv from 'dotenv';
import * as path from 'path';
import { adminDb } from '../src/lib/firebase/admin';
import { timelineSyncWorker } from '../src/lib/services/timelineSyncWorker';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const TEMPLATES = {
  financed_conventional: 'Financed Conventional (30-60 days)',
  cash_hard_money: 'Cash & Hard Money (7-14 days)',
  sba: 'SBA 504 Extended'
};

async function runDemo() {
  console.log('=== DEMONSTRATING CLOSING TIMELINE ENGINE (FD-29) ===\n');

  const projectId = 'deal_123_main_st_seed';
  const projectRef = adminDb.collection('projects').doc(projectId);

  // Preserve original closing timeline state
  const projectSnap = await projectRef.get();
  const projectData = projectSnap.data()!;
  const originalTimeline = projectData.closingTimeline || null;
  const originalTemplate = projectData.closingTimelineTemplate || null;
  const originalFinancials = projectData.financials || {};
  const originalClosingRoom = projectData.closingRoom || {};

  const printTimeline = (title: string, milestones: any[], template: string) => {
    console.log(`--- ${title} ---`);
    console.log(`Template: "${TEMPLATES[template as keyof typeof TEMPLATES] || template}"`);
    milestones.forEach((m: any) => {
      const statusIcon = m.completed ? '✅' : m.slippage ? '⚠️ SLIPPAGE' : '⏳';
      const actualStr = m.actualDate ? ` (Actual: ${m.actualDate})` : ' (Pending)';
      console.log(`  - [${m.key.padEnd(25)}] ${statusIcon} ${m.label.padEnd(30)} Target: ${m.targetDate}${actualStr}`);
    });
    console.log('');
  };

  // 1. INSTANTIATE FINANCED CONVENTIONAL TEMPLATE
  console.log('1. Setting up financingType = "Conventional" on Project...');
  await projectRef.update({
    'financials.financingType': 'Conventional',
    'financials.psaEffectiveDate': '2026-07-01', // Base contract date
    closingTimeline: [],
    closingTimelineTemplate: null
  });

  // Run sync worker to initialize Conventional timeline
  await timelineSyncWorker.sync(projectId);
  const snap1 = await projectRef.get();
  const data1 = snap1.data()!;
  printTimeline('CONVENTIONAL FINANCED INITIAL TIMELINE', data1.closingTimeline, data1.closingTimelineTemplate);

  // 2. PERSIST EDIT TO TARGET DATE
  console.log('2. Simulating manual edit of Target Date for "Closing Settlement" milestone...');
  const editedTimeline = data1.closingTimeline.map((m: any) => {
    if (m.key === 'closing') {
      return { ...m, targetDate: '2026-08-30' }; // Edit target date to Aug 30
    }
    return m;
  });
  await projectRef.update({ closingTimeline: editedTimeline });

  const snap2 = await projectRef.get();
  const data2 = snap2.data()!;
  printTimeline('EDITED CONVENTIONAL TIMELINE', data2.closingTimeline, data2.closingTimelineTemplate);

  // 3. LINKED EVENT AUTOMATIC ACTUAL SETTING (WITHOUT MANUAL ENTRY)
  console.log('3. Triggering linked event: Title Clearance verified in database...');
  await projectRef.update({
    'closingRoom.chainOfTitleStatus': 'verified',
    'closingRoom.titleWorkflow.status': 'cleared'
  });

  // Run sync worker to auto-detect title cleared event and set actualDate
  await timelineSyncWorker.sync(projectId);
  const snap3 = await projectRef.get();
  const data3 = snap3.data()!;
  printTimeline('TIMELINE UPDATED VIA LINKED EVENT (TITLE CLEARANCE)', data3.closingTimeline, data3.closingTimelineTemplate);

  // 4. INSTANTIATE CASH / HARD MONEY TEMPLATE
  console.log('4. Setting up financingType = "All Cash" on Project...');
  await projectRef.update({
    'financials.financingType': 'All Cash',
    closingTimeline: [],
    closingTimelineTemplate: null
  });

  // Run sync worker to initialize Cash timeline
  await timelineSyncWorker.sync(projectId);
  const snap4 = await projectRef.get();
  const data4 = snap4.data()!;
  printTimeline('CASH INITIAL TIMELINE', data4.closingTimeline, data4.closingTimelineTemplate);

  // Clean up and restore original state
  await projectRef.update({
    closingTimeline: originalTimeline,
    closingTimelineTemplate: originalTemplate,
    financials: originalFinancials,
    closingRoom: originalClosingRoom
  });
  console.log('✅ Firestore project restored to original state.');
}

runDemo().catch(console.error);
