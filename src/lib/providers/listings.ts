// Listings Provider — abstraction layer for searching active sale and rental listings.
// Supports mock fallback and real RentCast API integration.

import type { ListingParams } from './rentcast/types';
import { RentCastClient } from './rentcast/client';

export interface Listing {
  id: string;
  formattedAddress: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  zipCode: string;
  county?: string;
  latitude?: number;
  longitude?: number;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  lotSize?: number;
  yearBuilt?: number;
  status: string;
  price: number;
  listedDate?: string;
  daysOnMarket?: number;
  listingType: 'SALE' | 'RENTAL';
}

export interface ListingsDataProvider {
  getSaleListings(params: ListingParams): Promise<Listing[]>;
  getRentalListings(params: ListingParams): Promise<Listing[]>;
}

// ─── Mock implementation ───────────────────────────────────────────────────────

export class MockListingsDataProvider implements ListingsDataProvider {
  async getSaleListings(params: ListingParams): Promise<Listing[]> {
    await new Promise(r => setTimeout(r, 500));
    const zip = params.zipCode || '10001';
    
    return Array.from({ length: 6 }, (_, i) => {
      const id = `mock-sale-${zip}-${i}`;
      const beds = params.bedrooms ? Number(params.bedrooms) : (2 + (i % 3));
      const baths = 1 + (i % 2) + 0.5 * (i % 3 === 0 ? 1 : 0);
      const sqft = 800 + i * 250;
      const price = 250000 + i * 85000;
      const dayOffset = i * 4;
      const listedDate = new Date(Date.now() - dayOffset * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      return {
        id,
        formattedAddress: `${100 + i * 15} Main St, Suite ${i + 1}, Cityville, ST ${zip}`,
        addressLine1: `${100 + i * 15} Main St`,
        addressLine2: `Suite ${i + 1}`,
        city: params.city || 'Cityville',
        state: params.state || 'ST',
        zipCode: zip,
        county: 'Mock County',
        latitude: 40.7128 + (i * 0.005),
        longitude: -74.0060 - (i * 0.005),
        propertyType: params.propertyType || 'Single Family',
        bedrooms: beds,
        bathrooms: baths,
        squareFootage: sqft,
        lotSize: 5000 + i * 1000,
        yearBuilt: 1980 + i * 5,
        status: 'Active',
        price,
        listedDate,
        daysOnMarket: dayOffset,
        listingType: 'SALE'
      };
    });
  }

  async getRentalListings(params: ListingParams): Promise<Listing[]> {
    await new Promise(r => setTimeout(r, 500));
    const zip = params.zipCode || '10001';

    return Array.from({ length: 6 }, (_, i) => {
      const id = `mock-rental-${zip}-${i}`;
      const beds = params.bedrooms ? Number(params.bedrooms) : (1 + (i % 3));
      const baths = 1 + (i % 2);
      const sqft = 600 + i * 200;
      const price = 1200 + i * 450;
      const dayOffset = i * 3;
      const listedDate = new Date(Date.now() - dayOffset * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      return {
        id,
        formattedAddress: `${200 + i * 12} Elm St, Apt ${i * 3 + 2}, Townsville, ST ${zip}`,
        addressLine1: `${200 + i * 12} Elm St`,
        addressLine2: `Apt ${i * 3 + 2}`,
        city: params.city || 'Townsville',
        state: params.state || 'ST',
        zipCode: zip,
        county: 'Mock County',
        latitude: 40.7128 + (i * 0.004),
        longitude: -74.0060 - (i * 0.004),
        propertyType: params.propertyType || 'Condo',
        bedrooms: beds,
        bathrooms: baths,
        squareFootage: sqft,
        lotSize: 2000,
        yearBuilt: 1990 + i * 4,
        status: 'Active',
        price,
        listedDate,
        daysOnMarket: dayOffset,
        listingType: 'RENTAL'
      };
    });
  }
}

// ─── Real RentCast implementation ──────────────────────────────────────────────

export class RentCastListingsDataProvider implements ListingsDataProvider {
  private client: RentCastClient;

  constructor(apiKey: string) {
    this.client = new RentCastClient(apiKey);
  }

  async getSaleListings(params: ListingParams): Promise<Listing[]> {
    const rawListings = await this.client.getSaleListings(params);
    return (rawListings || []).map(c => ({
      id: c.id,
      formattedAddress: c.formattedAddress || 'Unknown Address',
      addressLine1: c.addressLine1 || 'Unknown Street',
      addressLine2: c.addressLine2,
      city: c.city,
      state: c.state,
      zipCode: c.zipCode,
      county: c.county,
      latitude: c.latitude,
      longitude: c.longitude,
      propertyType: c.propertyType,
      bedrooms: c.bedrooms,
      bathrooms: c.bathrooms,
      squareFootage: c.squareFootage,
      lotSize: c.lotSize,
      yearBuilt: c.yearBuilt,
      status: c.status,
      price: c.price,
      listedDate: c.listedDate,
      daysOnMarket: c.daysOnMarket,
      listingType: 'SALE'
    }));
  }

  async getRentalListings(params: ListingParams): Promise<Listing[]> {
    const rawListings = await this.client.getRentalListings(params);
    return (rawListings || []).map(c => ({
      id: c.id,
      formattedAddress: c.formattedAddress || 'Unknown Address',
      addressLine1: c.addressLine1 || 'Unknown Street',
      addressLine2: c.addressLine2,
      city: c.city,
      state: c.state,
      zipCode: c.zipCode,
      county: c.county,
      latitude: c.latitude,
      longitude: c.longitude,
      propertyType: c.propertyType,
      bedrooms: c.bedrooms,
      bathrooms: c.bathrooms,
      squareFootage: c.squareFootage,
      lotSize: c.lotSize,
      yearBuilt: c.yearBuilt,
      status: c.status,
      price: c.price,
      listedDate: c.listedDate,
      daysOnMarket: c.daysOnMarket,
      listingType: 'RENTAL'
    }));
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function getListingsProvider(type?: string): ListingsDataProvider {
  const providerType = (type || process.env.PROPERTY_DATA_PROVIDER || 'mock').toLowerCase();

  switch (providerType) {
    case 'rentcast': {
      const key = process.env.RENTCAST_API_KEY;
      if (!key) {
        console.warn('⚠️ [LISTINGS PROVIDER] RENTCAST_API_KEY is missing. Falling back to MockListingsDataProvider.');
        return new MockListingsDataProvider();
      }
      return new RentCastListingsDataProvider(key);
    }
    case 'mock':
    default:
      return new MockListingsDataProvider();
  }
}

export const defaultListingsProvider: ListingsDataProvider = getListingsProvider();
