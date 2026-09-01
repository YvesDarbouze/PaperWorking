import {
  getEntityAuthority,
  resolveSyncMode,
  type EntityAuthority,
  type SyncMode,
} from './entity-authority.js';

export type SyncWriteResult<TPrimary, TSecondary = void> = {
  primary: TPrimary;
  secondary?: TSecondary;
  secondaryError?: Error;
  queuedForRetry: boolean;
};

export type SyncOrchestratorOptions = {
  mode?: SyncMode;
  onSecondaryFailure?: (input: {
    entity: string;
    authority: EntityAuthority;
    error: Error;
  }) => void | Promise<void>;
};

/**
 * Centralized dual-write orchestrator.
 * Feature modules MUST NOT write to multiple stores directly.
 */
export class SyncOrchestrator {
  private readonly mode: SyncMode;
  private readonly onSecondaryFailure?: SyncOrchestratorOptions['onSecondaryFailure'];

  constructor(options: SyncOrchestratorOptions = {}) {
    this.mode = options.mode ?? resolveSyncMode();
    this.onSecondaryFailure = options.onSecondaryFailure;
  }

  getMode(): SyncMode {
    return this.mode;
  }

  shouldDualWrite(entity: string): boolean {
    if (this.mode !== 'dual') return false;
    const authority = getEntityAuthority(entity);
    return authority?.dualWrite ?? false;
  }

  async writePrimaryThenSecondary<TPrimary, TSecondary>(input: {
    entity: string;
    writePrimary: () => Promise<TPrimary>;
    writeSecondary?: () => Promise<TSecondary>;
  }): Promise<SyncWriteResult<TPrimary, TSecondary>> {
    const authority = getEntityAuthority(input.entity);
    if (!authority) {
      throw new Error(`No entity authority defined for ${input.entity}`);
    }

    const primary = await input.writePrimary();

    if (!input.writeSecondary || !this.shouldDualWrite(input.entity)) {
      return { primary, queuedForRetry: false };
    }

    try {
      const secondary = await input.writeSecondary();
      return { primary, secondary, queuedForRetry: false };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      await this.onSecondaryFailure?.({ entity: input.entity, authority, error: err });

      if (authority.secondaryFailure === 'block') {
        throw err;
      }

      return {
        primary,
        secondaryError: err,
        queuedForRetry: authority.secondaryFailure === 'retry_queue',
      };
    }
  }
}

export function createSyncOrchestrator(options?: SyncOrchestratorOptions): SyncOrchestrator {
  return new SyncOrchestrator(options);
}
