/**
 * Entity authority matrix (migration plan §C).
 * All dual-write behavior MUST reference this table — no ad-hoc cross-store writes.
 */
export type SyncMode = 'dual' | 'firestore' | 'neon' | 'postgres';

export type EntityAuthority = {
  entity: string;
  primary: 'firestore' | 'neon';
  secondary?: 'firestore' | 'neon';
  dualWrite: boolean;
  consistency: 'strong' | 'eventual';
  /** What to do when primary succeeds and secondary fails */
  secondaryFailure: 'retry_queue' | 'log_only' | 'block' | 'none';
};

export const ENTITY_AUTHORITY_MATRIX: readonly EntityAuthority[] = [
  {
    entity: 'User',
    primary: 'firestore',
    secondary: 'neon',
    dualWrite: true,
    consistency: 'eventual',
    secondaryFailure: 'retry_queue',
  },
  {
    entity: 'Organization',
    primary: 'firestore',
    dualWrite: true,
    consistency: 'eventual',
    secondaryFailure: 'retry_queue',
  },
  {
    entity: 'Project',
    primary: 'firestore',
    secondary: 'neon',
    dualWrite: true,
    consistency: 'eventual',
    secondaryFailure: 'retry_queue',
  },
  {
    entity: 'ReilProject',
    primary: 'neon',
    secondary: 'firestore',
    dualWrite: false,
    consistency: 'strong',
    secondaryFailure: 'log_only',
  },
  {
    entity: 'FinancialTransaction',
    primary: 'neon',
    dualWrite: false,
    consistency: 'strong',
    secondaryFailure: 'none',
  },
  {
    entity: 'Deal',
    primary: 'firestore',
    secondary: 'neon',
    dualWrite: true,
    consistency: 'eventual',
    secondaryFailure: 'retry_queue',
  },
  {
    entity: 'InboxItem',
    primary: 'firestore',
    dualWrite: true,
    consistency: 'eventual',
    secondaryFailure: 'retry_queue',
  },
  {
    entity: 'Message',
    primary: 'firestore',
    dualWrite: true,
    consistency: 'eventual',
    secondaryFailure: 'retry_queue',
  },
] as const;

export function resolveSyncMode(): SyncMode {
  const raw = process.env.SYNC_MODE?.trim().toLowerCase();
  if (raw === 'firestore' || raw === 'neon' || raw === 'postgres' || raw === 'dual') {
    return raw;
  }
  return 'firestore';
}

export function getEntityAuthority(entity: string): EntityAuthority | undefined {
  return ENTITY_AUTHORITY_MATRIX.find((row) => row.entity === entity);
}

export function isDualWriteEnabled(entity: string): boolean {
  const mode = resolveSyncMode();
  if (mode !== 'dual') return false;
  return getEntityAuthority(entity)?.dualWrite ?? false;
}
