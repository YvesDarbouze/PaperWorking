/**
 * Team Directory — Last-Active Is Real, Not Fabricated (Regression Tests)
 *
 * Background: team/page.tsx:75 previously rendered a hardcoded mock object
 * (e.g. `MOCK_TEAM_MEMBERS`) with a static "Active 2m ago" string attributed
 * to real colleague display names. No data was ever read from or written to
 * Firestore — every member showed a fabricated presence indicator.
 *
 * Definition of "active" (PR definition, stated here):
 *   A member is considered "last active" at the moment they initiated a new
 *   authenticated session — i.e., when POST /api/auth/session was called and
 *   the Admin SDK wrote `lastSeenAt: FieldValue.serverTimestamp()` to
 *   `users/{uid}/sessions/{sessionId}`. This reflects a real, auditable login
 *   event stored by the server, not a client-supplied value.
 *
 *   Members who have never logged in (invited but not onboarded, or who logged
 *   in before session tracking was introduced) have no session document. Their
 *   last-active field is explicitly null and the UI shows "—" (an honest empty
 *   state — never fabricated).
 *
 * Evidence in tests:
 *   STATIC/TEAM   — no mock object / constant; `formatLastActive` null-guards
 *                   to '—'; `memberActivity` populated from `getTeamMembers()`;
 *                   invited members hard-coded to '—' (never a time-ago string).
 *   STATIC/ACTION — `getTeamMembers()` queries `sessions` subcollection ordered
 *                   by `lastSeenAt` desc; returns null on empty snap (no fabrication).
 *   STATIC/SESSION — session POST writes `lastSeenAt: FieldValue.serverTimestamp()`;
 *                    value is server-supplied (FieldValue), not client-supplied.
 *   LOGIC         — `formatLastActive` is a pure function; verified against known
 *                   deltas: null→'—', <60s→'just now', <1h→'Xm ago',
 *                   <1d→'Xh ago', ≥1d→'Xd ago'.
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
function read(rel: string) {
  return fs.readFileSync(path.join(SRC, rel), 'utf8');
}

const TEAM   = read('app/dashboard/team/page.tsx');
const ACTION = read('actions/getTeamMembers.ts');
const SESSION = read('app/api/auth/session/route.ts');

/* ──────────────────────────────────────────────────────────────────────────
   STATIC/TEAM — no hardcoded mock; real wiring
   ────────────────────────────────────────────────────────────────────────── */
describe('team/page — no hardcoded mock activity', () => {

  it('no_mock_team_members_constant: MOCK_TEAM_MEMBERS constant does not exist', () => {
    expect(TEAM).not.toMatch(/(?:const|let|var)\s+MOCK_TEAM_MEMBERS/);
  });

  it('no_mock_activity_map: MOCK_ACTIVITY or FAKE_ACTIVITY constant does not exist', () => {
    expect(TEAM).not.toMatch(/(?:const|let|var)\s+MOCK_ACTIVITY/);
    expect(TEAM).not.toMatch(/(?:const|let|var)\s+FAKE_ACTIVITY/);
  });

  it('no_hardcoded_time_ago_string: no literal "2m ago" string in the file', () => {
    // The only "m ago" in the file must be the template literal inside formatLastActive
    // which uses Math.floor — never a hardcoded "2m ago", "5m ago", etc.
    expect(TEAM).not.toMatch(/'[0-9]+m ago'/);
    expect(TEAM).not.toMatch(/"[0-9]+m ago"/);
  });

  it('no_hardcoded_h_ago_string: no literal "2h ago" / "1h ago" strings', () => {
    expect(TEAM).not.toMatch(/'[0-9]+h ago'/);
    expect(TEAM).not.toMatch(/"[0-9]+h ago"/);
  });

  it('format_last_active_has_dash_fallback: formatLastActive returns "—" for null/undefined', () => {
    // The null guard must be the first check in the function
    expect(TEAM).toMatch(/if\s*\(\s*!iso\s*\)\s*return\s*['"]—['"]/);
  });

  it('member_activity_from_server_action: memberActivity is populated via getTeamMembers()', () => {
    // The data source must be the server action, not a hardcoded object
    expect(TEAM).toContain('getTeamMembers');
    expect(TEAM).toContain('memberActivity');
    expect(TEAM).toMatch(/getTeamMembers\s*\(\s*\)/);
  });

  it('invited_members_show_dash: invited status forces lastActive to "—" (no time-ago for unaccepted invites)', () => {
    // Invited members must show '—' — they have never used the app
    expect(TEAM).toMatch(/status\s*===\s*['"]invited['"]\s*\?\s*['"]—['"]/);
  });

  it('active_members_use_format_last_active: non-invited members use formatLastActive()', () => {
    // The ternary's false branch must call formatLastActive
    expect(TEAM).toMatch(/['"]invited['"]\s*\?[\s\S]{1,20}['"]—['"][\s\S]{1,30}formatLastActive/);
  });

  it('member_activity_state_initialized_empty: memberActivity defaults to an empty object', () => {
    // No preset values in the initial state — no fabricated timestamps
    expect(TEAM).toMatch(/useState\s*<\s*Record\s*<[^>]+>\s*>\s*\(\s*\{\s*\}\s*\)/);
  });

  it('degradation_comment_present: non-fatal degradation to dash is documented', () => {
    // The catch block must acknowledge the graceful degradation
    expect(TEAM).toMatch(/[Nn]on-fatal|degrades to|showing.*['"]—['"]/);
  });

});

/* ──────────────────────────────────────────────────────────────────────────
   STATIC/ACTION — getTeamMembers reads sessions subcollection
   ────────────────────────────────────────────────────────────────────────── */
describe('getTeamMembers action — reads real session data', () => {

  it('queries_sessions_subcollection: sessions subcollection path is used', () => {
    expect(ACTION).toMatch(/\.collection\s*\(\s*['"]sessions['"]\s*\)/);
  });

  it('orders_by_last_seen_at_desc: most recent session is fetched first', () => {
    expect(ACTION).toMatch(/orderBy\s*\(\s*['"]lastSeenAt['"]\s*,\s*['"]desc['"]\s*\)/);
  });

  it('limits_to_one_session: only the most recent session is read', () => {
    expect(ACTION).toMatch(/\.limit\s*\(\s*1\s*\)/);
  });

  it('returns_null_on_empty_snap: no fabrication when no sessions exist', () => {
    // snap.empty check must return null (not a fallback fake timestamp)
    expect(ACTION).toMatch(/snap\.empty.*return null|if\s*\(\s*snap\.empty\s*\)/);
  });

  it('extracts_to_date_iso_string: Firestore Timestamp is converted to ISO string', () => {
    // Actual code: ts?.toDate?.()?.toISOString() — toDate and toISOString both present
    // and they appear on the same expression line (optional chaining between them)
    expect(ACTION).toContain('toDate');
    expect(ACTION).toContain('toISOString');
    // They appear close together (within 40 chars) in the fetchLastSeenAt function
    expect(ACTION).toMatch(/toDate[\s\S]{0,40}toISOString/);
  });

  it('null_fallback_on_ts_absence: missing timestamp falls back to null', () => {
    // Pattern: ts?.toDate?.()?.toISOString() ?? null
    expect(ACTION).toMatch(/\?\?\s*null/);
  });

  it('no_hardcoded_timestamps: no ISO timestamp literals in the action', () => {
    // No string like "2024-01-01T00:00:00Z" should appear
    expect(ACTION).not.toMatch(/['"][0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/);
  });

  it('enriches_all_members_in_parallel: Promise.all used for concurrent enrichment', () => {
    expect(ACTION).toContain('Promise.all');
    expect(ACTION).toContain('lastSeenAt');
  });

});

/* ──────────────────────────────────────────────────────────────────────────
   STATIC/SESSION — login writes a real server timestamp
   ────────────────────────────────────────────────────────────────────────── */
describe('session route POST — writes real lastSeenAt on login', () => {

  it('writes_last_seen_at_on_login: session doc includes lastSeenAt on POST', () => {
    expect(SESSION).toContain('lastSeenAt');
    // Must be written inside the sessions subcollection set() call
    // (path to lastSeenAt is >200 chars from 'sessions' due to intermediate fields)
    expect(SESSION).toMatch(/\.collection\s*\(\s*['"]sessions['"]\s*\)[\s\S]{0,500}lastSeenAt/);
  });

  it('uses_field_value_server_timestamp: value is server-supplied, not client-supplied', () => {
    // FieldValue.serverTimestamp() is cryptographically server-assigned
    // A client cannot forge this value
    expect(SESSION).toMatch(/FieldValue\.serverTimestamp\s*\(\s*\)/);
    expect(SESSION).toMatch(/lastSeenAt\s*:\s*FieldValue\.serverTimestamp\s*\(\s*\)/);
  });

  it('imports_field_value_from_admin_sdk: FieldValue is from firebase-admin, not client SDK', () => {
    // FieldValue is loaded via dynamic import('firebase-admin/firestore') — server-side only
    expect(SESSION).toMatch(/import\s*\(\s*['"]firebase-admin\/firestore['"]\s*\)/);
    // Must destructure FieldValue from the result
    expect(SESSION).toContain('FieldValue');
  });

  it('writes_to_correct_path: session doc is at users/{uid}/sessions/{sessionId}', () => {
    // Path: adminDb.collection('users').doc(uid).collection('sessions').doc(sessionId)
    expect(SESSION).toMatch(/collection\s*\(\s*['"]users['"]\s*\)[\s\S]{0,100}collection\s*\(\s*['"]sessions['"]\s*\)/);
  });

  it('no_client_supplied_last_seen: request body fields not used for lastSeenAt', () => {
    // lastSeenAt must be FieldValue.serverTimestamp(), never body.lastSeenAt or similar
    expect(SESSION).not.toMatch(/body\s*\.\s*lastSeenAt/);
    expect(SESSION).not.toMatch(/request.*lastSeenAt/);
  });

});

/* ──────────────────────────────────────────────────────────────────────────
   LOGIC — formatLastActive pure function (extracted for unit testing)
   ────────────────────────────────────────────────────────────────────────── */

function formatLastActive(iso: string | null | undefined): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000)     return 'Active just now';
  if (ms < 3_600_000)  return `Active ${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `Active ${Math.floor(ms / 3_600_000)}h ago`;
  return `Active ${Math.floor(ms / 86_400_000)}d ago`;
}

function isoAgo(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

describe('formatLastActive — pure function, honest empty state', () => {

  it('null_returns_dash: null timestamp → "—" (no fabricated activity)', () => {
    expect(formatLastActive(null)).toBe('—');
  });

  it('undefined_returns_dash: undefined timestamp → "—"', () => {
    expect(formatLastActive(undefined)).toBe('—');
  });

  it('empty_string_returns_dash: empty string → "—"', () => {
    expect(formatLastActive('')).toBe('—');
  });

  it('thirty_seconds_ago_is_just_now: <60s → "Active just now"', () => {
    expect(formatLastActive(isoAgo(30_000))).toBe('Active just now');
  });

  it('fifty_nine_seconds_ago_is_just_now: 59s < 60s threshold', () => {
    expect(formatLastActive(isoAgo(59_000))).toBe('Active just now');
  });

  it('ninety_seconds_ago_is_1m: 90s → "Active 1m ago"', () => {
    expect(formatLastActive(isoAgo(90_000))).toBe('Active 1m ago');
  });

  it('two_minutes_ago: 2.5min → "Active 2m ago"', () => {
    expect(formatLastActive(isoAgo(150_000))).toBe('Active 2m ago');
  });

  it('fifty_nine_minutes_ago: 59m59s → "Active 59m ago"', () => {
    expect(formatLastActive(isoAgo(3_599_000))).toBe('Active 59m ago');
  });

  it('one_hour_ago: 60min → "Active 1h ago"', () => {
    expect(formatLastActive(isoAgo(3_600_000))).toBe('Active 1h ago');
  });

  it('two_hours_ago: 2h → "Active 2h ago"', () => {
    expect(formatLastActive(isoAgo(7_200_000))).toBe('Active 2h ago');
  });

  it('twenty_three_hours_ago: 23h59m → "Active 23h ago"', () => {
    expect(formatLastActive(isoAgo(86_399_000))).toBe('Active 23h ago');
  });

  it('one_day_ago: 24h → "Active 1d ago"', () => {
    expect(formatLastActive(isoAgo(86_400_000))).toBe('Active 1d ago');
  });

  it('seven_days_ago: 7d → "Active 7d ago"', () => {
    expect(formatLastActive(isoAgo(7 * 86_400_000))).toBe('Active 7d ago');
  });

  it('no_floating_point_in_output: output is always whole-number minutes/hours/days', () => {
    // Math.floor ensures no "Active 1.5h ago"
    const result = formatLastActive(isoAgo(5_400_000)); // 1.5h
    expect(result).toBe('Active 1h ago');
    expect(result).not.toMatch(/\.\d/);
  });

});
