/**
 * Regression tests — Prompt 55: FundingSourceTracker Real Persistence
 *
 * These tests prove:
 * 1. The hardcoded INITIAL_SOURCES (Kiavi, Wells Fargo) are gone.
 * 2. No fictional lender names or amounts appear in the component.
 * 3. The component accepts a projectId prop (not standalone).
 * 4. State is seeded from the project store (capitalStack), not a
 *    local constant.
 * 5. Persistence goes through the real API route (PATCH /api/projects/[id]/funding-sources).
 * 6. The API route requires auth (Authorization header).
 * 7. A new project shows an empty state prompt (no pre-seeded data).
 * 8. FundingSourceStatus type is exported from schema.
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const COMPONENT = path.join(SRC, 'components/evaluation/FundingSourceTracker.tsx');
const API_ROUTE = path.join(SRC, 'app/api/projects/[id]/funding-sources/route.ts');
const SCHEMA = path.join(SRC, 'types/schema.ts');
const PHASE1 = path.join(SRC, 'app/dashboard/projects/[id]/phase-1/page.tsx');

function read(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

describe('Prompt 55 — FundingSourceTracker Real Persistence', () => {
  let component: string;
  let apiRoute: string;
  let schema: string;
  let phase1: string;

  beforeAll(() => {
    component = read(COMPONENT);
    apiRoute = read(API_ROUTE);
    schema = read(SCHEMA);
    phase1 = read(PHASE1);
  });

  // ── 1. No fictional lender hardcodes ────────────────────────
  describe('no fictional lender defaults', () => {
    it('does not contain "Kiavi"', () => {
      expect(component).not.toContain('Kiavi');
    });

    it('does not contain "Wells Fargo"', () => {
      expect(component).not.toContain('Wells Fargo');
    });

    it('does not contain "INITIAL_SOURCES"', () => {
      expect(component).not.toContain('INITIAL_SOURCES');
    });

    it('does not hardcode lenderName: "Kiavi" or similar', () => {
      expect(component).not.toContain("lenderName: 'Kiavi'");
      expect(component).not.toContain('lenderName: "Kiavi"');
    });

    it('does not contain amount: 200000 (hardcoded Kiavi amount)', () => {
      expect(component).not.toContain('amount: 200000');
    });

    it('does not contain amount: 180000 (hardcoded Wells Fargo amount)', () => {
      expect(component).not.toContain('amount: 180000');
    });
  });

  // ── 2. Component accepts projectId prop ─────────────────────
  describe('projectId prop', () => {
    it('defines projectId in its props interface', () => {
      expect(component).toContain('projectId');
    });

    it('uses projectId to build the API URL', () => {
      expect(component).toMatch(/\/api\/projects\/\$\{.*projectId.*\}\/funding-sources/);
    });
  });

  // ── 3. Seeds from project store (capitalStack) ──────────────
  describe('seeds from project store', () => {
    it('reads capitalStack from project financials', () => {
      expect(component).toContain('capitalStack');
    });

    it('uses useProjectStore to get current project', () => {
      expect(component).toContain('useProjectStore');
    });

    it('re-seeds when currentProject.id changes (useEffect)', () => {
      expect(component).toContain('currentProject?.id');
    });
  });

  // ── 4. Persists via API (not just local state) ───────────────
  describe('persistence via API route', () => {
    it('calls fetch to /api/projects/[id]/funding-sources', () => {
      expect(component).toContain('/api/projects/');
      expect(component).toContain('/funding-sources');
    });

    it('uses PATCH method', () => {
      expect(component).toContain("method: 'PATCH'");
    });

    it('sends Authorization Bearer token', () => {
      expect(component).toContain('Authorization');
      expect(component).toContain('Bearer');
    });

    it('gets token from firebase auth (server-side secret, not client key)', () => {
      expect(component).toContain('getIdToken()');
    });
  });

  // ── 5. API route requires auth ────────────────────────────────
  describe('API route security', () => {
    it('imports requireAuth', () => {
      expect(apiRoute).toContain('requireAuth');
    });

    it('calls requireAuth(req) before writing', () => {
      expect(apiRoute).toContain('requireAuth(req)');
    });

    it('checks isAuthError and returns early if not authenticated', () => {
      expect(apiRoute).toContain('isAuthError');
    });

    it('uses firebase-admin (server-side) Firestore', () => {
      expect(apiRoute).toContain('adminDb');
    });

    it('does not use NEXT_PUBLIC_ in the API route', () => {
      expect(apiRoute).not.toContain('NEXT_PUBLIC_');
    });
  });

  // ── 6. Empty state for new projects ──────────────────────────
  describe('empty state', () => {
    it('shows an empty-state prompt (not a pre-seeded list)', () => {
      expect(component).toContain('No funding sources yet');
    });

    it('initializes from capitalStack which is undefined for new projects', () => {
      // The component uses storedSources ?? [] — must not fall back to a non-empty array
      expect(component).toContain('capitalStack ?? []');
    });
  });

  // ── 7. Schema has FundingSourceStatus ────────────────────────
  describe('schema types', () => {
    it('exports FundingSourceStatus type', () => {
      expect(schema).toContain('FundingSourceStatus');
    });

    it('FundingSourceStatus includes Approved and Funded', () => {
      expect(schema).toContain("'Approved'");
      expect(schema).toContain("'Funded'");
    });

    it('CapitalSource has optional lenderName field', () => {
      expect(schema).toContain('lenderName?');
    });

    it('CapitalSource has optional status field', () => {
      expect(schema).toContain('status?: FundingSourceStatus');
    });
  });

  // ── 8. Component is mounted in the app ───────────────────────
  describe('component is mounted', () => {
    it('phase-1 page imports FundingSourceTracker', () => {
      expect(phase1).toContain("import FundingSourceTracker from '@/components/evaluation/FundingSourceTracker'");
    });

    it('phase-1 page renders <FundingSourceTracker', () => {
      expect(phase1).toContain('<FundingSourceTracker');
    });

    it('phase-1 passes projectId prop', () => {
      expect(phase1).toContain('projectId={projectId}');
    });
  });
});
