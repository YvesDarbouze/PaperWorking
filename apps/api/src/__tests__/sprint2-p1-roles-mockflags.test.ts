/**
 * Sprint 2 P1 — Org role normalization + mock-auth flag contract.
 */
import { describe, expect, it } from '@jest/globals';
import {
  canManageOrganization,
  displayOrgRole,
  isAllowedOrgRole,
  normalizeOrgRole,
} from '../authz/org-roles.js';

function mockAuthEnabled(opts: {
  nodeEnv?: string;
  useMockData?: string;
  enableMockAuth?: string;
}): boolean {
  if (opts.nodeEnv === 'production') return false;
  const flag = opts.useMockData ?? opts.enableMockAuth;
  if (flag === 'false' || flag === '0') return false;
  return true;
}

function feMockEnabled(opts: {
  nodeEnv?: string;
  nextPublicUseMock?: string;
  useMockData?: string;
  nextPublicEnableMockAuth?: string;
  enableMockAuth?: string;
}): boolean {
  if (opts.nodeEnv === 'production') return false;
  const flag =
    opts.nextPublicUseMock ??
    opts.useMockData ??
    opts.nextPublicEnableMockAuth ??
    opts.enableMockAuth;
  if (flag === 'false' || flag === '0') return false;
  return true;
}

describe('Sprint 2 P1 — org roles', () => {
  it('normalizes casing and separators', () => {
    expect(normalizeOrgRole('Deal_Lead')).toBe('deal lead');
    expect(normalizeOrgRole('LEAD-INVESTOR')).toBe('lead investor');
    expect(displayOrgRole('deal_lead')).toBe('Deal Lead');
  });

  it('manage allowlist includes CEO/Admin/Owner/Lead Investor', () => {
    for (const role of ['CEO', 'President', 'Admin', 'Owner', 'Lead Investor', 'lead_investor']) {
      expect(canManageOrganization(role)).toBe(true);
    }
  });

  it('Deal Lead is NOT manage (no includes(lead) false positive)', () => {
    expect(canManageOrganization('Deal Lead')).toBe(false);
    expect(canManageOrganization('deal_lead')).toBe(false);
  });

  it('CFO/COO/Contributor are non-manage', () => {
    expect(canManageOrganization('CFO')).toBe(false);
    expect(canManageOrganization('COO')).toBe(false);
    expect(canManageOrganization('Contributor')).toBe(false);
  });

  it('validates supported role variants', () => {
    expect(isAllowedOrgRole('CEO')).toBe(true);
    expect(isAllowedOrgRole('Deal Lead')).toBe(true);
    expect(isAllowedOrgRole('member')).toBe(true);
    expect(isAllowedOrgRole('Superuser')).toBe(false);
  });
});

describe('Sprint 2 P1 — mock-auth FE/Nest flag sync', () => {
  it('production always off', () => {
    expect(mockAuthEnabled({ nodeEnv: 'production', useMockData: 'true' })).toBe(false);
    expect(feMockEnabled({ nodeEnv: 'production', nextPublicUseMock: 'true' })).toBe(false);
  });

  it('ENABLE_MOCK_AUTH=false disables Nest (and FE when used)', () => {
    expect(mockAuthEnabled({ nodeEnv: 'development', enableMockAuth: 'false' })).toBe(false);
    expect(feMockEnabled({ nodeEnv: 'development', enableMockAuth: 'false' })).toBe(false);
  });

  it('USE_MOCK_DATA=false disables both', () => {
    expect(mockAuthEnabled({ nodeEnv: 'development', useMockData: 'false' })).toBe(false);
    expect(feMockEnabled({ nodeEnv: 'development', useMockData: 'false' })).toBe(false);
  });

  it('default local → on for both', () => {
    expect(mockAuthEnabled({ nodeEnv: 'development' })).toBe(true);
    expect(feMockEnabled({ nodeEnv: 'development' })).toBe(true);
  });
});
