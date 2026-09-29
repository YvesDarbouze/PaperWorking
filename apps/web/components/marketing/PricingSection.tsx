'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  formatMonthlyEquiv,
  PRICING_PLANS,
  PRICING_FAQ,
  PRICING_COMPARISON_CATEGORIES,
  type PricingPlan,
} from '@/lib/marketing/pricing-data';
import {
  pricingHeader,
  pricingPositioningHeadline,
  pricingSubheadline,
  pricingBody,
} from '@/lib/marketing/copy';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Check,
  X,
  ArrowRight,
  CaretDown,
  ShieldCheck,
  Lock,
  Buildings,
} from '@/components/icons/PhosphorIcons';

/** Ported from PaperWorking `components/landing/PricingSection.tsx`. */
export default function PricingSection() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<'annual' | 'monthly'>('annual');
  const [showComparison, setShowComparison] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

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

  function toggleFaq(index: number) {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  }

  return (
    <section id="pricing" className="relative scroll-mt-20 overflow-hidden bg-background">
      <div className="relative z-10">
        {/* Header Block with Authoritative Copy */}
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 pb-6 pt-8 text-center md:pb-8 md:pt-12 md:px-8">
          <p className="mb-2.5 font-[family-name:var(--font-jetbrains-mono)] text-[11px] sm:text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            PLANS &amp; PRICING
          </p>

          <h1 className="landing-display mx-auto mb-3 max-w-[1000px] font-semibold leading-[1.15] tracking-[-0.02em] text-foreground uppercase break-words">
            {pricingHeader}
          </h1>

          <h2 className="mx-auto max-w-3xl text-2xl sm:text-3xl md:text-4xl font-semibold tracking-[-0.02em] text-foreground mb-5">
            {pricingPositioningHeadline}
          </h2>

          <div className="mx-auto max-w-3xl space-y-3.5 text-base leading-[1.65] text-muted-foreground sm:text-lg">
            <p>
              {pricingSubheadline}
            </p>
            <p>
              {pricingBody}
            </p>
          </div>
        </div>

        {/* Interactive Billing Cycle Toggle with Savings Badge */}
        <div className="mb-8 flex flex-col items-center justify-center gap-3 px-6">
          <div
            role="radiogroup"
            aria-label="Billing cycle options"
            className="inline-flex items-center rounded-none border border-border bg-muted/50 p-1"
          >
            <button
              type="button"
              role="radio"
              aria-checked={billingCycle === 'annual'}
              onClick={() => setBillingCycle('annual')}
              onKeyDown={(e) => handleKeyDown(e, 'annual')}
              className={`flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-none px-6 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                billingCycle === 'annual'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Annual</span>
              <span className="rounded-none border border-foreground/15 bg-muted px-1.5 py-0.5 text-[10px] font-mono font-medium text-foreground">
                Save ~17% · 2 Mo Free
              </span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={billingCycle === 'monthly'}
              onClick={() => setBillingCycle('monthly')}
              onKeyDown={(e) => handleKeyDown(e, 'monthly')}
              className={`flex min-h-[44px] cursor-pointer items-center justify-center rounded-none px-6 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                billingCycle === 'monthly'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            All plans include a full 14-day trial · No credit card charges until day 15 · Cancel anytime
          </p>
        </div>

        {/* Mobile Plan Quick Navigation Tabs */}
        <div className="mb-6 flex justify-center px-6 md:hidden">
          <div className="flex w-full max-w-sm rounded-none border border-border bg-muted/40 p-1">
            {PRICING_PLANS.map((plan) => (
              <a
                key={plan.id}
                href={`#plan-${plan.id}`}
                className="flex-1 rounded-none py-2 text-center text-xs font-semibold text-muted-foreground hover:text-foreground transition touch-press min-h-[44px] flex items-center justify-center no-underline"
              >
                {plan.name}
              </a>
            ))}
          </div>
        </div>

        {/* 3 Tier Plan Cards */}
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 pb-10 md:px-8">
          <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-3">
            {PRICING_PLANS.map((plan) => (
              <div
                key={plan.id}
                id={`plan-${plan.id}`}
                className={`relative flex h-full scroll-mt-24 flex-col rounded-none border bg-card p-6 md:p-7 shadow-sm ring-1 transition-colors ${
                  plan.highlighted
                    ? 'border-foreground/30 ring-foreground/20 shadow-md'
                    : 'border-border ring-foreground/10'
                }`}
              >
                <div className="border-b border-border pb-5">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-2xl font-semibold tracking-tight text-foreground">
                      {plan.name}
                    </h3>
                    {plan.badge ? (
                      <Badge variant="default" className="absolute -top-3 right-6 rounded-none text-[10px] tracking-wider uppercase font-mono">
                        {plan.badge}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-sm leading-[1.65] text-muted-foreground min-h-[48px]">{plan.tagline}</p>
                </div>

                <div className="border-b border-border py-5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-semibold tracking-tight text-foreground">
                      {billingCycle === 'annual'
                        ? formatMonthlyEquiv(plan.annualPrice)
                        : `$${plan.monthlyPrice}`}
                    </span>
                    <span className="text-base font-medium text-muted-foreground">/mo</span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">
                    {billingCycle === 'annual'
                      ? `billed annually ($${plan.annualPrice}/year)`
                      : 'billed monthly'}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {plan.id === 'vendor'
                      ? '14-day trial · No charge until day 15'
                      : '14-day trial · No charge until day 15 · Export your data anytime'}
                  </p>
                </div>

                <div className="py-5">
                  <Button
                    type="button"
                    onClick={() => handleSelect(plan)}
                    variant={plan.highlighted ? 'default' : 'outline'}
                    className="w-full min-h-[48px] text-sm font-semibold rounded-none cursor-pointer"
                  >
                    {plan.cta}
                  </Button>
                  <p className="mt-2.5 text-center text-xs text-muted-foreground font-mono">
                    {plan.microcopy}
                  </p>
                </div>

                <div className="flex-grow pt-2">
                  <p className="mb-3 text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">
                    Includes:
                  </p>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        <Check size={16} className="mt-0.5 shrink-0 text-foreground" weight="bold" />
                        <span className="leading-snug">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* Toggle Full Comparison Matrix */}
          <div className="mt-10 text-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowComparison(!showComparison)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-none px-6 text-xs font-semibold uppercase tracking-wider cursor-pointer"
            >
              <span>{showComparison ? 'Hide Detailed Feature Comparison' : 'Compare All Plan Features & Specs'}</span>
              <CaretDown className={`size-4 transition-transform duration-200 ${showComparison ? 'rotate-180' : ''}`} />
            </Button>
          </div>

          {/* Detailed Feature Comparison Table */}
          {showComparison && (
            <div className="mt-8 border border-border bg-card p-4 sm:p-6 rounded-none shadow-sm ring-1 ring-foreground/10 overflow-x-auto">
              <div className="mb-6">
                <h3 className="text-xl font-bold tracking-tight text-foreground">Detailed Plan Comparison</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Side-by-side feature matrix across Investor, Investment Team, and Vendor tiers.
                </p>
              </div>

              <div className="min-w-[640px]">
                <div className="grid grid-cols-4 border-b border-border pb-3 text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                  <div className="col-span-1">Feature / Capability</div>
                  <div className="text-center">Investor ($59/mo)</div>
                  <div className="text-center font-bold text-foreground">Investment Team ($99/mo)</div>
                  <div className="text-center">Vendor ($39/mo)</div>
                </div>

                {PRICING_COMPARISON_CATEGORIES.map((cat) => (
                  <div key={cat.title} className="mt-6">
                    <div className="bg-muted/40 px-3 py-2 text-xs font-semibold text-foreground uppercase tracking-wider font-mono border-y border-border">
                      {cat.title}
                    </div>
                    <div className="divide-y divide-border">
                      {cat.features.map((feat) => (
                        <div key={feat.name} className="grid grid-cols-4 py-3 px-3 text-sm items-center hover:bg-muted/10 transition-colors">
                          <div className="col-span-1 font-medium text-foreground text-xs sm:text-sm">
                            {feat.name}
                          </div>
                          <div className="text-center text-xs sm:text-sm text-muted-foreground flex justify-center">
                            {typeof feat.investor === 'boolean' ? (
                              feat.investor ? <Check size={18} className="text-foreground" weight="bold" /> : <X size={16} className="text-muted-foreground/40" />
                            ) : (
                              <span className="font-mono text-xs">{feat.investor}</span>
                            )}
                          </div>
                          <div className="text-center text-xs sm:text-sm font-semibold text-foreground flex justify-center">
                            {typeof feat.team === 'boolean' ? (
                              feat.team ? <Check size={18} className="text-foreground" weight="bold" /> : <X size={16} className="text-muted-foreground/40" />
                            ) : (
                              <span className="font-mono text-xs font-bold">{feat.team}</span>
                            )}
                          </div>
                          <div className="text-center text-xs sm:text-sm text-muted-foreground flex justify-center">
                            {typeof feat.vendor === 'boolean' ? (
                              feat.vendor ? <Check size={18} className="text-foreground" weight="bold" /> : <X size={16} className="text-muted-foreground/40" />
                            ) : (
                              <span className="font-mono text-xs">{feat.vendor}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ecosystem Integrations Bar */}
          <div className="mt-12 border-t border-border pt-6 text-center">
            <p className="text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">
              Direct API integrations: Plaid, MLS Live Feeds, DocuSign, Stripe, RentCast, Google Drive
            </p>
          </div>
        </div>

        {/* Reassurance Guarantee Block (3 Pillars) */}
        <div className="mx-auto max-w-[1200px] border-t border-border px-4 sm:px-6 py-12 md:py-16 md:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <p className="text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground mb-2">
              ZERO RISK OPERATIONAL TRIAL
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Start with one deal. Test every workflow.
            </h2>
            <p className="mt-3 text-base text-muted-foreground sm:text-lg">
              Run a live property through the 14-day trial with your real numbers, budget lines, and deadlines.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-10">
            <div className="border border-border bg-card p-6 rounded-none shadow-sm ring-1 ring-foreground/10 text-card-foreground">
              <div className="mb-4 flex size-10 items-center justify-center rounded-none border border-border bg-muted text-foreground">
                <ShieldCheck size={22} className="text-foreground" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">14-Day Full Access Trial</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Test live deal calculations, bank feeds, and document tracking with no charge until day 15. We notify you before your trial expires.
              </p>
            </div>

            <div className="border border-border bg-card p-6 rounded-none shadow-sm ring-1 ring-foreground/10 text-card-foreground">
              <div className="mb-4 flex size-10 items-center justify-center rounded-none border border-border bg-muted text-foreground">
                <Lock size={22} className="text-foreground" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">Zero Data Lock-In</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You own 100% of your records. Export your full project history, invoices, and Schedule E audit logs to CSV, Excel, or PDF with one click.
              </p>
            </div>

            <div className="border border-border bg-card p-6 rounded-none shadow-sm ring-1 ring-foreground/10 text-card-foreground">
              <div className="mb-4 flex size-10 items-center justify-center rounded-none border border-border bg-muted text-foreground">
                <Buildings size={22} className="text-foreground" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">30-Day Money-Back Guarantee</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Annual plans come with an unconditional 30-day refund window. If PaperWorking does not streamline your dealflow, request a prompt refund.
              </p>
            </div>
          </div>

          <div className="text-center">
            <Button asChild size="lg" className="min-h-[48px] px-8 text-sm font-semibold rounded-none cursor-pointer">
              <Link href="/signup">
                Start Free 14-Day Trial
                <ArrowRight className="size-4 ml-2" />
              </Link>
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              Instant activation · No setup fees · Cancel anytime in Settings
            </p>
          </div>
        </div>

        {/* Frequently Asked Questions (Accordion) */}
        <div className="mx-auto max-w-4xl border-t border-border px-4 sm:px-6 py-12 md:py-16 md:px-8">
          <div className="text-center mb-10">
            <p className="text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground mb-2">
              COMMON QUESTIONS
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="divide-y divide-border border-y border-border">
            {PRICING_FAQ.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={faq.question} className="py-4">
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="flex w-full items-center justify-between text-left text-base font-medium text-foreground hover:text-foreground/80 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer min-h-[44px]"
                    aria-expanded={isOpen}
                  >
                    <span className="pr-4">{faq.question}</span>
                    <CaretDown className={`size-4 shrink-0 transition-transform duration-200 text-muted-foreground ${isOpen ? 'rotate-180 text-foreground' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="pt-2 pb-3 text-sm leading-relaxed text-muted-foreground">
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
