import fs from 'fs';
import path from 'path';

describe('Intelligence Pages — Architecture Guards', () => {
  const intelligenceDir = path.resolve(__dirname, '../../../app/dashboard/intelligence');

  // Helper to recursively get all page.tsx files
  const getPageFiles = (dir: string): string[] => {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getPageFiles(filePath));
      } else if (file === 'page.tsx') {
        results.push(filePath);
      }
    });
    return results;
  };

  const pages = fs.existsSync(intelligenceDir) ? getPageFiles(intelligenceDir) : [];

  it('verifies that any migrated page using selectors.ts complies with the no-demo/no-fallback architecture', () => {
    let checkedCount = 0;

    pages.forEach((pagePath) => {
      const content = fs.readFileSync(pagePath, 'utf8');

      // Only enforce rules on pages that have migrated to import selectors.ts
      const importsSelectors = content.includes('lib/intelligence/selectors');
      if (!importsSelectors) {
        // Skip unmigrated pages to keep the test suite green today,
        // but they will be caught as soon as they migrate.
        return;
      }

      checkedCount++;
      const relativePath = path.relative(path.resolve(__dirname, '../../../../'), pagePath);

      // Rule 1: No identifiers matching DEMO_
      const demoMatches = content.match(/\bDEMO_[A-Za-z0-9_]+\b/g);
      expect(demoMatches).toBeNull();

      // Rule 2: No direct imports of both usePortfolioMetricSnapshots and useProjectStore
      const hasSnapshotImport = content.includes('usePortfolioMetricSnapshots');
      const hasStoreImport = content.includes('useProjectStore');
      expect(hasSnapshotImport && hasStoreImport).toBe(false);

      // Rule 3: No specific hardcoded seed values found in the intelligence page bugs.
      // These exact numeric literals were the seeds causing data inconsistency in Prompt 12.
      // Domain-standard defaults (loanTermYears ?? 30, sellingCosts ?? 8) are still allowed.
      // Banned seeds: 5052 (IRR annualCashFlow), 12486 (DSCR/CapRate NOI), 1410.85 (DSCR DS),
      //               279000 (CapRate price), 154 (debug value), '7.0' (IRR loanRate seed).
      // Note: 7.0 must be the exact string "7.0" to avoid matching valid "7" digits.
      const bannedSeeds = [5052, 12486, 1410.85, 279000, 154];
      const bannedExact = ['loanRate: 7.0', 'loanRate:7.0']; // loanRate seed from Bug 2
      const seedMatches = [
        ...bannedSeeds.filter((seed) => content.includes(String(seed))),
        ...bannedExact.filter((s) => content.includes(s)),
      ];
      expect(seedMatches).toEqual([]);
    });

    console.log(`Verified ${checkedCount} migrated intelligence pages against architecture guards.`);
  });
});
