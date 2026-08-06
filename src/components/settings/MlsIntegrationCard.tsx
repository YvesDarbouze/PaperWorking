'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAuth } from 'firebase/auth';

/**
 * MlsIntegrationCard — MLS Data Feed connection.
 *
 * Migrated here from the "Connected Services" panel on Settings → General
 * (removed August 2026: Firebase and Stripe were internal infrastructure with
 * no user action, and Google Drive already had an entry on this page). MLS was
 * the one service with a functional, user-facing connect action and no home on
 * this tab, so it moved rather than being deleted.
 *
 * Backed by `POST /api/integrations/mls/connect`, which is auth-guarded, tests
 * the provider before writing, and persists to
 * `users/{uid}/integrations/mls`.
 */
export function MlsIntegrationCard() {
  const [connected, setConnected] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const loadStatus = useCallback(async () => {
    const currentUser = getAuth().currentUser;
    if (!currentUser) { setLoading(false); return; }
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch('/api/integrations/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json() as { mls?: { connected: boolean; provider: string | null } };
      setConnected(!!data.mls?.connected);
      setProvider(data.mls?.provider ?? null);
    } catch (err) {
      // Non-fatal: the card falls back to "not connected".
      console.warn('[settings/integrations] MLS status load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadStatus(); }, [loadStatus]);

  const handleConnect = async () => {
    const currentUser = getAuth().currentUser;
    if (!currentUser) { toast.error('Not signed in.'); return; }

    setConnecting(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch('/api/integrations/mls/connect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? body.error ?? `Server error ${res.status}`);
      }
      await loadStatus();
      toast.success('MLS data feed connected.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'MLS connection failed.');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <section
      className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm space-y-5"
      data-testid="mls-integration-card"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-slate-600" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900">MLS Data Feed</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time property listings and market comps.
              {connected && provider ? ` Provider: ${provider}.` : ''}
            </p>
          </div>
        </div>

        {loading ? (
          <RefreshCw className="w-4 h-4 animate-spin text-slate-300 shrink-0" />
        ) : connected ? (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider shrink-0"
            data-testid="mls-connected-badge"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Connected
          </span>
        ) : (
          <button
            onClick={handleConnect}
            disabled={connecting}
            data-testid="mls-connect-btn"
            className="h-9 px-4 rounded-lg bg-slate-900 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-60 border-0 shrink-0"
          >
            {connecting
              ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Connecting…</>
              : 'Connect'}
          </button>
        )}
      </div>
    </section>
  );
}

export default MlsIntegrationCard;
