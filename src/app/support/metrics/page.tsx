'use client';

import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, CheckCircle, TrendingUp, Shield, BarChart3, Settings } from 'lucide-react';

/* ── Category Definitions ──────────────────────────────── */
type MetricCategory = 'financial' | 'operational' | 'portfolio' | 'marketing' | 'risk';

interface MetricDefinition {
  id: string;
  name: string;
  formula: string;
  measures: string;
  whyTracks: string;
  category: MetricCategory;
}

const CATEGORIES: { id: MetricCategory; label: string; icon: any }[] = [
  { id: 'financial', label: 'Financial Performance', icon: TrendingUp },
  { id: 'operational', label: 'Operational Efficiency', icon: Settings },
  { id: 'portfolio', label: 'Asset & Portfolio', icon: BarChart3 },
  { id: 'marketing', label: 'Marketing & Sales', icon: CheckCircle },
  { id: 'risk', label: 'Risk & Compliance', icon: Shield },
];

const METRICS: MetricDefinition[] = [
  // ── Financial Performance Metrics ──
  {
    id: 'noi',
    name: 'Net Operating Income (NOI)',
    formula: 'Revenue − Operating Expenses',
    measures: 'A property’s foundational operational profitability, excluding financing costs and capital expenditures (CapEx).',
    whyTracks: 'PaperWorking automatically scans your incoming property management statements, utility bills, and tax assessments, categorizing true operating expenses to give you a pristine, real-time look at your pure operational engine.',
    category: 'financial',
  },
  {
    id: 'cap-rate',
    name: 'Capitalization Rate (Cap Rate)',
    formula: '(NOI ÷ Property Value) × 100',
    measures: 'The asset yield over a one-year horizon based on an all-cash purchase.',
    whyTracks: 'By combining your dynamic NOI with estimated or appraised asset values, PaperWorking instantly surfaces Cap Rates across your entire portfolio, making it simple to spot underperforming assets that are ripe for repositioning or disposal.',
    category: 'financial',
  },
  {
    id: 'coc',
    name: 'Cash-on-Cash Return',
    formula: '(Annual Cash Flow ÷ Total Cash Invested) × 100',
    measures: 'The actual cash yield earned strictly on your out-of-pocket equity, ignoring debt leverage.',
    whyTracks: 'PaperWorking cross-references your initial closing documents with ongoing net cash distributions so you always know your exact, out-of-pocket equity efficiency—allowing you to accurately compare real estate yields against dividend stocks or ETFs.',
    category: 'financial',
  },
  {
    id: 'irr',
    name: 'Internal Rate of Return (IRR)',
    formula: 'Calculates the discount rate at which NPV of all cash flows equals zero',
    measures: 'Total annualized profitability across the entire lifespan of an investment, adjusting for the time value of money.',
    whyTracks: 'Instead of forcing you to build complex Excel models, PaperWorking aggregates your historic inflows, capital improvements, and projected exit numbers to give you a continuous, sophisticated view of multi-year project viability.',
    category: 'financial',
  },
  {
    id: 'cash-flow',
    name: 'Cash Flow',
    formula: 'Total Income − Total Expenses',
    measures: 'The literal liquidity moving through your property, accounting for debt service and CapEx that NOI excludes.',
    whyTracks: 'PaperWorking connects directly to your financial accounts to track everyday liquidity, warning you of near-term cash crunches or signaling a safe surplus for your next acquisition down payment.',
    category: 'financial',
  },
  {
    id: 'grm',
    name: 'Gross Rent Multiplier (GRM)',
    formula: 'Property Price ÷ Gross Annual Rent',
    measures: 'A quick, top-of-funnel filter to see how many years of gross revenue it will take an asset to pay for itself.',
    whyTracks: 'When evaluating prospective acquisitions, you can upload a target rent roll into PaperWorking to instantly calculate a deal\'s GRM, helping you filter out overpriced listings in seconds.',
    category: 'financial',
  },
  {
    id: 'dscr',
    name: 'Debt Service Coverage Ratio (DSCR)',
    formula: 'NOI ÷ Total Debt Service',
    measures: 'A property\'s structural ability to cover its annual mortgage obligations with its own income.',
    whyTracks: 'Lenders heavily scrutinize DSCR during underwriting and refinancing. PaperWorking continually calculates this buffer so you can confidently prove to lenders that your properties comfortably clear required covenants (typically 1.20+).',
    category: 'financial',
  },
  {
    id: 'ltv',
    name: 'Loan-to-Value (LTV) Ratio',
    formula: '(Loan Amount ÷ Property Value) × 100',
    measures: 'The leverage profile of the asset, comparing remaining debt to current market value.',
    whyTracks: 'PaperWorking monitors your amortizing loan balances against asset valuations to map your true risk exposure and alert you when your equity has built up enough to trigger favorable refinancing terms.',
    category: 'financial',
  },
  {
    id: 'oer',
    name: 'Operating Expense Ratio (OER)',
    formula: '(Operating Expenses ÷ Gross Operating Income) × 100',
    measures: 'The exact slice of your revenue pie that is eaten by daily operational upkeep.',
    whyTracks: 'PaperWorking flags line-item expenses that trend higher than your historical baseline or market averages, pinpointing where vendor costs or utility spikes are silently eating away at your profit margins.',
    category: 'financial',
  },
  {
    id: 'equity-to-value',
    name: 'Equity-to-Value Ratio',
    formula: '(Equity ÷ Property Value) × 100',
    measures: 'The unencumbered percentage of direct asset ownership you hold (the inverse of LTV).',
    whyTracks: 'This serves as a vital anchor for your long-term balance sheet. PaperWorking tracks this ratio to show your portfolio’s true asset cushioning against unexpected market corrections.',
    category: 'financial',
  },
  {
    id: 'interest-coverage',
    name: 'Interest Coverage Ratio',
    formula: 'NOI ÷ Interest Payments',
    measures: 'An asset’s short-term cushion for meeting immediate interest obligations, bypassing principal paydown.',
    whyTracks: 'For assets with variable-rate debt, PaperWorking constantly monitors this ratio to serve as an early warning system before rising interest rates jeopardize operational stability.',
    category: 'financial',
  },
  {
    id: 'roi',
    name: 'Return on Investment (ROI)',
    formula: '(Net Return on Investment ÷ Cost of Investment) × 100',
    measures: 'Cumulative total profitability relative to total capital deployed.',
    whyTracks: 'PaperWorking acts as your universal benchmark scorecard, compiling all historical data to show whether a completed stabilization or value-add project ultimately hit its underwriting target.',
    category: 'financial',
  },
  {
    id: 'capex',
    name: 'Capital Expenditures (CapEx)',
    formula: 'PP&E (Current Year) − PP&E (Previous Year) + Depreciation',
    measures: 'Funds deployed toward long-term asset improvements (e.g., roof overhauls, new HVAC units) rather than routine repairs.',
    whyTracks: 'Proper tax treatment requires separating routine repairs from depreciable CapEx. PaperWorking logs receipt line-items and isolates CapEx, optimizing your depreciation schedules and preserving operational cash history.',
    category: 'financial',
  },
  {
    id: 'goi',
    name: 'Gross Operating Income (GOI)',
    formula: 'Potential Rental Income + Other Income − Vacancy & Losses',
    measures: 'Total actual revenue collected before operational costs are factored in, including storage fees, parking, and laundry.',
    whyTracks: 'PaperWorking parses tenant ledgers and auxiliary income streams to establish a property\'s true, real-world baseline earning power.',
    category: 'financial',
  },
  {
    id: 'aar',
    name: 'Annual Average Return (AAR)',
    formula: 'Total Net Return ÷ Number of Years',
    measures: 'The arithmetic mean of an asset’s return across its entire holding period.',
    whyTracks: 'PaperWorking uses this metric to normalize performance over varying holding periods, allowing you to instantly generate standardized, easy-to-digest progress reports for your stakeholders or limited partners.',
    category: 'financial',
  },
  {
    id: 'em',
    name: 'Equity Multiple (EM)',
    formula: '(Total Profit + Total Investment) ÷ Total Cash Invested',
    measures: 'The literal absolute multiple of cash a project returns over your original out-of-pocket investment.',
    whyTracks: 'A favorite for absolute wealth-building tracking; PaperWorking calculates your EM to give you a clear, time-independent metric showing exactly how many times over you’ve multiplied your core equity.',
    category: 'financial',
  },
  {
    id: 'revenue-growth',
    name: 'Revenue Growth',
    formula: '((Current Period Revenue − Previous Period Revenue) ÷ Previous Period Revenue) × 100',
    measures: 'The year-over-year percentage trajectory of your top-line revenue.',
    whyTracks: 'By charting revenue growth over time, PaperWorking proves out the real-world success of your automated rent escalation clauses and strategic property upgrades.',
    category: 'financial',
  },

  // ── Operational Efficiency Metrics ──
  {
    id: 'occupancy',
    name: 'Occupancy Rate',
    formula: '(Number of Occupied Units ÷ Total Number of Units) × 100',
    measures: 'The physical space utilization efficiency of your properties.',
    whyTracks: 'PaperWorking continuously references active lease agreements inside your account to compute your live portfolio occupancy, alerting you to leasing gaps before they hit your monthly cash flow.',
    category: 'operational',
  },
  {
    id: 'turnover',
    name: 'Tenant Turnover Rate',
    formula: '(Units Vacated & Re-leased ÷ Average Number of Units) × 100',
    measures: 'The speed at which occupiers vacate and are replaced within a 12-month period.',
    whyTracks: 'Tenant turn is an investor\'s costliest friction point. PaperWorking tracks turnover rates to illuminate hidden operational leaks, like unit turnover make-ready bills and unearned lease commissions.',
    category: 'operational',
  },
  {
    id: 'avg-rent',
    name: 'Average Rent Price per Property',
    formula: 'Total Rental Income ÷ Number of Properties',
    measures: 'The mean baseline rental yield generated per asset or across asset buckets.',
    whyTracks: 'PaperWorking compiles rental trends across your different holdings, enabling you to swiftly run portfolio-wide comparisons and adjust your macro pricing models.',
    category: 'operational',
  },
  {
    id: 'retention',
    name: 'Lease Renewal / Tenant Retention Rate',
    formula: '(Number of Tenants Who Renew ÷ Leases Up for Renewal) × 100',
    measures: 'The percentage of current occupiers choosing to stay when their leases expire.',
    whyTracks: 'PaperWorking monitors upcoming lease expirations, prompting proactive management steps to boost retention, lock down consistent income, and dodge vacancy expenses.',
    category: 'operational',
  },
  {
    id: 'maintenance-cost',
    name: 'Maintenance Cost per Unit',
    formula: 'Total Maintenance Expenses ÷ Number of Units',
    measures: 'The run-rate cost allocated toward ongoing structural and unit-level upkeep.',
    whyTracks: 'PaperWorking extracts contractor invoice totals to let you spot systemic structural degradation or underperforming maintenance teams before they trigger a tenant exodus.',
    category: 'operational',
  },
  {
    id: 'dom',
    name: 'Days on Market (DOM)',
    formula: 'Calendar Time Between Listing Launch and Signed Contract',
    measures: 'Market demand, pricing accuracy, and marketing velocity.',
    whyTracks: 'By correlating listing paperwork dates with final lease signatures, PaperWorking helps you evaluate your team\'s marketing traction and optimize rental pricing logic.',
    category: 'operational',
  },
  {
    id: 'construction-cost',
    name: 'Construction Cost per Square Foot',
    formula: 'Total Construction Costs ÷ Total Square Footage',
    measures: 'The normalized expenditure of development, expansion, or cosmetic rehab on a per-foot basis.',
    whyTracks: 'PaperWorking matches contractor draw records against total blueprint footprints, enabling ground-up developers and value-add flippers to maintain razor-sharp budget control.',
    category: 'operational',
  },

  // ── Asset & Portfolio Management Metrics ──
  {
    id: 'portfolio-growth',
    name: 'Real Estate Portfolio Value Growth',
    formula: '((New Portfolio Value − Original Portfolio Value) ÷ Original Portfolio Value) × 100',
    measures: 'Compounded wealth appreciation across your entire asset holdings over time.',
    whyTracks: 'PaperWorking pulls all your properties under a single digital roof, displaying aggregate wealth growth driven by market tailwinds, active property management, and successful value-add execution.',
    category: 'portfolio',
  },
  {
    id: 'payback',
    name: 'Payback Period',
    formula: 'Initial Investment ÷ Annual Net Income',
    measures: 'The exact timeline required to fully claw back your initial cash layout from net property distributions.',
    whyTracks: 'PaperWorking records ongoing net earnings curves to show you exactly how close you are to playing with "house money" on any given deal.',
    category: 'portfolio',
  },
  {
    id: 'sold-variance',
    name: 'YoY Variance of Average Sold Price',
    formula: '((Current Year Avg Price − Previous Year Avg Price) ÷ Previous Year Avg Price) × 100',
    measures: 'Local structural shifts in overall market transaction values.',
    whyTracks: 'Tracking these macro variations gives PaperWorking users an objective data layer to time localized asset dispositions during market peaks.',
    category: 'portfolio',
  },
  {
    id: 'absorption',
    name: 'Sold Homes per Available Inventory (Absorption Rate)',
    formula: '(Number of Homes Sold ÷ Total Available Inventory) × 100',
    measures: 'Real-time buying demand vs. supply tension in a targeted location.',
    whyTracks: 'Helps you recognize changing market trends, enabling you to pivot negotiation strategies when deploying new capital into shifting buyer or seller markets.',
    category: 'portfolio',
  },
  {
    id: 'demand-growth',
    name: 'Real Estate Demand Growth',
    formula: '((New Demand Figure − Original Demand Figure) ÷ Original Demand Figure) × 100',
    measures: 'Shifts in hyper-local real estate interest, tracking volume metrics like mortgage applications or pending listings.',
    whyTracks: 'Integrates market velocity indicators to signal expanding economic submarkets, pointing you toward prime areas for your next geographical expansion.',
    category: 'portfolio',
  },

  // ── Marketing & Sales Metrics ──
  {
    id: 'listing-to-meeting',
    name: 'Listing-to-Meeting Ratio',
    formula: '(Number of Client Meetings ÷ Number of Active Listings) × 100',
    measures: 'The raw conversion appeal of active property listings at driving physical property tours or buyer interest.',
    whyTracks: 'PaperWorking evaluates lead records against active deal logs to expose whether your marketing materials match current consumer pricing expectations.',
    category: 'marketing',
  },
  {
    id: 'avg-commission',
    name: 'Average Commission per Sale',
    formula: 'Total Commission Earned ÷ Number of Closed Sales',
    measures: 'The transactional financial velocity earned per individual close.',
    whyTracks: 'PaperWorking reads incoming settlement sheets (ALTA/HUD-1 statements) to instantly track agent revenue metrics and isolate your most lucrative product types and regional asset classes.',
    category: 'marketing',
  },

  // ── Risk & Compliance Metrics ──
  {
    id: 'risk-score',
    name: 'Risk Assessment Score',
    formula: '(Financial Risk + Market Risk + Operational Risk + Compliance Risk) ÷ 4',
    measures: 'A blended, holistic metric summarizing your overall structural and investment vulnerability.',
    whyTracks: 'PaperWorking combines your active cash flows, debt structures, and operational records to spit out a clear, automated risk metric—removing guesswork from your safety evaluations.',
    category: 'risk',
  },
  {
    id: 'compliance-rate',
    name: 'Compliance Rate',
    formula: '(Number of Compliant Items ÷ Total Regulatory Requirements) × 100',
    measures: 'The degree to which assets adhere to local habitability mandates, zoning rules, and disclosure standards.',
    whyTracks: 'PaperWorking acts as an automated digital compliance officer. By scanning your files for missing lead paint disclosures, lapsed insurance policies, or expired safety certs, PaperWorking highlights compliance gaps before they turn into costly municipal citations or legal liabilities.',
    category: 'risk',
  },
];

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.19, 1, 0.22, 1] } },
};

export default function MetricsPlaybookPage() {
  const [activeCategory, setActiveCategory] = useState<MetricCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMetrics = useMemo(() => {
    let items = METRICS;
    if (activeCategory !== 'all') {
      items = items.filter((m) => m.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.formula.toLowerCase().includes(q) ||
          m.measures.toLowerCase().includes(q) ||
          m.whyTracks.toLowerCase().includes(q)
      );
    }
    return items;
  }, [activeCategory, searchQuery]);

  return (
    <div className="pt-12 pb-24 max-w-[1000px] mx-auto">
      {/* ── Header / Breadcrumb ── */}
      <div className="mb-12">
        <Link
          href="/support"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]/60 hover:text-primary transition-colors mb-6 text-decoration-none"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Support
        </Link>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-on-background mb-4">
          The PaperWorking Playbook
        </h1>
        <p className="text-base sm:text-lg text-on-surface-variant/80 max-w-[700px] leading-relaxed">
          Real estate is document-heavy. PaperWorking transforms raw closing statements, property tax assessments, leases, and receipts into 33 real-time performance metrics automatically.
        </p>
      </div>

      {/* ── Toolbar: Search & Tabs ── */}
      <div className="space-y-6 mb-10">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
          <input
            type="text"
            placeholder="Search metrics, formulas, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />
        </div>

        {/* Categories Tab Swiper */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-white/5">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-primary/10 border border-primary/20 text-primary'
                : 'bg-transparent border border-transparent text-on-surface-variant/60 hover:text-on-surface'
            }`}
          >
            All Metrics ({METRICS.length})
          </button>
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const count = METRICS.filter((m) => m.category === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  activeCategory === cat.id
                    ? 'bg-primary/10 border border-primary/20 text-primary'
                    : 'bg-transparent border border-transparent text-on-surface-variant/60 hover:text-on-surface'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Metrics Grid ── */}
      <motion.div
        layout
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-6"
      >
        <AnimatePresence mode="popLayout">
          {filteredMetrics.map((m, idx) => (
            <motion.div
              layout
              key={m.id}
              variants={fadeUp}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-6 rounded-2xl border border-white/5 backdrop-blur-xl relative overflow-hidden transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, rgba(24, 33, 39, 0.7) 0%, rgba(11, 20, 26, 0.8) 100%)',
              }}
            >
              {/* Index Number */}
              <div className="absolute top-4 right-4 font-mono text-[11px] font-bold text-on-surface-variant/20 tracking-wider">
                #{String(idx + 1).padStart(2, '0')}
              </div>

              {/* Title & Category */}
              <div className="mb-4">
                <span className="inline-flex text-[9px] uppercase tracking-wider font-bold text-primary px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 mb-2">
                  {CATEGORIES.find((c) => c.id === m.category)?.label}
                </span>
                <h3 className="text-lg font-bold text-on-surface">{m.name}</h3>
              </div>

              {/* Grid with Details */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-4 pt-4 border-t border-white/5">
                <div className="md:col-span-4 space-y-1">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant/40">Formula</span>
                  <div className="font-mono text-xs text-primary bg-primary/5 border border-primary/10 rounded-lg p-2.5 overflow-x-auto">
                    {m.formula}
                  </div>
                </div>

                <div className="md:col-span-4 space-y-1">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant/40">What It Measures</span>
                  <p className="text-[13px] text-on-surface/85 leading-relaxed font-normal">
                    {m.measures}
                  </p>
                </div>

                <div className="md:col-span-4 space-y-1">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant/40">How PaperWorking Tracks It</span>
                  <p className="text-[13px] text-on-surface-variant/80 leading-relaxed font-normal">
                    {m.whyTracks}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Empty State */}
      {filteredMetrics.length === 0 && (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl">
          <p className="text-sm text-on-surface-variant/60">No metrics match your search query.</p>
        </div>
      )}
    </div>
  );
}
