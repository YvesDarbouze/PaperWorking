import seedData from '../lib/support/seed-data.json' with { type: 'json' };
import {
  upsertFaqEntry,
  upsertGlossaryTerm,
  getFaqEntries,
  getGlossaryTerms,
} from '../lib/support/firestore-support-store';
import type { FaqEntry, GlossaryTerm } from '../lib/support/types';

const CANONICAL_FAQ_SEED = seedData.faqs as FaqEntry[];
const CANONICAL_GLOSSARY_SEED = seedData.glossary as GlossaryTerm[];

export async function seedSupportData() {
  console.log('='.repeat(70));
  console.log('PAPERWORKING SUPPORT KNOWLEDGE BASE — SERVER-LOCAL SEED SCRIPT (ADMIN SDK)');
  console.log(`Execution Mode: Server-local direct Admin SDK / Firestore Store (Zero HTTP routes)`);
  console.log(`Total FAQs to seed: ${CANONICAL_FAQ_SEED.length}`);
  console.log(`Total Glossary terms to seed: ${CANONICAL_GLOSSARY_SEED.length}`);
  console.log('='.repeat(70));

  // 1. Seed FAQs directly through Admin Store
  console.log('\n[1/2] Seeding FAQ Entries directly via Admin Store...');
  let faqCount = 0;
  for (const faq of CANONICAL_FAQ_SEED) {
    const saved = await upsertFaqEntry(faq);
    faqCount++;
    console.log(`  ✓ [${faqCount}/${CANONICAL_FAQ_SEED.length}] Seeded: ${saved.id} (${saved.category})`);
  }

  // 2. Seed Glossary Terms directly through Admin Store
  console.log('\n[2/2] Seeding Glossary Terms directly via Admin Store...');
  let termCount = 0;
  for (const term of CANONICAL_GLOSSARY_SEED) {
    const saved = await upsertGlossaryTerm(term);
    termCount++;
    console.log(`  ✓ [${termCount}/${CANONICAL_GLOSSARY_SEED.length}] Seeded: ${saved.term} [${saved.category}]`);
  }

  // 3. Verify Knowledge Base Output
  console.log('\n[3/3] Verifying Seeded Knowledge Base Content...');
  const faqs = await getFaqEntries();
  if (faqs.length < 14) {
    throw new Error(`Expected at least 14 FAQs, but store returned ${faqs.length}`);
  }
  console.log(`  ✓ Knowledge base contains ${faqs.length} FAQ items (OK)`);

  const terms = await getGlossaryTerms();
  if (terms.length < 22) {
    throw new Error(`Expected at least 22 Glossary terms, but store returned ${terms.length}`);
  }
  console.log(`  ✓ Knowledge base contains ${terms.length} Glossary terms (OK)`);

  console.log('\n' + '='.repeat(70));
  console.log(`SEED COMPLETE: ${faqCount} FAQs and ${termCount} Glossary terms successfully inserted!`);
  console.log('='.repeat(70) + '\n');

  return { faqCount, termCount };
}

// Run immediately on script execution
seedSupportData()
  .then(() => {
    process.exit(0);
  })
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error('\n❌ SEED FAILED:', message);
    process.exit(1);
  });
