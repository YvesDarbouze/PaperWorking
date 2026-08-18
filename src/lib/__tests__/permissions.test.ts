import { hasPermission, getRequiredTierForAction } from '../permissions';

describe('Agent 3: Permission Matrix Enforcement Unit Tests', () => {
  describe('create_project action', () => {
    test('allows Standard and Team accounts, blocks Vendor and Investor accounts', () => {
      expect(hasPermission('standard', 'create_project')).toBe(true);
      expect(hasPermission('team', 'create_project')).toBe(true);
      expect(hasPermission('vendor', 'create_project')).toBe(false);
      expect(hasPermission('investor', 'create_project')).toBe(false);
    });
  });

  describe('delete_project action', () => {
    test('allows Standard ONLY for own projects, Team for all projects, blocks Vendor and Investor', () => {
      expect(hasPermission('standard', 'delete_project', { isOwner: true })).toBe(true);
      expect(hasPermission('standard', 'delete_project', { isOwner: false })).toBe(false);
      expect(hasPermission('team', 'delete_project')).toBe(true);
      expect(hasPermission('vendor', 'delete_project')).toBe(false);
      expect(hasPermission('investor', 'delete_project')).toBe(false);
    });
  });

  describe('assign_tasks action', () => {
    test('allows Team tier ONLY, blocks Standard (requires upgrade prompt), Vendor, and Investor', () => {
      expect(hasPermission('standard', 'assign_tasks')).toBe(false);
      expect(hasPermission('team', 'assign_tasks')).toBe(true);
      expect(hasPermission('vendor', 'assign_tasks')).toBe(false);
      expect(hasPermission('investor', 'assign_tasks')).toBe(false);
    });
  });

  describe('receive_tasks action', () => {
    test('allows Standard, Team, and Vendor accounts, blocks pure Investor accounts', () => {
      expect(hasPermission('standard', 'receive_tasks')).toBe(true);
      expect(hasPermission('team', 'receive_tasks')).toBe(true);
      expect(hasPermission('vendor', 'receive_tasks')).toBe(true);
      expect(hasPermission('investor', 'receive_tasks')).toBe(false);
    });
  });

  describe('answer_vendor_requests action', () => {
    test('allows all 4 account tiers (Standard, Team, Vendor, Investor)', () => {
      expect(hasPermission('standard', 'answer_vendor_requests')).toBe(true);
      expect(hasPermission('team', 'answer_vendor_requests')).toBe(true);
      expect(hasPermission('vendor', 'answer_vendor_requests')).toBe(true);
      expect(hasPermission('investor', 'answer_vendor_requests')).toBe(true);
    });
  });

  describe('respond_investment_opportunities action', () => {
    test('allows Standard, Team, and Investor accounts, blocks Vendor', () => {
      expect(hasPermission('standard', 'respond_investment_opportunities')).toBe(true);
      expect(hasPermission('team', 'respond_investment_opportunities')).toBe(true);
      expect(hasPermission('vendor', 'respond_investment_opportunities')).toBe(false);
      expect(hasPermission('investor', 'respond_investment_opportunities')).toBe(true);
    });
  });

  describe('access_vendor_marketplace action', () => {
    test('allows Standard, Team, and Vendor, blocks Investor', () => {
      expect(hasPermission('standard', 'access_vendor_marketplace')).toBe(true);
      expect(hasPermission('team', 'access_vendor_marketplace')).toBe(true);
      expect(hasPermission('vendor', 'access_vendor_marketplace')).toBe(true);
      expect(hasPermission('investor', 'access_vendor_marketplace')).toBe(false);
    });
  });

  describe('list_services action', () => {
    test('allows Standard, Team, and Vendor, blocks Investor', () => {
      expect(hasPermission('standard', 'list_services')).toBe(true);
      expect(hasPermission('team', 'list_services')).toBe(true);
      expect(hasPermission('vendor', 'list_services')).toBe(true);
      expect(hasPermission('investor', 'list_services')).toBe(false);
    });
  });

  describe('view_portfolio action', () => {
    test('allows Standard and Team, allows Investor ONLY if invested, blocks Vendor', () => {
      expect(hasPermission('standard', 'view_portfolio')).toBe(true);
      expect(hasPermission('team', 'view_portfolio')).toBe(true);
      expect(hasPermission('vendor', 'view_portfolio')).toBe(false);
      expect(hasPermission('investor', 'view_portfolio', { isInvested: true })).toBe(true);
      expect(hasPermission('investor', 'view_portfolio', { isInvested: false })).toBe(false);
    });
  });

  describe('generate_tax_reports action', () => {
    test('allows Standard and Team, blocks Vendor and Investor', () => {
      expect(hasPermission('standard', 'generate_tax_reports')).toBe(true);
      expect(hasPermission('team', 'generate_tax_reports')).toBe(true);
      expect(hasPermission('vendor', 'generate_tax_reports')).toBe(false);
      expect(hasPermission('investor', 'generate_tax_reports')).toBe(false);
    });
  });

  describe('getRequiredTierForAction helper', () => {
    test('returns correct tier label for upgrades', () => {
      expect(getRequiredTierForAction('assign_tasks')).toBe('Team');
      expect(getRequiredTierForAction('create_project')).toBe('Standard or Team');
    });
  });
});
