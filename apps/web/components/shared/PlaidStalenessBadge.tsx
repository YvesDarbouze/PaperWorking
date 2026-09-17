'use client';

import React from 'react';
import { computePlaidStaleness, type PlaidConnectionStaleness } from '@/lib/plaid/staleness';

export interface PlaidStalenessBadgeProps {
  syncedAt: string | Date | null | undefined;
  status?: string;
  onReconnect?: () => void;
  className?: string;
}

export function PlaidStalenessBadge({
  syncedAt,
  status,
  onReconnect,
  className = '',
}: PlaidStalenessBadgeProps) {
  const staleness: PlaidConnectionStaleness = computePlaidStaleness(syncedAt, status);

  const formatTimestamp = (iso: string | null) => {
    if (!iso) return 'Never';
    try {
      return new Date(iso).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  if (staleness.state === 'login_repair_required') {
    return (
      <div
        className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20 ${className}`}
        data-testid="plaid-login-repair-badge"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        <span>Reconnect required</span>
        {onReconnect && (
          <button
            type="button"
            onClick={onReconnect}
            className="ml-1 text-xs underline font-semibold hover:text-amber-400 focus:outline-none"
            data-testid="plaid-reconnect-button"
          >
            Fix login
          </button>
        )}
      </div>
    );
  }

  if (staleness.state === 'stale_reconnect_required') {
    return (
      <div
        className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20 ${className}`}
        data-testid="plaid-stale-badge"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        <span>Reconnect your bank (Stale &gt;48h)</span>
        <span className="text-[10px] text-red-400/80">
          Last: {formatTimestamp(staleness.syncedAt)}
        </span>
        {onReconnect && (
          <button
            type="button"
            onClick={onReconnect}
            className="ml-1 text-xs underline font-semibold hover:text-red-400 focus:outline-none"
            data-testid="plaid-reconnect-button"
          >
            Reconnect
          </button>
        )}
      </div>
    );
  }

  if (staleness.state === 'disconnected') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border ${className}`}
        data-testid="plaid-disconnected-badge"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
        <span>Disconnected</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 ${className}`}
      data-testid="plaid-healthy-badge"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      <span>Synced {formatTimestamp(staleness.syncedAt)}</span>
    </div>
  );
}
