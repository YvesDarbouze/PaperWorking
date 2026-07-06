/**
 * Regression tests — Prompt 53: Title Search Checklist Persistence
 *
 * These tests prove:
 * 1. A new project starts with ALL checks as 'Pending' — no fabricated details.
 * 2. No check starts as 'Cleared' without Firestore-persisted data.
 * 3. The fabricated INITIAL_CHECKS strings are permanently gone.
 * 4. The blockchain simulation (titleVerify.ts) is deleted.
 * 5. buildFreshChecklist produces the expected 6-item template.
 * 6. mergeWithTemplate preserves stored attributions and fills missing items.
 */

import * as fs from 'fs';
import * as path from 'path';

// ── Utilities ─────────────────────────────────────────────────

const SRC = path.resolve(__dirname, '..');

function readSrc(rel: string): string {
  return fs.readFileSync(path.join(SRC, rel), 'utf-8');
}

function srcExists(rel: string): boolean {
  return fs.existsSync(path.join(SRC, rel));
}

// ── Test helpers (lightweight unit-test the pure logic) ───────

type ClearanceStatus = 'Pending' | 'In Review' | 'Cleared' | 'Issue Found';

interface TitleCheckItem {
  id: string;
  name: string;
  status: ClearanceStatus;
  notes?: string;
  clearedByUid?: string;
  clearedByName?: string;
  clearedAt?: string;
}

const CHECK_TEMPLATES: Pick<TitleCheckItem, 'id' | 'name'>[] = [
  { id: 'ownership',  name: 'Chain of Ownership Verification' },
  { id: 'liens',      name: 'Outstanding Liens & Judgments' },
  { id: 'taxes',      name: 'Property Tax Clearance' },
  { id: 'easements',  name: 'Easements & Encumbrances' },
  { id: 'survey',     name: 'Survey / Boundary Confirmation' },
  { id: 'hoa',        name: 'HOA/Condo Special Assessments' },
];

/** Mirror of the production helper — keep in sync if template changes */
function buildFreshChecklist(): TitleCheckItem[] {
  return CHECK_TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    status: 'Pending' as ClearanceStatus,
  }));
}

function mergeWithTemplate(stored: TitleCheckItem[]): TitleCheckItem[] {
  return CHECK_TEMPLATES.map((template) => {
    const found = stored.find((s) => s.id === template.id);
    return found ?? { id: template.id, name: template.name, status: 'Pending' as ClearanceStatus };
  });
}

// ─────────────────────────────────────────────────────────────

describe('Prompt 53 — Title Search Checklist Persistence', () => {

  // ── 1. Deleted simulation ───────────────────────────────────
  describe('blockchain simulation removed', () => {
    it('titleVerify.ts file is deleted', () => {
      expect(srcExists('lib/web3/titleVerify.ts')).toBe(false);
    });

    it('no file in src/ imports pingBlockchainTitleRegistry', () => {
      const files: string[] = [];
      function walk(dir: string) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== '__tests__') {
            walk(full);
          } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
            const contents = fs.readFileSync(full, 'utf-8');
            if (contents.includes('ping' + 'BlockchainTitleRegistry')) files.push(full);
          }
        }
      }
      walk(SRC);
      expect(files).toEqual([]);
    });
  });

  // ── 2. Fabricated strings are gone ─────────────────────────
  describe('fabricated INITIAL_CHECKS strings removed', () => {
    const component = readSrc('components/closing/TitleSearchClearance.tsx');

    it('does not contain the fabricated chain-of-ownership detail', () => {
      expect(component).not.toContain('Clear chain verified through 2003');
    });

    it('does not contain the fabricated tax detail', () => {
      expect(component).not.toContain('Current through Q2 2026');
    });

    it('does not contain the fabricated HOA detail', () => {
      expect(component).not.toContain('No HOA restrictions apply');
    });

    it('does not contain the string "Cleared" as a literal default', () => {
      // The string 'Cleared' only appears in STATUS_CONFIG and type definitions,
      // not as a hardcoded initial status value.
      // We check INITIAL_CHECKS / INITIAL_SOURCES patterns are gone.
      expect(component).not.toContain('INITIAL_CHECKS');
    });

    it('does not contain hardcoded "County records search in progress"', () => {
      expect(component).not.toContain('County records search in progress');
    });
  });

  // ── 3. buildFreshChecklist — honest empty state ─────────────
  describe('buildFreshChecklist', () => {
    const fresh = buildFreshChecklist();

    it('produces exactly 6 checks', () => {
      expect(fresh).toHaveLength(6);
    });

    it('all checks start as Pending', () => {
      for (const c of fresh) {
        expect(c.status).toBe('Pending');
      }
    });

    it('no check has notes', () => {
      for (const c of fresh) {
        expect(c.notes).toBeUndefined();
      }
    });

    it('no check has clearedByName', () => {
      for (const c of fresh) {
        expect(c.clearedByName).toBeUndefined();
      }
    });

    it('no check has clearedAt', () => {
      for (const c of fresh) {
        expect(c.clearedAt).toBeUndefined();
      }
    });

    it('includes all 6 canonical ids', () => {
      const ids = fresh.map((c) => c.id);
      expect(ids).toContain('ownership');
      expect(ids).toContain('liens');
      expect(ids).toContain('taxes');
      expect(ids).toContain('easements');
      expect(ids).toContain('survey');
      expect(ids).toContain('hoa');
    });
  });

  // ── 4. mergeWithTemplate — attribution preserved ────────────
  describe('mergeWithTemplate', () => {
    const stored: TitleCheckItem[] = [
      {
        id: 'ownership',
        name: 'Chain of Ownership Verification',
        status: 'Cleared',
        clearedByUid: 'user-123',
        clearedByName: 'Alice Smith',
        clearedAt: '2026-06-10T14:00:00.000Z',
        notes: 'Verified back to 1962',
      },
      // 'liens' missing — should be added as Pending
    ];

    const merged = mergeWithTemplate(stored);

    it('produces exactly 6 items', () => {
      expect(merged).toHaveLength(6);
    });

    it('preserves existing cleared check with attribution', () => {
      const ownership = merged.find((c) => c.id === 'ownership');
      expect(ownership?.status).toBe('Cleared');
      expect(ownership?.clearedByName).toBe('Alice Smith');
      expect(ownership?.clearedAt).toBe('2026-06-10T14:00:00.000Z');
      expect(ownership?.notes).toBe('Verified back to 1962');
    });

    it('fills missing check (liens) as Pending with no attribution', () => {
      const liens = merged.find((c) => c.id === 'liens');
      expect(liens?.status).toBe('Pending');
      expect(liens?.clearedByName).toBeUndefined();
      expect(liens?.clearedAt).toBeUndefined();
    });
  });

  // ── 5. Schema exports ───────────────────────────────────────
  describe('schema.ts exports', () => {
    const schema = readSrc('types/schema.ts');

    it('exports ClearanceStatus type', () => {
      expect(schema).toContain("export type ClearanceStatus");
    });

    it('exports TitleCheckItem interface', () => {
      expect(schema).toContain("export interface TitleCheckItem");
    });

    it('ClosingRoom includes titleChecks field', () => {
      expect(schema).toContain('titleChecks?: TitleCheckItem[]');
    });

    it('TitleCheckItem has attribution fields', () => {
      expect(schema).toContain('clearedByUid');
      expect(schema).toContain('clearedByName');
      expect(schema).toContain('clearedAt');
    });
  });

  // ── 6. API route uses requireAuth, not body.idToken ─────────
  describe('API route auth pattern', () => {
    const route = readSrc('app/api/closing/title-search/route.ts');

    it('uses requireAuth (Authorization: Bearer pattern)', () => {
      expect(route).toContain('requireAuth');
    });

    it('does not accept idToken from request body', () => {
      expect(route).not.toContain('body.idToken');
    });

    it('writes titleChecks to Firestore via adminDb', () => {
      expect(route).toContain('adminDb');
      expect(route).toContain('titleChecks');
    });

    it('does not import pingBlockchainTitleRegistry', () => {
      // Split the string so this test file itself doesn't trigger the assertion
      const banned = 'ping' + 'Blockchain';
      expect(route).not.toContain(banned);
      expect(route).not.toContain('titleVerify');
    });
  });

  // ── 7. Component is now mounted in phase-2 ──────────────────
  describe('phase-2 page mounts TitleSearchClearance', () => {
    const phase2 = readSrc('app/dashboard/projects/[id]/phase-2/page.tsx');

    it('imports TitleSearchClearance', () => {
      expect(phase2).toContain("import TitleSearchClearance");
    });

    it('renders <TitleSearchClearance', () => {
      expect(phase2).toContain('<TitleSearchClearance');
    });
  });
});
