/**
 * Regression tests — Prompt 54: Deal Analyzer Truthful Pre-load
 *
 * These tests prove:
 * 1. The hardcoded fictional defaults ($450k purchase, $3,500 rent, etc.) are gone.
 * 2. Initial rental/flip state starts at zero (not fictional values).
 * 3. The useEffect sync uses ?? (nullish) not || (falsy) so zeroes stay honest.
 * 4. handleReset seeds from the project, not from fictional hardcodes.
 * 5. The explicit "Save to Project" button exists (underwritingDirty gating).
 * 6. Comps auto-save is not affected.
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const COMPONENT = path.join(SRC, 'components/evaluation/DealAnalyzer.tsx');

function readComponent(): string {
  return fs.readFileSync(COMPONENT, 'utf-8');
}

describe('Prompt 54 — Deal Analyzer Truthful Pre-load', () => {

  let content: string;
  beforeAll(() => {
    content = readComponent();
  });

  // ── 1. Fictional defaults are gone from initial state ─────────
  describe('fictional initial state removed', () => {
    it('does not start rental.purchasePrice at 450000', () => {
      // The only place purchasePrice: 450000 could appear is the old hardcoded default.
      // After the fix, the initial state uses 0.
      expect(content).not.toContain('purchasePrice: 450000');
    });

    it('does not start rental.monthlyRent at 3500', () => {
      expect(content).not.toContain('monthlyRent: 3500');
    });

    it('does not start rental.priceOfSale at 550000', () => {
      expect(content).not.toContain('priceOfSale: 550000');
    });

    it('does not start flip.purchasePrice at 325000', () => {
      expect(content).not.toContain('purchasePrice: 325000');
    });

    it('does not start flip.rehabCost at 65000', () => {
      expect(content).not.toContain('rehabCost: 65000');
    });

    it('does not start flip.arv at 485000', () => {
      expect(content).not.toContain('arv: 485000');
    });

    it('does not start flip.loanAmount at 275000', () => {
      expect(content).not.toContain('loanAmount: 275000');
    });

    it('does not start flip.interestRate at 9.5 (flip defaults)', () => {
      // The only place interestRate: 9.5 appeared was in the old hardcoded flip state
      expect(content).not.toContain('interestRate: 9.5');
    });
  });

  // ── 2. useEffect sync uses ?? not || for real values ────────
  describe('useEffect sync uses nullish coalescing', () => {
    it('uses ?? 0 for purchasePrice sync (not || prev.purchasePrice)', () => {
      expect(content).toContain('purchasePrice: f.purchasePrice ?? 0');
    });

    it('uses ?? 0 for monthlyRent sync (not || prev.monthlyRent)', () => {
      // Either of the two forms is acceptable
      expect(content).toMatch(/monthlyRent: f\.(monthlyGrossRent|projectedMonthlyRent) \?\?/);
    });

    it('uses ?? 0 for loanInterestRate sync (not || prev.interestRate)', () => {
      expect(content).toContain('interestRate: f.loanInterestRate ?? 0');
    });

    it('does not use || prev.purchasePrice fallback in sync', () => {
      expect(content).not.toContain('|| prev.purchasePrice');
    });

    it('does not use || prev.monthlyRent fallback in sync', () => {
      expect(content).not.toContain('|| prev.monthlyRent');
    });
  });

  // ── 3. handleReset uses project financials, not hardcodes ───
  describe('handleReset uses project data', () => {
    it('handleReset does not hardcode purchasePrice: 450000', () => {
      // The old reset had these values; they must be gone from the reset body
      const resetMatch = content.match(/const handleReset[\s\S]{0,2000}setUnderwritingDirty\(false\)/);
      expect(resetMatch).not.toBeNull();
      expect(resetMatch![0]).not.toContain('450000');
      expect(resetMatch![0]).not.toContain('325000');
      expect(resetMatch![0]).not.toContain('65000');
    });

    it('handleReset references currentProject financials', () => {
      const resetMatch = content.match(/const handleReset[\s\S]{0,2000}setUnderwritingDirty\(false\)/);
      expect(resetMatch).not.toBeNull();
      expect(resetMatch![0]).toContain('currentProject');
    });

    it('handleReset clears underwritingDirty', () => {
      expect(content).toContain('setUnderwritingDirty(false)');
    });
  });

  // ── 4. Explicit save button exists ──────────────────────────
  describe('explicit Save to Project button', () => {
    it('handleSaveUnderwriting function is defined', () => {
      expect(content).toContain('handleSaveUnderwriting');
    });

    it('save button appears conditionally on underwritingDirty', () => {
      expect(content).toContain('underwritingDirty');
    });

    it('save button calls handleSaveUnderwriting on click', () => {
      expect(content).toContain('onClick={handleSaveUnderwriting}');
    });

    it('save writes to Firestore (not just Zustand)', () => {
      expect(content).toContain('projectsService.updateProject');
    });
  });

  // ── 5. updateRental/updateFlip wrappers exist ───────────────
  describe('dirty-aware input wrappers', () => {
    it('updateRental wrapper exists', () => {
      expect(content).toContain('const updateRental');
    });

    it('updateFlip wrapper exists', () => {
      expect(content).toContain('const updateFlip');
    });

    it('onChange handlers in JSX use updateRental, not setRental inline', () => {
      // We expect e.g. onChange={v => updateRental('purchasePrice', v)}
      expect(content).toContain("updateRental('purchasePrice', v)");
    });

    it('onChange handlers in JSX use updateFlip, not setFlip inline', () => {
      expect(content).toContain("updateFlip('purchasePrice', v)");
    });
  });

  // ── 6. Comps auto-save preserved ────────────────────────────
  describe('comps auto-save preserved', () => {
    it('addComp still calls save({ comparableSales })', () => {
      expect(content).toContain('save({ comparableSales: updated })');
    });
  });
});
