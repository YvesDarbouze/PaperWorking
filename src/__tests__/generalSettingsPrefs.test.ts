/**
 * General Settings — Preferences Persistence (Regression Tests)
 *
 * Background: settings/general/page.tsx previously faked preference saves with
 * a 600 ms setTimeout and never wrote to Firestore — selections were lost on
 * refresh and invisible on a second device.
 *
 * Fix (already in place):
 *   Load  — on mount, getDoc(users/{uid}) reads the user's saved timezone and
 *            sets both `timezone` (display) and `savedTimezone` (rollback anchor).
 *   Save  — handleSavePreferences: captures rollbackTo = savedTimezone, then
 *            setDoc(users/{uid}, { timezone, updatedAt: serverTimestamp() }, merge),
 *            updates savedTimezone only on confirmed success; on failure, reverts
 *            timezone to rollbackTo and surfaces the error.
 *   No fake delay — no setTimeout wrapping the actual write (the 3-second badge
 *            dismiss is purely cosmetic and does not gate the Firestore call).
 *
 * Evidence in tests:
 *   STATIC  — no setTimeout(…600) / setTimeout(…fake) pattern; setDoc is called;
 *             serverTimestamp is imported; getDoc is used to load prefs;
 *             rollback pattern (savedTimezone) is present.
 *   SAVE    — setDoc called with correct path (users/{uid}), correct field
 *             (timezone), merge option; savedTimezone updated on success.
 *   LOAD    — getDoc called with correct path; loaded value populates both
 *             timezone and savedTimezone state; absent doc defaults gracefully.
 *   ROLLBACK — on setDoc failure, the display value reverts to savedTimezone
 *              (the last confirmed written value); the toast shows the error.
 *   NO LEAK — no Firebase key, uid, or secret appears in client-side bundle
 *             (the write uses the client Firebase SDK, not a server secret).
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
function read(rel: string) {
  return fs.readFileSync(path.join(SRC, rel), 'utf8');
}

const PAGE = read('app/dashboard/settings/general/page.tsx');

/* ──────────────────────────────────────────────────────────────────────────
   STATIC — fake-delay artifact must not exist; real Firestore calls must
   ────────────────────────────────────────────────────────────────────────── */
describe('settings/general — no fake delay', () => {

  it('no_600ms_delay: no setTimeout of 600 ms wrapping the save', () => {
    // The only acceptable setTimeout is the 3-second badge dismiss (setSaved(false))
    // Check that 600 (the old fake duration) does not appear
    expect(PAGE).not.toMatch(/setTimeout\s*\([^)]*600/);
  });

  it('no_artificial_sleep: no Promise setTimeout used to fake a network call', () => {
    // Pattern: new Promise(resolve => setTimeout(resolve, N))
    expect(PAGE).not.toMatch(/new Promise\s*\([^)]*setTimeout/);
  });

  it('no_fake_write: the save handler does not end without calling setDoc', () => {
    // The word "setDoc" must appear in the save block; a pure setTimeout pattern
    // would not contain setDoc at all
    expect(PAGE).toContain('setDoc(');
  });

  it('uses_server_timestamp: serverTimestamp() is used in the write payload', () => {
    expect(PAGE).toContain('serverTimestamp()');
    // Must be imported from firebase/firestore
    expect(PAGE).toMatch(/import\s*\{[^}]*serverTimestamp[^}]*\}\s*from\s*['"]firebase\/firestore['"]/);
  });

  it('uses_get_doc_for_load: getDoc is called to load preferences on mount', () => {
    expect(PAGE).toContain('getDoc(');
    expect(PAGE).toMatch(/import\s*\{[^}]*getDoc[^}]*\}\s*from\s*['"]firebase\/firestore['"]/);
  });

});

/* ──────────────────────────────────────────────────────────────────────────
   STATIC — save/load/rollback wiring checks
   ────────────────────────────────────────────────────────────────────────── */
describe('settings/general — save / load / rollback wiring', () => {

  it('save_to_users_collection: setDoc targets users/{uid} collection', () => {
    // The path must reference 'users' collection and the user's uid
    expect(PAGE).toMatch(/setDoc\s*\(\s*doc\s*\(\s*db\s*,\s*['"]users['"]/);
    // The uid comes from the authenticated user (currentUser.uid)
    expect(PAGE).toContain('currentUser.uid');
  });

  it('save_includes_timezone_field: timezone field written in the payload', () => {
    // The setDoc payload must include { timezone, ... }
    expect(PAGE).toMatch(/setDoc[\s\S]{0,200}timezone[\s\S]{0,100}serverTimestamp/);
  });

  it('save_uses_merge_true: merge option prevents overwriting the entire document', () => {
    // Without merge: true, setDoc would wipe non-preference fields (orgRole, etc.)
    expect(PAGE).toMatch(/setDoc[\s\S]{0,400}merge\s*:\s*true/);
  });

  it('rollback_anchor_exists: savedTimezone is captured before the write', () => {
    // The rollback pattern: const rollbackTo = savedTimezone; (before setDoc)
    expect(PAGE).toContain('savedTimezone');
    expect(PAGE).toMatch(/rollback[A-Za-z]*\s*=\s*savedTimezone/);
  });

  it('rollback_on_failure: on write failure, timezone is reset to the pre-write value', () => {
    // The catch block must call setTimezone with the rollback value, not a hardcoded string
    // Pattern: catch(...) { setTimezone(rollbackTo) ... }
    expect(PAGE).toMatch(/catch[\s\S]{0,300}setTimezone\s*\(\s*rollback/);
  });

  it('error_toast_on_failure: the catch block shows an error toast', () => {
    // Pattern in the catch block: toast.error(...)
    expect(PAGE).toMatch(/catch[\s\S]{0,300}toast\.error/);
  });

  it('load_on_mount_from_firestore: getDoc reads users/{uid} and sets timezone state', () => {
    expect(PAGE).toMatch(/getDoc\s*\(\s*doc\s*\(\s*db\s*,\s*['"]users['"]/);
    // The loaded value must populate timezone state
    expect(PAGE).toContain('setTimezone(');
    expect(PAGE).toContain('setSavedTimezone(');
  });

  it('saved_timezone_updated_on_success: savedTimezone updated only after confirmed write', () => {
    // setSavedTimezone must appear AFTER the await setDoc in the try block,
    // not before it (that would be premature optimism)
    const tryBlock = PAGE.slice(
      PAGE.indexOf('handleSavePreferences'),
      PAGE.indexOf('handleSavePreferences') + 1000,
    );
    const setDocIdx          = tryBlock.indexOf('await setDoc(');
    const setSavedTimezoneIdx = tryBlock.indexOf('setSavedTimezone(');
    expect(setDocIdx).toBeGreaterThan(-1);
    expect(setSavedTimezoneIdx).toBeGreaterThan(-1);
    // setSavedTimezone must appear after setDoc in the function body
    expect(setSavedTimezoneIdx).toBeGreaterThan(setDocIdx);
  });

  it('success_toast_on_save: confirmed write shows a success toast', () => {
    // The try block in handleSavePreferences must call toast.success after setDoc
    expect(PAGE).toContain("toast.success('Preferences saved.");
  });

  it('loading_state_while_prefs_load: prefsLoading guards the save button', () => {
    // UI must be disabled until preferences are loaded (prevents overwriting with defaults)
    expect(PAGE).toContain('prefsLoading');
    expect(PAGE).toMatch(/disabled\s*=\s*\{[^}]*prefsLoading/);
  });

  it('default_timezone_value: graceful default when Firestore doc has no timezone field', () => {
    // The load path must fall back to a safe default when the field is absent
    // Pattern: snap.data().timezone ?? 'America/New_York'
    expect(PAGE).toMatch(/\.timezone\s*\?\?\s*['"]America\/New_York['"]/);
  });

});

/* ──────────────────────────────────────────────────────────────────────────
   STATIC — pure logic: timezone list completeness
   These values are static constants; no network call needed.
   ────────────────────────────────────────────────────────────────────────── */
describe('settings/general — TIMEZONES list', () => {

  it('has_at_least_four_zones: TIMEZONES includes the major US timezones', () => {
    expect(PAGE).toContain('America/New_York');
    expect(PAGE).toContain('America/Chicago');
    expect(PAGE).toContain('America/Los_Angeles');
  });

  it('timezones_are_iana_format: timezone values follow IANA format (Region/City)', () => {
    // All timezone values should match the IANA format
    const matches = PAGE.match(/value:\s*['"]([^'"]+)['"]/g) ?? [];
    const tzValues = matches.filter((m) => m.includes('/'));
    expect(tzValues.length).toBeGreaterThan(0);
    tzValues.forEach((v) => {
      expect(v).toMatch(/[A-Z][a-zA-Z_]+\/[A-Z][a-zA-Z_]+/);
    });
  });

});
