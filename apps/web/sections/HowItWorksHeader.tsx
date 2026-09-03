'use client';

export default function HowItWorksHeader() {
  return (
    <section id="how-it-works" className="relative border-b border-white/5 py-16 md:py-24">
      <div className="mx-auto max-w-[1200px] px-6 md:px-8">
        {/* Header content */}
        <div className="mx-auto mb-16 max-w-4xl text-center">
          <span className="mb-4 inline-block font-[family-name:var(--font-jetbrains-mono)] text-[12px] font-semibold uppercase tracking-[0.1em] text-[#00DD94]">
            HOW IT WORKS
          </span>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            PORTFOLIO EXECUTION &amp; AUTOMATED METRICS
          </h2>
          <h3 className="mb-6 text-lg font-medium text-[#00DD94] sm:text-xl">
            How PaperWorking Works: The Work You Do Becomes the Numbers You Need
          </h3>
          <p className="mx-auto max-w-3xl text-sm leading-[1.7] text-white/70 sm:text-base">
            Generic tools log isolated tasks. PaperWorking turns daily operational deal activity into
            real-time portfolio KPIs and tax-ready reporting. Every document saved, contingency
            cleared, and expense logged automatically feeds your financial metrics—eliminating static
            spreadsheets and prepping your books for CPA exports as you work.
          </p>
        </div>

        {/* Global Portfolio Dashboard Mockup */}
        <div className="mx-auto max-w-5xl rounded-xl border border-white/10 bg-[#0a0a0f]/90 shadow-2xl overflow-hidden">
          {/* Browser Top Bar */}
          <div className="flex items-center gap-2 border-b border-white/5 bg-white/[0.02] px-4 py-3">
            {/* Dots */}
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-500/80" />
              <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
              <span className="h-3 w-3 rounded-full bg-green-500/80" />
            </div>
            {/* Mock URL */}
            <div className="mx-auto max-w-md w-full rounded-md border border-white/5 bg-white/[0.01] py-1 text-center font-[family-name:var(--font-jetbrains-mono)] text-[11px] text-white/40">
              paperworking.com/dashboard/portfolio
            </div>
          </div>

          {/* Browser Content */}
          <div className="p-6 space-y-6">
            {/* Dashboard Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h4 className="text-lg font-semibold text-white">Global Portfolio Dashboard</h4>
                <p className="text-xs text-white/50">Real-time consolidated asset metrics</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-lg bg-white/[0.04] border border-white/5 px-3 py-1.5 text-xs text-white/60">
                <span className="h-2 w-2 rounded-full bg-[#00DD94] animate-pulse" />
                Live Sync Active
              </div>
            </div>

            {/* Metric Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Metric 1 */}
              <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4 backdrop-blur-md">
                <p className="text-xs text-white/50 uppercase tracking-wider font-[family-name:var(--font-jetbrains-mono)]">Total Equity</p>
                <p className="mt-1 text-xl sm:text-2xl font-bold text-white">$1.12M</p>
                <div className="mt-1 flex items-center gap-1 text-[10px] text-[#00DD94]">
                  <span>+4.2% this quarter</span>
                </div>
              </div>
              {/* Metric 2 */}
              <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4 backdrop-blur-md">
                <p className="text-xs text-white/50 uppercase tracking-wider font-[family-name:var(--font-jetbrains-mono)]">Avg Cap Rate</p>
                <p className="mt-1 text-xl sm:text-2xl font-bold text-[#00DD94]">6.8%</p>
                <div className="mt-1 flex items-center gap-1 text-[10px] text-white/45">
                  <span>Market baseline 6.2%</span>
                </div>
              </div>
              {/* Metric 3 */}
              <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4 backdrop-blur-md">
                <p className="text-xs text-white/50 uppercase tracking-wider font-[family-name:var(--font-jetbrains-mono)]">Portfolio DSCR</p>
                <p className="mt-1 text-xl sm:text-2xl font-bold text-white">1.45</p>
                <div className="mt-1 flex items-center gap-1 text-[10px] text-[#00DD94]">
                  <span>Lender safe-zone &gt;1.25</span>
                </div>
              </div>
              {/* Metric 4 */}
              <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4 backdrop-blur-md">
                <p className="text-xs text-white/50 uppercase tracking-wider font-[family-name:var(--font-jetbrains-mono)]">Net Cash Flow</p>
                <p className="mt-1 text-xl sm:text-2xl font-bold text-white">$14,250<span className="text-sm font-normal text-white/55">/mo</span></p>
                <div className="mt-1 flex items-center gap-1 text-[10px] text-[#00DD94]">
                  <span>100% tenant collected</span>
                </div>
              </div>
            </div>

            {/* Kanban Pipeline Dashboard */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3 font-[family-name:var(--font-jetbrains-mono)]">Active Deal Pipeline</p>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Acquisition Column */}
                <div className="rounded-xl bg-white/[0.01] border border-white/5 p-3 flex flex-col gap-3 min-h-[220px]">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-xs font-semibold text-white/80">Acquisition</span>
                    <span className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-semibold text-white/60">2</span>
                  </div>
                  {/* Card 1 */}
                  <div className="rounded-lg bg-white/[0.02] border border-white/10 p-3 hover:border-white/20 transition-all">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded bg-[#00DD94]/10 text-[#00DD94] text-[9px] px-1.5 py-0.5 font-[family-name:var(--font-jetbrains-mono)]">UNDERWRITE</span>
                      <span className="text-[10px] text-white/40">$245k</span>
                    </div>
                    <p className="text-xs font-medium text-white mt-2">Oakridge Duplex</p>
                    <div className="mt-2 flex justify-between items-center text-[10px] text-white/50">
                      <span>Cap: 7.2%</span>
                      <span className="text-[#00DD94]">IRR: 14.8%</span>
                    </div>
                  </div>
                  {/* Card 2 */}
                  <div className="rounded-lg bg-white/[0.02] border border-white/10 p-3 hover:border-white/20 transition-all">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded bg-yellow-500/10 text-yellow-400 text-[9px] px-1.5 py-0.5 font-[family-name:var(--font-jetbrains-mono)]">DUE DILIGENCE</span>
                      <span className="text-[10px] text-white/40">$1.2M</span>
                    </div>
                    <p className="text-xs font-medium text-white mt-2">Alpine Apartments</p>
                    <div className="mt-2 flex justify-between items-center text-[10px] text-white/50">
                      <span>6 Units</span>
                      <span>Offer Pending</span>
                    </div>
                  </div>
                </div>

                {/* Fund Column */}
                <div className="rounded-xl bg-white/[0.01] border border-white/5 p-3 flex flex-col gap-3 min-h-[220px]">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-xs font-semibold text-white/80">Fund</span>
                    <span className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-semibold text-white/60">1</span>
                  </div>
                  {/* Card 1 */}
                  <div className="rounded-lg bg-white/[0.02] border border-white/10 p-3 hover:border-white/20 transition-all">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded bg-sky-400/10 text-sky-400 text-[9px] px-1.5 py-0.5 font-[family-name:var(--font-jetbrains-mono)]">ESCROW</span>
                      <span className="text-[10px] text-white/40">$480k</span>
                    </div>
                    <p className="text-xs font-medium text-white mt-2">124 Pine St Fourplex</p>
                    <div className="mt-2 flex flex-col gap-1 text-[9px]">
                      <div className="flex justify-between text-white/60">
                        <span>Earnest Money:</span>
                        <span className="text-yellow-400 font-medium">Due in 3d</span>
                      </div>
                      <div className="flex justify-between text-white/60">
                        <span>Inspection:</span>
                        <span className="text-white/80">Completed</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hold Column */}
                <div className="rounded-xl bg-white/[0.01] border border-white/5 p-3 flex flex-col gap-3 min-h-[220px]">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-xs font-semibold text-white/80">Hold</span>
                    <span className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-semibold text-white/60">1</span>
                  </div>
                  {/* Card 1 */}
                  <div className="rounded-lg bg-white/[0.02] border border-white/10 p-3 hover:border-white/20 transition-all">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded bg-amber-500/10 text-amber-400 text-[9px] px-1.5 py-0.5 font-[family-name:var(--font-jetbrains-mono)]">REHAB</span>
                      <span className="text-[10px] text-white/40">$320k</span>
                    </div>
                    <p className="text-xs font-medium text-white mt-2">Maple Street Triplex</p>
                    <div className="mt-2 space-y-1 text-[9px]">
                      <div className="w-full bg-white/10 rounded-full h-1.5">
                        <div className="bg-[#00DD94] h-1.5 rounded-full" style={{ width: '45%' }} />
                      </div>
                      <div className="flex justify-between text-white/50">
                        <span>Budget: 45% spent</span>
                        <span>Draw #2 Ok</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Exit Column */}
                <div className="rounded-xl bg-white/[0.01] border border-white/5 p-3 flex flex-col gap-3 min-h-[220px]">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-xs font-semibold text-white/80">Exit</span>
                    <span className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-semibold text-white/60">1</span>
                  </div>
                  {/* Card 1 */}
                  <div className="rounded-lg bg-white/[0.02] border border-white/10 p-3 hover:border-white/20 transition-all">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded bg-red-400/10 text-red-400 text-[9px] px-1.5 py-0.5 font-[family-name:var(--font-jetbrains-mono)]">MARKETED</span>
                      <span className="text-[10px] text-white/40">$195k</span>
                    </div>
                    <p className="text-xs font-medium text-white mt-2">Summit Single Family</p>
                    <div className="mt-2 flex justify-between items-center text-[10px] text-white/50">
                      <span>Multiple Offers</span>
                      <span className="text-red-400">Escrow Open</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
