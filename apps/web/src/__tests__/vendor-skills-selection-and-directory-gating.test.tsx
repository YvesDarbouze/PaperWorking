import React from 'react';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import {
  CANONICAL_VENDOR_PROFESSIONS,
  isValidVendorProfession,
  validateVendorSkills,
  canListOnVendorDirectory,
  matchVendorSkills,
} from '@/lib/marketplace/vendor-professions';
import {
  updateVendorProfileInStore,
  listMarketplaceVendorsFromStore,
  getVendorProfileFromStore,
} from '@/lib/vendor-portal/vendor-store';

const mockUseAuth = jest.fn();

jest.unstable_mockModule('@/context/AuthContext', () => ({
  useAuth: mockUseAuth,
  useOptionalAuth: () => ({ user: { uid: 'test-user-1' }, isAuthed: true }),
}));

jest.unstable_mockModule('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/settings',
}));

// Dynamically import components after module mock
const { FirstLoginOnboardingModal } = await import(
  '../../components/onboarding/FirstLoginOnboardingModal.js'
);
const { default: GeneralSettingsPanel } = await import(
  '../../components/settings/GeneralSettingsPanel.js'
);

describe('Vendor Skills (1–3 Professions) & Directory Gating', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  describe('1. Canonical Vendor Professions List (38 Professions)', () => {
    it('contains exactly 38 canonical professions', () => {
      expect(CANONICAL_VENDOR_PROFESSIONS.length).toBe(38);
    });

    it('contains all required professional & trade specialties', () => {
      const required = [
        'Real Estate Broker / Agent',
        'Real Estate Attorney',
        'Real Estate Appraiser',
        'Real Estate Consultant / Advisor',
        'Mortgage Broker / Loan Originator',
        'Real Estate Investment Banker',
        'Investment Analyst / Underwriter',
        'Property Manager',
        'Asset Manager',
        'Leasing Agent / Coordinator',
        'Real Estate Developer',
        'General Contractor',
        'Handyman',
        'Electrician',
        'Plumber',
        'HVAC Technician',
        'Roofer',
        'Flooring Specialist',
        'Architect / Engineer',
        'Home Inspector',
        'Mold / Environmental Assessor',
        'Locksmith',
        'Appliance Repair Technician',
        'Surveyor',
        'Landscaper / Lawn Care Service',
        'Snow Removal Specialist',
        'Janitorial / Cleaning Service',
        'Pest Control Operator',
        'Inspector',
        'Pool Service Technician',
        'Waste Management Service',
        'Security System Installer',
        'Network / Telecom Installer',
        'Real Estate Accountant / CPA',
        'Title Officer / Examiner',
        'Insurance Broker / Agent',
        'Transaction Coordinator',
        'Cost Segregation Specialist',
      ];

      for (const profession of required) {
        expect(CANONICAL_VENDOR_PROFESSIONS).toContain(profession);
        expect(isValidVendorProfession(profession)).toBe(true);
      }
    });

    it('rejects unknown profession names', () => {
      expect(isValidVendorProfession('Astronaut')).toBe(false);
      expect(isValidVendorProfession('Celebrity Chef')).toBe(false);
    });
  });

  describe('2. Validation & Gating Logic (1 to 3 Skills)', () => {
    it('accepts 1, 2, or 3 valid professions', () => {
      const one = validateVendorSkills(['Electrician']);
      expect(one.ok).toBe(true);
      expect(one.skills).toEqual(['Electrician']);

      const two = validateVendorSkills(['Electrician', 'Plumber']);
      expect(two.ok).toBe(true);
      expect(two.skills).toEqual(['Electrician', 'Plumber']);

      const three = validateVendorSkills(['Electrician', 'Plumber', 'Roofer']);
      expect(three.ok).toBe(true);
      expect(three.skills).toEqual(['Electrician', 'Plumber', 'Roofer']);
    });

    it('rejects 0 skills or empty array with clear validation message', () => {
      const empty = validateVendorSkills([]);
      expect(empty.ok).toBe(false);
      expect(empty.error).toMatch(/between 1 and 3/i);
    });

    it('rejects more than 3 skills', () => {
      const four = validateVendorSkills(['Electrician', 'Plumber', 'Roofer', 'Handyman']);
      expect(four.ok).toBe(false);
      expect(four.error).toMatch(/maximum of 3/i);
    });

    it('rejects invalid/unrecognized skills', () => {
      const invalid = validateVendorSkills(['Electrician', 'Rocket Scientist']);
      expect(invalid.ok).toBe(false);
      expect(invalid.error).toMatch(/invalid skill/i);
    });

    it('canListOnVendorDirectory correctly gates directory listing status', () => {
      expect(canListOnVendorDirectory([])).toBe(false);
      expect(canListOnVendorDirectory(null)).toBe(false);
      expect(canListOnVendorDirectory(['Electrician'])).toBe(true);
      expect(canListOnVendorDirectory(['Electrician', 'Plumber', 'Roofer'])).toBe(true);
      expect(canListOnVendorDirectory(['Electrician', 'Plumber', 'Roofer', 'Handyman'])).toBe(false);
    });
  });

  describe('3. Onboarding Flow Integration', () => {
    it('renders the Vendor Directory Skills section with count and search', () => {
      mockUseAuth.mockReturnValue({
        authenticated: true,
        loading: false,
        profile: {
          accountType: 'investor',
          name: 'Dana Underwriter',
          subscriptionPlan: 'Individual',
        },
      });

      const html = renderToString(<FirstLoginOnboardingModal forceOpen={true} />);

      expect(html).toContain('data-testid="onboarding-vendor-skills-section"');
      expect(html).toContain('Vendor Directory Skills (1–3 Skills)');
      expect(html).toContain('data-testid="onboarding-skills-count-badge"');
      expect(html).toContain('data-testid="onboarding-skills-search-input"');
      expect(html).toContain('skill-pill-general-contractor');
      expect(html).toContain('skill-pill-electrician');
      expect(html).toContain('skill-pill-real-estate-attorney');
      expect(html).toContain('skill-pill-cost-segregation-specialist');
      expect(html).toContain('Without skills, you cannot post on the Vendor Directory');
    });
  });

  describe('4. Settings Management Integration', () => {
    it('renders the Vendor Directory & Professional Skills panel in General Settings', () => {
      const html = renderToString(<GeneralSettingsPanel />);

      expect(html).toContain('data-testid="settings-vendor-skills-section"');
      expect(html).toContain('Vendor Directory &amp; Professional Skills');
      expect(html).toContain('data-testid="settings-skills-count-badge"');
      expect(html).toContain('data-testid="settings-skills-search-input"');
      expect(html).toContain('data-testid="settings-skill-pill-electrician"');
      expect(html).toContain('data-testid="settings-skill-pill-real-estate-accountant---cpa"');
    });
  });

  describe('5. Search Engine & Vendor Directory Store Indexing', () => {
    it('matches vendors by their selected trade skills', () => {
      const match1 = matchVendorSkills('mold', ['Mold / Environmental Assessor'], 'Clean Air Inc', 'Assessor');
      expect(match1).toBe(true);

      const match2 = matchVendorSkills('electrician', ['Electrician', 'Handyman'], 'Bright Sparks LLC');
      expect(match2).toBe(true);

      const match3 = matchVendorSkills('cost segregation', ['Cost Segregation Specialist'], 'Tax Pro Corp');
      expect(match3).toBe(true);

      const noMatch = matchVendorSkills('plumber', ['Electrician', 'Roofer'], 'Sparks Co');
      expect(noMatch).toBe(false);
    });

    it('persists and updates vendor skills in store, listing them when skills exist', async () => {
      const testUid = 'skills-test-user-1';
      const updated = await updateVendorProfileInStore(testUid, {
        companyName: 'Apex Construction & Design',
        vendorSkills: ['General Contractor', 'Architect / Engineer'],
      });

      expect(updated.vendorSkills).toEqual(['General Contractor', 'Architect / Engineer']);

      // Should be searchable in directory
      const results = await listMarketplaceVendorsFromStore({ search: 'Architect' });
      const found = results.find((v) => (v as any).uid === testUid || v.id === `vendor-${testUid}`);
      expect(found).toBeDefined();
    });

    it('delists a vendor from marketplace directory if skills are emptied to 0', async () => {
      const testUid = 'skills-test-user-delist';
      // First add with skills
      await updateVendorProfileInStore(testUid, {
        companyName: 'Temporary Services LLC',
        vendorSkills: ['Handyman'],
      });

      let check = await listMarketplaceVendorsFromStore({ id: `vendor-${testUid}` });
      expect(check.length).toBe(1);

      // Now empty skills to 0
      await updateVendorProfileInStore(testUid, {
        vendorSkills: [],
      });

      check = await listMarketplaceVendorsFromStore({ id: `vendor-${testUid}` });
      expect(check.length).toBe(0);
    });
  });
});
