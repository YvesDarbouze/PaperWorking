/**
 * ActivityFeed — No Hardcoded Demo Data Regression Test
 *
 * Root cause: ActivityFeed.tsx had a hardcoded ACTIVITY_ITEMS array and
 * a [WARN] NO DATA DETECTED terminal empty state that replaced real data.
 * SystemActivityFeed.tsx had a hardcoded `activities` array of fictional
 * events ("Dividend payout", "Jane Cooper accessed Due Diligence folder")
 * that was never connected to Firestore.
 *
 * Fix:
 *   - ActivityFeed.tsx wired to Firestore organizations/{orgId}/activity
 *     with a live onSnapshot listener and a friendly honest empty state.
 *   - SystemActivityFeed.tsx removed (dead code — never imported).
 *   - vendorAssignment.ts emits phase_change activity after batch commit.
 *   - invitations/respond/route.ts emits member_joined on invitation accept.
 *
 * Mutation paths that now write to the org activity feed:
 *   POST /api/projects                    → deal_created
 *   PATCH /api/projects/[id]              → phase_change
 *   POST /api/projects/[id]/documents     → doc_uploaded
 *   POST /api/webhooks/sourcing           → deal_created (sourced lead)
 *   POST /api/closing/title-search        → phase_change
 *   assignVendorToProject (Server Action) → phase_change  ← NEW
 *   POST /api/invitations/respond (accept) → member_joined ← NEW
 *
 * These tests enforce that no demo activity data can re-enter the source.
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');

function read(relPath: string): string {
  return fs.readFileSync(path.join(SRC, relPath), 'utf8');
}

const ACTIVITY_FEED    = read('components/dashboard/home/ActivityFeed.tsx');
const VENDOR_ACTION    = read('actions/vendorAssignment.ts');
const INVITE_RESPOND   = read('app/api/invitations/respond/route.ts');

/* ──────────────────────────────────────────────────────────────────────────
   1. ActivityFeed.tsx — no hardcoded arrays, no [WARN] terminal UI
   ────────────────────────────────────────────────────────────────────────── */
describe('ActivityFeed.tsx — no hardcoded demo arrays or terminal [WARN] UI', () => {

  it('af_no_activity_items: ACTIVITY_ITEMS constant does not exist', () => {
    expect(ACTIVITY_FEED).not.toContain('ACTIVITY_ITEMS');
  });

  it('af_no_warn_terminal: empty state does not render [WARN] or NO DATA DETECTED', () => {
    expect(ACTIVITY_FEED).not.toContain('[WARN]');
    expect(ACTIVITY_FEED).not.toContain('NO DATA DETECTED');
  });

  it('af_live_listener: uses Firestore onSnapshot for real-time updates', () => {
    expect(ACTIVITY_FEED).toContain('onSnapshot');
  });

  it('af_correct_collection: queries organizations/{orgId}/activity', () => {
    expect(ACTIVITY_FEED).toContain("'organizations'");
    expect(ACTIVITY_FEED).toContain("'activity'");
  });

  it('af_ordered_newest_first: query orders by createdAt descending', () => {
    expect(ACTIVITY_FEED).toContain("orderBy('createdAt', 'desc')");
  });

});

/* ──────────────────────────────────────────────────────────────────────────
   2. SystemActivityFeed.tsx — removed (dead code with fake data)
   ────────────────────────────────────────────────────────────────────────── */
describe('SystemActivityFeed.tsx — removed (hardcoded fake events)', () => {

  it('saf_file_deleted: SystemActivityFeed.tsx no longer exists', () => {
    const filePath = path.join(SRC, 'components/dashboard/home/SystemActivityFeed.tsx');
    expect(fs.existsSync(filePath)).toBe(false);
  });

});

/* ──────────────────────────────────────────────────────────────────────────
   3. Activity emission — real mutations write to the org feed
   ────────────────────────────────────────────────────────────────────────── */
describe('Activity emission — vendor assignment and invitation accept emit events', () => {

  it('va_imports_logger: vendorAssignment.ts imports logOrgActivity', () => {
    expect(VENDOR_ACTION).toContain("import { logOrgActivity }");
  });

  it('va_emits_after_commit: logOrgActivity is called after batch.commit() in assignVendorToProject', () => {
    // Slice from the first batch.commit() to end of function to confirm logOrgActivity follows it
    const afterCommit = VENDOR_ACTION.slice(VENDOR_ACTION.indexOf('await batch.commit()'));
    expect(afterCommit).toContain('logOrgActivity(');
  });

  it('inv_emits_on_accept: invitation respond route calls logOrgActivity when action === accept', () => {
    // The logOrgActivity call must appear after the accept guard
    const afterAcceptGuard = INVITE_RESPOND.slice(
      INVITE_RESPOND.indexOf("action === 'accept' && inv.organizationId"),
    );
    expect(afterAcceptGuard).toContain('logOrgActivity(');
  });

});
