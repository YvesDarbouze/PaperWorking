import dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Import adminDb via require to ensure dotenv runs first
const { adminDb: db } = require('../src/lib/firebase/admin');

/* ═══════════════════════════════════════════════════════════════
   Backfill: legacy `fractionalInvestors` 'confirmed' entries -> commitments

   Prior to the invitations/respond -> commitments pipeline, some
   projects had investors marked 'confirmed' directly in
   fractionalInvestors[] (written by the now-retired /api/invest/[token]
   POST handler), with no backing commitments doc.

   For each such entry (no commitmentId yet), this creates a matching
   `projects/{id}/commitments` doc with status 'cleared' (already-reconciled
   money, since it was marked 'confirmed' under the old model) and stamps
   the array entry with the new commitmentId so future syncs recognize it.
   This preserves legacy confirmed investors as already-cleared, not lost.

   Usage:
     npx ts-node scripts/migrate-legacy-fractional-investors.ts            (dry run)
     npx ts-node scripts/migrate-legacy-fractional-investors.ts --commit   (writes)
   ═══════════════════════════════════════════════════════════════ */

const commitMode = process.argv.includes('--commit');

async function migrate() {
  console.log(`Legacy Fractional Investor Backfill`);
  console.log(`Running in ${commitMode ? 'COMMIT' : 'DRY-RUN'} mode...\n`);

  const projectsSnapshot = await db.collection('projects').get();
  console.log(`Found ${projectsSnapshot.size} projects to scan.`);

  let projectsTouched = 0;
  let investorsBackfilled = 0;

  for (const doc of projectsSnapshot.docs) {
    const project = doc.data();
    const projectId = doc.id;
    const fractionalInvestors = project.fractionalInvestors || [];

    const candidates = fractionalInvestors.filter(
      (inv: any) => inv.status === 'confirmed' && !inv.commitmentId
    );

    if (candidates.length === 0) continue;

    projectsTouched++;
    console.log(`\nProject [${projectId}] "${project.propertyName || 'Unnamed'}" — ${candidates.length} legacy confirmed investor(s):`);

    const updatedList = [...fractionalInvestors];

    for (const inv of candidates) {
      const commitmentRef = db
        .collection('projects')
        .doc(projectId)
        .collection('commitments')
        .doc();

      const amountCents = Math.round((inv.contributionAmount || 0) * 100);

      console.log(`  - ${inv.name} (${inv.email}) — $${(inv.contributionAmount || 0).toLocaleString()} -> commitment ${commitmentRef.id} (cleared)`);

      if (commitMode) {
        await commitmentRef.set({
          projectId,
          name: inv.name,
          email: inv.email || null,
          amountCents,
          status: 'cleared',
          notes: 'Backfilled from legacy fractionalInvestors entry (pre-migration)',
          createdByUid: 'system_migration',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      const idx = updatedList.findIndex((i: any) => i.id === inv.id);
      if (idx >= 0) {
        updatedList[idx] = { ...updatedList[idx], commitmentId: commitmentRef.id };
      }

      investorsBackfilled++;
    }

    if (commitMode) {
      await db.collection('projects').doc(projectId).update({ fractionalInvestors: updatedList });
    }
  }

  console.log(`\n${commitMode ? 'Backfilled' : 'Would backfill'} ${investorsBackfilled} investor(s) across ${projectsTouched} project(s).`);
  if (!commitMode) {
    console.log(`\nRe-run with --commit to apply these changes.`);
  }
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
