import { beforeEach, describe, expect, it } from '@jest/globals';
import {
  DEFAULT_TEAM_TIER_EMAILS,
  TEAM_TIER_EMAIL_ALLOWLIST_ENV,
  applyTeamTierOverride,
  isTeamTierOverrideEmail,
  teamTierEmailAllowlist,
} from '../billing/tier-override.js';

describe('Team tier email override', () => {
  beforeEach(() => {
    delete process.env[TEAM_TIER_EMAIL_ALLOWLIST_ENV];
  });

  it('includes the built-in operator email by default', () => {
    expect(DEFAULT_TEAM_TIER_EMAILS).toContain('yvesdarbouze@gmail.com');
    expect(isTeamTierOverrideEmail('yvesdarbouze@gmail.com')).toBe(true);
    expect(isTeamTierOverrideEmail('  YvesDarbouze@Gmail.com ')).toBe(true);
  });

  it('does not match other or missing emails', () => {
    expect(isTeamTierOverrideEmail('someone@example.com')).toBe(false);
    expect(isTeamTierOverrideEmail('')).toBe(false);
    expect(isTeamTierOverrideEmail(null)).toBe(false);
    expect(isTeamTierOverrideEmail(undefined)).toBe(false);
  });

  it('adds emails from the env allowlist without dropping defaults', () => {
    process.env[TEAM_TIER_EMAIL_ALLOWLIST_ENV] = 'ops@paperworking.co, extra@paperworking.co';
    const allowlist = teamTierEmailAllowlist();
    expect(allowlist.has('yvesdarbouze@gmail.com')).toBe(true);
    expect(allowlist.has('ops@paperworking.co')).toBe(true);
    expect(allowlist.has('extra@paperworking.co')).toBe(true);
  });

  it('overrides subscriptions for allowlisted emails only', () => {
    expect(
      applyTeamTierOverride('yvesdarbouze@gmail.com', { plan: 'Individual', status: 'active' }),
    ).toEqual({ plan: 'Team', status: 'active' });
    expect(applyTeamTierOverride('yvesdarbouze@gmail.com', null)).toEqual({
      plan: 'Team',
      status: 'active',
    });
    expect(
      applyTeamTierOverride('someone@example.com', { plan: 'Individual', status: 'active' }),
    ).toEqual({ plan: 'Individual', status: 'active' });
  });
});
