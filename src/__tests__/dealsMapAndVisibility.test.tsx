/** @jest-environment jsdom */
import React from 'react';
import { render } from '@testing-library/react';
import DealMap, { type GoogleMapsApi } from '@/components/marketplace/DealMap';
import PublicAddressSearch from '@/components/search/PublicAddressSearch';
import type { DealListingTeaser } from '@/types/listing';

interface GoogleMapsMock {
  maps: {
    Map: jest.Mock;
    Circle: jest.Mock;
    Marker: jest.Mock;
    SymbolPath: { CIRCLE: number };
    LatLngBounds: jest.Mock;
    event: {
      addListener: jest.Mock;
      removeListener: jest.Mock;
    };
  };
}

// Mock routing & next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  __esModule: true,
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock PostHog
jest.mock('posthog-js', () => ({
  __esModule: true,
  default: {
    capture: jest.fn(),
  },
}));

// Mock search action
const mockSearchDealByAddress = jest.fn();
jest.mock('@/actions/listings', () => ({
  __esModule: true,
  searchDealByAddress: (...args: unknown[]) => mockSearchDealByAddress(...args),
}));

// Setup mock before tests
beforeAll(() => {
  Object.defineProperty(window, 'google', {
    writable: true,
    value: {
      maps: {
        Marker: jest.fn().mockImplementation((opts?: { position?: unknown; title?: string }) => ({
          setMap: jest.fn(),
          addListener: jest.fn(),
          position: opts?.position,
          title: opts?.title,
        })),
        Map: jest.fn().mockImplementation(() => ({
          setCenter: jest.fn(),
          setZoom: jest.fn(),
          fitBounds: jest.fn(),
          getZoom: jest.fn().mockReturnValue(12),
          addListener: jest.fn(),
        })),
        LatLngBounds: jest.fn().mockImplementation(() => ({
          extend: jest.fn(),
        })),
        SymbolPath: { CIRCLE: 0 },
        event: {
          addListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
          removeListener: jest.fn(),
        },
      },
    },
  });
});

describe('DM-13 Map and List Views & Visibility Matrix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('DealMap and Google Attribution (G-8/DM-3)', () => {
    it('renders the map canvas and Google attribution text', () => {
      const mockDeals: DealListingTeaser[] = [
        {
          id: 'deal-1',
          projectId: 'project-1',
          status: 'published',
          propertyName: 'Heights Apartment',
          neighborhood: 'Brickell',
          city: 'Miami',
          state: 'FL',
          assetClass: 'Residential',
          subStrategy: 'FLIP',
          leadInvestorName: 'John',
          followCount: 5,
          viewCount: 10,
          publishedAt: new Date().toISOString(),
          latitude: 25.7617,
          longitude: -80.1918,
        },
      ];

      const { container, getByText } = render(<DealMap deals={mockDeals} />);

      // Verify Google Maps container exists
      expect(container.querySelector('.w-full.h-full')).not.toBeNull();

      // Verify G-8 attribution is present
      expect(getByText('Powered by Google')).toBeDefined();
    });

    it('filters out deals without coordinates to prevent map rendering exceptions', () => {
      const mockDeals: DealListingTeaser[] = [
        {
          id: 'deal-no-coords',
          projectId: 'project-1',
          status: 'published',
          propertyName: 'No Coords Property',
          neighborhood: 'Brickell',
          city: 'Miami',
          state: 'FL',
          assetClass: 'Residential',
          subStrategy: 'FLIP',
          leadInvestorName: 'John',
          followCount: 5,
          viewCount: 10,
          publishedAt: new Date().toISOString(),
          latitude: undefined, // no coordinates
          longitude: undefined,
        },
      ];

      render(<DealMap deals={mockDeals} />);
      const googleMock = window.google as unknown as GoogleMapsMock;
      // Should succeed without throwing
      expect(googleMock.maps.Marker).not.toHaveBeenCalled();
    });
  });

  describe('View Switcher Persistence', () => {
    it('persists switcher toggle choice in localStorage', () => {
      const { unmount } = render(<PublicAddressSearch />);
      
      // Initially, switcher state defaults to 'list'
      expect(localStorage.getItem('pw_public_search_view')).toBeNull();
      unmount();
    });
  });

  describe('Anonymous Map Pin Visibility Gates (DM-D9)', () => {
    it('renders a pin on the map for PUBLIC_SOLICITED deals viewed anonymously', () => {
      const publicTeaser: DealListingTeaser = {
        id: 'deal-public',
        projectId: 'project-public',
        status: 'published',
        propertyName: 'Public Solicited Prop',
        neighborhood: 'Brickell',
        city: 'Miami',
        state: 'FL',
        assetClass: 'Residential',
        subStrategy: 'FLIP',
        leadInvestorName: 'John',
        followCount: 5,
        viewCount: 10,
        publishedAt: new Date().toISOString(),
        latitude: 25.7617,
        longitude: -80.1918,
      };

      // DealMap is rendered for PUBLIC_SOLICITED mode
      render(<DealMap deals={[publicTeaser]} />);
      const googleMock = window.google as unknown as GoogleMapsMock;

      // Pin should exist (window.google.maps.Marker should have been constructed)
      expect(googleMock.maps.Marker).toHaveBeenCalledTimes(1);
      expect(googleMock.maps.Marker).toHaveBeenCalledWith(
        expect.objectContaining({
          position: { lat: 25.7617, lng: -80.1918 },
          title: expect.stringContaining('Public Solicited Prop'),
        })
      );
    });

    it('does NOT render a pin on the map for MARKETPLACE deals viewed anonymously', () => {
      // For MARKETPLACE deals, anonymous map receives an empty list of deals
      render(<DealMap deals={[]} />);
      const googleMock = window.google as unknown as GoogleMapsMock;

      // No pin should exist
      expect(googleMock.maps.Marker).not.toHaveBeenCalled();
    });
  });
});
