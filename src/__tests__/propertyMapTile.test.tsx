/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import fs from 'fs';
import path from 'path';

// Import the component to test
import { PropertyMapTile } from '@/components/project/PropertyMapTile';

// Mock Auth Context
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      getIdToken: jest.fn().mockResolvedValue('mock-token'),
    },
  }),
}));

// Setup global fetch mock
const originalFetch = global.fetch;
beforeAll(() => {
  global.fetch = jest.fn();
});
afterAll(() => {
  global.fetch = originalFetch;
});

describe('PropertyMapTile Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a loading spinner initially', () => {
    (global.fetch as jest.Mock).mockReturnValue(new Promise(() => {})); // Never resolves
    render(<PropertyMapTile projectId="proj-1" address="123 Main St" />);
    expect(screen.getByText('progress_activity')).toBeTruthy();
  });

  it('displays correct map position and coordinates for Project A (Brooklyn)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ lat: 40.7128, lng: -74.0060 }),
    });

    render(<PropertyMapTile projectId="proj-1" address="123 Main St, Brooklyn" />);

    // Wait for the static map image to load
    const img = await screen.findByAltText('Map showing 123 Main St, Brooklyn');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toContain('/api/map-tile?lat=40.7128&lng=-74.006&zoom=15&w=640&h=256');

    // Coordinates should be formatted to 4 decimals
    expect(screen.getByText('40.7128, -74.0060')).toBeTruthy();
  });

  it('displays correct map position and coordinates for Project B (Los Angeles)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ lat: 34.0522, lng: -118.2437 }),
    });

    render(<PropertyMapTile projectId="proj-2" address="456 Sunset Blvd, LA" />);

    const img = await screen.findByAltText('Map showing 456 Sunset Blvd, LA');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toContain('/api/map-tile?lat=34.0522&lng=-118.2437&zoom=15&w=640&h=256');

    expect(screen.getByText('34.0522, -118.2437')).toBeTruthy();
  });

  it('shows honest fallback when coordinates are missing but address is available', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ lat: null, lng: null }),
    });

    render(<PropertyMapTile projectId="proj-3" address="789 Pine St, Chicago" />);

    // Wait for fallback state
    const addressEl = await screen.findByText('789 Pine St, Chicago');
    expect(addressEl).toBeTruthy();
    expect(screen.getByText(/Map coordinates not yet captured/i)).toBeTruthy();
    expect(screen.getByText(/location_off/i)).toBeTruthy();
  });

  it('shows honest fallback when both coordinates and address are missing', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ lat: null, lng: null }),
    });

    render(<PropertyMapTile projectId="proj-4" address="" />);

    const noAddressEl = await screen.findByText(/No address on record/i);
    expect(noAddressEl).toBeTruthy();
    expect(screen.getByText(/location_off/i)).toBeTruthy();
  });

  it('does not render the old animated SVG grid placeholder, bouncing location pin, or In Final Diligence', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ lat: 40.7128, lng: -74.0060 }),
    });

    const { container } = render(<PropertyMapTile projectId="proj-1" address="123 Main St" />);
    await screen.findByAltText('Map showing 123 Main St');

    // Confirm bouncing class or cartoon markup is absent
    expect(container.querySelector('.animate-bounce')).toBeNull();
    expect(screen.queryByText('In Final Diligence')).toBeNull();
  });
});

describe('Phase 2 Page Map Integration Regression Check', () => {
  it('imports and renders PropertyMapTile and has removed the old animated SVG road lines', () => {
    const filePath = path.resolve(__dirname, '../app/dashboard/projects/[id]/phase-2/page.tsx');
    const content = fs.readFileSync(filePath, 'utf8');

    // Confirm it imports PropertyMapTile
    expect(content).toContain("import { PropertyMapTile } from '@/components/project/PropertyMapTile';");

    // Confirm it renders PropertyMapTile
    expect(content).toContain('<PropertyMapTile');

    // Confirm it does NOT contain the old mock SVG road lines or "In Final Diligence" bouncing text
    expect(content).not.toContain('In Final Diligence');
    expect(content).not.toContain('animate-bounce');
    expect(content).not.toContain('[background-size:16px_16px]');
    expect(content).not.toContain('mock map graphic');
  });
});
