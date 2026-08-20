import type { RouteResult } from '../../../http/response.js';
import { jsonResponse } from '../../../http/response.js';
import {
  ATTORNEY_CLOSE_STATES_SEED,
  ATTORNEY_STATES_DOC_PATH,
} from '../../../lib/config/attorney-states.js';

export interface AttorneyStatesDocument {
  states: string[];
  seededAt: string | null;
  updatedAt: string | null;
}

export interface AttorneyStatesReader {
  get(): Promise<AttorneyStatesDocument | null>;
}

export interface AttorneyStatesGetDeps {
  reader?: AttorneyStatesReader;
}

/**
 * GET /api/config/attorney-states — read-only migration variant.
 * Source auto-seeds Firestore on first read; migration returns seed constant without writing.
 */
export async function handleAttorneyStatesGet(
  deps: AttorneyStatesGetDeps = {},
): Promise<RouteResult> {
  try {
    if (deps.reader) {
      const doc = await deps.reader.get();
      if (doc) {
        return jsonResponse(200, doc);
      }
    }

    return jsonResponse(200, {
      states: [...ATTORNEY_CLOSE_STATES_SEED],
      seededAt: null,
      updatedAt: null,
      _meta: {
        source: 'seed_constant',
        firestorePath: ATTORNEY_STATES_DOC_PATH,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Attorney States Config]', message);
    return jsonResponse(500, { error: 'Failed to load attorney states' });
  }
}
