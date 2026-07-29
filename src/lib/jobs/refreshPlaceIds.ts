import { adminDb } from '@/lib/firebase/admin';
import type { PlaceIdRefreshResult, Property } from '@/types/propertyTypes';
import { PLACE_ID_REFRESH_INTERVAL_MS, COORDINATE_TTL_MS } from '@/types/propertyTypes';
import { telemetry } from '@/lib/telemetry';

/**
 * Refreshes placeId and coordinates for properties older than 12 months.
 * Processes in batches to respect Google API rate limits.
 * Billed to 'id-refresh' SKU.
 */
export async function refreshStaleProperties(options?: {
  batchSize?: number;  // Default 50
  dryRun?: boolean;    // If true, report but don't update
}): Promise<PlaceIdRefreshResult> {
  const batchSize = options?.batchSize || 50;
  const dryRun = options?.dryRun ?? false;
  
  const now = Date.now();
  const cutoff = now - PLACE_ID_REFRESH_INTERVAL_MS;

  const snapshot = await adminDb
    .collection('properties')
    .where('placeIdVerifiedAt', '<', cutoff)
    .limit(batchSize)
    .get();

  const result: PlaceIdRefreshResult = {
    processed: 0,
    refreshed: 0,
    deprecated: 0,
    failed: 0,
    errors: []
  };

  if (snapshot.empty) {
    return result;
  }

  const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

  if (!PLACES_API_KEY) {
    throw new Error('Google API key not configured');
  }

  for (const doc of snapshot.docs) {
    const property = doc.data() as Property;
    result.processed++;

    try {
      const url = `https://places.googleapis.com/v1/places/${property.placeId}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': PLACES_API_KEY,
          'X-Goog-FieldMask': 'id,location'
        }
      });

      if (!response.ok) {
        throw new Error(`Places API returned ${response.status}`);
      }

      const data = await response.json();
      const newPlaceId = data.id;
      const lat = data.location?.latitude;
      const lng = data.location?.longitude;

      if (!newPlaceId || lat == null || lng == null) {
        throw new Error('Invalid response from Places API');
      }

      const isDeprecated = newPlaceId !== property.placeId;

      if (!dryRun) {
        const updateData: Partial<Property> = {
          placeIdVerifiedAt: now,
          updatedAt: new Date()
        };

        if (isDeprecated) {
          updateData.placeId = newPlaceId;
          
          // Update all referencing projects
          const projectsQuery = await adminDb
            .collection('projects')
            .where('propertyId', '==', property.id)
            .get();
            
          if (!projectsQuery.empty) {
            const batch = adminDb.batch();
            projectsQuery.docs.forEach(pDoc => {
              batch.update(pDoc.ref, { placeId: newPlaceId });
            });
            await batch.commit();
          }
        }

        updateData.coordinates = {
          lat,
          lng,
          cachedAt: now,
          expiresAt: now + COORDINATE_TTL_MS
        };

        await doc.ref.update(updateData);
      }

      if (isDeprecated) {
        result.deprecated++;
      } else {
        result.refreshed++;
      }

      telemetry.capture({
        distinctId: 'system-job',
        event: 'place_id_refreshed',
        properties: {
          sku: 'id-refresh',
          propertyId: property.id,
          deprecated: isDeprecated
        }
      });

    } catch (error: any) {
      result.failed++;
      result.errors.push({ propertyId: property.id, error: error.message });
    }
  }

  return result;
}
