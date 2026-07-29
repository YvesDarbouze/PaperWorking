/** @jest-environment jsdom */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { PropertyStreetViewTile } from '@/components/project/PropertyStreetViewTile';

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      getIdToken: jest.fn().mockResolvedValue('mock-token'),
    },
  }),
}));

describe('PropertyStreetViewTile — Section A.5 Availability Probe', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('renders loading state initially while probing availability', () => {
    (global.fetch as jest.Mock).mockReturnValue(new Promise(() => {})); // Never resolves
    render(<PropertyStreetViewTile lat={37.422} lng={-122.084} address="1600 Amphitheatre Pkwy" />);
    expect(screen.getByText(/Checking Street View/i)).toBeTruthy();
  });

  it('renders live Street View image when availability probe returns status === OK', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('metadata=true')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'OK', pano_id: 'pano_12345' }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    render(<PropertyStreetViewTile lat={37.422} lng={-122.084} address="1600 Amphitheatre Pkwy" />);

    const img = await screen.findByAltText('Street View of 1600 Amphitheatre Pkwy');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toContain('/api/street-view?lat=37.422&lng=-122.084');
    expect(screen.getByText(/Street View Live/i)).toBeTruthy();
  });

  it('falls back to Satellite Map tile when availability probe returns ZERO_RESULTS', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('metadata=true')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'ZERO_RESULTS' }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    render(<PropertyStreetViewTile lat={37.422} lng={-122.084} address="1600 Remote Rd" />);

    const mapImg = await screen.findByAltText('Satellite Map showing 1600 Remote Rd');
    expect(mapImg).toBeTruthy();
    expect(mapImg.getAttribute('src')).toContain('/api/map-tile?lat=37.422&lng=-122.084');
    expect(screen.queryByAltText('Street View of 1600 Remote Rd')).toBeNull();
  });
});
