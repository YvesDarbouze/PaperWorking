'use client';

import { useCallback, useEffect, useState } from 'react';
import { getAdminOpsFromBff } from '@/lib/admin/admin-api';

export function useAdminOpsSection<T>(section: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const body = await getAdminOpsFromBff<Record<string, unknown> & { data?: T; error?: string }>(
        section,
      );
      if (body.data !== undefined) {
        setData(body.data);
      } else {
        const { success: _s, section: _sec, ...rest } = body;
        setData(rest as T);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to load ${section}`);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload };
}

export function AdminPageShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2
            className="text-2xl font-extralight tracking-tight sm:text-3xl"
            style={{ color: 'var(--text-primary)' }}
          >
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-2 max-w-prose text-sm" style={{ color: 'var(--text-secondary)' }}>
              {subtitle}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function AdminStateBlock({
  loading,
  error,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
}) {
  if (loading) {
    return <p className="text-sm text-black/55">Loading…</p>;
  }
  if (error) {
    return (
      <div className="rounded-2xl border border-red-300 bg-red-50 p-5 text-sm text-red-800">
        <p>{error}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold"
          >
            Retry
          </button>
        ) : null}
      </div>
    );
  }
  return null;
}

export function StatusPill({ status }: { status: string }) {
  const tone =
    status === 'active' || status === 'healthy' || status === 'resolved' || status === 'open'
      ? 'bg-emerald-100 text-emerald-800'
      : status === 'past_due' || status === 'reauth' || status === 'warning' || status === 'pending'
        ? 'bg-amber-100 text-amber-900'
        : status === 'canceled' || status === 'critical' || status === 'high'
          ? 'bg-rose-100 text-rose-800'
          : 'bg-black/5 text-black/70';

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase ${tone}`}>
      {status}
    </span>
  );
}
