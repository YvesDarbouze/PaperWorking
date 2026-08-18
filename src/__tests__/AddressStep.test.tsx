/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AddressStep } from '@/components/project-wizard/AddressStep';

describe('AddressStep Component', () => {
  test('renders heading, description, and input placeholder', () => {
    const handleAddressSelect = jest.fn();
    render(<AddressStep onAddressSelect={handleAddressSelect} />);

    expect(screen.getByText('Property Address')).toBeTruthy();
    expect(screen.getByPlaceholderText('123 Main St, Austin, TX 78701')).toBeTruthy();
  });
});
