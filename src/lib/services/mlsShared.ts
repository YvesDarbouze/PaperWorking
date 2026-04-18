import { DealPhase } from './dealStateMachine';
import type { BridgeProperty } from '../types/bridge';
import { BridgeMediaParser } from '../utils/BridgeMediaParser';

/**
 * ── MLS Shared Logic ──
 * This file contains pure functions and types that are safe for both 
 * Client and Server components. It does NOT import any Node.js-specific 
 * modules or Redis.
 */

export interface NormalizedProperty {
  mls_id: string;
  address: string;
  beds: number;
  baths: number;
  sqft: number;
  lotSize: number;
  yearBuilt: number;
  price: number;
  status: DealPhase;
  description: string;
  photos: string[];
}

/**
 * Normalizes a raw MLS JSON object into our internal format.
 */
export function normalizeMLSData(rawData: BridgeProperty): NormalizedProperty {
  return {
    mls_id: rawData.ListingKey || rawData.ListingId || 'Unknown',
    address: rawData.UnparsedAddress || rawData.FullAddress || 'Unknown Address',
    beds: Number(rawData.BedroomsTotal || 0),
    baths: Number(rawData.BathroomsFull || 0) + (Number(rawData.BathroomsHalf || 0) * 0.5),
    sqft: Number(rawData.LivingArea || 0),
    lotSize: Number(rawData.LotSizeAcres || 0),
    yearBuilt: Number(rawData.YearBuilt || 0),
    price: Number(rawData.ListPrice || 0),
    status: mapStatusToPhase(rawData.StandardStatus || ''),
    description: rawData.PublicRemarks || '',
    photos: BridgeMediaParser.extractHighResUrls(rawData.Media || [])
  };
}

/**
 * Translates RESO StandardStatus to internal DealPhase
 */
export function mapStatusToPhase(status: string): DealPhase {
  switch (status) {
    case 'Active':
      return 'Listed';
    case 'Active Under Contract':
    case 'Pending':
      return 'Under Contract';
    case 'Closed':
      return 'Sold';
    case 'Coming Soon':
      return 'Sourcing';
    default:
      return 'Sourcing';
  }
}
