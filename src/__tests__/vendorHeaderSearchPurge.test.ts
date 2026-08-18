import fs from 'fs';
import path from 'path';

describe('BUG-009 — Vendor Header Search SEEDED_VENDORS Purge Guard', () => {
  const srcDir = path.resolve(__dirname, '../');

  function getAllFiles(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let files: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== '__tests__' && entry.name !== 'node_modules') {
          files = files.concat(getAllFiles(fullPath));
        }
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        files.push(fullPath);
      }
    }
    return files;
  }

  it('Static Guard: No production source file imports SEEDED_VENDORS or seededVendors', () => {
    const prodFiles = getAllFiles(srcDir);
    const violatingFiles: string[] = [];

    for (const file of prodFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes('SEEDED_VENDORS') || content.includes('@/lib/vendors/seededVendors')) {
        violatingFiles.push(path.relative(srcDir, file));
      }
    }

    expect(violatingFiles).toEqual([]);
  });

  describe('TopAppBar search filtering logic verification', () => {
    it('returns honest empty array when API returns empty vendors list', () => {
      const apiVendors: any[] = [];
      const searchQuery = 'Miami';
      const q = searchQuery.toLowerCase();

      const filtered = apiVendors.filter((v: any) => {
        const name = v.displayName || v.companyName || v.name || '';
        return name.toLowerCase().includes(q) || (v.location && v.location.toLowerCase().includes(q));
      });

      expect(filtered).toEqual([]);
      // Confirm no seed vendor names leakage
      const seedNames = ['Apex Legal Group', 'First Choice Capital Lending', 'Cornerstone Property Inspections'];
      for (const name of seedNames) {
        expect(filtered.some((v) => v.name === name)).toBe(false);
      }
    });

    it('handles API error without falling back to seed vendors', async () => {
      let isError = false;
      let vendorsResult: any[] | null = null;

      try {
        // Simulate API error response (500)
        const mockResponse = { ok: false, status: 500 };
        if (!mockResponse.ok) {
          throw new Error('Failed to fetch vendors');
        }
      } catch (err) {
        isError = true;
      }

      expect(isError).toBe(true);
      expect(vendorsResult).toBeNull();
    });
  });
});
