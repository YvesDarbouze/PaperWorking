import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Shield,
  Zap,
  CheckCircle,
  MapPin,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   PaperWorking — For Pros (Vendor Recruitment Landing Page)
   SEO-optimized public page for vendor acquisition
   ═══════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: 'For Professionals · PaperWorking',
  description:
    'PaperWorking connects real estate professionals with investors at the milestone that needs your trade. Milestone-matched leads, local by default, quotes in context.',
  openGraph: {
    title: 'For Professionals · PaperWorking',
    description:
      'Get connected to real estate investors near you at the moment they need your service, inside the workspace where their Projects live.',
    type: 'website',
  },
};

const VENDOR_TYPES = [
  'Inspector',
  'Title Company',
  'RE Attorney',
  'Insurance Agent',
  'Surveyor',
  'Contractor',
  'Appraiser',
  'Property Manager',
];

const VALUE_PROPS = [
  {
    icon: Zap,
    title: 'Milestone-Matched Leads',
    description:
      'Surface to investors when their Project timeline calls for your trade.',
  },
  {
    icon: MapPin,
    title: 'Local by Default',
    description:
      'Reach investors working Deals in your service area.',
  },
  {
    icon: Shield,
    title: 'Quotes in Context',
    description:
      'Receive and respond to quote requests inside the Project, with full bidirectional sync.',
  },
];

const TIERS = [
  {
    name: 'Vendor',
    price: 39,
    billing: '/mo',
    annualPrice: 390,
    coverage: 'Your service area',
    features: [
      'Profile in marketplace directory',
      'Lead inbox with accept/decline',
      'In-context lead delivery (phase-matched)',
      'Public SEO profile page',
      'Verified badge',
      'Analytics dashboard',
      'Priority support',
    ],
    cta: 'Join the Marketplace',
    highlighted: true,
  },
];

/* Testimonials removed — Honesty Rule: no fabricated quotes or lead counts. */

export default function ForProsPage() {
  return (
    <div
      className="min-h-screen bg-[#0d0a0b] text-white font-sans antialiased"
      style={{
        backgroundImage:
          'radial-gradient(rgba(69, 73, 85, 0.03) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-40 bg-[#0d0a0b]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-[#454955] font-bold text-xl tracking-tighter">
              PaperWorking
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-[#9E9DA0] hover:text-white transition-colors type-cta"
            >
              Log In
            </Link>
            <Link
              href="/register?type=vendor"
              className="px-5 py-2 rounded-lg bg-[#454955] text-[#0d0a0b] text-sm font-bold hover:bg-[#454955]/90 transition-all type-cta"
            >
              Sign Up Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#454955]/10 border border-[#454955]/20 text-[#454955] text-xs font-bold uppercase tracking-widest mb-8 type-eyebrow">
          <Zap className="w-3.5 h-3.5" />
          For Real Estate Professionals
        </div>
        <h1 className="font-bold tracking-tight leading-[1.1] mb-6 type-display">
          Investors Need You at
          <br />
          <span className="text-[#454955]">Exactly the Right Moment. Be There.</span>
        </h1>
        <p className="text-lg md:text-xl text-[#9E9DA0] max-w-2xl mx-auto mb-10 leading-relaxed type-body-lg">
          PaperWorking&rsquo;s project management tools know when an investor hits the
          milestone that needs your trade — inspection, rehab, staging, closing.
          Subscribe as a Vendor and get connected to real estate investors near
          you at the moment they need your service, inside the same workspace
          where their Projects live. The same way conversations happen on social
          platforms, PaperWorking lets you engage serious investors in your area
          — with context, not cold calls.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register?type=vendor"
            className="px-8 py-4 rounded-xl bg-[#454955] text-[#0d0a0b] text-base font-bold hover:bg-[#454955]/90 transition-all flex items-center gap-2 shadow-[0_0_30px_rgba(69, 73, 85,0.2)] type-cta"
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="#pricing"
            className="px-8 py-4 rounded-xl border border-white/10 text-[#C0BEC2] text-base font-bold hover:border-[#454955]/40 hover:text-white transition-all type-cta"
          >
            View Plans
          </Link>
        </div>
      </section>

      {/* ── Vendor Types Strip ── */}
      <section className="border-y border-white/5 bg-white/[0.01]">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <p className="text-xs text-[#6B6870] uppercase tracking-widest text-center mb-6 type-eyebrow">
            Built for every real estate professional
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {VENDOR_TYPES.map((type) => (
              <span
                key={type}
                className="px-4 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-[#C0BEC2] font-medium type-small"
              >
                {type}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Value Props ── */}
      <section className="max-w-6xl mx-auto px-6 py-12 md:py-16 lg:py-20">
        <div className="text-center mb-10">
          <h2 className="font-bold tracking-tight mb-4 type-h2">
            Why professionals choose PaperWorking
          </h2>
          <p className="text-[#9E9DA0] max-w-xl mx-auto type-body">
            Your profile is surfaced inside investor workspaces at the exact
            phase they need your services.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {VALUE_PROPS.map((prop) => (
            <div
              key={prop.title}
              className="glass-card rounded-xl border border-white/[0.06] p-8 hover:border-[#454955]/20 transition-all"
              style={{
                background:
                  'linear-gradient(145deg, rgba(255,255,255,0.02) 0%, rgba(69, 73, 85,0.02) 100%)',
              }}
            >
              <div className="w-12 h-12 rounded-lg bg-[#454955]/10 border border-[#454955]/20 flex items-center justify-center mb-6">
                <prop.icon className="w-6 h-6 text-[#454955]" />
              </div>
              <h3 className="text-xl font-bold mb-3">{prop.title}</h3>
              <p className="text-sm text-[#9E9DA0] leading-relaxed">
                {prop.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="border-y border-white/5 bg-white/[0.01]">
        <div className="max-w-6xl mx-auto px-6 py-12 md:py-16 lg:py-20">
          <h2 className="font-bold text-center mb-10 type-h2">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: '01',
                title: 'Create Your Profile',
                desc: 'Add your credentials, service areas, and specialties.',
              },
              {
                step: '02',
                title: 'Get Matched',
                desc: 'Investors see your profile when they need your service in your area.',
              },
              {
                step: '03',
                title: 'Accept Leads',
                desc: 'Review incoming leads and accept the ones that fit your capacity.',
              },
              {
                step: '04',
                title: 'Deliver & Grow',
                desc: 'Complete the work, build your rating, and grow your pipeline.',
              },
            ].map((item) => (
              <div key={item.step} className="text-center md:text-left">
                <div className="text-[#454955] text-3xl font-bold font-mono mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-[#9E9DA0]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof section removed — Honesty Rule: fabricated testimonials prohibited. */}

      {/* ── Pricing ── */}
      <section id="pricing" className="border-y border-white/5 bg-white/[0.01]">
        <div className="max-w-6xl mx-auto px-6 py-12 md:py-16 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="font-bold tracking-tight mb-4 type-h2">
              Simple, transparent pricing
            </h2>
            <p className="text-[#9E9DA0]">
              Choose coverage that matches your service area. Cancel anytime.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-xl border p-8 flex flex-col ${
                  tier.highlighted
                    ? 'border-[#454955]/40 bg-[#454955]/[0.03] shadow-[0_0_40px_rgba(69, 73, 85,0.08)] relative'
                    : 'border-white/[0.06] bg-white/[0.01]'
                }`}
              >
                <h3 className="text-lg font-bold uppercase tracking-wider mb-1">
                  {tier.name}
                </h3>
                <p className="text-xs text-[#9E9DA0] mb-6">{tier.coverage}</p>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl font-bold font-mono">
                    ${tier.price}
                  </span>
                  <span className="text-[#9E9DA0] text-sm">{tier.billing}</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-[#C0BEC2]"
                    >
                      <CheckCircle className="w-4 h-4 text-[#454955] flex-shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register?type=vendor"
                  className={`w-full py-3 rounded-lg text-center text-sm font-bold transition-all ${
                    tier.highlighted
                      ? 'bg-[#454955] text-[#0d0a0b] hover:bg-[#454955]/90 shadow-[0_0_20px_rgba(69, 73, 85,0.2)]'
                      : 'border border-white/10 text-white hover:border-[#454955]/40'
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">
          Ready to connect with serious investors?
        </h2>
        <p className="text-[#9E9DA0] max-w-xl mx-auto mb-10">
          Subscribe as a Vendor and get milestone-matched connections to
          real estate investors in your area.
        </p>
        <Link
          href="/register?type=vendor"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#454955] text-[#0d0a0b] text-base font-bold hover:bg-[#454955]/90 transition-all shadow-[0_0_30px_rgba(69, 73, 85,0.2)]"
        >
          Get Started Today <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#6B6870]">
            © {new Date().getFullYear()} PaperWorking. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-xs text-[#6B6870]">
            <Link href="/tos" className="hover:text-white transition-colors">
              Terms
            </Link>
            <Link
              href="/privacy"
              className="hover:text-white transition-colors"
            >
              Privacy
            </Link>
            <Link href="/login" className="hover:text-white transition-colors">
              Log In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
