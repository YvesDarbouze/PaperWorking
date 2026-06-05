import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Info } from 'lucide-react';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';

/* ═══════════════════════════════════════════════════════
   /faq — Industry & Investing FAQ
   
   Obsidian glass theme. Unified LandingHeader navigation.
   ═══════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: 'House Flipping FAQ & Industry Insights | PaperWorking',
  description:
    'Real numbers, industry averages, and strategies for successful real estate investing. Learn what a realistic ROI is, how long a flip takes, and why flips fail.',
};

const FAQ_DATA = [
  {
    question: "What's a realistic ROI to expect on a house flip right now?",
    answer:
      "The current national average is 30.4% gross ROI on a typical flip, per ATTOM's Q2 2024 data. That's down from the 40%+ ROIs of the 2020 market but still strong relative to most other asset classes. Be cautious of guides that promise 50%+ — those numbers usually exclude holding costs, financing carry, and the long tail of \"small\" expenses that quietly erode margins. A more conservative 10–20% net is what most working flippers actually clear once everything is accounted for. PaperWorking's Exit Formula calculator pulls every cost from acquisition through close, so the ROI you see modeled is the ROI you actually realize.",
  },
  {
    question: "How long does a typical flip take from acquisition to sale?",
    answer:
      "166 days — roughly 5.5 months from purchase to closing — is the national average as of Q2 2024. That's two days longer than Q1 but a meaningful improvement on 2023's 178-day average. Every extra week on market eats into your margin through insurance, utilities, taxes, and debt service. PaperWorking's Holding Cost Clock tracks daily burn against your original projection in real time, so you know exactly what a delay is costing you before the deal is underwater.",
  },
  {
    question: "How much does the average flipper actually make per year?",
    answer:
      "The most credible industry estimate puts the average full-time flipper at around $117,000 in annual income, though the spread across operators is enormous. What you earn comes down to flip volume (one deal a year vs. five), local market dynamics, acquisition discipline, and how tightly you control rehab budgets. The flippers who clear the upper end of that range almost universally run their deals like a business — pipeline tracked, expenses categorized, exits modeled before they close on the buy.",
  },
  {
    question: "Is house flipping still profitable in 2024?",
    answer:
      "Yes, and the trend is improving. Q2 2024 gross profits hit roughly $73,500 per flip nationally — the strongest number in two years, after the 2022–2023 margin compression. Profits dipped to $65,000 in 2021, sat at $67,900 in 2022, and bottomed at $66,000 in 2023 before recovering. The market now favors operators who can move quickly and price accurately; sloppy underwriting and slow closings get punished harder than they did three years ago. Discipline beats speculation in this market.",
  },
  {
    question: "What percentage of flips actually lose money?",
    answer:
      "Around 12% of flips sell at break-even or a loss before all expenses are factored in, per the most-cited industry data. The real failure rate is likely higher once you include opportunity cost and unaccounted holding expenses. The most common culprits: underestimated rehab scope, missed contingency deadlines, and properties sitting too long on market. PaperWorking's Compliance Vault flags contingency dates before they expire, and the Rehab Budget Manager tracks variance against original scope in real time — the two failure modes most responsible for flips going underwater.",
  },
  {
    question: "Should I finance my flips or pay cash?",
    answer:
      "Nationally, 63% of flips are now paid in cash and 37% are financed — cash has trended up about three percentage points year-over-year. Cash closes faster, wins more competitive bids, and removes interest carry from your daily holding costs. Financing preserves capital for running multiple deals in parallel and accelerates scaling, but adds debt service to your monthly burn. The right answer depends on deal flow and your leverage tolerance. PaperWorking's Find & Fund Pipeline tracks capital commitments from your syndicate so you always know what's available to deploy across deals in progress.",
  },
  {
    question: "Which markets have the most flip activity right now?",
    answer:
      "The highest flip rates cluster in the Southeast and Rust Belt. Warner Robins, Georgia leads the country at 20.7% of all home sales, followed by Macon (15.4%), Atlanta (13.4%), Columbus, GA (13.2%), Memphis (12.8%), Birmingham (11.7%), Cleveland (11%), and Columbus, OH (10.7%). The lowest activity is on the West Coast and Hawaii — Portland (4.2%), San Jose (4.1%), Seattle (4%), Honolulu (3.5%), and Hilo (3.3%) all under 5%. High flip-rate markets typically mean more inventory but more competition; low-activity markets often translate to longer holding periods, which matters for your carrying costs.",
  },
  {
    question: "How big is the flipping market overall?",
    answer:
      "Between 241,000 and 407,000 single-family homes and condos have been flipped annually in the U.S. over the past five years. 2022 was the recent peak at 407,417 properties — the highest volume since 2005. 2023 cooled to 308,922. Q1 2024 came in at 67,817 properties and Q2 at 79,540, suggesting the market is finding its footing after the post-pandemic correction.",
  },
  {
    question: "What does it cost to flip a condo versus a single-family home?",
    answer:
      "Most published data blends single-family and condo flips, so condo-specific numbers require some triangulation. Combining ATTOM's average flip margin of 27.5% with the 2023 average condo sale price of $348,300 puts the typical all-in cost of a condo flip around $252,500, with roughly $95,800 in gross profit. Condos add wrinkles single-families don't: HOA dues during the hold period, restrictions on exterior work, and special-assessment exposure. Model these explicitly in your acquisition analysis rather than assuming a condo flip behaves like a house flip with a smaller footprint.",
  },
  {
    question: "What are the biggest reasons flips fail?",
    answer:
      "The recurring failure modes across the industry are consistent: capital that's too expensive (high-rate hard money eating the margin), rehab scope that expands past the original budget, properties that sit too long because they were priced wrong at listing, and missed contingency deadlines on the contract side that force a forced sale or earnest money loss. Each of these is preventable with disciplined tracking. The reason PaperWorking is built around four phases (acquisition, purchase, hold, exit) rather than as a generic project tool is that each phase has its own failure mode, and the answers live in different places — capital stack data, document deadlines, daily burn rate, and final reconciliation. Mixing them in spreadsheets is how flips quietly lose money.",
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface dark">
      <LandingHeader />

      <main className="max-w-4xl mx-auto px-6 md:px-margin-desktop pt-32 pb-24">
        {/* ── Header ── */}
        <section className="mb-20 text-center max-w-3xl mx-auto">
          <p className="font-label-sm text-label-sm text-primary uppercase tracking-widest mb-6">
            Industry Insights &amp; Data
          </p>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight leading-none mb-6">
            House Flipping FAQ
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
            Real numbers, industry averages, and strategies for successful real estate investing.
          </p>
          
          <div className="mt-8 flex items-center justify-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
            <Info className="w-4 h-4 text-primary" />
            <p>All data points reference ATTOM Data Solutions Q2 2024 reporting unless otherwise noted.</p>
          </div>
        </section>

        {/* ── FAQ Content ── */}
        <section className="space-y-8 mb-28">
          {FAQ_DATA.map((item, index) => (
            <div
              key={index}
              className="group rounded-2xl p-8 transition-all duration-300 hover:scale-[1.01]"
              style={{
                background: 'linear-gradient(135deg, rgba(34,43,50,0.4), rgba(22,19,24,0.8))',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderTop: '1px solid rgba(255,255,255,0.12)',
                borderLeft: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <h2 className="font-label-md text-label-md text-on-surface mb-4 group-hover:text-primary transition-colors">
                {item.question}
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                {item.answer}
              </p>
            </div>
          ))}
        </section>

        {/* ── CTA ── */}
        <section className="text-center">
          <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight mb-4">
            Ready to structure your deals like a business?
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-8 max-w-md mx-auto">
            PaperWorking gives you the deal-intelligence infrastructure to avoid common flipping failures.
          </p>
          <Link
            href="/#pricing"
            className="luminous-button inline-flex items-center gap-2 px-8 py-3 rounded-lg font-label-md text-label-md tracking-wide active:scale-95 transition-all duration-150"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
