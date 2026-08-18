import { checkStreetViewAvailability, getStreetViewImage, geocodeAddress } from '../street-view';

describe('Street View Service', () => {
  test('returns unavailable when API key is missing', async () => {
    const originalKey = process.env.GOOGLE_MAPS_API_KEY;
    const originalPlacesKey = process.env.GOOGLE_PLACES_API_KEY;
    delete process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.GOOGLE_PLACES_API_KEY;

    const result = await getStreetViewImage(30.2672, -97.7431);
    expect(result.available).toBe(false);
    expect(result.imageUrl).toBeNull();

    process.env.GOOGLE_MAPS_API_KEY = originalKey;
    process.env.GOOGLE_PLACES_API_KEY = originalPlacesKey;
  });

  test('generates correct Street View URL', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'test_key';

    // Mock fetch for metadata check
    global.fetch = jest.fn().mockResolvedValueOnce({
      json: () => Promise.resolve({ status: 'OK' }),
    });

    const result = await getStreetViewImage(30.2672, -97.7431);

    expect(result.available).toBe(true);
    expect(result.imageUrl).toContain('maps.googleapis.com/maps/api/streetview');
    expect(decodeURIComponent(result.imageUrl!)).toContain('30.2672,-97.7431');
    expect(result.imageUrl).toContain('test_key');
  });
});
