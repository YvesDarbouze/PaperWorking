/**
 * @jest-environment jsdom
 */

import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, screen, fireEvent } from '@testing-library/react';
import MarketplacesClient from '@/components/landing/MarketplacesClient';
import { MarketplaceSubnav } from '@/components/marketplace/MarketplaceSubnav';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/deals',
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe('PROMPT 4 — Marketplaces Subnavigation & Compliance Verification', () => {
  describe('Marketing /marketplaces Subnavigation (Surface A)', () => {
    it('renders exact Deal Marketplace and Vendor Marketplace tabs with subnav accessibility', () => {
      render(<MarketplacesClient />);

      const dealsTab = screen.getByRole('tab', { name: /deal marketplace/i });
      const vendorsTab = screen.getByRole('tab', { name: /vendor marketplace/i });

      expect(dealsTab).toBeDefined();
      expect(vendorsTab).toBeDefined();
      expect(dealsTab.getAttribute('aria-selected')).toBe('true');
      expect(vendorsTab.getAttribute('aria-selected')).toBe('false');
    });

    it('switches active subnav tab on click and updates aria-selected state', () => {
      render(<MarketplacesClient />);

      const dealsTab = screen.getByRole('tab', { name: /deal marketplace/i });
      const vendorsTab = screen.getByRole('tab', { name: /vendor marketplace/i });

      fireEvent.click(vendorsTab);
      expect(vendorsTab.getAttribute('aria-selected')).toBe('true');
      expect(dealsTab.getAttribute('aria-selected')).toBe('false');

      fireEvent.click(dealsTab);
      expect(dealsTab.getAttribute('aria-selected')).toBe('true');
      expect(vendorsTab.getAttribute('aria-selected')).toBe('false');
    });

    it('preserves all verbatim marketing copy and compliance disclaimers on Marketplaces surface', () => {
      const clientPath = path.resolve(process.cwd(), 'src/components/landing/MarketplacesClient.tsx');
      const content = fs.readFileSync(clientPath, 'utf8');

      expect(content).toContain('Two marketplaces, one network');
      expect(content).toContain('Come for the tools. Stay for the community.');
      expect(content).toContain('PaperWorking subscribers have exclusive access to powerful tools for serious real estate investors.');
      expect(content).toContain('PaperWorking is project management software, not investment advice. Marketplace listings are not offers to sell securities.');

      // Below the fold blocks purged per user request
      expect(content).not.toContain('Put your Project in front of investors who are looking.');
      expect(content).not.toContain('Find the right professional when the deal needs them.');
    });
  });

  describe('Signed-In Marketplace In-App Subnavigation (Surface B)', () => {
    it('renders MarketplaceSubnav with working links to Deals, Vendors, and Investors', () => {
      render(<MarketplaceSubnav />);

      const nav = screen.getByRole('navigation', { name: /marketplace subnavigation/i });
      expect(nav).toBeDefined();

      const dealsLink = screen.getByRole('link', { name: /deal marketplace/i });
      const vendorsLink = screen.getByRole('link', { name: /vendor marketplace/i });
      const investorsLink = screen.getByRole('link', { name: /investors/i });

      expect(dealsLink.getAttribute('href')).toBe('/dashboard/deals');
      expect(vendorsLink.getAttribute('href')).toBe('/dashboard/marketplace');
      expect(investorsLink.getAttribute('href')).toBe('/marketplace/investors');
    });
  });

  describe('Source Code Security & Compliance Checks', () => {
    it('verifies compliance disclaimers exist across signed-in listing surfaces', () => {
      const dealsPath = path.resolve(process.cwd(), 'src/app/dashboard/deals/page.tsx');
      const marketplacePath = path.resolve(process.cwd(), 'src/app/dashboard/marketplace/page.tsx');
      const profilePath = path.resolve(process.cwd(), 'src/app/marketplace/investors/[id]/page.tsx');

      const dealsContent = fs.readFileSync(dealsPath, 'utf8');
      const marketplaceContent = fs.readFileSync(marketplacePath, 'utf8');
      const profileContent = fs.readFileSync(profilePath, 'utf8');

      expect(dealsContent).toContain('PaperWorking facilitates introductions and interest tracking only');
      expect(marketplaceContent).toContain('PaperWorking facilitates introductions and interest tracking only');
      expect(profileContent).toContain('PaperWorking facilitates introductions and interest tracking only');
    });

    it('verifies clickable deal cards route to deal detail view (/dashboard/deals/[slug])', () => {
      const profilePath = path.resolve(process.cwd(), 'src/app/marketplace/investors/[id]/page.tsx');
      const content = fs.readFileSync(profilePath, 'utf8');

      expect(content).toContain("href={`/dashboard/deals/${(d as any).slug || d.id}`}");
    });

    it('verifies zero occurrences of forbidden term Sponsor across touched files', () => {
      const files = [
        'src/components/landing/MarketplacesClient.tsx',
        'src/components/marketplace/MarketplaceSubnav.tsx',
        'src/app/marketplace/investors/[id]/page.tsx',
        'src/app/marketplace/investors/page.tsx',
      ];

      files.forEach((file) => {
        const fullPath = path.resolve(process.cwd(), file);
        const content = fs.readFileSync(fullPath, 'utf8');
        expect(content.toLowerCase()).not.toContain('sponsor');
      });
    });
  });
});
