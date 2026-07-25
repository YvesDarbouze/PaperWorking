/**
 * DM-2 Migration: Property ⟷ Deal Identity Model
 * 
 * Migrates existing projects to the new Property-based identity model.
 * For each project:
 *   1. Resolves or creates a Property record anchored on placeId
 *   2. Generates a dealSlug from the canonical address
 *   3. Links project to Property via propertyId
 *   4. Handles unresolvable addresses gracefully
 * 
 * This script is idempotent — re-running it will skip already-migrated projects.
 * 
 * Usage:
 *   npx tsx src/lib/migrations/migrate-properties.ts [--dry-run] [--batch-size=50]
 */

import { adminDb } from '@/lib/firebase/admin';
import { resolveOrCreateProperty } from '@/lib/services/propertyService';
import { canonicalizeAddress, generateDealSlug } from '@/lib/identity/propertyIdentity';
import type { AddressComponents } from '@/types/propertyTypes';

const PROJECTS_COLLECTION = 'projects';
const BATCH_SIZE = 50;

export interface MigrationResult {
  total: number;
  migrated: number;
  skipped: number;       // Already had propertyId
  unresolved: number;    // Address couldn't resolve to placeId
  slugCollisions: number;
  errors: Array<{ projectId: string; error: string }>;
}

/**
 * Parse address components from a raw project record.
 * Best-effort extraction from existing address, city, state, zip fields.
 */
function extractAddressComponents(project: {
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}): AddressComponents | null {
  const address = project.address?.trim();
  if (!address) return null;

  // Try to parse street number and route from the address line
  // Common formats: "123 Main St", "123 Main Street, Miami, FL 33101"
  const streetPart = address.split(',')[0]?.trim() || address;
  const streetMatch = streetPart.match(/^(\d+\S*)\s+(.+)$/);

  if (!streetMatch) {
    // Can't parse street number — return what we have
    return {
      streetNumber: '',
      route: streetPart,
      city: project.city || '',
      state: (project.state || '').toUpperCase().slice(0, 2),
      zip: project.zip || '',
    };
  }

  return {
    streetNumber: streetMatch[1],
    route: streetMatch[2],
    city: project.city || '',
    state: (project.state || '').toUpperCase().slice(0, 2),
    zip: project.zip || '',
  };
}

/**
 * Attempt to resolve a placeId for a project that doesn't have one.
 * Calls the Places Autocomplete + Details API server-side.
 */
async function resolveAddressToPlaceId(address: string): Promise<{
  placeId: string;
  lat: number;
  lng: number;
  formattedAddress: string;
} | null> {
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.warn('[Migration] GOOGLE_PLACES_API_KEY not set — cannot resolve addresses');
      return null;
    }

    // Use Places Autocomplete (New) to find the place
    const autocompleteRes = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify({
        input: address,
        includedPrimaryTypes: ['street_address', 'subpremise', 'premise'],
        includedRegionCodes: ['us'],
      }),
    });

    if (!autocompleteRes.ok) return null;

    const autocompleteData = await autocompleteRes.json();
    const firstSuggestion = autocompleteData.suggestions?.[0]?.placePrediction;
    if (!firstSuggestion?.placeId) return null;

    // Fetch Place Details
    const detailsRes = await fetch(
      `https://places.googleapis.com/v1/places/${firstSuggestion.placeId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'addressComponents,formattedAddress,location',
        },
      }
    );

    if (!detailsRes.ok) return null;

    const details = await detailsRes.json();
    return {
      placeId: firstSuggestion.placeId,
      lat: details.location?.latitude ?? 0,
      lng: details.location?.longitude ?? 0,
      formattedAddress: details.formattedAddress || address,
    };
  } catch (err) {
    console.error(`[Migration] Failed to resolve address "${address}":`, err);
    return null;
  }
}

/**
 * Run the DM-2 Property migration.
 */
export async function migrateProperties(options?: {
  dryRun?: boolean;
  batchSize?: number;
}): Promise<MigrationResult> {
  const dryRun = options?.dryRun ?? false;
  const batchSize = options?.batchSize ?? BATCH_SIZE;
  const result: MigrationResult = {
    total: 0,
    migrated: 0,
    skipped: 0,
    unresolved: 0,
    slugCollisions: 0,
    errors: [],
  };

  console.log(`[DM-2 Migration] Starting${dryRun ? ' (DRY RUN)' : ''}...`);

  // Collect all existing slugs for collision detection
  const existingSlugs: string[] = [];

  // Process projects in batches
  let lastDoc: FirebaseFirestore.DocumentSnapshot | null = null;
  let hasMore = true;

  while (hasMore) {
    let query = adminDb
      .collection(PROJECTS_COLLECTION)
      .orderBy('createdAt')
      .limit(batchSize);

    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();
    if (snapshot.empty) {
      hasMore = false;
      break;
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.docs.length < batchSize) {
      hasMore = false;
    }

    for (const doc of snapshot.docs) {
      result.total++;
      const project = doc.data();

      // Skip already-migrated projects
      if (project.propertyId) {
        result.skipped++;
        continue;
      }

      try {
        // Step 1: Resolve placeId
        let placeId = project.placeId;
        let lat = project.latitude ?? project.lat;
        let lng = project.longitude ?? project.lng;

        if (!placeId && project.address) {
          // Need to resolve via Google Places API
          const resolved = await resolveAddressToPlaceId(project.address);
          if (resolved) {
            placeId = resolved.placeId;
            lat = resolved.lat;
            lng = resolved.lng;
          }
        }

        if (!placeId) {
          // Cannot resolve — mark as unresolved
          if (!dryRun) {
            await doc.ref.update({
              migrationStatus: 'unresolved',
              migrationNote: 'Address could not be resolved to a Google place_id',
              updatedAt: new Date(),
            });
          }
          result.unresolved++;
          console.log(`  [UNRESOLVED] ${doc.id}: "${project.address}"`);
          continue;
        }

        // Step 2: Extract address components
        const components = extractAddressComponents(project);
        if (!components) {
          result.unresolved++;
          if (!dryRun) {
            await doc.ref.update({
              migrationStatus: 'unresolved',
              migrationNote: 'Address components could not be parsed',
              updatedAt: new Date(),
            });
          }
          continue;
        }

        // Step 3: Resolve or create Property
        const { property, created } = await resolveOrCreateProperty({
          placeId,
          addressComponents: components,
          coordinates: { lat: lat || 0, lng: lng || 0 },
        });

        // Step 4: Generate dealSlug
        const canonicalAddr = property.canonicalAddress;
        const slug = generateDealSlug(canonicalAddr, existingSlugs);
        if (existingSlugs.includes(slug.replace(/-\d+$/, ''))) {
          result.slugCollisions++;
        }
        existingSlugs.push(slug);

        // Step 5: Update project
        if (!dryRun) {
          await doc.ref.update({
            propertyId: property.id,
            placeId: property.placeId,
            dealSlug: slug,
            migrationStatus: 'completed',
            updatedAt: new Date(),
          });
        }

        result.migrated++;
        console.log(
          `  [${dryRun ? 'WOULD MIGRATE' : 'MIGRATED'}] ${doc.id}: ` +
          `"${project.address}" → Property ${property.id} (${created ? 'new' : 'existing'}) → slug "${slug}"`
        );
      } catch (err: any) {
        result.errors.push({ projectId: doc.id, error: err.message });
        console.error(`  [ERROR] ${doc.id}:`, err.message);
      }

      // Rate limiting — 100ms between API calls to stay within Google quotas
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`\n[DM-2 Migration] Complete:`);
  console.log(`  Total:        ${result.total}`);
  console.log(`  Migrated:     ${result.migrated}`);
  console.log(`  Skipped:      ${result.skipped}`);
  console.log(`  Unresolved:   ${result.unresolved}`);
  console.log(`  Collisions:   ${result.slugCollisions}`);
  console.log(`  Errors:       ${result.errors.length}`);

  return result;
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const batchSizeArg = args.find(a => a.startsWith('--batch-size='));
  const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1], 10) : BATCH_SIZE;

  migrateProperties({ dryRun, batchSize })
    .then(result => {
      if (result.errors.length > 0) {
        console.error('\nErrors encountered:');
        result.errors.forEach(e => console.error(`  ${e.projectId}: ${e.error}`));
        process.exit(1);
      }
      process.exit(0);
    })
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
