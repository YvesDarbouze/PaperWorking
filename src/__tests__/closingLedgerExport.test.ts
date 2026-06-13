/**
 * Closing Ledger Export — Real File Download (Regression Tests)
 *
 * Background: The export button on phase-2/page.tsx previously fired a toast
 * notification and did nothing else — no file was produced despite closing
 * ledger data existing. The fix implements:
 *
 *   GET /api/reil/projects/{id}/closing-ledger/export?format=csv|pdf
 *     - Auth: Firebase ID token (Authorization: Bearer)
 *     - Membership: hasProjectAccessSync — 403 for non-members
 *     - Read-only: reads project.financials from Firestore, no writes
 *     - Same pure functions as the on-screen sidebar (computeClosingCostLines +
 *       totalClosingCosts from @/lib/math/closingCosts) — totals agree exactly
 *     - CSV: each line: label, type (Computed|Overridden), computed $,
 *            override $, amount $; TOTAL row at the bottom
 *     - PDF: jsPDF; brand header; override rows in amber; basis hint per row;
 *            footer with "Generated {date}" and "Read-only snapshot" label
 *     - Filename: closing-ledger-{address-slug}-{YYYY-MM-DD}.{format}
 *     - Telemetry: closing_ledger_exported event on success
 *
 *   Client handler (handleExportLedger in phase-2/page.tsx):
 *     - Calls GET, downloads blob, fires toast.success ONLY after a.click()
 *     - Error toast only in the catch block — never on the success path
 *
 * Evidence categories:
 *   STATIC/CLIENT  — toast sequence, bearer token, download wiring
 *   STATIC/ROUTE   — auth ordering, scope guard, format/header/telemetry
 *   CSV            — column structure, override marking, TOTAL row
 *   PDF            — brand, override color, page overflow, arraybuffer output
 *   CROSS-SURFACE  — sidebar + route import from identical module
 *   LOGIC          — computeClosingCostLines / totalClosingCosts unit tests
 *   RUNTIME        — mocked Firebase/HTTP integration tests
 */

// ── ALL IMPORTS AT TOP ────────────────────────────────────────────────────────
import * as fs from 'fs';
import * as path from 'path';
import {
  computeClosingCostLines,
  totalClosingCosts,
  type ClosingCostInputs,
  type ClosingCostOverrides,
} from '../lib/math/closingCosts';
import { GET } from '@/app/api/reil/projects/[id]/closing-ledger/export/route';
import { NextRequest } from 'next/server';

// ── MOCK VARIABLES (var hoists above jest.mock factories) ─────────────────────
// eslint-disable-next-line no-var
var mockVerifyIdToken = jest.fn();
// eslint-disable-next-line no-var
var mockGet = jest.fn();
// eslint-disable-next-line no-var
var mockSet = jest.fn();
// eslint-disable-next-line no-var
var mockUpdate = jest.fn();
// eslint-disable-next-line no-var
var mockDelete = jest.fn();
// eslint-disable-next-line no-var
var mockCapture = jest.fn();

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
  },
  adminDb: {
    collection: jest.fn().mockImplementation(() => ({
      doc: jest.fn().mockImplementation((docId: string) => ({
        get:    (...args: any[]) => mockGet(...args),
        set:    (...args: any[]) => mockSet(docId, ...args),
        update: (...args: any[]) => mockUpdate(docId, ...args),
        delete: (...args: any[]) => mockDelete(docId, ...args),
      })),
    })),
  },
}));

jest.mock('@/lib/telemetry', () => ({
  telemetry: {
    capture: (...args: any[]) => mockCapture(...args),
  },
}));

// ── STATIC SOURCE HELPERS ─────────────────────────────────────────────────────
const SRC = path.resolve(__dirname, '..');
function readSrc(rel: string): string {
  return fs.readFileSync(path.join(SRC, rel), 'utf8');
}

const PAGE    = readSrc('app/dashboard/projects/[id]/phase-2/page.tsx');
const ROUTE   = readSrc('app/api/reil/projects/[id]/closing-ledger/export/route.ts');
const SIDEBAR = readSrc('components/phase2/ClosingCostSidebar.tsx');

// Slice of the page that covers handleExportLedger
const HANDLER = (() => {
  const start = PAGE.indexOf('handleExportLedger');
  return PAGE.slice(start, start + 1600);
})();

/* ──────────────────────────────────────────────────────────────────────────
   STATIC / CLIENT — toast fires only after real file download
   ────────────────────────────────────────────────────────────────────────── */
describe('phase-2 handleExportLedger — toast fires only after real download', () => {
  it('blob_before_toast_success: res.blob() appears before toast.success', () => {
    expect(HANDLER.indexOf('res.blob()')).toBeLessThan(HANDLER.indexOf('toast.success'));
  });

  it('click_before_toast_success: a.click() appears before toast.success', () => {
    expect(HANDLER.indexOf('.click()')).toBeLessThan(HANDLER.indexOf('toast.success'));
  });

  it('create_object_url_then_revoke: URL object lifecycle is correct', () => {
    expect(HANDLER).toContain('URL.createObjectURL');
    expect(HANDLER).toContain('URL.revokeObjectURL');
  });

  it('a_download_has_closing_ledger_prefix: filename starts with closing-ledger', () => {
    expect(HANDLER).toMatch(/a\.download\s*=.*closing-ledger-/);
  });

  it('date_from_iso_split: date derived from toISOString().split, not hardcoded', () => {
    expect(HANDLER).toContain('.toISOString().split');
  });

  it('bearer_token_sent: Authorization: Bearer {token} header in fetch', () => {
    expect(HANDLER).toMatch(/Authorization.*Bearer.*token/);
    expect(HANDLER).toContain('getIdToken()');
  });

  it('fetch_targets_export_endpoint: /closing-ledger/export called with format param', () => {
    expect(HANDLER).toContain('closing-ledger/export');
    expect(HANDLER).toMatch(/format=.*format/);
  });

  it('error_toast_in_catch_uses_err_variable: catch block uses the caught error, not a literal', () => {
    // The early-return guard uses toast.error('Not authenticated') — a literal.
    // The catch block must use the caught error variable: toast.error(err...)
    // Actual catch signature: catch (err: unknown) — type annotation allowed.
    expect(HANDLER).toMatch(/catch\s*\(\s*err[^)]*\)[\s\S]{0,200}toast\.error\s*\(\s*err/);
  });
});

/* ──────────────────────────────────────────────────────────────────────────
   STATIC / ROUTE — auth ordering, scope, format, headers, telemetry
   ────────────────────────────────────────────────────────────────────────── */
describe('closing-ledger export route — static structure', () => {
  it('require_auth_before_admin_db: auth guard checked before any Firestore access', () => {
    const authIdx = ROUTE.indexOf('requireAuth(req)');
    const dbIdx   = ROUTE.indexOf('adminDb.collection');
    expect(authIdx).toBeGreaterThan(-1);
    expect(dbIdx).toBeGreaterThan(authIdx);
  });

  it('scope_guard_before_build_csv: hasProjectAccessSync checked before file generation', () => {
    // Search for the CALL to buildCsv/buildPdf (not their definitions).
    // Definitions have `buildCsv(lines:` (type annotation).
    // Calls have    `buildCsv(lines,` (positional argument, comma follows).
    const guardIdx    = ROUTE.indexOf('hasProjectAccessSync');
    const csvCallIdx  = ROUTE.indexOf('buildCsv(lines,');
    const pdfCallIdx  = ROUTE.indexOf('buildPdf(lines,');
    const buildCallIdx = Math.min(
      csvCallIdx  === -1 ? Infinity : csvCallIdx,
      pdfCallIdx  === -1 ? Infinity : pdfCallIdx,
    );
    expect(guardIdx).toBeGreaterThan(-1);
    expect(buildCallIdx).toBeGreaterThan(guardIdx);
  });

  it('access_denied_403: 403 returned with readable message on scope denial', () => {
    expect(ROUTE).toMatch(/403/);
    expect(ROUTE).toMatch(/Access denied|not a project member/);
  });

  it('project_not_found_404: 404 returned when project snap does not exist', () => {
    expect(ROUTE).toMatch(/404/);
    expect(ROUTE).toMatch(/Project not found/);
  });

  it('shared_pure_function_imported: computeClosingCostLines from @/lib/math/closingCosts', () => {
    expect(ROUTE).toContain('computeClosingCostLines');
    expect(ROUTE).toContain('totalClosingCosts');
    expect(ROUTE).toMatch(/from\s*['"]@\/lib\/math\/closingCosts['"]/);
  });

  it('build_csv_function_defined: buildCsv function declared in route', () => {
    expect(ROUTE).toMatch(/function\s+buildCsv\s*\(/);
  });

  it('build_pdf_function_uses_jspdf: buildPdf uses jsPDF from jspdf package', () => {
    expect(ROUTE).toMatch(/function\s+buildPdf\s*\(/);
    expect(ROUTE).toContain('jsPDF');
    expect(ROUTE).toMatch(/from\s*['"]jspdf['"]/);
  });

  it('csv_content_type: text/csv; charset=utf-8 header set', () => {
    expect(ROUTE).toMatch(/text\/csv/);
  });

  it('pdf_content_type: application/pdf header set', () => {
    expect(ROUTE).toMatch(/application\/pdf/);
  });

  it('attachment_disposition: Content-Disposition attachment with filename', () => {
    expect(ROUTE).toMatch(/attachment.*filename/);
  });

  it('no_store_cache_control: no-store prevents stale cached exports', () => {
    expect(ROUTE).toContain('no-store');
  });

  it('closing_ledger_prefix_in_basename: filename starts with closing-ledger', () => {
    expect(ROUTE).toMatch(/closing-ledger-/);
    expect(ROUTE).toContain('basename');
  });

  it('telemetry_event_on_success: closing_ledger_exported event captured', () => {
    expect(ROUTE).toContain('closing_ledger_exported');
    expect(ROUTE).toContain('telemetry');
  });

  it('read_only_no_project_writes: no .set() or .update() on the project collection', () => {
    const afterAuth = ROUTE.slice(ROUTE.indexOf('requireAuth'));
    expect(afterAuth).not.toMatch(
      /collection\s*\(\s*['"]projects['"]\s*\)[\s\S]{0,100}\.(?:set|update)\s*\(/
    );
  });
});

/* ──────────────────────────────────────────────────────────────────────────
   CSV FORMAT — column headers, override marking, total row
   ────────────────────────────────────────────────────────────────────────── */
describe('buildCsv — column structure and override marking', () => {
  it('column_header_row: all required columns present in header', () => {
    expect(ROUTE).toMatch(/Line Item.*Type.*Computed.*Amount/);
  });

  it('overridden_label: "Overridden" written for lines with user override', () => {
    expect(ROUTE).toMatch(/isOverridden.*'Overridden'|isOverridden.*"Overridden"/);
  });

  it('computed_label: "Computed" written for formula-driven lines', () => {
    expect(ROUTE).toMatch(/'Computed'|"Computed"/);
  });

  it('total_row_present: TOTAL appears at bottom of CSV output', () => {
    expect(ROUTE).toContain('TOTAL');
  });

  it('csv_escape_double_quotes: csvEscape function doubles inner quotes (RFC 4180)', () => {
    expect(ROUTE).toContain('csvEscape');
    expect(ROUTE).toMatch(/replace.*""/);
  });

  it('to_fixed_2_decimal_places: amounts formatted to 2 decimal places', () => {
    expect(ROUTE).toMatch(/\.toFixed\s*\(\s*2\s*\)/);
  });
});

/* ──────────────────────────────────────────────────────────────────────────
   PDF FORMAT — brand, override color, page overflow, footer
   ────────────────────────────────────────────────────────────────────────── */
describe('buildPdf — brand, overrides, page overflow', () => {
  it('override_rows_visually_distinct: different RGB color for isOverridden rows', () => {
    expect(ROUTE).toMatch(/isOverridden.*\[\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\]/);
  });

  it('basis_hint_rendered: basisStr sub-line shown under each line item', () => {
    expect(ROUTE).toContain('basisStr');
    expect(ROUTE).toContain('l.basis');
  });

  it('page_overflow_handled: addPage called when y exceeds threshold', () => {
    expect(ROUTE).toContain('addPage');
    expect(ROUTE).toMatch(/y\s*>\s*2\d{2}/);
  });

  it('brand_header: PAPERWORKING text in top banner', () => {
    expect(ROUTE).toContain('PAPERWORKING');
  });

  it('footer_has_generated_date: Generated {date} appears in footer', () => {
    expect(ROUTE).toMatch(/Generated\s*\$\{date\}/);
  });

  it('arraybuffer_output: doc.output("arraybuffer") used for binary response', () => {
    expect(ROUTE).toContain("doc.output('arraybuffer')");
  });
});

/* ──────────────────────────────────────────────────────────────────────────
   CROSS-SURFACE AGREEMENT — sidebar and export use identical module
   ────────────────────────────────────────────────────────────────────────── */
describe('closing cost totals — sidebar and export route share the same module', () => {
  it('sidebar_imports_from_closing_costs_module', () => {
    expect(SIDEBAR).toContain('computeClosingCostLines');
    expect(SIDEBAR).toContain('totalClosingCosts');
    expect(SIDEBAR).toMatch(/from\s*['"]@\/lib\/math\/closingCosts['"]/);
  });

  it('route_imports_from_same_path', () => {
    expect(ROUTE).toMatch(/from\s*['"]@\/lib\/math\/closingCosts['"]/);
  });

  it('neither_surface_defines_its_own_formula', () => {
    expect(SIDEBAR).not.toMatch(/totalClosingCosts\s*=/);
    expect(ROUTE).not.toMatch(/function\s+totalClosingCosts/);
  });
});

/* ──────────────────────────────────────────────────────────────────────────
   LOGIC — computeClosingCostLines unit tests
   (Proves: "real data including a marked override; totals match the screen")
   ────────────────────────────────────────────────────────────────────────── */
const BASE: ClosingCostInputs = {
  purchasePrice: 400_000,
  loanAmount: 320_000,
  loanInterestRate: 6.5,
  loanOriginationPoints: 1,
};

describe('computeClosingCostLines — four line items', () => {
  it('returns_exactly_four_lines', () => {
    expect(computeClosingCostLines(BASE)).toHaveLength(4);
  });

  it('origination_equals_loan_times_points_div_100', () => {
    const lines = computeClosingCostLines(BASE);
    const orig = lines.find((l) => l.id === 'origination')!;
    expect(orig.computed).toBe(3200); // 320000 × 1%
    expect(orig.amount).toBe(3200);
    expect(orig.isOverridden).toBe(false);
  });

  it('title_recording_equals_040pct_of_purchase_price', () => {
    const lines = computeClosingCostLines(BASE);
    const title = lines.find((l) => l.id === 'titleRecording')!;
    expect(title.computed).toBe(1600); // 400000 × 0.004
    expect(title.isOverridden).toBe(false);
  });

  it('transfer_tax_equals_010pct_of_purchase_price', () => {
    const lines = computeClosingCostLines(BASE);
    const tx = lines.find((l) => l.id === 'transferTax')!;
    expect(tx.computed).toBe(400); // 400000 × 0.001
    expect(tx.isOverridden).toBe(false);
  });

  it('override_replaces_amount_and_marks_is_overridden', () => {
    const overrides: ClosingCostOverrides = { origination: 999 };
    const lines = computeClosingCostLines(BASE, overrides);
    const orig = lines.find((l) => l.id === 'origination')!;
    expect(orig.computed).toBe(3200);
    expect(orig.override).toBe(999);
    expect(orig.amount).toBe(999);
    expect(orig.isOverridden).toBe(true);
  });

  it('non_overridden_lines_unaffected_when_one_override_set', () => {
    const overrides: ClosingCostOverrides = { origination: 999 };
    const lines = computeClosingCostLines(BASE, overrides);
    const title = lines.find((l) => l.id === 'titleRecording')!;
    expect(title.isOverridden).toBe(false);
    expect(title.amount).toBe(title.computed);
  });

  it('override_zero_is_still_marked_overridden', () => {
    const overrides: ClosingCostOverrides = { transferTax: 0 };
    const lines = computeClosingCostLines(BASE, overrides);
    const tx = lines.find((l) => l.id === 'transferTax')!;
    expect(tx.isOverridden).toBe(true);
    expect(tx.amount).toBe(0);
    expect(tx.override).toBe(0);
  });

  it('basis_string_present_on_every_line', () => {
    const lines = computeClosingCostLines(BASE);
    for (const l of lines) {
      expect(typeof l.basis).toBe('string');
      expect(l.basis.length).toBeGreaterThan(0);
    }
  });

  it('zero_inputs_produce_zero_total', () => {
    const lines = computeClosingCostLines({});
    expect(totalClosingCosts(lines)).toBe(0);
    for (const l of lines) {
      expect(l.computed).toBe(0);
      expect(l.isOverridden).toBe(false);
    }
  });
});

describe('totalClosingCosts — sums amounts not computed values', () => {
  it('total_equals_manual_sum_of_amounts', () => {
    const lines = computeClosingCostLines(BASE);
    const total = totalClosingCosts(lines);
    const manualSum = lines.reduce((s, l) => s + l.amount, 0);
    expect(total).toBe(manualSum);
  });

  it('override_shifts_total_by_the_delta', () => {
    const overrides: ClosingCostOverrides = { origination: 999 };
    const withOverride    = totalClosingCosts(computeClosingCostLines(BASE, overrides));
    const withoutOverride = totalClosingCosts(computeClosingCostLines(BASE));
    expect(withOverride).toBe(withoutOverride - 3200 + 999);
  });

  it('no_override_total_equals_sum_of_computed', () => {
    const lines = computeClosingCostLines(BASE);
    const total      = totalClosingCosts(lines);
    const sumComputed = lines.reduce((s, l) => s + l.computed, 0);
    expect(total).toBe(sumComputed);
  });

  it('known_total_hand_check: $400k/$320k/6.5%/1pt yields expected range', () => {
    // origination: 3200 · title: 1600 · transfer: 400
    // prepaids ≈ 15-day interest + 1mo insurance + 3mo tax = ~2000–2500
    // expected: 7200–7800
    const total = totalClosingCosts(computeClosingCostLines(BASE));
    expect(total).toBeGreaterThan(7200);
    expect(total).toBeLessThan(7800);
  });
});

/* ──────────────────────────────────────────────────────────────────────────
   RUNTIME INTEGRATION TESTS (mocked Firebase + HTTP handler)
   ────────────────────────────────────────────────────────────────────────── */
describe('Closing Ledger Export API Route', () => {
  const projectId = 'project_test_123';
  const routeParams = { params: Promise.resolve({ id: projectId }) };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unauthenticated requests with 401', async () => {
    const req = new NextRequest(
      `http://localhost/api/reil/projects/${projectId}/closing-ledger/export?format=csv`,
      { method: 'GET', headers: { Authorization: 'Bearer invalid-token' } },
    );
    mockVerifyIdToken.mockRejectedValueOnce(new Error('Invalid token'));

    const res = await GET(req, routeParams);
    expect(res.status).toBe(401);
  });

  it('rejects non-member and non-owner access with 403', async () => {
    const req = new NextRequest(
      `http://localhost/api/reil/projects/${projectId}/closing-ledger/export?format=csv`,
      { method: 'GET', headers: { Authorization: 'Bearer valid-token' } },
    );
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'intruder_456' });
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ ownerUid: 'owner_123', members: { collab_789: true } }),
    });
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ role: 'Standard' }),
    });

    const res = await GET(req, routeParams);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Access denied');
  });

  it('exports CSV with correct headers, marked override, and verified total', async () => {
    const req = new NextRequest(
      `http://localhost/api/reil/projects/${projectId}/closing-ledger/export?format=csv`,
      { method: 'GET', headers: { Authorization: 'Bearer valid-token' } },
    );
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'owner_123' });
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        ownerUid: 'owner_123',
        organizationId: 'org_123',
        address: '123 Main St, Anytown, USA',
        financials: {
          purchasePrice: 300000,
          loanAmount: 240000,
          loanInterestRate: 6.5,
          loanOriginationPoints: 1.0,
          closingCostOverrides: { transferTax: 1200 },
        },
      }),
    });
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ uid: 'owner_123', role: 'Lead Investor', personalOrganizationId: 'org_123' }),
    });

    const res = await GET(req, routeParams);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/csv');
    expect(res.headers.get('Content-Disposition')).toContain('closing-ledger-123-main-st-anytown-usa-');

    const text = await res.text();
    expect(text).toContain('"Line Item","Type","Computed ($)","Override ($)","Amount ($)"');
    // Origination: 240000 × 1% = 2400 (no override)
    expect(text).toContain('"Origination Fees","Computed","2400.00","","2400.00"');
    // Transfer tax: computed 300 (300000 × 0.1%), override 1200
    expect(text).toContain('"Transfer Tax","Overridden","300.00","1200.00","1200.00"');
    // total = 2400 + 1200 (title) + 1200 (override) + 1704 (prepaids) = 6504
    expect(text).toContain('"TOTAL","6504.00"');

    expect(mockCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'closing_ledger_exported',
        properties: expect.objectContaining({ projectId, format: 'csv' }),
      }),
    );
    expect(mockSet).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('exports PDF with correct content-type and non-empty body', async () => {
    const req = new NextRequest(
      `http://localhost/api/reil/projects/${projectId}/closing-ledger/export?format=pdf`,
      { method: 'GET', headers: { Authorization: 'Bearer valid-token' } },
    );
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'member_789' });
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        ownerUid: 'owner_123',
        members: { member_789: true },
        address: '123 Main St, Anytown, USA',
        financials: {
          purchasePrice: 300000,
          loanAmount: 240000,
          loanInterestRate: 6.5,
          loanOriginationPoints: 1.0,
        },
      }),
    });
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ role: 'Standard' }),
    });

    const res = await GET(req, routeParams);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/pdf');
    expect(res.headers.get('Content-Disposition')).toContain('closing-ledger-123-main-st-anytown-usa-');

    const buffer = await res.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);

    expect(mockCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'closing_ledger_exported',
        properties: expect.objectContaining({ projectId, format: 'pdf' }),
      }),
    );
    expect(mockSet).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
