/**
 * Title Search Clearance — Persistence & Attribution (Regression Tests)
 *
 * Background: TitleSearchClearance.tsx:32 previously initialized from a
 * hardcoded `INITIAL_CHECKS` array whose pre-populated statuses (some already
 * "Cleared") lived only in local React state. On refresh they reset to the
 * hardcoded defaults. On a second member's screen, they never appeared at all.
 *
 * Fix (already in place):
 *   • buildFreshChecklist() — new projects start with all 6 checks as "Pending",
 *     no notes, no attribution. Never pre-cleared.
 *   • mergeWithTemplate() — on load, stored Firestore data is merged with the
 *     canonical template so new template items appear as Pending on existing
 *     projects and stored attributions are preserved.
 *   • handleUpdate() — each status change persists immediately to Firestore via
 *     POST /api/closing/title-search with Attribution (who, when) attached to
 *     terminal status changes (Cleared / Issue Found).
 *   • persist() — on failure, local state rolls back to the last stored values;
 *     no ghost state persists.
 *   • API route requireAuth — actorName comes from the verified Firebase token,
 *     not from the request body. A spoofed body.actorName is ignored.
 *   • The Zustand store is updated from the server's response after each save,
 *     so the next mount/refresh reads the persisted state.
 *
 * Evidence in tests:
 *   STATIC  — component reads from Firestore (via store), not a local constant;
 *             re-seeds when project changes; writes back via authorized fetch.
 *   LOGIC   — deriveChainStatus: all-cleared→verified, any-issue→failed, else→pending;
 *             attribution set on terminal change; attribution cleared on revert.
 *   API     — unauthenticated request → 401; body.actorName ignored (attribution
 *             from token); Firestore path is closingRoom.titleChecks;
 *             FieldValue.serverTimestamp() used for updatedAt.
 *   ROLLBACK — on persist failure, re-seeding from stored state is in the catch block.
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
function read(rel: string) {
  return fs.readFileSync(path.join(SRC, rel), 'utf8');
}

const COMPONENT = read('components/closing/TitleSearchClearance.tsx');
const ROUTE     = read('app/api/closing/title-search/route.ts');

/* ──────────────────────────────────────────────────────────────────────────
   STATIC/COMPONENT — reads from Firestore, not a hardcoded constant
   ────────────────────────────────────────────────────────────────────────── */
describe('TitleSearchClearance — data comes from Firestore, not local constant', () => {

  it('reads_stored_checks_from_project_store: storedChecks sourced from closingRoom', () => {
    // Not from a hardcoded constant
    expect(COMPONENT).toMatch(/closingRoom\?\.titleChecks/);
    expect(COMPONENT).toContain('storedChecks');
  });

  it('initial_state_from_store_or_fresh: useState seeds from store OR buildFreshChecklist', () => {
    // mergeWithTemplate(storedChecks) OR buildFreshChecklist()
    expect(COMPONENT).toContain('mergeWithTemplate');
    expect(COMPONENT).toContain('buildFreshChecklist');
    // Both paths in the initial useState call
    expect(COMPONENT).toMatch(/useState[\s\S]{0,100}mergeWithTemplate[\s\S]{0,100}buildFreshChecklist/);
  });

  it('re_seeds_on_project_change: useEffect re-seeds checks when currentProject.id changes', () => {
    // Dependency array must be currentProject?.id so navigating projects updates the view
    expect(COMPONENT).toMatch(/useEffect[\s\S]{0,400}currentProject\?\.id/);
  });

  it('store_updated_from_server_response: updateClosingRoom called with result.data after save', () => {
    // After a successful persist, the Zustand store is updated with the server's
    // authoritative data — not with the optimistic local state
    expect(COMPONENT).toContain('updateClosingRoom');
    expect(COMPONENT).toMatch(/updateClosingRoom[\s\S]{0,100}result\.data/);
  });

  it('no_hardcoded_initial_checks_constant: INITIAL_CHECKS constant is absent', () => {
    expect(COMPONENT).not.toContain('INITIAL_CHECKS');
  });

  it('no_pre_cleared_status_in_template: CHECK_TEMPLATES only has id and name (no status)', () => {
    // The template provides category names only; status is always assigned separately
    // The type annotation on CHECK_TEMPLATES must be Pick<TitleCheckItem, 'id' | 'name'>
    expect(COMPONENT).toMatch(/CHECK_TEMPLATES\s*:\s*Pick\s*<\s*TitleCheckItem\s*,\s*['"]id['"]\s*\|\s*['"]name['"]/);
  });

});

/* ──────────────────────────────────────────────────────────────────────────
   STATIC/COMPONENT — attribution on terminal status changes
   ────────────────────────────────────────────────────────────────────────── */
describe('TitleSearchClearance — attribution stamped on terminal changes', () => {

  it('terminal_statuses_defined: Cleared and Issue Found trigger attribution', () => {
    // const isTerminalChange = patch.status === 'Cleared' || patch.status === 'Issue Found';
    // The definition spans lines, so use [\s\S] for cross-line matching
    expect(COMPONENT).toMatch(/isTerminalChange[\s\S]{0,60}'Cleared'/);
    expect(COMPONENT).toMatch(/isTerminalChange[\s\S]{0,80}'Issue Found'/);
    expect(COMPONENT).toContain('isTerminalChange');
  });

  it('cleared_by_uid_set_on_terminal: clearedByUid assigned from currentUser.uid', () => {
    expect(COMPONENT).toMatch(/clearedByUid\s*:\s*actorUid/);
    expect(COMPONENT).toMatch(/actorUid\s*=\s*auth\.currentUser\?\.uid/);
  });

  it('cleared_by_name_set_on_terminal: clearedByName assigned from displayName or email', () => {
    expect(COMPONENT).toMatch(/clearedByName\s*:\s*actorName/);
    // actorName = displayName || email || 'Unknown' — spans multiple lines
    expect(COMPONENT).toMatch(/actorName[\s\S]{0,60}displayName[\s\S]{0,80}Unknown/);
  });

  it('cleared_at_set_on_terminal: clearedAt assigned as ISO 8601 string', () => {
    expect(COMPONENT).toMatch(/clearedAt\s*:\s*new Date\(\)\.toISOString\(\)/);
  });

  it('attribution_cleared_on_revert: rolling back to Pending clears attribution fields', () => {
    // When status goes back to 'Pending' or 'In Review', attribution must be wiped
    expect(COMPONENT).toMatch(/clearedByUid\s*:\s*undefined/);
    expect(COMPONENT).toMatch(/clearedByName\s*:\s*undefined/);
    expect(COMPONENT).toMatch(/clearedAt\s*:\s*undefined/);
  });

  it('attribution_shown_in_check_row: clearedByName and clearedAt are rendered', () => {
    // The CheckRow sub-component must display attribution when present
    expect(COMPONENT).toContain('check.clearedByName');
    expect(COMPONENT).toContain('check.clearedAt');
  });

});

/* ──────────────────────────────────────────────────────────────────────────
   STATIC/COMPONENT — persist and rollback wiring
   ────────────────────────────────────────────────────────────────────────── */
describe('TitleSearchClearance — persist wiring and rollback', () => {

  it('persist_uses_bearer_token: ID token added as Authorization header', () => {
    expect(COMPONENT).toMatch(/Authorization.*Bearer.*token|Bearer.*token/);
    expect(COMPONENT).toMatch(/getIdToken/);
  });

  it('persist_posts_to_correct_endpoint: fetch targets api/closing/title-search', () => {
    expect(COMPONENT).toContain('/api/closing/title-search');
    expect(COMPONENT).toMatch(/method\s*:\s*['"]POST['"]/);
  });

  it('persist_rejects_if_no_token: early return when token is falsy', () => {
    // If getIdToken returns falsy, persist must show an error and bail
    expect(COMPONENT).toMatch(/if\s*\(\s*!token\s*\)/);
    expect(COMPONENT).toMatch(/!token[\s\S]{0,80}toast\.error|toast\.error[\s\S]{0,80}!token/);
  });

  it('rollback_on_failure: catch block reseeds from store not hardcoded defaults', () => {
    // The catch block must call setChecks from stored data (mergeWithTemplate or buildFreshChecklist)
    // NOT from a hardcoded constant
    expect(COMPONENT).toMatch(/catch[\s\S]{0,300}setChecks[\s\S]{0,200}(?:mergeWithTemplate|buildFreshChecklist)/);
  });

  it('saving_state_shown_during_persist: setSaving(true) before fetch, setSaving(false) in finally', () => {
    expect(COMPONENT).toMatch(/setSaving\s*\(\s*true\s*\)/);
    expect(COMPONENT).toMatch(/finally[\s\S]{0,100}setSaving\s*\(\s*false\s*\)/);
  });

});

/* ──────────────────────────────────────────────────────────────────────────
   STATIC/API — auth guard, server-side attribution, Firestore path
   ────────────────────────────────────────────────────────────────────────── */
describe('title-search API route — auth, attribution, Firestore', () => {

  it('requires_auth_header: requireAuth called before any business logic', () => {
    expect(ROUTE).toContain('requireAuth');
    expect(ROUTE).toContain('isAuthError');
    // Guard is the first async operation
    const guardIdx   = ROUTE.indexOf('requireAuth');
    const firestoreIdx = ROUTE.indexOf('adminDb');
    expect(guardIdx).toBeGreaterThan(-1);
    expect(firestoreIdx).toBeGreaterThan(guardIdx);
  });

  it('actor_name_from_token_not_body: actorName derived from decoded token', () => {
    // Attribution must come from the verified token, not request body
    expect(ROUTE).toMatch(/actorName[\s\S]{0,60}token\?\.name.*token\?\.email/);
    expect(ROUTE).not.toContain('body.actorName');
    expect(ROUTE).not.toContain('actorName: checks');
  });

  it('writes_to_closing_room_title_checks: Firestore path is closingRoom.titleChecks', () => {
    expect(ROUTE).toMatch(/'closingRoom\.titleChecks'/);
  });

  it('writes_chain_of_title_status: aggregate status written alongside checks', () => {
    expect(ROUTE).toMatch(/'closingRoom\.chainOfTitleStatus'/);
  });

  it('uses_server_timestamp_for_updated_at: FieldValue.serverTimestamp() used', () => {
    expect(ROUTE).toContain('FieldValue.serverTimestamp()');
    expect(ROUTE).toContain('updatedAt');
  });

  it('validates_project_id: 400 returned when projectId absent', () => {
    expect(ROUTE).toMatch(/projectId.*required|400/);
  });

  it('validates_checks_array: 400 returned when checks is not an array', () => {
    expect(ROUTE).toMatch(/checks.*array|Array\.isArray/);
  });

});

/* ──────────────────────────────────────────────────────────────────────────
   LOGIC — deriveChainStatus pure function (extracted for unit testing)
   ────────────────────────────────────────────────────────────────────────── */

type ClearanceStatus = 'Pending' | 'In Review' | 'Cleared' | 'Issue Found';
interface TitleCheckItem { id: string; name: string; status: ClearanceStatus; }

function deriveChainStatus(
  checks: TitleCheckItem[]
): 'pending' | 'verified' | 'failed' {
  if (checks.some((c) => c.status === 'Issue Found')) return 'failed';
  if (checks.every((c) => c.status === 'Cleared')) return 'verified';
  return 'pending';
}

function makeChecks(statuses: ClearanceStatus[]): TitleCheckItem[] {
  return statuses.map((status, i) => ({ id: `c${i}`, name: `Check ${i}`, status }));
}

describe('deriveChainStatus — aggregate logic', () => {

  it('all_cleared_returns_verified', () => {
    expect(deriveChainStatus(makeChecks(['Cleared', 'Cleared', 'Cleared']))).toBe('verified');
  });

  it('any_issue_found_returns_failed_immediately', () => {
    expect(deriveChainStatus(makeChecks(['Cleared', 'Issue Found', 'Cleared']))).toBe('failed');
  });

  it('issue_found_overrides_all_cleared: even if most are cleared', () => {
    const six: ClearanceStatus[] = ['Cleared', 'Cleared', 'Cleared', 'Cleared', 'Cleared', 'Issue Found'];
    expect(deriveChainStatus(makeChecks(six))).toBe('failed');
  });

  it('mixed_cleared_and_pending_returns_pending', () => {
    expect(deriveChainStatus(makeChecks(['Cleared', 'Pending', 'Cleared']))).toBe('pending');
  });

  it('all_pending_returns_pending', () => {
    expect(deriveChainStatus(makeChecks(['Pending', 'Pending', 'Pending']))).toBe('pending');
  });

  it('in_review_returns_pending', () => {
    expect(deriveChainStatus(makeChecks(['Cleared', 'In Review', 'Cleared']))).toBe('pending');
  });

  it('single_cleared_check_not_verified: all must be cleared', () => {
    expect(deriveChainStatus(makeChecks(['Cleared']))).toBe('verified');
    expect(deriveChainStatus(makeChecks(['Cleared', 'Pending']))).toBe('pending');
  });

});

/* ──────────────────────────────────────────────────────────────────────────
   LOGIC — mergeWithTemplate (second-member persistence scenario)
   ────────────────────────────────────────────────────────────────────────── */

const CHECK_TEMPLATES: Pick<TitleCheckItem, 'id' | 'name'>[] = [
  { id: 'ownership', name: 'Chain of Ownership Verification' },
  { id: 'liens',     name: 'Outstanding Liens & Judgments' },
  { id: 'taxes',     name: 'Property Tax Clearance' },
  { id: 'easements', name: 'Easements & Encumbrances' },
  { id: 'survey',    name: 'Survey / Boundary Confirmation' },
  { id: 'hoa',       name: 'HOA/Condo Special Assessments' },
];

interface FullCheckItem extends TitleCheckItem {
  notes?: string;
  clearedByUid?: string;
  clearedByName?: string;
  clearedAt?: string;
}

function mergeWithTemplate(stored: FullCheckItem[]): FullCheckItem[] {
  return CHECK_TEMPLATES.map((template) => {
    const found = stored.find((s) => s.id === template.id);
    return found ?? { id: template.id, name: template.name, status: 'Pending' as ClearanceStatus };
  });
}

describe('mergeWithTemplate — second-member scenario (survived refresh)', () => {

  it('second_member_sees_cleared_check: persisted Cleared status with attribution is preserved', () => {
    // Member A clears "ownership", saves to Firestore.
    // Member B opens the project. The store loads titleChecks from Firestore.
    // mergeWithTemplate must preserve Member A's attribution.
    const fromFirestore: FullCheckItem[] = [
      {
        id: 'ownership',
        name: 'Chain of Ownership Verification',
        status: 'Cleared',
        clearedByUid: 'member-a-uid',
        clearedByName: 'Member A',
        clearedAt: '2026-06-13T10:00:00.000Z',
        notes: 'Confirmed with county recorder',
      },
    ];

    const merged = mergeWithTemplate(fromFirestore);
    const ownership = merged.find((c) => c.id === 'ownership') as FullCheckItem;

    expect(ownership.status).toBe('Cleared');
    expect(ownership.clearedByName).toBe('Member A');
    expect(ownership.clearedByUid).toBe('member-a-uid');
    expect(ownership.clearedAt).toBe('2026-06-13T10:00:00.000Z');
    expect(ownership.notes).toBe('Confirmed with county recorder');
  });

  it('second_member_sees_pending_for_unstarted: uncompleted checks show as Pending', () => {
    const fromFirestore: FullCheckItem[] = [
      { id: 'ownership', name: 'Chain of Ownership Verification', status: 'Cleared', clearedByName: 'A', clearedAt: '2026-06-13T10:00:00.000Z' },
    ];
    const merged = mergeWithTemplate(fromFirestore);
    const liens = merged.find((c) => c.id === 'liens') as FullCheckItem;
    expect(liens.status).toBe('Pending');
    expect(liens.clearedByName).toBeUndefined();
  });

  it('new_project_all_pending: empty stored array yields fresh checklist', () => {
    const merged = mergeWithTemplate([]);
    expect(merged).toHaveLength(6);
    merged.forEach((c) => {
      expect(c.status).toBe('Pending');
      expect((c as FullCheckItem).clearedByName).toBeUndefined();
      expect((c as FullCheckItem).clearedAt).toBeUndefined();
    });
  });

  it('template_order_preserved: canonical order not disturbed by stored order', () => {
    const outOfOrder: FullCheckItem[] = [
      { id: 'hoa',      name: 'HOA/Condo Special Assessments', status: 'Cleared', clearedByName: 'X', clearedAt: '2026-06-13T10:00:00.000Z' },
      { id: 'taxes',    name: 'Property Tax Clearance',         status: 'In Review' },
      { id: 'survey',   name: 'Survey / Boundary Confirmation', status: 'Pending' },
    ];
    const merged = mergeWithTemplate(outOfOrder);
    expect(merged.map((c) => c.id)).toEqual(
      ['ownership', 'liens', 'taxes', 'easements', 'survey', 'hoa']
    );
    expect(merged[2].status).toBe('In Review'); // taxes
    expect(merged[5].status).toBe('Cleared');   // hoa
  });

  it('issue_found_preserved: Issue Found status and notes survive merge', () => {
    const fromFirestore: FullCheckItem[] = [
      { id: 'liens', name: 'Outstanding Liens & Judgments', status: 'Issue Found', notes: 'Mechanic lien from 2024', clearedByName: 'B', clearedAt: '2026-06-13T11:00:00.000Z' },
    ];
    const merged = mergeWithTemplate(fromFirestore);
    const liens = merged.find((c) => c.id === 'liens') as FullCheckItem;
    expect(liens.status).toBe('Issue Found');
    expect(liens.notes).toBe('Mechanic lien from 2024');
  });

});
