import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock next/navigation
jest.unstable_mockModule('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(''),
  usePathname: () => '/marketplace/apexheights',
}));

// Mock Auth Context
jest.unstable_mockModule('@/context/AuthContext', () => ({
  useAuth: () => ({
    loading: false,
    authenticated: true,
    profile: { accountType: 'investor', subscriptionPlan: 'Pro', subscriptionStatus: 'active' },
    navContext: { role: 'investor', accountType: 'investor' },
  }),
  useOptionalAuth: () => ({
    loading: false,
    authenticated: true,
    profile: { accountType: 'investor', subscriptionPlan: 'Pro', subscriptionStatus: 'active' },
  }),
}));

// Mock Compare Context
jest.unstable_mockModule('@/context/CompareContext', () => ({
  useCompare: () => ({
    addToCompare: jest.fn(),
    removeFromCompare: jest.fn(),
    isComparing: () => false,
    compareList: [],
    comparedDeals: [],
    clearCompare: jest.fn(),
  }),
}));

// Mock Saved Deals Context
jest.unstable_mockModule('@/context/SavedDealsContext', () => ({
  useSavedDeals: () => ({
    isSaved: () => false,
    toggleSave: jest.fn(),
    savedDeals: [],
  }),
}));

// Mock Property Image hook
jest.unstable_mockModule('@/lib/maps/property-image', () => ({
  usePropertyImage: () => ({
    imageUrl: '/images/properties/deal-property-default.jpg',
    handleImageError: jest.fn(),
    isLoading: false,
  }),
}));

const { generateDiligenceDocument } = await import(
  '../../components/marketplace/detail/DealDetailPageView.js'
);
type DealCardData = import('../../components/marketplace/DealCard.js').DealCardData;

describe('Task 9: Wire Due Diligence Document Downloads (DealDetailPageView.tsx)', () => {
  const sampleDeal: DealCardData & { rehabCost?: number; arv?: number } = {
    id: 'deal-austin-multifamily-01',
    slug: 'austin-multifamily-value-add',
    name: 'Austin Multifamily Value-Add',
    propertyName: 'Austin Multifamily Value-Add',
    address: '1401 E 6th St, Austin, TX 78702',
    city: 'Austin',
    state: 'TX',
    purchasePrice: 1250000,
    rehabCost: 175000,
    arv: 1850000,
    fundingTarget: 1425000,
    committedAmount: 950000,
    minInvestment: 25000,
    targetIrr: 19.5,
    projectedRoi: 22.0,
    equityMultiple: 1.92,
    holdPeriod: '3–5 Years',
    assetClass: 'Multifamily',
    subStrategy: 'VALUE_ADD',
    status: 'published',
    visibility: 'marketplace',
    creatorName: 'Apex Capital Partners',
  };

  it('generates a CSV model for Institutional Underwriting Model with accurate underwriting metrics', () => {
    const doc = generateDiligenceDocument(
      sampleDeal,
      'Institutional Underwriting Model',
      'Apex Capital Partners'
    );

    expect(doc.ext).toBe('csv');
    expect(doc.mimeType).toBe('text/csv;charset=utf-8;');
    expect(doc.filename).toBe('austin-multifamily-value-add-institutional-underwriting-model');
    expect(doc.content).toContain('"PaperWorking Institutional Underwriting Model","Austin Multifamily Value-Add"');
    expect(doc.content).toContain('"Property Address","1401 E 6th St, Austin, TX 78702"');
    expect(doc.content).toContain('"Purchase Price","1250000"');
    expect(doc.content).toContain('"Rehab Budget","175000"');
    expect(doc.content).toContain('"After Repair Value (ARV)","1850000"');
    expect(doc.content).toContain('"Target IRR (%)","19.5"');
    expect(doc.content).toContain('"Equity Multiple","1.92"');
    expect(doc.content).toContain('"Funding Target","1425000"');
    expect(doc.content).toContain('"Asset Class","Multifamily"');
    expect(doc.content).toContain('"Deal Strategy","VALUE_ADD"');
  });

  it('generates structured TXT due diligence memos with operator provenance and Rule 506(c) notice', () => {
    const documents = [
      'Offering Memorandum (OM)',
      'Phase I Environmental Site Assessment',
      'Zoning & Title Commitment',
    ];

    for (const title of documents) {
      const doc = generateDiligenceDocument(sampleDeal, title, 'Lone Star Real Estate Syndicate');

      expect(doc.ext).toBe('txt');
      expect(doc.mimeType).toBe('text/plain;charset=utf-8;');
      expect(doc.content).toContain('PAPERWORKING DUE DILIGENCE VAULT');
      expect(doc.content).toContain(`DOCUMENT: ${title.toUpperCase()}`);
      expect(doc.content).toContain('Deal Reference: Austin Multifamily Value-Add');
      expect(doc.content).toContain('Property Address: 1401 E 6th St, Austin, TX 78702');
      expect(doc.content).toContain('Deal ID: deal-austin-multifamily-01');
      expect(doc.content).toContain('Operator: Lone Star Real Estate Syndicate');
      expect(doc.content).toContain('- Purchase Price: $1,250,000');
      expect(doc.content).toContain('- Rehab / CapEx: $175,000');
      expect(doc.content).toContain('- Projected ARV: $1,850,000');
      expect(doc.content).toContain('- Target IRR: 19.5%');
      expect(doc.content).toContain('- Equity Multiple: 1.92x');
      expect(doc.content).toContain('LEGAL & COMPLIANCE NOTICE:');
      expect(doc.content).toContain('Rule 506(c) of Regulation D');
      expect(doc.content).toContain('proprietary to the operating partner');
    }
  });

  it('strictly adheres to anti-slop rules: prohibits the forbidden term "sponsor"', () => {
    const titles = [
      'Institutional Underwriting Model',
      'Offering Memorandum (OM)',
      'Phase I Environmental Site Assessment',
      'Zoning & Title Commitment',
    ];

    for (const title of titles) {
      const doc = generateDiligenceDocument(sampleDeal, title, 'Apex Equity Group');
      // Case-insensitive check for the word sponsor
      expect(doc.content.toLowerCase()).not.toMatch(/\bsponsor\b/);
      expect(doc.filename.toLowerCase()).not.toMatch(/\bsponsor\b/);
    }

    // Also assert that the DealDetailPageView component file itself does NOT contain "sponsor"
    const componentPath = path.resolve(
      __dirname,
      '../../components/marketplace/detail/DealDetailPageView.tsx'
    );
    const componentSource = fs.readFileSync(componentPath, 'utf8');
    expect(componentSource.toLowerCase()).not.toMatch(/\bsponsor\b/);
  });

  it('generates valid download payloads that can be instantiated into Blob instances', () => {
    const doc = generateDiligenceDocument(sampleDeal, 'Institutional Underwriting Model');
    const blob = new Blob([doc.content], { type: doc.mimeType });
    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe(doc.mimeType);
  });
});
