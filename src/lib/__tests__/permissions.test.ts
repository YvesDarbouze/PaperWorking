import { hasPermission, getRequiredTierForAction, validateAccountType } from '../permissions';

describe('Permission Matrix — 3-Tier Hierarchy', () => {
  test('Investor can create projects but cannot assign tasks or invite to deal', () => {
    expect(hasPermission('investor', 'create_project')).toBe(true);
    expect(hasPermission('investor', 'assign_tasks')).toBe(false);
    expect(hasPermission('investor', 'invite_to_deal')).toBe(false);
    expect(hasPermission('investor', 'view_portfolio')).toBe(true);
    expect(hasPermission('investor', 'generate_tax_reports')).toBe(true);
  });

  test('Investment Team can assign tasks and invite to deals', () => {
    expect(hasPermission('investment_team', 'create_project')).toBe(true);
    expect(hasPermission('investment_team', 'assign_tasks')).toBe(true);
    expect(hasPermission('investment_team', 'invite_to_deal')).toBe(true);
    expect(hasPermission('investment_team', 'view_team_portfolio')).toBe(true);
    expect(hasPermission('investment_team', 'generate_tax_reports')).toBe(true);
  });

  test('Vendor cannot create projects or view portfolio', () => {
    expect(hasPermission('vendor', 'create_project')).toBe(false);
    expect(hasPermission('vendor', 'view_portfolio')).toBe(false);
    expect(hasPermission('vendor', 'receive_tasks')).toBe(true);
    expect(hasPermission('vendor', 'list_services')).toBe(true);
  });

  test('Vendor with dual team membership can assign tasks and create projects', () => {
    expect(hasPermission('vendor', 'assign_tasks', { hasTeamMembership: true })).toBe(true);
    expect(hasPermission('vendor', 'create_project', { hasTeamMembership: true })).toBe(true);
  });

  test('Master Admin has full access to platform actions', () => {
    expect(hasPermission('admin', 'create_project')).toBe(true);
    expect(hasPermission('admin', 'assign_tasks')).toBe(true);
    expect(hasPermission('admin', 'invite_to_deal')).toBe(true);
  });

  test('Admin is not a public user tier and cannot sign up as admin', () => {
    expect(() => validateAccountType('admin')).toThrow('Admin accounts are internal only');
  });

  test('Old role names are rejected with actionable error messages', () => {
    expect(() => validateAccountType('standard')).toThrow('Use "investor" instead');
    expect(() => validateAccountType('team')).toThrow('Use "investment_team" instead');
  });

  test('getRequiredTierForAction helper returns updated tier labels', () => {
    expect(getRequiredTierForAction('assign_tasks')).toBe('Investment Team');
    expect(getRequiredTierForAction('invite_to_deal')).toBe('Investment Team');
    expect(getRequiredTierForAction('create_project')).toBe('Investor or Investment Team');
  });
});
