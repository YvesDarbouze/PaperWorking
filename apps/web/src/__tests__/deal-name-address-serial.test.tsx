import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import DealCard, { extractStreetAddress, type DealCardData } from '../../components/marketplace/DealCard.js';

const mockProjectDeal: DealCardData = {
  id: 'deal-serial-1',
  slug: '1247-elm-street',
  name: '1247 Elm Street, Austin, TX 78702',
  address: '1247 Elm Street, Austin, TX 78702',
  city: 'Austin',
  state: 'TX',
  zipCode: '78702',
  assetClass: 'Multifamily',
  subStrategy: 'VALUE_ADD',
  status: 'funding',
  targetIrr: 18.5,
  equityMultiple: 1.85,
  holdPeriod: '3–5 Years',
  minInvestment: 25_000,
  fundingTarget: 1_500_000,
  committedAmount: 900_000,
  investorCount: 12,
  creatorName: 'Blue Ridge Capital',
  isVerifiedOperator: true,
  projectId: 'proj-elm-101',
  projectName: '1247 Elm Street Project',
};

describe('Deal Name as Project Address Serial Number & Street Address Card Display', () => {
  describe('extractStreetAddress helper', () => {
    it('extracts only the street address portion from full comma-separated address', () => {
      expect(extractStreetAddress('1247 Elm Street, Austin, TX 78702')).toBe('1247 Elm Street');
      expect(extractStreetAddress('450 Lexington Ave, Suite 1400, New York, NY 10017')).toBe('450 Lexington Ave');
      expect(extractStreetAddress('888 Ocean Drive, Miami Beach, FL')).toBe('888 Ocean Drive');
    });

    it('handles single-string addresses without commas gracefully', () => {
      expect(extractStreetAddress('100 Main Street')).toBe('100 Main Street');
      expect(extractStreetAddress('')).toBe('Commercial Property');
    });
  });

  describe('DealCard rendering: Street Address visible, Full Address Serial on hover', () => {
    it('renders ONLY the Street Address as the primary deal card heading', () => {
      const html = renderToString(<DealCard deal={mockProjectDeal} />);

      // Street Address is rendered in the card title
      expect(html).toContain('1247 Elm Street');

      // The heading itself contains the street address
      expect(html).toMatch(/<h3[^>]*>[\s\S]*?1247 Elm Street[\s\S]*?<\/h3>/);
    });

    it('attaches the full address serial number to title attribute for hover access', () => {
      const html = renderToString(<DealCard deal={mockProjectDeal} />);

      // Native hover tooltip title contains the full address serial number
      expect(html).toContain('title="1247 Elm Street, Austin, TX 78702"');
    });

    it('renders accessible floating hover tooltip and hover-reveal element for full address', () => {
      const html = renderToString(<DealCard deal={mockProjectDeal} />);

      // Floating popover tooltip for serial number
      expect(html).toContain('role="tooltip"');
      expect(html).toContain('Deal Name · Serial Number');
      expect(html).toContain('1247 Elm Street, Austin, TX 78702');

      // Serial hint row indicates hover behavior when not hovered
      expect(html).toContain('Hover for full address serial');
    });

    it('applies the same street-address-only and hover-reveal pattern in compact mode', () => {
      const html = renderToString(<DealCard deal={mockProjectDeal} compact={true} />);

      expect(html).toContain('1247 Elm Street');
      expect(html).toContain('title="1247 Elm Street, Austin, TX 78702"');
      expect(html).toContain('Deal Name · Serial Number');
      expect(html).toContain('Hover for full address');
    });
  });
});
