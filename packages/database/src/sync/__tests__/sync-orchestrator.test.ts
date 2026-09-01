import { describe, expect, it, jest } from '@jest/globals';
import { createSyncOrchestrator } from '../sync-orchestrator.js';

describe('SyncOrchestrator', () => {
  it('writes primary only when dual-write disabled', async () => {
    const orchestrator = createSyncOrchestrator({ mode: 'postgres' });
    const writeSecondary = jest.fn();

    const result = await orchestrator.writePrimaryThenSecondary({
      entity: 'User',
      writePrimary: async () => ({ id: 'u1' }),
      writeSecondary,
    });

    expect(result.primary).toEqual({ id: 'u1' });
    expect(writeSecondary).not.toHaveBeenCalled();
    expect(result.queuedForRetry).toBe(false);
  });

  it('queues retry when secondary fails with retry_queue policy', async () => {
    const onSecondaryFailure = jest.fn();
    const orchestrator = createSyncOrchestrator({
      mode: 'dual',
      onSecondaryFailure,
    });

    const result = await orchestrator.writePrimaryThenSecondary({
      entity: 'User',
      writePrimary: async () => ({ id: 'u1' }),
      writeSecondary: async () => {
        throw new Error('neon unavailable');
      },
    });

    expect(result.primary).toEqual({ id: 'u1' });
    expect(result.secondaryError?.message).toBe('neon unavailable');
    expect(result.queuedForRetry).toBe(true);
    expect(onSecondaryFailure).toHaveBeenCalled();
  });
});
