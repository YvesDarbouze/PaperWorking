import {
  checkStreetViewAvailability,
  getStreetViewImage,
  geocodeAddress,
} from '@/lib/maps/street-view';

describe('Server-Side Street View Service', () => {
  const originalKey = process.env.GOOGLE_MAPS_API_KEY;

  beforeEach(() => {
    process.env.GOOGLE_MAPS_API_KEY = 'mock-maps-key';
  });

  afterEach(() => {
    process.env.GOOGLE_MAPS_API_KEY = originalKey;
    jest.restoreAllMocks();
  });

  test('checkStreetViewAvailability returns false if API key is not set', async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.GOOGLE_PLACES_API_KEY;
    const available = await checkStreetViewAvailability(37.422, -122.084);
    expect(available).toBe(false);
  });

  test('checkStreetViewAvailability parses OK response correctly', async () => {
    jest.spyOn(global, 'fetch').mockImplementationOnce(async () => {
      return {
        json: async () => ({ status: 'OK' }),
      } as Response;
    });

    const available = await checkStreetViewAvailability(37.422, -122.084);
    expect(available).toBe(true);
  });

  test('getStreetViewImage returns image URL when available', async () => {
    jest.spyOn(global, 'fetch').mockImplementationOnce(async () => {
      return {
        json: async () => ({ status: 'OK' }),
      } as Response;
    });

    const result = await getStreetViewImage(37.422, -122.084, { width: 800, height: 450 });
    expect(result.available).toBe(true);
    expect(result.imageUrl).toContain('https://maps.googleapis.com/maps/api/streetview');
    expect(result.imageUrl).toContain('size=800x450');
    expect(result.imageUrl).toContain('source=outdoor');
  });

  test('geocodeAddress returns lat/lng coordinates when status is OK', async () => {
    jest.spyOn(global, 'fetch').mockImplementationOnce(async () => {
      return {
        json: async () => ({
          status: 'OK',
          results: [{ geometry: { location: { lat: 30.2672, lng: -97.7431 } } }],
        }),
      } as Response;
    });

    const coords = await geocodeAddress('123 Main St, Austin, TX');
    expect(coords).toEqual({ lat: 30.2672, lng: -97.7431 });
  });
});
