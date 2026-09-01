export type DatabaseReadMode = 'postgres' | 'firestore';

/**
 * Primary read path selector for migration testing.
 * Production default remains `postgres`.
 */
export function getDatabaseReadMode(): DatabaseReadMode {
  const mode = process.env.DATABASE_READ_MODE?.trim().toLowerCase();
  if (mode === 'firestore') return 'firestore';
  return 'postgres';
}

export function isFirestoreReadMode(): boolean {
  return getDatabaseReadMode() === 'firestore';
}

/** Optional shadow reads for migration validation. Default OFF. */
export function isFirestoreShadowReadsEnabled(): boolean {
  return process.env.FIRESTORE_SHADOW_READS === 'true';
}
