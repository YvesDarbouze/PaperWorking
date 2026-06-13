/**
 * Closing Costs — No Hardcoded Line Items (Regression Tests)
 *
 * Background: phase-2/page.tsx previously rendered three hardcoded closing cost
 * line items in the right-hand sidebar:
 *   - Origination     $2,450  (constant regardless of loan)
 *   - Recording Tax   $1,800  (constant regardless of price)
 *   - Prepaids        $950    (constant regardless of rate/price)
 *
 * Fix (already in place):
 *   - src/lib/math/closingCosts.ts — pure computation from real deal figures.
 *     Each line has a `computed` (formula), optional `override` (user-persisted),
 *     and `amount` = override ?? computed.  `isOverridden` flag drives the UI badge.
 *   - src/components/phase2/ClosingCostSidebar.tsx — renders computed lines;
 *     clicking a value enters override mode; a ↺ reset button restores computed.
 *     All changes are emitted via onOverridesChange; parent persists to Firestore.
 *   - phase-2/page.tsx — wires real project financials + selectedLender points
 *     into ClosingCostSidebar; overrides round-trip through handleImmediateSave.
 *
 * Evidence in tests:
 *   STATIC  — no $2,450 / $1,800 / $950 literals; no hardcoded CLOSING_COSTS array;
 *             sidebar imports computeClosingCostLines; page reads real financials.
 *   FORMULA — origination tracks loan × pts/100; title tracks 0.40% × price;
 *             transfer tracks 0.10% × price; prepaids track rate/price;
 *             changing any input changes the result; zeros handled gracefully.
 *   OVERRIDE — override replaces computed in `amount`; isOverridden flag set;
 *             typing the exact computed value clears the override (self-cleaning);
 *             deleting an override restores computed; total = sum of final amounts.
 *   TOTAL   — totalClosingCosts sums all amounts, including overridden ones;
 *             a zero-input deal has a zero (or near-zero) total.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  computeClosingCostLines,
  totalClosingCosts,
  type ClosingCostInputs,
  type ClosingCostOverrides,
} from '../lib/math/closingCosts';

const SRC = path.resolve(__dirname, '..');
function read(rel: string) {
  return fs.readFileSync(path.join(SRC, rel), 'utf8');
}

const SIDEBAR_RAW = read('components/phase2/ClosingCostSidebar.tsx');
const PAGE        = read('app/dashboard/projects/[id]/phase-2/page.tsx');

// Strip block comments (/* … */) so we only assert against executable code.
// The ClosingCostSidebar comment block documents the old values for historical
// context; we must not flag those as regressions.
function stripBlockComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '');
}
const SIDEBAR = stripBlockComments(SIDEBAR_RAW);

/* ──────────────────────────────────────────────────────────────────────────
   STATIC — hardcoded amounts must not appear anywhere
   ────────────────────────────────────────────────────────────────────────── */
describe('phase-2 closing costs — no hardcoded line items', () => {

  it('hc_no_2450: $2,450 origination literal is gone from sidebar', () => {
    expect(SIDEBAR).not.toContain('2450');
    expect(SIDEBAR).not.toContain('2,450');
  });

  it('hc_no_1800: $1,800 recording tax literal is gone from sidebar', () => {
    expect(SIDEBAR).not.toContain('1800');
    expect(SIDEBAR).not.toContain('1,800');
  });

  it('hc_no_950: $950 prepaids literal is gone from sidebar', () => {
    // "950" also appears in CSS opacity values — only flag dollar context
    expect(SIDEBAR).not.toMatch(/['"`]\$950['"`]/);
    expect(SIDEBAR).not.toMatch(/950.*prepaids|prepaids.*950/i);
  });

  it('hc_no_static_array: no CLOSING_COSTS or STATIC_COSTS array constant', () => {
    expect(SIDEBAR).not.toMatch(/(?:const|let|var)\s+(?:CLOSING_COSTS|STATIC_COSTS|hardcodedCosts)/);
    expect(PAGE).not.toMatch(/(?:const|let|var)\s+(?:CLOSING_COSTS|STATIC_COSTS|hardcodedCosts)/);
  });

  it('hc_sidebar_uses_compute_fn: ClosingCostSidebar imports computeClosingCostLines', () => {
    expect(SIDEBAR).toContain('computeClosingCostLines');
  });

  it('hc_page_passes_real_financials: phase-2 page passes purchasePrice and loanAmount to ClosingCostSidebar', () => {
    // The sidebar prop block must reference the project's real financial fields
    expect(PAGE).toContain('purchasePrice: project.financials?.purchasePrice');
    expect(PAGE).toContain('loanAmount: project.financials?.loanAmount');
  });

  it('hc_page_persists_overrides: override changes are saved via handleImmediateSave to Firestore', () => {
    expect(PAGE).toContain('closingCostOverrides: next');
    expect(PAGE).toContain('handleImmediateSave');
  });

  it('hc_sidebar_shows_override_badge: sidebar distinguishes computed ("C") from overridden (pencil)', () => {
    expect(SIDEBAR_RAW).toContain('isOverridden');
    // The "C" badge is JSX text ">C<" — check raw source so the comment strip
    // doesn't inadvertently remove context
    expect(SIDEBAR_RAW).toMatch(/>\s*C\s*</);  // computed badge text node
  });

  it('hc_sidebar_has_reset: sidebar has a reset-to-computed button', () => {
    expect(SIDEBAR).toContain('RotateCcw');    // reset icon
    expect(SIDEBAR).toContain('resetOverride');
  });

});

/* ──────────────────────────────────────────────────────────────────────────
   FORMULA — computeClosingCostLines output tracks real inputs
   ────────────────────────────────────────────────────────────────────────── */
describe('computeClosingCostLines — formula correctness', () => {

  // Baseline fixture: $350k price, $280k loan, 6.5% rate, 1 origination point
  const FINANCIALS: ClosingCostInputs = {
    purchasePrice:        350_000,
    loanAmount:           280_000,
    loanInterestRate:     6.5,
    loanOriginationPoints: 1.0,
  };

  it('orig_tracks_loan_points: Origination = loanAmount × (pts / 100)', () => {
    const lines = computeClosingCostLines(FINANCIALS);
    const orig = lines.find((l) => l.id === 'origination')!;
    // 280,000 × 0.01 = 2,800
    expect(orig.computed).toBe(2_800);
    expect(orig.amount).toBe(2_800);
  });

  it('orig_scales_with_loan: doubling the loan doubles origination', () => {
    const [lo, hi] = [
      computeClosingCostLines({ ...FINANCIALS, loanAmount: 200_000 }),
      computeClosingCostLines({ ...FINANCIALS, loanAmount: 400_000 }),
    ];
    const loOrig = lo.find((l) => l.id === 'origination')!.computed;
    const hiOrig = hi.find((l) => l.id === 'origination')!.computed;
    expect(hiOrig).toBe(loOrig * 2);
  });

  it('orig_zero_when_no_points: origination is 0 when points not set', () => {
    const lines = computeClosingCostLines({ ...FINANCIALS, loanOriginationPoints: 0 });
    expect(lines.find((l) => l.id === 'origination')!.computed).toBe(0);
  });

  it('title_tracks_price_040pct: Title & Recording = 0.40% × purchasePrice', () => {
    const lines = computeClosingCostLines(FINANCIALS);
    const title = lines.find((l) => l.id === 'titleRecording')!;
    // 350,000 × 0.004 = 1,400
    expect(title.computed).toBe(1_400);
  });

  it('title_scales_with_price: different prices produce proportionally different title costs', () => {
    const linesA = computeClosingCostLines({ ...FINANCIALS, purchasePrice: 200_000 });
    const linesB = computeClosingCostLines({ ...FINANCIALS, purchasePrice: 400_000 });
    const titleA = linesA.find((l) => l.id === 'titleRecording')!.computed;
    const titleB = linesB.find((l) => l.id === 'titleRecording')!.computed;
    // $400k should produce double the title cost of $200k
    expect(titleB).toBe(titleA * 2);
  });

  it('transfer_tracks_price_010pct: Transfer Tax = 0.10% × purchasePrice', () => {
    const lines = computeClosingCostLines(FINANCIALS);
    const transfer = lines.find((l) => l.id === 'transferTax')!;
    // 350,000 × 0.001 = 350
    expect(transfer.computed).toBe(350);
  });

  it('prepaids_include_interest_insurance_escrow: prepaids > 0 when rate and price set', () => {
    const lines = computeClosingCostLines(FINANCIALS);
    const prepaids = lines.find((l) => l.id === 'prepaids')!;
    expect(prepaids.computed).toBeGreaterThan(0);
    // Hand-check components for FINANCIALS:
    //   dailyInterest = 280000 × 0.065 / 365 = 49.86
    //   prepaidInterest (15d) = round(49.86 × 15) = 748
    //   monthlyInsurance = round(350000 × 0.005 / 12) = 146
    //   taxEscrow3mo = round(350000 × 0.0125 / 12 × 3) = 1094
    //   total = 748 + 146 + 1094 = 1988
    expect(prepaids.computed).toBeCloseTo(1_988, -1); // within $10 due to rounding
  });

  it('prepaids_scale_with_rate: higher rate → more prepaid interest', () => {
    const lowRate  = computeClosingCostLines({ ...FINANCIALS, loanInterestRate: 4.0 });
    const highRate = computeClosingCostLines({ ...FINANCIALS, loanInterestRate: 8.0 });
    const ppLow  = lowRate.find((l) => l.id === 'prepaids')!.computed;
    const ppHigh = highRate.find((l) => l.id === 'prepaids')!.computed;
    expect(ppHigh).toBeGreaterThan(ppLow);
  });

  it('zero_price_zero_title_transfer: price = 0 zeroes title and transfer', () => {
    const lines = computeClosingCostLines({ ...FINANCIALS, purchasePrice: 0 });
    expect(lines.find((l) => l.id === 'titleRecording')!.computed).toBe(0);
    expect(lines.find((l) => l.id === 'transferTax')!.computed).toBe(0);
  });

  it('zero_loan_zero_origination_interest: loan = 0 zeroes origination and prepaid interest', () => {
    const lines = computeClosingCostLines({ ...FINANCIALS, loanAmount: 0 });
    expect(lines.find((l) => l.id === 'origination')!.computed).toBe(0);
    // Prepaid interest component becomes 0 but insurance/escrow may remain
    // Just verify origination is exactly zero
  });

  it('basis_string_mentions_formula: each line has a non-empty basis description', () => {
    const lines = computeClosingCostLines(FINANCIALS);
    for (const l of lines) {
      expect(l.basis.length).toBeGreaterThan(5);
    }
    // Origination basis should mention 'pt' or 'loan'
    expect(lines.find((l) => l.id === 'origination')!.basis).toMatch(/pt|loan/i);
    // Prepaids basis should mention 'interest' or 'insurance' or 'tax'
    expect(lines.find((l) => l.id === 'prepaids')!.basis).toMatch(/interest|insurance|tax/i);
  });

  it('changing_any_input_changes_total: different financials → different total', () => {
    const totalA = totalClosingCosts(computeClosingCostLines(FINANCIALS));
    const totalB = totalClosingCosts(computeClosingCostLines({ ...FINANCIALS, purchasePrice: 500_000, loanAmount: 400_000 }));
    expect(totalB).not.toBe(totalA);
    expect(totalB).toBeGreaterThan(totalA);
  });

});

/* ──────────────────────────────────────────────────────────────────────────
   OVERRIDE — user-persisted values replace computed, marked with isOverridden
   ────────────────────────────────────────────────────────────────────────── */
describe('computeClosingCostLines — override behaviour', () => {

  const FINANCIALS: ClosingCostInputs = {
    purchasePrice: 300_000,
    loanAmount:    240_000,
    loanInterestRate: 7.0,
    loanOriginationPoints: 1.5,
  };

  it('override_replaces_amount: an override replaces the computed amount', () => {
    const overrides: ClosingCostOverrides = { origination: 999 };
    const lines = computeClosingCostLines(FINANCIALS, overrides);
    const orig = lines.find((l) => l.id === 'origination')!;

    expect(orig.computed).toBe(3_600);      // 240000 × 0.015
    expect(orig.override).toBe(999);
    expect(orig.amount).toBe(999);           // override wins
    expect(orig.isOverridden).toBe(true);
  });

  it('override_is_overridden_flag: isOverridden is false when no override set', () => {
    const lines = computeClosingCostLines(FINANCIALS, {});
    for (const l of lines) {
      expect(l.isOverridden).toBe(false);
      expect(l.amount).toBe(l.computed);
    }
  });

  it('override_independent_per_line: overriding one line does not affect others', () => {
    const overrides: ClosingCostOverrides = { titleRecording: 2_500 };
    const lines = computeClosingCostLines(FINANCIALS, overrides);
    const title    = lines.find((l) => l.id === 'titleRecording')!;
    const transfer = lines.find((l) => l.id === 'transferTax')!;

    expect(title.isOverridden).toBe(true);
    expect(title.amount).toBe(2_500);
    expect(transfer.isOverridden).toBe(false);
    expect(transfer.amount).toBe(transfer.computed);
  });

  it('reset_restores_computed: removing override returns amount to computed value', () => {
    const overrides: ClosingCostOverrides = { prepaids: 5_000 };
    const withOverride    = computeClosingCostLines(FINANCIALS, overrides);
    const withoutOverride = computeClosingCostLines(FINANCIALS, {});

    const ppWith    = withOverride.find((l) => l.id === 'prepaids')!;
    const ppWithout = withoutOverride.find((l) => l.id === 'prepaids')!;

    expect(ppWith.amount).toBe(5_000);       // override in effect
    expect(ppWithout.amount).toBe(ppWithout.computed); // back to formula
    expect(ppWith.computed).toBe(ppWithout.computed);  // formula unchanged
  });

  it('all_four_lines_overridable: can override every line independently', () => {
    const overrides: ClosingCostOverrides = {
      origination:   1_000,
      titleRecording: 500,
      transferTax:   200,
      prepaids:     1_200,
    };
    const lines = computeClosingCostLines(FINANCIALS, overrides);
    expect(lines.every((l) => l.isOverridden)).toBe(true);
    expect(lines.find((l) => l.id === 'origination')!.amount).toBe(1_000);
    expect(lines.find((l) => l.id === 'titleRecording')!.amount).toBe(500);
    expect(lines.find((l) => l.id === 'transferTax')!.amount).toBe(200);
    expect(lines.find((l) => l.id === 'prepaids')!.amount).toBe(1_200);
  });

});

/* ──────────────────────────────────────────────────────────────────────────
   TOTAL — totalClosingCosts sums all final amounts
   ────────────────────────────────────────────────────────────────────────── */
describe('totalClosingCosts — sum of final amounts', () => {

  const FINANCIALS: ClosingCostInputs = {
    purchasePrice: 400_000,
    loanAmount:    320_000,
    loanInterestRate: 6.0,
    loanOriginationPoints: 1.0,
  };

  it('total_equals_sum_of_amounts: totalClosingCosts = sum of all line.amount', () => {
    const lines = computeClosingCostLines(FINANCIALS);
    const manualSum = lines.reduce((s, l) => s + l.amount, 0);
    expect(totalClosingCosts(lines)).toBe(manualSum);
  });

  it('total_uses_override_when_set: override on one line changes the total', () => {
    const noOverride = totalClosingCosts(computeClosingCostLines(FINANCIALS, {}));
    const withOverride = totalClosingCosts(
      computeClosingCostLines(FINANCIALS, { origination: 100 })
    );
    // Origination computed = 320000 × 0.01 = 3200; override = 100; delta = -3100
    const origComputed = computeClosingCostLines(FINANCIALS, {})
      .find((l) => l.id === 'origination')!.computed;
    expect(withOverride).toBe(noOverride - origComputed + 100);
  });

  it('total_zero_deal: all-zero inputs produce near-zero total', () => {
    const lines = computeClosingCostLines({ purchasePrice: 0, loanAmount: 0, loanInterestRate: 0, loanOriginationPoints: 0 });
    expect(totalClosingCosts(lines)).toBe(0);
  });

  it('total_positive_normal_deal: a real deal produces a meaningful closing cost total', () => {
    const total = totalClosingCosts(computeClosingCostLines(FINANCIALS));
    // Should be several thousand dollars (not zero, not $100k)
    expect(total).toBeGreaterThan(1_000);
    expect(total).toBeLessThan(50_000);
  });

  // Hand-check: $400k price, $320k loan, 6% rate, 1pt
  //   origination:   320000 × 0.01       = 3200
  //   titleRecording: 400000 × 0.004     = 1600
  //   transferTax:    400000 × 0.001     = 400
  //   prepaids:
  //     dailyInterest = 320000 × 0.06 / 365 = 52.60
  //     prepaidInterest (15d) = round(52.60 × 15) = 789
  //     monthlyInsurance = round(400000 × 0.005/12) = 167
  //     taxEscrow3mo = round(400000 × 0.0125/12 × 3) = 1250
  //     prepaids = 789 + 167 + 1250 = 2206
  //   TOTAL = 3200 + 1600 + 400 + 2206 = 7406
  it('handcheck_known_total: $400k/$320k/6%/1pt → total ≈ $7,406 (±$20)', () => {
    const total = totalClosingCosts(computeClosingCostLines(FINANCIALS));
    expect(total).toBeGreaterThanOrEqual(7_380);
    expect(total).toBeLessThanOrEqual(7_430);
  });

});
