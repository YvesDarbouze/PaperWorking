import { jsonResponse, type RouteResult } from '../../../http/response.js';
import { buildChangelogMetadata, type ChangelogEntry } from '../../../lib/changelog/metadata.js';

export type LoadChangelogEntriesFn = () => Promise<ChangelogEntry[]>;

export interface ChangelogMetadataGetDeps {
  loadEntries?: LoadChangelogEntriesFn;
}

/**
 * GET /api/changelog/metadata
 */
export async function handleChangelogMetadataGet(
  deps: ChangelogMetadataGetDeps = {},
): Promise<RouteResult> {
  try {
    const entries = deps.loadEntries ? await deps.loadEntries() : [];
    return jsonResponse(200, buildChangelogMetadata(entries));
  } catch (error: unknown) {
    console.error('[Changelog metadata] Error:', error);
    return jsonResponse(500, { error: 'Failed to fetch changelog metadata' });
  }
}
