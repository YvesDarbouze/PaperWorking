/** @jest-environment node */

import { searchDealsAuthenticated } from '../actions/listings';
import type { SubscriberPropertyResult } from '@/types/listing';

// ── Mock Firestore & Auth ───────────────────────────────
const mockDocGet = jest.fn();
const mockDocUpdate = jest.fn();
const mockCollectionGet = jest.fn();

let activeCollectionName = '';

jest.mock('@/lib/firebase/admin', () => ({
  __esModule: true,
  adminDb: {
    collection: jest.fn().mockImplementation((collectionName: string) => {
      activeCollectionName = collectionName;
      return {
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockImplementation(() => {
          if (activeCollectionName === 'subscriptions') {
            return Promise.resolve({
              docs: [
                {
                  data: () => ({ status: 'active', userId: 'subscriber-uid' }),
                },
              ],
            });
          }
          if (activeCollectionName === 'properties') {
            return Promise.resolve({
              docs: [
                {
                  id: 'prop_1',
                  data: () => ({ id: 'prop_1' }),
                },
              ],
            });
          }
          if (activeCollectionName === 'projects') {
            return Promise.resolve({
              docs: [
                {
                  id: 'project_1',
                  data: () => ({ id: 'project_1', propertyId: 'prop_1' }),
                },
              ],
            });
          }
          if (activeCollectionName === 'dealListings') {
            return mockCollectionGet();
          }
          return Promise.resolve({ docs: [] });
        }),
        doc: jest.fn().mockImplementation((docId: string) => {
          return {
            get: jest.fn().mockImplementation(() => mockDocGet(docId)),
            update: mockDocUpdate,
          };
        }),
      };
    }),
  },
  adminAuth: {
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'subscriber-uid' }),
  },
}));

var mockCookieGet = jest.fn();
jest.mock('next/headers', () => ({
  __esModule: true,
  cookies: jest.fn(() => ({
    get: mockCookieGet,
  })),
}));

var mockGeocodeAddress = jest.fn();
jest.mock('@/lib/providers/geocode', () => ({
  __esModule: true,
  geocodeAddress: (...args: any[]) => mockGeocodeAddress(...args),
}));

// Mock Metrics derive function to prevent actual evaluations
jest.mock('@/lib/metrics', () => ({
  __esModule: true,
  deriveAllProjectMetrics: jest.fn().mockResolvedValue({
    cocReturn: 0.08,
    projectedROI: 0.12,
  }),
}));

// Mock PlacesGateway geocode and placeDetails
jest.mock('@/lib/places/placesGateway', () => ({
  __esModule: true,
  geocode: jest.fn().mockResolvedValue({
    placeId: 'place_1',
    formattedAddress: '123 Main St, Miami, FL 33131',
  }),
  placeDetails: jest.fn().mockResolvedValue({
    placeId: 'place_1',
    formattedAddress: '123 Main St, Miami, FL 33131',
    addressComponents: {
      streetNumber: '123',
      route: 'Main St',
      city: 'Miami',
      state: 'FL',
      zip: '33131',
    },
  }),
}));

describe('Coordinates Cache Refresh logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCookieGet.mockReturnValue({ value: 'token-abc' });
  });

  it('reuses property coordinates if they are fresh (expiresAt > now)', async () => {
    const now = Date.now();
    
    // Mock user profile, project, and property document lookup
    mockDocGet.mockImplementation((docId: string) => {
      if (docId === 'subscriber-uid') {
        return Promise.resolve({
          exists: true,
          data: () => ({
            accountType: 'subscriber',
            subscriptionPlan: 'Professional',
            subscriptionStatus: 'active',
          }),
        });
      }
      if (docId === 'project_1') {
        return Promise.resolve({
          exists: true,
          data: () => ({ id: 'project_1', propertyId: 'prop_1' }),
        });
      }
      if (docId === 'prop_1') {
        return Promise.resolve({
          exists: true,
          ref: { update: mockDocUpdate },
          data: () => ({
            id: 'prop_1',
            canonicalAddress: '123 Main St',
            city: 'Miami',
            state: 'FL',
            zip: '33131',
            coordinates: {
              lat: 25.7617,
              lng: -80.1918,
              expiresAt: now + 500000, // future
            },
          }),
        });
      }
      return Promise.resolve({ exists: false });
    });

    // Mock search collection with 1 listing
    mockCollectionGet.mockResolvedValue({
      docs: [
        {
          id: 'listing_1',
          data: () => ({
            id: 'listing_1',
            projectId: 'project_1',
            visibilityMode: 'PUBLIC_SOLICITED',
            propertyName: 'Brickell Flat',
            address: '123 Main St',
            city: 'Miami',
            state: 'FL',
            zipCode: '33131',
            status: 'published',
            ownerUid: 'owner_1',
          }),
        },
      ],
    });

    const searchResult = await searchDealsAuthenticated('123 Main St', 'subscriber-uid');

    // Assert that we received property results
    expect(searchResult.mode).toBe('results');
    const resultsArray = searchResult.results as unknown as SubscriberPropertyResult[];
    expect(Array.isArray(resultsArray)).toBe(true);
    expect(resultsArray).toHaveLength(1);
    expect(resultsArray[0].coordinates).toEqual({ lat: 25.7617, lng: -80.1918 });

    // Geocoder should NOT have been called
    expect(mockGeocodeAddress).not.toHaveBeenCalled();
    expect(mockDocUpdate).not.toHaveBeenCalled();
  });

  it('refreshes coordinates via geocodeAddress and updates Firestore if they are expired', async () => {
    const now = Date.now();

    // Mock search collection with 1 listing
    mockCollectionGet.mockResolvedValue({
      docs: [
        {
          id: 'listing_1',
          data: () => ({
            id: 'listing_1',
            projectId: 'project_1',
            visibilityMode: 'PUBLIC_SOLICITED',
            propertyName: 'Brickell Flat',
            address: '123 Main St',
            city: 'Miami',
            state: 'FL',
            zipCode: '33131',
            status: 'published',
            ownerUid: 'owner_1',
          }),
        },
      ],
    });

    // Mock project & expired property doc lookup
    mockDocGet.mockImplementation((docId: string) => {
      if (docId === 'project_1') {
        return Promise.resolve({
          exists: true,
          data: () => ({ id: 'project_1', propertyId: 'prop_1' }),
        });
      }
      if (docId === 'subscriber-uid') {
        return Promise.resolve({
          exists: true,
          data: () => ({
            accountType: 'subscriber',
            subscriptionPlan: 'Professional',
            subscriptionStatus: 'active',
          }),
        });
      }
      if (docId === 'prop_1') {
        return Promise.resolve({
          exists: true,
          ref: { update: mockDocUpdate },
          data: () => ({
            id: 'prop_1',
            canonicalAddress: '123 Main St',
            city: 'Miami',
            state: 'FL',
            zip: '33131',
            coordinates: {
              lat: 25.7617,
              lng: -80.1918,
              expiresAt: now - 500000, // expired
            },
          }),
        });
      }
      return Promise.resolve({ exists: false });
    });

    // Mock geocoder returning new fresh coordinates
    mockGeocodeAddress.mockResolvedValue({ lat: 25.7620, lng: -80.1920 });
    mockDocUpdate.mockResolvedValue(undefined);

    const searchResult = await searchDealsAuthenticated('123 Main St', 'subscriber-uid');

    // Assert that we received property results
    expect(searchResult.mode).toBe('results');
    const resultsArray = searchResult.results as unknown as SubscriberPropertyResult[];
    expect(Array.isArray(resultsArray)).toBe(true);
    expect(resultsArray).toHaveLength(1);
    expect(resultsArray[0].coordinates).toEqual({ lat: 25.7620, lng: -80.1920 });

    // Geocode helper should have been called and Firestore updated
    expect(mockGeocodeAddress).toHaveBeenCalledTimes(1);
    expect(mockDocUpdate).toHaveBeenCalledTimes(1);
    expect(mockDocUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        coordinates: expect.objectContaining({
          lat: 25.7620,
          lng: -80.1920,
        }),
      })
    );
  });
});
