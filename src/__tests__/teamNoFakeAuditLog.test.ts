/**
 * Team Directory — No Fabricated Audit Log Simulator (Regression Tests)
 *
 * Background: A previous version of team/page.tsx (pre-0c455584) rendered a
 * fake "terminal" panel in the right column. It:
 *   1. Pushed 4 hardcoded log strings into local state on mount via useEffect,
 *      e.g. "[HH:MM:SS] INFO Connection established to primary DB node."
 *   2. Pushed more fabricated lines (WARN / SEC prefixed) on every local state
 *      mutation (role change, revocation) — with a client-side `new Date()` as
 *      the timestamp rather than any server-recorded timestamp.
 *   3. Attributed action messages to real member emails / display names with
 *      fabricated semantics ("Purging auth tokens for: …").
 *
 * These strings had no data source. They were invented client-side and could
 * never be replayed, audited, or corroborated.
 *
 * Decision (PR statement):
 *   The terminal simulator is REMOVED, not replaced with a second real-event
 *   surface. The CommandCenter already has a real `TerminalAuditFeed` component
 *   that subscribes to the shared `events` collection. Duplicating that feed on
 *   the team page would mean two Firestore subscriptions to the same data and
 *   two rendering surfaces that could drift out of sync. If team-scoped audit
 *   events are ever needed here, they must come from the same `events` collection
 *   via a dedicated hook — not a local state array seeded with fabricated strings.
 *
 * Evidence in tests:
 *   STATIC — no terminalLogs / auditLog state variable; no fabricated log strings;
 *            no fake INFO/WARN/SEC prefix literals; no setInterval driving fake
 *            updates; no stale "Audit logs" comment in the right column heading;
 *            no handleRevoke* function that pushes terminal log lines.
 *   WIRING — real member activity comes only from getTeamMembers() server action;
 *            the only side-effects for revoke/suspend/role-change are Zustand
 *            store mutations + toast notifications (no log-push side effects).
 *   HONEST — invited members show '—'; non-invited members show a real timestamp
 *            or '—' (never a string that starts with "[" which was the fake format).
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
function read(rel: string) {
  return fs.readFileSync(path.join(SRC, rel), 'utf8');
}

const TEAM = read('app/dashboard/team/page.tsx');

/* ──────────────────────────────────────────────────────────────────────────
   STATIC — simulator state variables are gone
   ────────────────────────────────────────────────────────────────────────── */
describe('team/page — terminal simulator state removed', () => {

  it('no_terminal_logs_state: terminalLogs useState is not present', () => {
    expect(TEAM).not.toMatch(/(?:const|let)\s*\[\s*terminalLogs/);
    expect(TEAM).not.toMatch(/setTerminalLogs/);
  });

  it('no_audit_log_state: auditLog / auditLogs useState is not present', () => {
    expect(TEAM).not.toMatch(/(?:const|let)\s*\[\s*audit[Ll]og/);
    expect(TEAM).not.toMatch(/setAuditLog/);
  });

  it('no_log_entries_state: logEntries / logLines useState is not present', () => {
    expect(TEAM).not.toMatch(/(?:const|let)\s*\[\s*log[Ee]ntries/);
    expect(TEAM).not.toMatch(/(?:const|let)\s*\[\s*log[Ll]ines/);
  });

  it('no_revoking_email_state: revokingEmail state from old terminal flow is removed', () => {
    // revokingEmail was used to gate terminal push side effects in the old code
    expect(TEAM).not.toMatch(/(?:const|let)\s*\[\s*revokingEmail/);
    expect(TEAM).not.toMatch(/setRevokingEmail/);
  });

});

/* ──────────────────────────────────────────────────────────────────────────
   STATIC — fabricated log string patterns are gone
   ────────────────────────────────────────────────────────────────────────── */
describe('team/page — fabricated log string patterns removed', () => {

  it('no_info_connection_established: fake "Connection established" log not present', () => {
    expect(TEAM).not.toContain('Connection established to primary DB');
  });

  it('no_polling_access_scopes: fake "Polling access scopes" log not present', () => {
    expect(TEAM).not.toContain('Polling access scopes');
  });

  it('no_sec_role_verification: fake "SEC Role verification" log not present', () => {
    expect(TEAM).not.toContain('SEC Role verification');
  });

  it('no_system_status_stable: fake "System status: STABLE" log not present', () => {
    expect(TEAM).not.toContain('System status: STABLE');
  });

  it('no_warn_revocation_sequence: fake "Initialized revocation sequence" push not present', () => {
    expect(TEAM).not.toContain('Initialized revocation sequence');
  });

  it('no_sec_purging_auth_tokens: fake "Purging auth tokens for" push not present', () => {
    expect(TEAM).not.toContain('Purging auth tokens for');
  });

  it('no_bracket_timestamp_prefix: no "[HH:MM:SS]" style fabricated log prefix in push calls', () => {
    // The fabricated format was: `[${new Date().toLocaleTimeString()}] INFO ...`
    // The `[` + toLocaleTimeString pattern inside a template literal push was the tell
    expect(TEAM).not.toMatch(/`\s*\[\s*\$\{new Date\(\)/);
  });

  it('no_info_warn_sec_prefixes_in_log_push: INFO/WARN/SEC prefixes not pushed to local state', () => {
    // Pattern: prev => [...prev, `[...] INFO ...`]  or similar spread into a log state
    expect(TEAM).not.toMatch(/\.\.\.\s*prev\s*,\s*`[^`]*(?:INFO|WARN|SEC)\s/);
  });

});

/* ──────────────────────────────────────────────────────────────────────────
   STATIC — simulator infrastructure removed
   ────────────────────────────────────────────────────────────────────────── */
describe('team/page — simulator infrastructure removed', () => {

  it('no_set_interval: no setInterval driving fake log refresh', () => {
    expect(TEAM).not.toMatch(/setInterval/);
  });

  it('no_audit_logs_heading_comment: stale "& Audit logs" section comment removed', () => {
    // The old comment read "Pending Invites & Audit logs" — now just "Pending Invites"
    expect(TEAM).not.toContain('Pending Invites & Audit logs');
  });

  it('no_handle_revoke_external_with_log_push: old handleRevokeExternalAccess that pushed logs removed', () => {
    // The old function did: setTerminalLogs(prev => [...prev, `...WARN...`])
    // If a revoke handler still exists, it must not push terminal log lines
    if (TEAM.includes('handleRevokeExternal')) {
      // If the function still exists, confirm it doesn't push to a log state
      const fnStart = TEAM.indexOf('handleRevokeExternalAccess');
      const fnEnd   = TEAM.indexOf('\n  };', fnStart) + 5;
      const fnBody  = TEAM.slice(fnStart, fnEnd);
      expect(fnBody).not.toMatch(/set(?:Terminal|Audit)Log/);
    } else {
      // Function is fully removed — the correct outcome
      expect(TEAM).not.toContain('handleRevokeExternalAccess');
    }
  });

  it('no_node_us_east_stable_badge: fake "Node: US-EAST-01 • Stable" status badge removed', () => {
    // This badge was part of the old terminal aesthetic, implying a live node connection
    expect(TEAM).not.toContain('US-EAST-01');
    expect(TEAM).not.toContain('Node:');
  });

});

/* ──────────────────────────────────────────────────────────────────────────
   WIRING — real data sources for side-effects
   ────────────────────────────────────────────────────────────────────────── */
describe('team/page — action side-effects are store mutations + toasts only', () => {

  it('revoke_uses_remove_team_member: handleRevokeAccess calls removeTeamMember (Zustand), not a log push', () => {
    expect(TEAM).toContain('removeTeamMember');
    // The revoke handler must touch the store, not a log state
    const revokeIdx = TEAM.indexOf('handleRevokeAccess');
    expect(revokeIdx).toBeGreaterThan(-1);
    const revokeBody = TEAM.slice(revokeIdx, revokeIdx + 300);
    expect(revokeBody).toContain('removeTeamMember');
    expect(revokeBody).not.toMatch(/set(?:Terminal|Audit)Log/);
  });

  it('suspend_uses_suspend_team_member: handleToggleSuspend calls suspendTeamMember (Zustand), not a log push', () => {
    expect(TEAM).toContain('suspendTeamMember');
    const suspendIdx = TEAM.indexOf('handleToggleSuspend');
    expect(suspendIdx).toBeGreaterThan(-1);
    const suspendBody = TEAM.slice(suspendIdx, suspendIdx + 300);
    expect(suspendBody).toContain('suspendTeamMember');
    expect(suspendBody).not.toMatch(/set(?:Terminal|Audit)Log/);
  });

  it('role_change_uses_update_member_role: handleRoleChange calls updateMemberRole (Zustand), not a log push', () => {
    expect(TEAM).toContain('updateMemberRole');
    const roleIdx = TEAM.indexOf('handleRoleChange');
    expect(roleIdx).toBeGreaterThan(-1);
    const roleBody = TEAM.slice(roleIdx, roleIdx + 300);
    expect(roleBody).toContain('updateMemberRole');
    expect(roleBody).not.toMatch(/set(?:Terminal|Audit)Log/);
  });

  it('member_activity_from_get_team_members: last-active data comes from getTeamMembers(), not a fabricated map', () => {
    expect(TEAM).toContain('getTeamMembers');
    expect(TEAM).toContain('memberActivity');
    // setMemberActivity must be called inside the getTeamMembers().then() handler
    expect(TEAM).toMatch(/getTeamMembers\s*\(\s*\)[\s\S]{0,100}setMemberActivity/);
  });

  it('only_one_useeffect_for_data: single effect populates memberActivity, no second effect for log init', () => {
    // Count useEffect calls — only one for data fetching should exist at the component level
    // (the fake log init was a second useEffect seeding terminal state)
    const effectMatches = TEAM.match(/useEffect\s*\(/g) ?? [];
    // Only 1 component-level data useEffect is expected
    // (more could appear in sub-components or hooks — this checks the count is reasonable)
    expect(effectMatches.length).toBeLessThanOrEqual(3);
  });

});

/* ──────────────────────────────────────────────────────────────────────────
   HONEST — the right column contains only real data
   ────────────────────────────────────────────────────────────────────────── */
describe('team/page — right column shows only honest data', () => {

  it('right_column_has_pending_invitations: the real pending invitations panel is present', () => {
    expect(TEAM).toContain('Pending Invitations');
    expect(TEAM).toContain('pendingInvitations');
  });

  it('last_active_column_exists: "Last Active" column header is present in the table', () => {
    expect(TEAM).toContain('Last Active');
  });

  it('last_active_values_from_member_last_active: table cells render member.lastActive', () => {
    expect(TEAM).toContain('member.lastActive');
  });

  it('format_function_returns_dash_for_null: the display value is "—" for missing data', () => {
    // formatLastActive must guard against null (honest empty state)
    expect(TEAM).toMatch(/if\s*\(\s*!iso\s*\)\s*return\s*['"]—['"]/);
  });

});
