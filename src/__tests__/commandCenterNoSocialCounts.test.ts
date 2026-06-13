/**
 * CommandCenter ProfileCard — No Hardcoded Social Counts (Regression Tests)
 *
 * Background: CommandCenter.tsx:551 previously rendered hardcoded vanity counts
 *   - 142  "Followers"
 *   - 98   "Following"
 * inside the ProfileCard. These numbers had no data source and a social follow
 * graph has no place in a portfolio management tool.
 *
 * Decision made: the slot was repurposed to real workspace data:
 *   - "Team"  — live workspace member count (onSnapshot on organizations/{tenantId},
 *               counting members with status === 'active' or no status set)
 *   - "Deals" — total project count from the Firestore-backed project store
 *   - "Active Projects" / "Past Projects" — derived from project status field
 *
 * No social follow system was built; a follow graph would require a separate
 * design decision and product approval before implementation.
 *
 * Evidence in tests:
 *   STATIC  — no "142" / "98" / "Followers" / "Following" literals in the file;
 *             no SOCIAL_COUNTS constant or follower/following state variable.
 *   WIRING  — teamCount sourced from organizations/{tenantId} onSnapshot;
 *             projects.length used for Deals count;
 *             activeCount/pastCount derived from project.status field.
 *   LOGIC   — active vs past split is correct (status === 'Sold' → past);
 *             teamCount filters to active members only;
 *             teamCount defaults to 1 when no member list present.
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
function read(rel: string) {
  return fs.readFileSync(path.join(SRC, rel), 'utf8');
}

const CC = read('components/dashboard/command-center/CommandCenter.tsx');

/* ──────────────────────────────────────────────────────────────────────────
   STATIC — hardcoded social numbers must not appear
   ────────────────────────────────────────────────────────────────────────── */
describe('CommandCenter ProfileCard — no hardcoded social counts', () => {

  it('hc_no_142: the number 142 does not appear as a follower count', () => {
    // 142 may appear elsewhere (zip codes, etc.) so scope to follower context
    expect(CC).not.toMatch(/142\s*[,\s]*['"]\s*[Ff]ollower/);
    expect(CC).not.toMatch(/[Ff]ollowers?\s*['":\s]*142/);
  });

  it('hc_no_98: the number 98 does not appear as a following count', () => {
    expect(CC).not.toMatch(/98\s*[,\s]*['"]\s*[Ff]ollowing/);
    expect(CC).not.toMatch(/[Ff]ollowing\s*['":\s]*98/);
  });

  it('hc_no_followers_label: "Followers" label is not rendered', () => {
    // Not a substring of a word like "followers_count" either — check JSX text context
    expect(CC).not.toMatch(/>\s*Followers\s*</);
    expect(CC).not.toMatch(/['"`]Followers['"`]/);
  });

  it('hc_no_following_label: "Following" label is not rendered as a social stat', () => {
    // "Following" appears in prose ("the following data") but not as a social badge
    // Check it doesn't appear as a JSX text node or quoted stat label
    expect(CC).not.toMatch(/>\s*Following\s*</);
    // Quoted string "Following" as a standalone label value
    expect(CC).not.toMatch(/['"`]Following['"`]/);
  });

  it('hc_no_social_state: no followerCount / followingCount state variable', () => {
    expect(CC).not.toMatch(/(?:const|let|var|useState)[^;]*(?:follower|following)Count/i);
  });

  it('hc_no_social_constant: no SOCIAL_COUNTS or FOLLOWER_DATA constant', () => {
    expect(CC).not.toMatch(/(?:const|let|var)\s+(?:SOCIAL_COUNTS|FOLLOWER_DATA|MOCK_SOCIAL)/);
  });

});

/* ──────────────────────────────────────────────────────────────────────────
   WIRING — real data sources for the replaced slot
   ────────────────────────────────────────────────────────────────────────── */
describe('CommandCenter ProfileCard — real data wiring', () => {

  it('team_from_firestore: teamCount sourced via onSnapshot on organizations collection', () => {
    expect(CC).toContain('teamCount');
    // orgRef created from doc(db, 'organizations', ...) then passed to onSnapshot
    expect(CC).toMatch(/doc\s*\(\s*db\s*,\s*['"]organizations['"]/);
    expect(CC).toMatch(/onSnapshot\s*\(\s*orgRef/);
    expect(CC).toContain("teamMembers");
  });

  it('team_label_present: "Team" label rendered alongside the live count', () => {
    // The label must appear as a JSX text node next to {teamCount}
    expect(CC).toContain('{teamCount}');
    expect(CC).toMatch(/>\s*Team\s*</);
  });

  it('deals_from_project_store: project count derived from the project store', () => {
    // projects.length used for total deals
    expect(CC).toContain('projects.length');
    expect(CC).toMatch(/>\s*Deals\s*</);
  });

  it('active_count_from_status: activeCount derived from project status !== Sold', () => {
    expect(CC).toMatch(/filter\s*\(\s*p\s*=>\s*p\.status\s*!==\s*['"]Sold['"]\s*\)/);
    expect(CC).toContain('activeCount');
    expect(CC).toMatch(/>\s*Active Projects\s*</);
  });

  it('past_count_from_status: pastCount derived from project status === Sold', () => {
    expect(CC).toMatch(/filter\s*\(\s*p\s*=>\s*p\.status\s*===\s*['"]Sold['"]\s*\)/);
    expect(CC).toContain('pastCount');
    expect(CC).toMatch(/>\s*Past Projects\s*</);
  });

  it('team_count_skips_placeholder_org: listener not started for org_placeholder tenant', () => {
    // Prevents Firestore queries on the bootstrap placeholder org
    expect(CC).toMatch(/activeTenantId.*===.*['"]org_placeholder['"]/);
  });

  it('team_count_defaults_to_one: Math.max(1, active) ensures count never shows 0', () => {
    expect(CC).toMatch(/Math\.max\s*\(\s*1\s*,\s*active\s*\)/);
  });

});

/* ──────────────────────────────────────────────────────────────────────────
   LOGIC — pure functions: active/past split and team filtering
   (These run without React or Firebase, using the extraction patterns from the source)
   ────────────────────────────────────────────────────────────────────────── */

interface MockProject { status?: string; }

function activeCount(projects: MockProject[]): number {
  return projects.filter((p) => p.status !== 'Sold').length;
}

function pastCount(projects: MockProject[]): number {
  return projects.filter((p) => p.status === 'Sold').length;
}

interface MockMember { status?: string; }

function computeTeamCount(members: MockMember[]): number {
  const active = members.filter((m) => m.status === 'active' || !m.status).length;
  return Math.max(1, active);
}

describe('activeCount / pastCount derivation logic', () => {

  it('active_excludes_sold: a sold project is not counted as active', () => {
    const projects: MockProject[] = [
      { status: 'Active' },
      { status: 'Sold' },
      { status: 'Under Contract' },
    ];
    expect(activeCount(projects)).toBe(2);
    expect(pastCount(projects)).toBe(1);
  });

  it('all_active_when_no_sold: all projects active when none are sold', () => {
    const projects: MockProject[] = [
      { status: 'Active' },
      { status: 'Under Contract' },
      { status: 'Pending' },
    ];
    expect(activeCount(projects)).toBe(3);
    expect(pastCount(projects)).toBe(0);
  });

  it('all_sold_when_portfolio_exited: all projects past when all sold', () => {
    const projects: MockProject[] = [
      { status: 'Sold' },
      { status: 'Sold' },
    ];
    expect(activeCount(projects)).toBe(0);
    expect(pastCount(projects)).toBe(2);
  });

  it('undefined_status_counts_as_active: project with no status is treated as active', () => {
    const projects: MockProject[] = [{ status: undefined }, { status: 'Sold' }];
    expect(activeCount(projects)).toBe(1);
  });

  it('active_plus_past_equals_total: activeCount + pastCount = total projects', () => {
    const projects: MockProject[] = [
      { status: 'Active' }, { status: 'Sold' }, { status: 'Active' }, { status: 'Sold' }, { status: 'Pending' },
    ];
    expect(activeCount(projects) + pastCount(projects)).toBe(projects.length);
  });

});

describe('teamCount derivation logic', () => {

  it('counts_active_members: active status members are counted', () => {
    const members: MockMember[] = [
      { status: 'active' },
      { status: 'active' },
      { status: 'inactive' },
    ];
    expect(computeTeamCount(members)).toBe(2);
  });

  it('counts_members_with_no_status: undefined status is treated as active', () => {
    const members: MockMember[] = [
      { status: undefined },
      { status: 'active' },
      { status: 'inactive' },
    ];
    expect(computeTeamCount(members)).toBe(2);
  });

  it('min_one_when_empty: empty member list returns 1 (at least the owner)', () => {
    expect(computeTeamCount([])).toBe(1);
  });

  it('min_one_when_all_inactive: all inactive still returns 1', () => {
    const members: MockMember[] = [
      { status: 'inactive' },
      { status: 'inactive' },
    ];
    expect(computeTeamCount(members)).toBe(1);
  });

  it('exact_count_when_all_active: all active members counted correctly', () => {
    const members: MockMember[] = Array.from({ length: 5 }, () => ({ status: 'active' }));
    expect(computeTeamCount(members)).toBe(5);
  });

});
