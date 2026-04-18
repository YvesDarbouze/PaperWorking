'use server';

import { fetchMLSData as fetchMLSDataInternal } from './mlsService';
import { NormalizedProperty } from './mlsShared';

/**
 * 🚀 fetchMLSData (Server Action)
 * 
 * Safely fetches MLS data from the server. By wrapping the mlsService call
 * in a server action, we prevent Node.js-specific modules (like Redis/dns) 
 * from being bundled into the client.
 */
export async function fetchMLSDataAction(listingId: string): Promise<NormalizedProperty> {
  try {
    return await fetchMLSDataInternal(listingId);
  } catch (error) {
    console.error('❌ [MLS ACTION ERROR]', error);
    throw error;
  }
}
