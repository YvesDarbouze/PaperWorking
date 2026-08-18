/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { StreetViewHeader } from '@/components/deals/StreetViewHeader';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    const { fill, priority, ...rest } = props;
    return <img {...rest} alt={props.alt} />;
  },
}));

describe('StreetViewHeader Component', () => {
  test('renders address badge correctly', () => {
    render(
      <StreetViewHeader
        address="1600 Amphitheatre Pkwy, Mountain View, CA"
        streetViewUrl="https://maps.googleapis.com/maps/api/streetview?location=37.422,-122.084"
      />
    );

    expect(screen.getByText('1600 Amphitheatre Pkwy, Mountain View, CA')).toBeTruthy();
  });

  test('renders address badge for rural property', () => {
    render(
      <StreetViewHeader
        address="Remote Rural Road"
      />
    );

    expect(screen.getByText('Remote Rural Road')).toBeTruthy();
  });
});
