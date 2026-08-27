'use client';

export default function PhaseWalkthrough() {
  return (
    <div className="relative w-full">
      {/* ----------------- PHASE 01: ACQUISITION ----------------- */}
      <section className="relative overflow-hidden border-b border-white/5 py-16 md:py-24" id="phase-1">
        <div className="mx-auto max-w-[1200px] px-6 md:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            {/* Text details (col-span-5) */}
            <div className="lg:col-span-5 space-y-6">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00DD94]/30 bg-white/[0.04] px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-[#00DD94] backdrop-blur-sm">
                Phase 01 · Acquisition
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
                Analyze Potential Deals with Live Data &amp; Modeler
              </h2>
              <div className="space-y-4 text-sm text-white/70">
                <p className="leading-relaxed">
                  Decide if the deal works before you commit. The Deal Calculator pulls live property data, tax records, and estimated values automatically.
                </p>
                <ul className="space-y-3 pl-4 list-disc marker:text-[#00DD94]">
                  <li>Adjust purchase price, rehab projections, and expected rent dynamically.</li>
                  <li>Instantly calculate key pro-forma metrics including IRR, Cap Rate, and Cash-on-Cash.</li>
                  <li>Check investor appetite by listing details directly on the Deal Marketplace to track pledges.</li>
                </ul>
              </div>
            </div>

            {/* UI Mockup (col-span-7) */}
            <div className="lg:col-span-7">
              <div className="rounded-xl border border-white/10 bg-[#0a0a0f] shadow-2xl overflow-hidden">
                {/* Browser Top Bar */}
                <div className="flex items-center gap-2 border-b border-white/5 bg-white/[0.02] px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
                  </div>
                  <div className="mx-auto max-w-xs w-full rounded bg-white/[0.02] py-0.5 text-center font-[family-name:var(--font-jetbrains-mono)] text-[10px] text-white/40">
                    paperworking.com/deals/calculator
                  </div>
                </div>

                {/* Dashboard / Modal Mockup */}
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-white">Deal Calculator</h4>
                      <p className="text-[10px] text-white/50">Address: 1042 Oakridge Ln</p>
                    </div>
                    <span className="rounded-full bg-[#00DD94]/10 border border-[#00DD94]/20 px-2 py-0.5 text-[9px] font-semibold text-[#00DD94] uppercase tracking-wide">
                      Acquisition
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Modeler inputs */}
                    <div className="space-y-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 font-[family-name:var(--font-jetbrains-mono)]">Model Parameters</p>
                      
                      {/* Price slider */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-white/60">Purchase Price</span>
                          <span className="text-white font-semibold">$245,000</span>
                        </div>
                        <div className="relative h-1 w-full bg-white/10 rounded">
                          <div className="absolute left-0 top-0 h-1 bg-[#00DD94] rounded" style={{ width: '65%' }} />
                          <div className="absolute top-1/2 left-[65%] -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-[#00DD94] shadow border border-[#0a0a0f]" />
                        </div>
                      </div>

                      {/* Rehab slider */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-white/60">Rehab Budget</span>
                          <span className="text-white font-semibold">$35,000</span>
                        </div>
                        <div className="relative h-1 w-full bg-white/10 rounded">
                          <div className="absolute left-0 top-0 h-1 bg-[#00DD94] rounded" style={{ width: '40%' }} />
                          <div className="absolute top-1/2 left-[40%] -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-[#00DD94] shadow border border-[#0a0a0f]" />
                        </div>
                      </div>

                      {/* Rent slider */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-white/60">Projected Rent</span>
                          <span className="text-white font-semibold">$2,400/mo</span>
                        </div>
                        <div className="relative h-1 w-full bg-white/10 rounded">
                          <div className="absolute left-0 top-0 h-1 bg-[#00DD94] rounded" style={{ width: '80%' }} />
                          <div className="absolute top-1/2 left-[80%] -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-[#00DD94] shadow border border-[#0a0a0f]" />
                        </div>
                      </div>
                    </div>

                    {/* Right: Calculator Outputs */}
                    <div className="rounded-lg bg-white/[0.01] border border-white/5 p-4 flex flex-col justify-center space-y-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 font-[family-name:var(--font-jetbrains-mono)]">Calculated Metrics</p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] text-white/50">Projected Cap Rate</p>
                          <p className="text-lg font-bold text-[#00DD94]">7.2%</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-white/50">Cash-on-Cash</p>
                          <p className="text-lg font-bold text-white">8.9%</p>
                        </div>
                        <div className="col-span-2 border-t border-white/5 pt-2">
                          <p className="text-[10px] text-white/50">Internal Rate of Return (IRR)</p>
                          <p className="text-xl font-extrabold text-[#00DD94]">14.8%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------- PHASE 02: FUND ----------------- */}
      <section className="relative overflow-hidden border-b border-white/5 py-16 md:py-24" id="phase-2">
        <div className="mx-auto max-w-[1200px] px-6 md:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            {/* UI Mockup (col-span-7) - Placed Left on Desktop */}
            <div className="order-2 lg:order-1 lg:col-span-7">
              <div className="rounded-xl border border-white/10 bg-[#0a0a0f] shadow-2xl overflow-hidden">
                {/* Browser Top Bar */}
                <div className="flex items-center gap-2 border-b border-white/5 bg-white/[0.02] px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
                  </div>
                  <div className="mx-auto max-w-xs w-full rounded bg-white/[0.02] py-0.5 text-center font-[family-name:var(--font-jetbrains-mono)] text-[10px] text-white/40">
                    paperworking.com/projects/fund
                  </div>
                </div>

                {/* Dashboard Mockup */}
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-white">Contingency &amp; Documents Dashboard</h4>
                      <p className="text-[10px] text-white/50">Project: 124 Pine St Fourplex</p>
                    </div>
                    <span className="rounded-full bg-sky-400/10 border border-sky-400/20 px-2 py-0.5 text-[9px] font-semibold text-sky-400 uppercase tracking-wide">
                      Fund
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Escrow Calendar & Dates */}
                    <div className="space-y-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 font-[family-name:var(--font-jetbrains-mono)]">Critical Dates</p>
                      
                      <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-3 space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-red-400">
                          <span>Inspection Contingency</span>
                          <span>4 Days Left</span>
                        </div>
                        <p className="text-[10px] text-white/60">Window closes on Aug 29. Alert sent to partner.</p>
                      </div>

                      <div className="rounded-lg bg-yellow-500/5 border border-yellow-500/10 p-3 space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-yellow-400">
                          <span>Earnest Money Escrow</span>
                          <span>Due in 3 Days</span>
                        </div>
                        <p className="text-[10px] text-white/60">Amount: $10,000. Wiring instructions verified.</p>
                      </div>
                    </div>

                    {/* Right: Secure Vault */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 font-[family-name:var(--font-jetbrains-mono)]">Secure Document Vault</p>
                      
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between rounded border border-white/5 bg-white/[0.01] px-2.5 py-1.5 text-xs text-white/80">
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm text-sky-400">description</span>
                            <span className="truncate max-w-[130px] text-[11px]">Purchase_Agreement_Signed.pdf</span>
                          </div>
                          <span className="text-[9px] text-[#00DD94] font-medium font-[family-name:var(--font-jetbrains-mono)]">VERIFIED</span>
                        </div>

                        <div className="flex items-center justify-between rounded border border-white/5 bg-white/[0.01] px-2.5 py-1.5 text-xs text-white/80">
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm text-sky-400">description</span>
                            <span className="truncate max-w-[130px] text-[11px]">Earnest_Money_Receipt.pdf</span>
                          </div>
                          <span className="text-[9px] text-[#00DD94] font-medium font-[family-name:var(--font-jetbrains-mono)]">VERIFIED</span>
                        </div>

                        <div className="flex items-center justify-between rounded border border-white/5 bg-white/[0.01] px-2.5 py-1.5 text-xs text-white/80">
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm text-sky-400">description</span>
                            <span className="truncate max-w-[130px] text-[11px]">Appraisal_Report_Draft.pdf</span>
                          </div>
                          <span className="text-[9px] text-yellow-400 font-medium font-[family-name:var(--font-jetbrains-mono)]">REVIEW</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Text details (col-span-5) - Placed Right on Desktop */}
            <div className="order-1 lg:order-2 lg:col-span-5 space-y-6">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-white/[0.04] px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-sky-400 backdrop-blur-sm">
                Phase 02 · Fund
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
                Lock Down Financing &amp; Contingency Deadlines
              </h2>
              <div className="space-y-4 text-sm text-white/70">
                <p className="leading-relaxed">
                  Track financing steps, loan covenants, and contingency deadlines in a secure environment. Never let an critical milestone go hard by mistake.
                </p>
                <ul className="space-y-3 pl-4 list-disc marker:text-sky-400">
                  <li>Enable active countdown gauges for inspection windows and earnest money commitments.</li>
                  <li>Maintain strict document control with a dedicated secure vault for title commitments and agreements.</li>
                  <li>Assign permissions and collaborate seamlessly with equity partners and escrow agents.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------- PHASE 03: HOLD ----------------- */}
      <section className="relative overflow-hidden border-b border-white/5 py-16 md:py-24" id="phase-3">
        <div className="mx-auto max-w-[1200px] px-6 md:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            {/* Text details (col-span-5) */}
            <div className="lg:col-span-5 space-y-6">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-white/[0.04] px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-amber-400 backdrop-blur-sm">
                Phase 03 · Hold
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
                Manage Renovations, Cashflow, and Draw Invoices
              </h2>
              <div className="space-y-4 text-sm text-white/70">
                <p className="leading-relaxed">
                  Own and operate with confidence. Connect rehab milestone completion dates to your budget line-items and ensure every invoice is accounted for.
                </p>
                <ul className="space-y-3 pl-4 list-disc marker:text-amber-400">
                  <li>Track budget-versus-actual variance in real time to avoid cost overruns.</li>
                  <li>Log contractor draws line-by-line and monitor daily holding burn.</li>
                  <li>Instantly connect with verified professionals near you on the Vendor Marketplace.</li>
                </ul>
              </div>
            </div>

            {/* UI Mockup (col-span-7) */}
            <div className="lg:col-span-7">
              <div className="rounded-xl border border-white/10 bg-[#0a0a0f] shadow-2xl overflow-hidden">
                {/* Browser Top Bar */}
                <div className="flex items-center gap-2 border-b border-white/5 bg-white/[0.02] px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
                  </div>
                  <div className="mx-auto max-w-xs w-full rounded bg-white/[0.02] py-0.5 text-center font-[family-name:var(--font-jetbrains-mono)] text-[10px] text-white/40">
                    paperworking.com/projects/hold
                  </div>
                </div>

                {/* Dashboard Mockup */}
                <div className="p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-3 gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-white">Rehab Budget &amp; Expenses</h4>
                      <p className="text-[10px] text-white/50">Project: Maple Street Triplex</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="rounded-full bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 text-[9px] font-semibold text-amber-400 uppercase tracking-wide">
                        Hold
                      </span>
                    </div>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded border border-white/5 bg-white/[0.01] p-3">
                      <p className="text-[9px] uppercase tracking-wider text-white/45">Variance Analysis</p>
                      <p className="text-sm font-bold text-[#00DD94]">-$200 <span className="text-[10px] font-normal text-white/50">(Under Budget)</span></p>
                    </div>
                    <div className="rounded border border-white/5 bg-white/[0.01] p-3">
                      <p className="text-[9px] uppercase tracking-wider text-white/45">Daily Holding Burn</p>
                      <p className="text-sm font-bold text-white">$115/day</p>
                    </div>
                  </div>

                  {/* Budget Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/5 text-white/40 text-[10px] uppercase font-[family-name:var(--font-jetbrains-mono)]">
                          <th className="pb-2">Item</th>
                          <th className="pb-2">Est. Cost</th>
                          <th className="pb-2">Act. Cost</th>
                          <th className="pb-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        <tr>
                          <td className="py-2 font-medium text-white">Roof Replacement</td>
                          <td className="py-2 text-white/60">$12,000</td>
                          <td className="py-2 text-white">$12,500</td>
                          <td className="py-2">
                            <span className="rounded bg-green-500/10 text-green-400 px-1.5 py-0.5 text-[9px] font-medium font-[family-name:var(--font-jetbrains-mono)]">PAID</span>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 font-medium text-white">Kitchen Cabinetry</td>
                          <td className="py-2 text-white/60">$8,500</td>
                          <td className="py-2 text-white">$7,800</td>
                          <td className="py-2">
                            <span className="rounded bg-[#00DD94]/10 text-[#00DD94] px-1.5 py-0.5 text-[9px] font-medium font-[family-name:var(--font-jetbrains-mono)]">APPROVED</span>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 font-medium text-white">HVAC Upgrade</td>
                          <td className="py-2 text-white/60">$6,500</td>
                          <td className="py-2 text-white/40">$0</td>
                          <td className="py-2">
                            <span className="rounded bg-yellow-500/10 text-yellow-400 px-1.5 py-0.5 text-[9px] font-medium font-[family-name:var(--font-jetbrains-mono)]">PENDING DRAW</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------- PHASE 04: EXIT ----------------- */}
      <section className="relative overflow-hidden border-b border-white/5 py-16 md:py-24" id="phase-4">
        <div className="mx-auto max-w-[1200px] px-6 md:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            {/* UI Mockup (col-span-7) - Placed Left on Desktop */}
            <div className="order-2 lg:order-1 lg:col-span-7">
              <div className="rounded-xl border border-white/10 bg-[#0a0a0f] shadow-2xl overflow-hidden">
                {/* Browser Top Bar */}
                <div className="flex items-center gap-2 border-b border-white/5 bg-white/[0.02] px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
                  </div>
                  <div className="mx-auto max-w-xs w-full rounded bg-white/[0.02] py-0.5 text-center font-[family-name:var(--font-jetbrains-mono)] text-[10px] text-white/40">
                    paperworking.com/projects/exit
                  </div>
                </div>

                {/* Dashboard Mockup */}
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-white">Performance Package &amp; Reports</h4>
                      <p className="text-[10px] text-white/50">Project: Summit Single Family</p>
                    </div>
                    <span className="rounded-full bg-white/5 border border-white/15 px-2 py-0.5 text-[9px] font-semibold text-white/50 uppercase tracking-wide">
                      Exit
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Financial Performance package */}
                    <div className="rounded-lg bg-white/[0.01] border border-white/5 p-4 space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 font-[family-name:var(--font-jetbrains-mono)]">Performance record</p>
                      
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-white/60">Actual NOI</span>
                        <span className="font-semibold text-white">$22,400/yr</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-white/60">Equity Multiple</span>
                        <span className="font-semibold text-[#00DD94]">1.68x</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-white/60">Actual DSCR</span>
                        <span className="font-semibold text-white">1.45</span>
                      </div>
                    </div>

                    {/* Right: Export options */}
                    <div className="space-y-3 flex flex-col justify-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 font-[family-name:var(--font-jetbrains-mono)]">Download Center</p>
                      
                      <button className="flex items-center justify-center gap-2 rounded border border-[#00DD94]/30 bg-[#00DD94]/5 hover:bg-[#00DD94]/10 transition px-3 py-2 text-xs font-semibold text-[#00DD94] w-full text-center">
                        <span className="material-symbols-outlined text-sm">download</span>
                        Lender-Grade Package (PDF)
                      </button>

                      <button className="flex items-center justify-center gap-2 rounded border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition px-3 py-2 text-xs text-white/70 w-full text-center">
                        <span className="material-symbols-outlined text-sm">table_view</span>
                        Export CPA-Ready P&amp;L (CSV)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Text details (col-span-5) - Placed Right on Desktop */}
            <div className="order-1 lg:order-2 lg:col-span-5 space-y-6">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/[0.04] px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-white/50 backdrop-blur-sm">
                Phase 04 · Exit
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
                Compile CPA Exports &amp; Lender-Grade Performance Packages
              </h2>
              <div className="space-y-4 text-sm text-white/70">
                <p className="leading-relaxed">
                  Generate professional performance dossiers with a single click. Keep verified records that buyers, CPA partners, and appraisers can trust.
                </p>
                <ul className="space-y-3 pl-4 list-disc marker:text-white/40">
                  <li>Compile lender-ready financial data sheets, DSCR packages, and equity valuations automatically.</li>
                  <li>Instantly export P&amp;L statements and tax Schedule E summaries ready for your CPA.</li>
                  <li>Maintain a complete, immutable audit trail of the deal’s transactional history.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
