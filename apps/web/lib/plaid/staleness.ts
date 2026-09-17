export const PLAID_STALENESS_THRESHOLD_MS = 48 * 60 * 60 * 1000;

export type PlaidSyncState =
  | 'healthy'
  | 'stale_reconnect_required'
  | 'login_repair_required'
  | 'disconnected';

export interface PlaidConnectionStaleness {
  isStale: boolean;
  syncedAt: string | null;
  state: PlaidSyncState;
  displayText: string;
}

export function computePlaidStaleness(
  syncedAt: Date | string | null | undefined,
  status?: string,
): PlaidConnectionStaleness {
  if (status === 'login_repair_required') {
    return {
      isStale: true,
      syncedAt: syncedAt ? new Date(syncedAt).toISOString() : null,
      state: 'login_repair_required',
      displayText: 'Reconnect required: Bank credentials have changed or expired',
    };
  }

  if (status === 'disconnected') {
    return {
      isStale: true,
      syncedAt: syncedAt ? new Date(syncedAt).toISOString() : null,
      state: 'disconnected',
      displayText: 'Disconnected',
    };
  }

  if (!syncedAt) {
    return {
      isStale: true,
      syncedAt: null,
      state: 'stale_reconnect_required',
      displayText: 'Reconnect your bank: Never synced',
    };
  }

  const syncTime = new Date(syncedAt).getTime();
  const ageMs = Date.now() - syncTime;
  const isStale = ageMs > PLAID_STALENESS_THRESHOLD_MS;

  if (isStale) {
    const hours = Math.floor(ageMs / (1000 * 60 * 60));
    return {
      isStale: true,
      syncedAt: new Date(syncedAt).toISOString(),
      state: 'stale_reconnect_required',
      displayText: `Reconnect your bank: Data is ${hours}h out of date (>48h)`,
    };
  }

  return {
    isStale: false,
    syncedAt: new Date(syncedAt).toISOString(),
    state: 'healthy',
    displayText: 'Synced',
  };
}
