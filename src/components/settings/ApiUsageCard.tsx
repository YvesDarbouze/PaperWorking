'use client';

import { useEffect, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

/**
 * ApiUsageCard — RentCast API call volume against the monthly safety cap.
 *
 * Moved here from Settings → Billing in the August 2026 UX hardening pass:
 * consumption of a third-party data provider is an integration concern, not a
 * subscription concern, and its presence on Billing implied the calls were a
 * billable line item on the user's plan. They are not.
 *
 * Styled to match the surrounding Integrations cards (light surface), not the
 * Billing page it came from.
 */
export function ApiUsageCard() {
  const { user } = useAuth();
  const [usage, setUsage]     = useState<{ count: number; limit: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    user.getIdToken()
      .then((idToken: string) =>
        fetch('/api/admin/rentcast-usage', {
          headers: { Authorization: `Bearer ${idToken}` },
        }),
      )
      .then((r: Response) => r.json())
      .then((data: { success?: boolean; count?: number; limit?: number }) => {
        if (cancelled) return;
        if (data?.success && typeof data.count === 'number' && typeof data.limit === 'number') {
          setUsage({ count: data.count, limit: data.limit });
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [user]);

  const pct = usage && usage.limit > 0
    ? Math.min((usage.count / usage.limit) * 100, 100)
    : 0;

  // Amber as the cap approaches; the bar is otherwise neutral. Green is
  // reserved for success confirmations, not for "usage exists".
  const barTone = usage && usage.count >= usage.limit * 0.8
    ? 'bg-amber-500'
    : 'bg-slate-400';

  return (
    <section className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">API Usage</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              RentCast property-data calls this month, against the safety cap that
              limits automated sourcing spend.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          Loading usage…
        </div>
      ) : usage ? (
        <div className="space-y-3">
          <p className="text-2xl font-bold text-slate-900 tabular-nums">
            {usage.count}
            <span className="text-sm text-slate-400 font-normal"> / {usage.limit} calls</span>
          </p>
          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barTone}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400">Usage data currently unavailable.</p>
      )}
    </section>
  );
}

export default ApiUsageCard;
