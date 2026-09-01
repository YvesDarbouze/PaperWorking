export {
  ENTITY_AUTHORITY_MATRIX,
  getEntityAuthority,
  isDualWriteEnabled,
  resolveSyncMode,
  type EntityAuthority,
  type SyncMode,
} from './entity-authority.js';
export {
  SyncOrchestrator,
  createSyncOrchestrator,
  type SyncWriteResult,
  type SyncOrchestratorOptions,
} from './sync-orchestrator.js';

export const SYNC_PACKAGE_STATUS = 'phase-1-scaffold' as const;
