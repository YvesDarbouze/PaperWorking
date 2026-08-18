/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddressSearch from '@/components/deals/AddressSearch';

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('AddressSearch Component & Collision Interception', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock fetch handling autocomplete & deals collision
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/api/places/autocomplete')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            predictions: [
              {
                placeId: 'place_123main',
                description: '123 Main St, Austin, TX 78701',
                mainText: '123 Main St',
                secondaryText: 'Austin, TX 78701',
              },
            ],
          }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ exists: false, deal: null }),
      } as Response);
    });
  });

  describe('AddressSearch component rendering', () => {
    it('renders input with placeholder and inline CTA button', () => {
      render(<AddressSearch />);

      const input = screen.getByTestId('deals-address-search-input');
      expect(input).toBeTruthy();
      expect(input.getAttribute('placeholder')).toBe(
        'Search any property address to find or create a deal...'
      );

      const listBtn = screen.getByTestId('list-a-deal-hero-cta');
      expect(listBtn).toBeTruthy();
    });

    it('updates query input state on change', () => {
      render(<AddressSearch />);
      const input = screen.getByTestId('deals-address-search-input') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '123 Main' } });
      expect(input.value).toBe('123 Main');
    });

    it('triggers prediction search on input change after 300ms debounce', async () => {
      render(<AddressSearch />);
      const input = screen.getByTestId('deals-address-search-input');

      fireEvent.change(input, { target: { value: '123 Main' } });

      await waitFor(() => {
        expect(screen.getByTestId('address-prediction-dropdown')).toBeTruthy();
      }, { timeout: 1000 });

      const predictionItem = screen.getByTestId('prediction-item-0');
      expect(predictionItem.textContent).toContain('123 Main St');
    });

    it('renders glass collision modal when selected address matches an existing published deal', async () => {
      // Mock fetch returning published deal collision
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          exists: true,
          deal: {
            id: 'deal_123main',
            slug: '123mainstaustintx78701',
            name: 'Austin Core Multifamily Project',
            address: '123 Main St, Austin, TX 78701',
            price: 350000,
            roi: 18.5,
            status: 'published',
            creatorName: 'Yves Darbouze',
            committed: 130000,
            target: 200000,
          },
        }),
      } as unknown as Response);

      render(<AddressSearch />);
      const input = screen.getByTestId('deals-address-search-input');

      fireEvent.change(input, { target: { value: '123 Main' } });

      await waitFor(() => {
        expect(screen.getByTestId('address-prediction-dropdown')).toBeTruthy();
      }, { timeout: 1000 });

      const predictionItem = screen.getByTestId('prediction-item-0');
      fireEvent.click(predictionItem);

      await waitFor(() => {
        expect(screen.getByTestId('search-collision-modal')).toBeTruthy();
      });

      expect(screen.getByText('A deal already exists at this address')).toBeTruthy();
      expect(screen.getByTestId('view-existing-deal-btn')).toBeTruthy();
      expect(screen.getByTestId('create-deal-anyway-btn')).toBeTruthy();
    });
  });
});
