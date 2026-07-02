import { RentCastClient } from '../lib/providers/rentcast/client';
import {
  RentCastRateLimitError,
  RentCastServerError,
  RentCastNotFoundError,
  RentCastAuthError,
} from '../lib/providers/rentcast/errors';
import { getCached, setCached, logApiCall } from '../lib/providers/rentcast/cache';
import { rentCastLimiter } from '../lib/providers/rentcast/limiter';

jest.mock('../lib/providers/rentcast/cache', () => ({
  buildCacheKey: (endpoint: string, params: any) => `${endpoint}__${JSON.stringify(params)}`,
  getCached: jest.fn().mockResolvedValue(null),
  setCached: jest.fn().mockResolvedValue(undefined),
  logApiCall: jest.fn().mockResolvedValue(undefined),
}));

describe('RentCastClient Core Integration', () => {
  const apiKey = 'test-key';
  let client: RentCastClient;
  let originalFetch: typeof global.fetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  beforeEach(() => {
    client = new RentCastClient(apiKey);
    jest.clearAllMocks();
    rentCastLimiter.reset();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('respects cache hit flow without calling fetch', async () => {
    const mockCachedResponse = {
      data: [{ address: '123 Main St', propertyType: 'SFR' }],
      fetchedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 10000).toISOString(),
      endpoint: 'properties',
      cacheKey: 'properties__address=123_main_st',
      ttlSeconds: 60,
    };
    (getCached as jest.Mock).mockResolvedValueOnce(mockCachedResponse);
    global.fetch = jest.fn();

    const result = await client.getProperties({ address: '123 Main St' });

    expect(result).toEqual(mockCachedResponse.data);
    expect(getCached).toHaveBeenCalledWith(expect.stringContaining('properties__'));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('calls fetch on cache miss, caches response, and logs api call', async () => {
    (getCached as jest.Mock).mockResolvedValueOnce(null);
    const mockApiResponse = [{ id: 1, address: '123 Main St' }];
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    });

    const result = await client.getProperties({ address: '123 Main St' });

    expect(result).toEqual(mockApiResponse);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(setCached).toHaveBeenCalledWith(expect.any(String), 'properties', mockApiResponse);
    expect(logApiCall).toHaveBeenCalledWith('properties');
  });

  it('retries up to 3 times on 429 status code and eventually succeeds', async () => {
    (getCached as jest.Mock).mockResolvedValue(null);
    const mockApiResponse = { price: 250000 };
    
    // First 2 calls fail with 429, 3rd call succeeds
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ message: 'Too many requests' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ message: 'Too many requests' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

    const result = await client.getValueEstimate({ address: '123 Main St' });

    expect(result).toEqual(mockApiResponse);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('throws RentCastRateLimitError if 429 retries are exhausted', async () => {
    (getCached as jest.Mock).mockResolvedValue(null);
    
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ message: 'Too many requests' }),
    });

    await expect(
      client.getValueEstimate({ address: '123 Main St' })
    ).rejects.toThrow(RentCastRateLimitError);

    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('throws mapped error immediately on 404', async () => {
    (getCached as jest.Mock).mockResolvedValue(null);
    
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Address not found' }),
    });

    await expect(
      client.getProperties({ address: 'Unknown Address' })
    ).rejects.toThrow(RentCastNotFoundError);

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('throws mapped error immediately on 401', async () => {
    (getCached as jest.Mock).mockResolvedValue(null);
    
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized key' }),
    });

    await expect(
      client.getProperties({ address: '123 Main St' })
    ).rejects.toThrow(RentCastAuthError);

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
