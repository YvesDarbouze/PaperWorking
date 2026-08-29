'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api/client';

interface LenderRate {
  id: string;
  name: string;
  interestRate: number;
  points: number;
  lenderFeesCents: number;
  asOf: string | null;
}

export default function AdminLenderConfigPanel() {
  const [rates, setRates] = useState<LenderRate[]>([]);
  const [checklists, setChecklists] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [ratesRes, checklistsRes] = await Promise.all([
          apiFetch('/api/admin/lender-rates', { credentials: 'include', cache: 'no-store' }),
          apiFetch('/api/admin/lender-checklists', { credentials: 'include', cache: 'no-store' }),
        ]);
        const ratesBody = (await ratesRes.json()) as { rates?: LenderRate[]; error?: string };
        const checklistsBody = (await checklistsRes.json()) as {
          checklists?: Record<string, string[]>;
          error?: string;
        };
        if (!ratesRes.ok) throw new Error(ratesBody.error ?? 'Rates request failed');
        if (!checklistsRes.ok) throw new Error(checklistsBody.error ?? 'Checklists request failed');
        if (!cancelled) {
          setRates(ratesBody.rates ?? []);
          setChecklists(checklistsBody.checklists ?? {});
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load lender config');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full py-4 text-sm text-black/55">
        Loading lender config…
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <div className="rounded-2xl border border-red-300 bg-red-50 p-6 text-sm text-red-800">{error}</div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-8">
      <section>
        <h2 className="text-2xl font-extralight tracking-tight sm:text-3xl">Lender configuration</h2>
        <p className="mt-2 text-sm text-black/60">
          Read paths from `handleAdminLenderRatesGet` and `handleAdminLenderChecklistsGet`.
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
        <div className="border-b border-black/8 px-5 py-4">
          <h3 className="text-lg font-semibold">Rate sheet</h3>
        </div>
        <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-black/[0.03] text-black/55">
            <tr>
              <th className="px-5 py-3 font-medium">Lender</th>
              <th className="px-5 py-3 font-medium">Rate</th>
              <th className="px-5 py-3 font-medium">Points</th>
              <th className="px-5 py-3 font-medium">Fees</th>
            </tr>
          </thead>
          <tbody>
            {rates.map((rate) => (
              <tr key={rate.id} className="border-t border-black/8">
                <td className="px-5 py-3 font-medium">{rate.name}</td>
                <td className="px-5 py-3">{rate.interestRate}%</td>
                <td className="px-5 py-3">{rate.points}</td>
                <td className="px-5 py-3">${(rate.lenderFeesCents / 100).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {Object.entries(checklists).map(([product, items]) => (
          <article key={product} className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold">{product}</h3>
            <ul className="mt-3 space-y-2 text-sm text-black/70">
              {items.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </div>
  );
}
