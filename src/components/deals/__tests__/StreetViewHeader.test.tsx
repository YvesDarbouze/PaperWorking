/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StreetViewHeader } from '../StreetViewHeader';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    const { fill, priority, ...rest } = props;
    return <img {...rest} alt={props.alt} />;
  },
}));

describe('StreetViewHeader', () => {
  it('renders address and Street View image when url is provided', () => {
    render(
      <StreetViewHeader
        address="1600 Pennsylvania Ave NW, Washington, DC"
        streetViewUrl="https://maps.googleapis.com/maps/api/streetview?location=1600+Pennsylvania+Ave"
        height={250}
      />
    );

    expect(screen.getByText('1600 Pennsylvania Ave NW, Washington, DC')).toBeTruthy();
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toContain('maps.googleapis.com');
  });

  it('renders fallback when image fails to load or no url provided', () => {
    render(
      <StreetViewHeader
        address="Unknown Property"
        streetViewUrl={null}
        fallbackImage="/images/deal-placeholder.jpg"
      />
    );

    const img = screen.getByRole('img');
    fireEvent.error(img);

    expect(screen.getByText('No Street View Available')).toBeTruthy();
    expect(screen.getByText('Unknown Property')).toBeTruthy();
  });
});
