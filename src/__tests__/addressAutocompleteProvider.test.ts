import { POST as AutocompletePublicPOST } from '@/app/api/places/autocomplete-public/route';
import { NextRequest } from 'next/server';

// Mock PlacesGateway
jest.mock('@/lib/places/placesGateway', () => ({
  autocomplete: jest.fn(),
}));

import * as PlacesGateway from '@/lib/places/placesGateway';

describe('BUG-007 — Real Address Autocomplete Endpoint & Gateway Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('short-circuits with empty predictions array on single character query', async () => {
    const req = new NextRequest('http://localhost:3000/api/places/autocomplete-public', {
      method: 'POST',
      body: JSON.stringify({ input: 'a' }),
    });

    const res = await AutocompletePublicPOST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.predictions).toEqual([]);
    expect(PlacesGateway.autocomplete).not.toHaveBeenCalled();
  });

  it('short-circuits with empty predictions array on empty query', async () => {
    const req = new NextRequest('http://localhost:3000/api/places/autocomplete-public', {
      method: 'POST',
      body: JSON.stringify({ input: '   ' }),
    });

    const res = await AutocompletePublicPOST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.predictions).toEqual([]);
    expect(PlacesGateway.autocomplete).not.toHaveBeenCalled();
  });

  it('delegates valid query (min 2 chars) to PlacesGateway and returns formatted predictions', async () => {
    (PlacesGateway.autocomplete as jest.Mock).mockResolvedValue([
      {
        placeId: 'place_austin_1',
        description: '100 Congress Ave, Austin, TX 78701',
        mainText: '100 Congress Ave',
        secondaryText: 'Austin, TX 78701',
      },
    ]);

    const req = new NextRequest('http://localhost:3000/api/places/autocomplete-public', {
      method: 'POST',
      body: JSON.stringify({ input: '100 Congress' }),
    });

    const res = await AutocompletePublicPOST(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(PlacesGateway.autocomplete).toHaveBeenCalledWith(
      '100 Congress',
      expect.any(String),
      'public'
    );
    expect(json.predictions).toEqual([
      {
        placeId: 'place_austin_1',
        description: '100 Congress Ave, Austin, TX 78701',
      },
    ]);
  });

  it('returns empty predictions array on Gateway error without serving mock data', async () => {
    (PlacesGateway.autocomplete as jest.Mock).mockRejectedValue(
      new Error('[PlacesGateway] GOOGLE_PLACES_API_KEY is not configured')
    );

    const req = new NextRequest('http://localhost:3000/api/places/autocomplete-public', {
      method: 'POST',
      body: JSON.stringify({ input: '123 Main St' }),
    });

    const res = await AutocompletePublicPOST(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.predictions).toEqual([]);
    expect(JSON.stringify(json)).not.toContain('456 Oak Ave');
    expect(JSON.stringify(json)).not.toContain('789 Pine St');
  });
});
