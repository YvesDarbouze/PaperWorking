'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  formatMonthlyEquiv,
  PRICING_PLANS,
  type PricingPlan,
} from '@/lib/marketing/pricing-data';

/** Ported from PaperWorking `components/landing/PricingSection.tsx`. */
export default function PricingSection() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<'annual' | 'monthly'>('annual');

  function handleSelect(plan: PricingPlan) {
    const params = new URLSearchParams({
      mode: 'signup',
      accountType: plan.id === 'vendor' ? 'vendor' : 'investor',
      redirectTo: '/pricing',
      plan: plan.stripeKey,
      interval: billingCycle,
    });
    router.push(`/login?${params.toString()}`);
  }

  function handleKeyDown(e: React.KeyboardEvent, cycle: 'annual' | 'monthly') {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      setBillingCycle(cycle === 'annual' ? 'monthly' : 'annual');
    }
  }

  return (
    <section id="pricing" className="relative scroll-mt-20 overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden">
        <div className="absolute -top-32 left-1/4 h-[500px] w-[500px] rounded-full bg-[color:var(--color-primary)]/[0.04] blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-sky-400/[0.04] blur-[140px]" />
      </div>

      <div className="relative z-10">
        <div className="mx-auto max-w-[1100px] px-6 pb-6 pt-8 text-center md:pb-8 md:pt-12 lg:px-8">
          <p className="mb-2.5 font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium uppercase tracking-[0.12em] text-[color:var(--color-primary)]">
            Real Estate Bloomberg Terminal
          </p>

          <h1 className="landing-display mx-auto mb-3 max-w-[1000px] font-semibold leading-[1.15] tracking-[-0.02em] text-white">
            The average stock trade is $5000, the average Real Estate deal is $429,000. Why do stock
            investors have better fintech apps?
          </h1>

          <p className="mx-auto max-w-3xl text-sm leading-[1.6] text-white/65 sm:text-base">
            PaperWorking is the Bloomberg Terminal for serious Real Estate Investors. For people who
            understand the advantage sober data gives them.
          </p>
        </div>

        <div className="mb-8 flex justify-center px-6">
          <div
            role="radiogroup"
            aria-label="Billing cycle options"
            className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] p-1 backdrop-blur-sm"
          >
            <button
              type="button"
              role="radio"
              aria-checked={billingCycle === 'annual'}
              onClick={() => setBillingCycle('annual')}
              onKeyDown={(e) => handleKeyDown(e, 'annual')}
              className={`flex min-h-[44px] cursor-pointer items-center justify-center rounded-full px-6 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] ${
                billingCycle === 'annual'
                  ? 'bg-[color:var(--color-primary)] text-[#0d0a0b] shadow-md'
                  : 'text-white/55 hover:text-white'
              }`}
            >
              Annual
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={billingCycle === 'monthly'}
              onClick={() => setBillingCycle('monthly')}
              onKeyDown={(e) => handleKeyDown(e, 'monthly')}
              className={`flex min-h-[44px] cursor-pointer items-center justify-center rounded-full px-6 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] ${
                billingCycle === 'monthly'
                  ? 'bg-[color:var(--color-primary)] text-[#0d0a0b] shadow-md'
                  : 'text-white/55 hover:text-white'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-[1200px] px-6 pb-10 lg:px-8">
          <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-3">
            {PRICING_PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`glass-card relative flex h-full flex-col rounded-[24px] border p-7 transition-all duration-300 ${
                  plan.highlighted
                    ? 'border-[color:var(--color-primary)]/40 bg-white/[0.05] shadow-[0_0_50px_-12px_rgba(0,221,148,0.25)]'
                    : 'border-white/10 bg-white/[0.03]'
                }`}
              >
                <div className="border-b border-white/[0.08] pb-5">
                  <div className="mb-2 flex items-center justify-between">
                    <h3
                      className={`text-2xl font-semibold tracking-tight ${
                        plan.highlighted
                          ? 'text-[color:var(--color-primary)]'
                          : 'text-white'
                      }`}
                    >
                      {plan.name}
                    </h3>
                    {plan.badge ? (
                      <span className="rounded-full border border-[color:var(--color-primary)]/30 bg-[color:var(--color-primary)]/10 px-3 py-1 font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium uppercase tracking-widest text-[color:var(--color-primary)]">
                        {plan.badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm leading-[1.65] text-white/60">{plan.tagline}</p>
                </div>

                <div className="border-b border-white/[0.08] py-5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold tracking-tight text-white">
                      {billingCycle === 'annual'
                        ? formatMonthlyEquiv(plan.annualPrice)
                        : `$${plan.monthlyPrice}`}
                    </span>
                    <span className="text-base font-medium text-white/55">/mo</span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-white/45">
                    {billingCycle === 'annual'
                      ? `billed annually ($${plan.annualPrice}/year)`
                      : 'billed monthly'}
                  </p>
                </div>

                <div className="py-5">
                  <button
                    type="button"
                    onClick={() => handleSelect(plan)}
                    className={`w-full cursor-pointer rounded-full py-3.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] ${
                      plan.highlighted
                        ? 'bg-[color:var(--color-primary)] text-[#0d0a0b] shadow-[0_0_24px_-4px_rgba(0,221,148,0.45)]'
                        : 'border border-[color:var(--color-primary)]/40 text-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)]/10'
                    }`}
                  >
                    {plan.cta}
                  </button>
                  <p className="mt-2.5 text-center font-[family-name:var(--font-jetbrains-mono)] text-[10px] text-white/40">
                    {plan.microcopy}
                  </p>
                </div>

                <div className="flex-grow pt-2">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm text-white/60">
                        <span
                          className={`material-symbols-outlined mt-0.5 shrink-0 text-[16px] ${
                            plan.highlighted
                              ? 'text-[color:var(--color-primary)]'
                              : 'text-[color:var(--color-primary)]/70'
                          }`}
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          check_circle
                        </span>
                        <span className="leading-snug">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t border-white/5 pt-5 text-center">
            <p className="font-[family-name:var(--font-jetbrains-mono)] text-[13px] font-medium uppercase tracking-widest text-white/50">
              Integrates with the tools you already use: Plaid, MLS, DocuSign, Stripe, RentCast.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-4xl border-t border-white/5 px-6 py-12 md:py-14 lg:px-8">
          <div className="glass-card relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] p-8 text-center sm:p-12">
            <div className="relative z-10">
              <h2 className="mb-4 text-3xl font-semibold leading-tight text-white sm:text-4xl">
                Start with one deal.
              </h2>
              <p className="mx-auto mb-8 max-w-2xl text-base leading-[1.65] text-white/65 sm:text-lg">
                Run it through the trial with your real numbers: your budget, your deadlines, your
                documents. If PaperWorking doesn&apos;t earn its place, cancel from Settings and take
                every export with you.
              </p>

              <div className="mb-4 flex justify-center">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2.5 rounded-full bg-[color:var(--color-primary)] px-8 py-4 text-[15px] font-semibold tracking-wide text-[#0d0a0b] shadow-[0_0_24px_-4px_rgba(0,221,148,0.45)]"
                >
                  Start Free 14-Day Trial
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>
              </div>

              <p className="text-[12.5px] leading-relaxed text-white/45">
                14-day trial · No charge until day 15 · Export everything · Cancel anytime; annual
                plans include a 30-day refund window
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
