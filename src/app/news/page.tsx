import type { Metadata } from 'next';
import Link from 'next/link';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';

export const metadata: Metadata = {
  title: 'News & Updates — PaperWorking',
  description:
    'The latest product updates, integrations, and announcements from PaperWorking — the real estate investment operating system.',
  openGraph: {
    title: 'News & Updates — PaperWorking',
    description: 'Product updates, integrations, and announcements from PaperWorking.',
    url: 'https://paperworking.co/news',
  },
};

const UPDATES = [
  {
    date: 'June 2, 2026',
    category: 'Product',
    categoryColor: 'text-primary bg-primary/10',
    headline: 'REIL Lifecycle phase gates now enforced across all deal pipelines',
    body: 'Deals now move through Acquisition → Purchase → Hold → Exit in strict order. Each phase gate requires the previous phase to be marked complete before advancing. This keeps your pipeline audit-ready and prevents data gaps that cause problems at closing or tax time.',
    link: '/changelog',
  },
  {
    date: 'May 28, 2026',
    category: 'Growth',
    categoryColor: 'text-primary bg-primary/10',
    headline: 'Referral program live — bring investors, earn a free month',
    body: 'Every PaperWorking user now has a unique referral link in their profile. When a referred investor starts a paid plan, both accounts receive one month free, automatically applied at the next billing cycle. No codes, no forms.',
    link: '/changelog',
  },
  {
    date: 'May 20, 2026',
    category: 'Platform',
    categoryColor: 'text-secondary bg-secondary/10',
    headline: 'Public demo mode — full pipeline walkthrough, no account needed',
    body: 'Anyone can now visit /demo to explore a fully-loaded read-only workspace with sample properties, rehab budgets, ROI projections, and closing documents. Ideal for showing partners or lenders how you manage deals before inviting them to the platform.',
    link: '/demo',
  },
  {
    date: 'May 15, 2026',
    category: 'Finance',
    categoryColor: 'text-tertiary bg-tertiary/10',
    headline: 'Stripe webhook referral rewards — automatic coupon application on conversion',
    body: 'Referral rewards are now applied automatically at the payment webhook level. When a referred user converts from trial to paid, both the referee and referrer subscriptions receive the reward coupon with zero manual intervention.',
    link: '/changelog',
  },
  {
    date: 'May 8, 2026',
    category: 'Auth',
    categoryColor: 'text-on-surface-variant bg-surface-container-high',
    headline: 'Session cookie hardening — SameSite=Strict, HttpOnly across all auth flows',
    body: 'All auth session cookies now enforce SameSite=Strict and HttpOnly attributes site-wide. The middleware layer was consolidated into a single source of truth, eliminating inconsistent guard logic that previously existed across individual route files.',
    link: '/changelog',
  },
];

const CATEGORIES = ['All', 'Product', 'Platform', 'Finance', 'Growth', 'Auth'];

export default function NewsPage() {
  return (
    <>
      <LandingHeader />

      <main className="pt-28 md:pt-36 pb-24 min-h-screen bg-background text-on-surface dark">

        {/* ── Page Hero ── */}
        <section className="max-w-container-max mx-auto px-5 md:px-gutter-desktop mb-16">
          <p className="font-label-sm text-label-sm uppercase tracking-[0.2em] text-primary mb-4">
            What&apos;s New
          </p>
          <h1 className="font-headline-xl text-headline-xl text-on-surface mb-4 max-w-2xl">
            News &amp; Updates
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl">
            Product releases, platform improvements, and announcements from the PaperWorking team.
          </p>
        </section>

        {/* ── Category filter (static — no JS needed for MVP) ── */}
        <section className="max-w-container-max mx-auto px-5 md:px-gutter-desktop mb-12">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <span
                key={cat}
                className={`font-label-sm text-label-sm px-4 py-1.5 rounded-full border transition-colors cursor-default ${
                  cat === 'All'
                    ? 'border-primary text-primary bg-primary/10'
                    : 'border-white/10 text-on-surface-variant hover:border-white/20'
                }`}
              >
                {cat}
              </span>
            ))}
          </div>
        </section>

        {/* ── Updates feed ── */}
        <section className="max-w-container-max mx-auto px-5 md:px-gutter-desktop space-y-6">
          {UPDATES.map((item) => (
            <article
              key={item.headline}
              className="glass-panel rounded-xl p-8 flex flex-col md:flex-row gap-6 hover:border-white/20 transition-all"
            >
              {/* Left meta column */}
              <div className="md:w-48 shrink-0 flex md:flex-col gap-3 md:gap-2">
                <span className={`font-label-sm text-label-sm px-2.5 py-1 rounded-full w-fit ${item.categoryColor}`}>
                  {item.category}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant/60 md:mt-1">
                  {item.date}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1">
                <h2 className="font-headline-md text-headline-md text-on-surface mb-3">
                  {item.headline}
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed mb-4">
                  {item.body}
                </p>
                <Link
                  href={item.link}
                  className="inline-flex items-center gap-1.5 font-label-sm text-label-sm text-primary hover:underline decoration-primary/40"
                >
                  Read more
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
            </article>
          ))}
        </section>

        {/* ── Changelog CTA ── */}
        <section className="max-w-container-max mx-auto px-5 md:px-gutter-desktop mt-16">
          <div className="glass-panel-elevated rounded-2xl p-10 text-center border-t-2 border-t-primary/30">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-3">
              Want the full technical changelog?
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant mb-6">
              Every release, version bump, and breaking change — documented.
            </p>
            <Link
              href="/changelog"
              className="luminous-button inline-flex items-center gap-2 px-6 py-3 rounded-lg font-label-md text-label-md"
            >
              View Full Changelog
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </Link>
          </div>
        </section>

      </main>

      <LandingFooter />
    </>
  );
}
