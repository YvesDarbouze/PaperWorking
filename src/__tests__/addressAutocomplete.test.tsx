/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddressAutocomplete from '@/components/projects/AddressAutocomplete';

jest.mock('@/lib/firebase/config', () => ({
  auth: {
    currentUser: {
      getIdToken: jest.fn().mockResolvedValue('mock_firebase_id_token'),
    },
  },
}));

describe('AddressAutocomplete Component (PS-0 ... PS-11)', () => {
  const mockOnSelect = jest.fn();
  const mockOnInputChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = jest.fn();
  });

  it('renders autocomplete input in default mode', () => {
    render(<AddressAutocomplete value="" onSelect={mockOnSelect} onInputChange={mockOnInputChange} />);
    const input = screen.getByRole('combobox');
    expect(input).toBeTruthy();
  });

  it('switches to manual entry mode when clicking "Enter Address Manually"', () => {
    render(<AddressAutocomplete value="" onSelect={mockOnSelect} onInputChange={mockOnInputChange} />);
    const manualBtn = screen.getByText(/enter address manually/i);
    fireEvent.click(manualBtn);

    expect(screen.getByText(/street address/i)).toBeTruthy();
    expect(screen.getByText(/city/i)).toBeTruthy();
    expect(screen.getByText(/state/i)).toBeTruthy();
    expect(screen.getByText(/zip code/i)).toBeTruthy();
  });

  it('switches back to search mode when clicking "Search Address Instead"', () => {
    render(<AddressAutocomplete value="" onSelect={mockOnSelect} onInputChange={mockOnInputChange} />);
    const manualBtn = screen.getByText(/enter address manually/i);
    fireEvent.click(manualBtn);

    const searchBtn = screen.getByText(/search address instead/i);
    fireEvent.click(searchBtn);

    expect(screen.getByRole('combobox')).toBeTruthy();
  });

  it('fetches predictions when typing 3+ characters', async () => {
    const mockPredictions = [
      {
        placeId: 'place_1',
        description: '1600 Amphitheatre Pkwy, Mountain View, CA',
        mainText: '1600 Amphitheatre Pkwy',
        secondaryText: 'Mountain View, CA',
      },
    ];

    (global as any).fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce({ predictions: mockPredictions }),
    });

    render(<AddressAutocomplete value="" onSelect={mockOnSelect} onInputChange={mockOnInputChange} />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: '1600 Amp' } });

    await waitFor(() => {
      expect((global as any).fetch).toHaveBeenCalledWith(
        '/api/places/autocomplete',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });
});
