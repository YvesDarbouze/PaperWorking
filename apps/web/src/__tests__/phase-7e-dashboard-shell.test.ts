import { INBOX_THREADS, SETTINGS_SECTIONS, TEAM_MEMBERS } from '../../lib/dashboard/shell-seed.js';

describe('phase 7e — dashboard shell previews', () => {
  it('provides inbox, team, and settings seed data', () => {
    expect(INBOX_THREADS.length).toBeGreaterThanOrEqual(2);
    expect(TEAM_MEMBERS.length).toBeGreaterThanOrEqual(2);
    expect(SETTINGS_SECTIONS.some((s) => s.href === '/dashboard/settings/billing')).toBe(true);
  });
});
