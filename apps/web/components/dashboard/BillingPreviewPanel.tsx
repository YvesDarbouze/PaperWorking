'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BILLING_PREVIEW } from '@/lib/dashboard/shell-seed';

export default function BillingPreviewPanel() {
  const searchParams = useSearchParams();
  const paywall = searchParams.get('paywall');

  return (
    <div className="w-full space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#fdfffc]">Billing</h2>
        <p className="mt-1 text-sm text-white/45">
          {BILLING_PREVIEW.plan} plan · {BILLING_PREVIEW.status}
        </p>
      </div>

      {paywall === 'deals' ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-amber-300">
            Deals Marketplace locked
          </p>
          <p className="mt-2 text-sm text-white/75">
            Deals Marketplace requires an active subscription. Upgrade or complete checkout to unlock
            Discover & syndicate.
          </p>
        </div>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-[#121014]/90 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/45">
              Current plan
            </p>
            <h2 className="mt-1 text-3xl font-bold text-[#fdfffc]">{BILLING_PREVIEW.plan}</h2>
            <p className="mt-2 text-sm text-white/55">
              ${BILLING_PREVIEW.monthlyPrice}/mo · Trial ends {BILLING_PREVIEW.trialEnds}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg border border-white/12 px-3.5 py-2 text-[12px] font-semibold text-white/75"
            >
              Change plan
            </button>
            <button
              type="button"
              className="rounded-lg border border-rose-400/25 px-3.5 py-2 text-[12px] font-semibold text-rose-300"
            >
              Cancel
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-[#121014]/90 p-5">
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-white/45">
            Payment method
          </h3>
          <p className="text-sm text-white/75">{BILLING_PREVIEW.paymentMethod}</p>
          <button
            type="button"
            className="mt-4 rounded-lg border border-white/12 px-3 py-2 text-[12px] font-semibold text-white/70"
          >
            Update card
          </button>
        </article>
        <article className="rounded-2xl border border-white/10 bg-[#121014]/90 p-5">
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-white/45">
            Billing info
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-white/45">Email</dt>
              <dd className="text-white/85">{BILLING_PREVIEW.billingEmail}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-white/45">Status</dt>
              <dd className="capitalize text-emerald-300">{BILLING_PREVIEW.status}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#121014]/90">
        <div className="border-b border-white/8 px-5 py-3">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/45">Invoices</h3>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.03] text-[11px] uppercase tracking-wider text-white/40">
            <tr>
              <th className="px-5 py-2.5 font-medium">Invoice</th>
              <th className="px-5 py-2.5 font-medium">Date</th>
              <th className="px-5 py-2.5 font-medium">Amount</th>
              <th className="px-5 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {BILLING_PREVIEW.invoices.map((invoice) => (
              <tr key={invoice.id} className="border-t border-white/8">
                <td className="px-5 py-3 font-mono text-xs text-white/70">{invoice.id}</td>
                <td className="px-5 py-3 text-white/65">{invoice.date}</td>
                <td className="px-5 py-3 text-white/85">${invoice.amount}</td>
                <td className="px-5 py-3 text-white/65">{invoice.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#454955]/40 to-[#121014] p-5">
        <h3 className="text-lg font-semibold text-[#fdfffc]">Need more seats?</h3>
        <p className="mt-2 text-sm text-white/65">
          Investment Team unlocks additional collaborators, vendor marketplace access, and deal
          syndication tools.
        </p>
        <Link
          href="/pricing"
          className="mt-4 inline-flex rounded-lg bg-emerald-500 px-4 py-2 text-[12px] font-bold text-slate-950 no-underline"
        >
          View team plans
        </Link>
      </section>
    </div>
  );
}
