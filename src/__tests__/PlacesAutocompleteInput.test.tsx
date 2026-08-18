/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlacesAutocompleteInput } from '@/components/maps/PlacesAutocompleteInput';

describe('PlacesAutocompleteInput Component', () => {
  test('renders input with value and placeholder', () => {
    const handleChange = jest.fn();
    render(
      <PlacesAutocompleteInput
        value="123 Main St"
        onChange={handleChange}
        placeholder="Search address..."
      />
    );

    const input = screen.getByPlaceholderText('Search address...') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe('123 Main St');
  });

  test('calls onChange when user types', () => {
    const handleChange = jest.fn();
    render(
      <PlacesAutocompleteInput
        value=""
        onChange={handleChange}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '456 Oak Ave' } });
    expect(handleChange).toHaveBeenCalledWith('456 Oak Ave');
  });

  test('renders error message when error prop is provided', () => {
    render(
      <PlacesAutocompleteInput
        value=""
        onChange={jest.fn()}
        error="Invalid property address"
      />
    );

    expect(screen.getByText('Invalid property address')).toBeTruthy();
  });
});
