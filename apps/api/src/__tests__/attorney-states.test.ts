import { describe, expect, it, jest } from '@jest/globals';
import { handleAttorneyStatesGet } from '../routes/config/attorney-states/handler.js';
import { ATTORNEY_CLOSE_STATES_SEED } from '../lib/config/attorney-states.js';

describe('GET /api/config/attorney-states', () => {
  it('returns seed list when no reader is configured', async () => {
    const result = await handleAttorneyStatesGet();

    expect(result.status).toBe(200);
    const body = result.body as { states: string[]; seededAt: null };
    expect(body.states).toEqual([...ATTORNEY_CLOSE_STATES_SEED]);
    expect(body.seededAt).toBeNull();
  });

  it('returns Firestore document when reader provides data', async () => {
    const result = await handleAttorneyStatesGet({
      reader: {
        get: jest.fn().mockResolvedValue({
          states: ['NY', 'NJ'],
          seededAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-02-01T00:00:00.000Z',
        }),
      },
    });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      states: ['NY', 'NJ'],
      seededAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
    });
  });
});
