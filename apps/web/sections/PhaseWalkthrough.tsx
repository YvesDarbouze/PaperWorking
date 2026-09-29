'use client';

import { FileText, DownloadSimple, Table } from '@/components/icons/PhosphorIcons';

export default function PhaseWalkthrough() {
  return (
    <div className="relative w-full bg-background">
      {/* Phase 01: Acquisition */}
      <section className="relative overflow-hidden border-b border-border py-12 md:py-16" id="phase-1">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 md:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            {/* Text details (col-span-5) */}
            <div className="lg:col-span-5 space-y-6">
              <span className="inline-block font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Phase 01 · Acquisition
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
                Analyze Potential Deals with Live Data &amp; Modeler
              </h2>
              <div className="space-y-4 text-sm text-muted-foreground">
                <p className="leading-relaxed">
                  Decide if the deal works before you commit. The Deal Calculator pulls live property data, tax records, and estimated values automatically.
                </p>
                <ul className="space-y-3 pl-4 list-disc marker:text-muted-foreground/60">
                  <li>Adjust purchase price, rehab projections, and expected rent dynamically.</li>
                  <li>Instantly calculate key pro-forma metrics including IRR, Cap Rate, and Cash-on-Cash.</li>
                  <li>Check investor appetite by listing details directly on the Deal Marketplace to track pledges.</li>
                </ul>
              </div>
            </div>

            {/* UI Mockup (col-span-7) */}
            <div className="lg:col-span-7">
              <div className="rounded-none border border-border bg-card shadow-sm ring-1 ring-foreground/10 overflow-hidden text-card-foreground">
                {/* Browser Top Bar */}
                <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                  </div>
                  <div className="mx-auto max-w-xs w-full rounded-none border border-border bg-background py-0.5 text-center font-mono text-[10px] text-muted-foreground">
                    paperworking.com/deals/calculator
                  </div>
                </div>

                {/* Dashboard / Modal Mockup */}
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Deal Calculator</h4>
                      <p className="text-[10px] text-muted-foreground">Address: 1042 Oakridge Ln</p>
                    </div>
                    <span className="rounded-none border border-border bg-muted px-2 py-0.5 text-[9px] font-mono font-semibold text-foreground uppercase tracking-wide">
                      Acquisition
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Modeler inputs */}
                    <div className="space-y-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">Model Parameters</p>
                      
                      {/* Price slider */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground">Purchase Price</span>
                          <span className="text-foreground font-semibold">$245,000</span>
                        </div>
                        <div className="relative h-1 w-full bg-muted rounded-none">
                          <div className="absolute left-0 top-0 h-1 bg-foreground rounded-none" style={{ width: '65%' }} />
                          <div className="absolute top-1/2 left-[65%] -translate-y-1/2 -translate-x-1/2 h-3 w-3 bg-foreground border border-background" />
                        </div>
                      </div>

                      {/* Rehab slider */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground">Rehab Budget</span>
                          <span className="text-foreground font-semibold">$35,000</span>
                        </div>
                        <div className="relative h-1 w-full bg-muted rounded-none">
                          <div className="absolute left-0 top-0 h-1 bg-foreground rounded-none" style={{ width: '40%' }} />
                          <div className="absolute top-1/2 left-[40%] -translate-y-1/2 -translate-x-1/2 h-3 w-3 bg-foreground border border-background" />
                        </div>
                      </div>

                      {/* Rent slider */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground">Projected Rent</span>
                          <span className="text-foreground font-semibold">$2,400/mo</span>
                        </div>
                        <div className="relative h-1 w-full bg-muted rounded-none">
                          <div className="absolute left-0 top-0 h-1 bg-foreground rounded-none" style={{ width: '80%' }} />
                          <div className="absolute top-1/2 left-[80%] -translate-y-1/2 -translate-x-1/2 h-3 w-3 bg-foreground border border-background" />
                        </div>
                      </div>
                    </div>

                    {/* Right: Calculator Outputs */}
                    <div className="rounded-none bg-muted/20 border border-border p-4 flex flex-col justify-center space-y-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">Calculated Metrics</p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] text-muted-foreground" title="Cap Rate on Cost: Year-1 NOI divided by Total Cost Basis">Cap Rate on Cost</p>
                          <p className="text-lg font-bold text-foreground">7.2%</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Cash-on-Cash</p>
                          <p className="text-lg font-bold text-foreground">8.9%</p>
                        </div>
                        <div className="col-span-2 border-t border-border pt-2">
                          <p className="text-[10px] text-muted-foreground">Internal Rate of Return (IRR)</p>
                          <p className="text-xl font-extrabold text-foreground">14.8%</p>
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

      {/* Phase 02: Fund */}
      <section className="relative overflow-hidden border-b border-border py-12 md:py-16" id="phase-2">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 md:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            {/* UI Mockup (col-span-7) - Placed Left on Desktop */}
            <div className="order-2 lg:order-1 lg:col-span-7">
              <div className="rounded-none border border-border bg-card shadow-sm ring-1 ring-foreground/10 overflow-hidden text-card-foreground">
                {/* Browser Top Bar */}
                <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                  </div>
                  <div className="mx-auto max-w-xs w-full rounded-none border border-border bg-background py-0.5 text-center font-mono text-[10px] text-muted-foreground">
                    paperworking.com/projects/fund
                  </div>
                </div>

                {/* Dashboard Mockup */}
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Contingency &amp; Documents Dashboard</h4>
                      <p className="text-[10px] text-muted-foreground">Project: 124 Pine St Fourplex</p>
                    </div>
                    <span className="rounded-none border border-border bg-muted px-2 py-0.5 text-[9px] font-mono font-semibold text-foreground uppercase tracking-wide">
                      Fund
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Escrow Calendar & Dates */}
                    <div className="space-y-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">Critical Dates</p>
                      
                      <div className="rounded-none bg-muted/30 border border-border p-3 space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-foreground">
                          <span>Inspection Contingency</span>
                          <span className="text-muted-foreground font-mono">4 Days Left</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Window closes on Aug 29. Alert sent to partner.</p>
                      </div>

                      <div className="rounded-none bg-muted/30 border border-border p-3 space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-foreground">
                          <span>Earnest Money Escrow</span>
                          <span className="text-muted-foreground font-mono">Due in 3 Days</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Amount: $10,000. Wiring instructions verified.</p>
                      </div>
                    </div>

                    {/* Right: Secure Vault */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">Secure Document Vault</p>
                      
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between rounded-none border border-border bg-muted/20 px-2.5 py-1.5 text-xs text-foreground">
                          <div className="flex items-center gap-1.5">
                            <FileText size={14} className="text-muted-foreground" />
                            <span className="truncate max-w-[130px] text-[11px]">Purchase_Agreement_Signed.pdf</span>
                          </div>
                          <span className="text-[9px] font-mono font-semibold text-foreground">VERIFIED</span>
                        </div>

                        <div className="flex items-center justify-between rounded-none border border-border bg-muted/20 px-2.5 py-1.5 text-xs text-foreground">
                          <div className="flex items-center gap-1.5">
                            <FileText size={14} className="text-muted-foreground" />
                            <span className="truncate max-w-[130px] text-[11px]">Earnest_Money_Receipt.pdf</span>
                          </div>
                          <span className="text-[9px] font-mono font-semibold text-foreground">VERIFIED</span>
                        </div>

                        <div className="flex items-center justify-between rounded-none border border-border bg-muted/20 px-2.5 py-1.5 text-xs text-foreground">
                          <div className="flex items-center gap-1.5">
                            <FileText size={14} className="text-muted-foreground" />
                            <span className="truncate max-w-[130px] text-[11px]">Appraisal_Report_Draft.pdf</span>
                          </div>
                          <span className="text-[9px] font-mono font-semibold text-muted-foreground">REVIEW</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Text details (col-span-5) - Placed Right on Desktop */}
            <div className="order-1 lg:order-2 lg:col-span-5 space-y-6">
              <span className="inline-block font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Phase 02 · Fund
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
                Lock Down Financing &amp; Contingency Deadlines
              </h2>
              <div className="space-y-4 text-sm text-muted-foreground">
                <p className="leading-relaxed">
                  Track financing steps, loan covenants, and contingency deadlines in a secure environment. Never let an critical milestone go hard by mistake.
                </p>
                <ul className="space-y-3 pl-4 list-disc marker:text-muted-foreground/60">
                  <li>Enable active countdown gauges for inspection windows and earnest money commitments.</li>
                  <li>Maintain strict document control with a dedicated secure vault for title commitments and agreements.</li>
                  <li>Assign permissions and collaborate seamlessly with equity partners and escrow agents.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Phase 03: Hold */}
      <section className="relative overflow-hidden border-b border-border py-12 md:py-16" id="phase-3">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 md:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            {/* Text details (col-span-5) */}
            <div className="lg:col-span-5 space-y-6">
              <span className="inline-block font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Phase 03 · Hold
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
                Manage Renovations, Cashflow, and Draw Invoices
              </h2>
              <div className="space-y-4 text-sm text-muted-foreground">
                <p className="leading-relaxed">
                  Own and operate with confidence. Connect rehab milestone completion dates to your budget line-items and ensure every invoice is accounted for.
                </p>
                <ul className="space-y-3 pl-4 list-disc marker:text-muted-foreground/60">
                  <li>Track budget-versus-actual variance in real time to avoid cost overruns.</li>
                  <li>Log contractor draws line-by-line and monitor daily holding burn.</li>
                  <li>Instantly connect with verified professionals near you on the Vendor Marketplace.</li>
                </ul>
              </div>
            </div>

            {/* UI Mockup (col-span-7) */}
            <div className="lg:col-span-7">
              <div className="rounded-none border border-border bg-card shadow-sm ring-1 ring-foreground/10 overflow-hidden text-card-foreground">
                {/* Browser Top Bar */}
                <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                  </div>
                  <div className="mx-auto max-w-xs w-full rounded-none border border-border bg-background py-0.5 text-center font-mono text-[10px] text-muted-foreground">
                    paperworking.com/projects/hold
                  </div>
                </div>

                {/* Dashboard Mockup */}
                <div className="p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3 gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Rehab Budget &amp; Expenses</h4>
                      <p className="text-[10px] text-muted-foreground">Project: Maple Street Triplex</p>
                    </div>
                    <span className="rounded-none border border-border bg-muted px-2 py-0.5 text-[9px] font-mono font-semibold text-foreground uppercase tracking-wide">
                      Hold
                    </span>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-none border border-border bg-muted/30 p-3">
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Variance Analysis</p>
                      <p className="text-sm font-bold text-foreground">-$200 <span className="text-[10px] font-normal text-muted-foreground">(Under Budget)</span></p>
                    </div>
                    <div className="rounded-none border border-border bg-muted/30 p-3">
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Daily Holding Burn</p>
                      <p className="text-sm font-bold text-foreground">$115/day</p>
                    </div>
                  </div>

                  {/* Budget Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground text-[10px] uppercase font-mono">
                          <th className="pb-2">Item</th>
                          <th className="pb-2">Est. Cost</th>
                          <th className="pb-2">Act. Cost</th>
                          <th className="pb-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        <tr>
                          <td className="py-2 font-medium text-foreground">Roof Replacement</td>
                          <td className="py-2 text-muted-foreground">$12,000</td>
                          <td className="py-2 text-foreground">$12,500</td>
                          <td className="py-2">
                            <span className="rounded-none border border-border bg-muted px-1.5 py-0.5 text-[9px] font-mono font-medium text-foreground">PAID</span>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 font-medium text-foreground">Kitchen Cabinetry</td>
                          <td className="py-2 text-muted-foreground">$8,500</td>
                          <td className="py-2 text-foreground">$7,800</td>
                          <td className="py-2">
                            <span className="rounded-none border border-border bg-muted px-1.5 py-0.5 text-[9px] font-mono font-medium text-foreground">APPROVED</span>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 font-medium text-foreground">HVAC Upgrade</td>
                          <td className="py-2 text-muted-foreground">$6,500</td>
                          <td className="py-2 text-muted-foreground">$0</td>
                          <td className="py-2">
                            <span className="rounded-none border border-border bg-muted px-1.5 py-0.5 text-[9px] font-mono font-medium text-muted-foreground">PENDING DRAW</span>
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

      {/* Phase 04: Exit */}
      <section className="relative overflow-hidden border-b border-border py-12 md:py-16" id="phase-4">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 md:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            {/* UI Mockup (col-span-7) - Placed Left on Desktop */}
            <div className="order-2 lg:order-1 lg:col-span-7">
              <div className="rounded-none border border-border bg-card shadow-sm ring-1 ring-foreground/10 overflow-hidden text-card-foreground">
                {/* Browser Top Bar */}
                <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                  </div>
                  <div className="mx-auto max-w-xs w-full rounded-none border border-border bg-background py-0.5 text-center font-mono text-[10px] text-muted-foreground">
                    paperworking.com/projects/exit
                  </div>
                </div>

                {/* Dashboard Mockup */}
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Performance Package &amp; Reports</h4>
                      <p className="text-[10px] text-muted-foreground">Project: Summit Single Family</p>
                    </div>
                    <span className="rounded-none border border-border bg-muted px-2 py-0.5 text-[9px] font-mono font-semibold text-foreground uppercase tracking-wide">
                      Exit
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Financial Performance package */}
                    <div className="rounded-none bg-muted/20 border border-border p-4 space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">Performance record</p>
                      
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Actual NOI</span>
                        <span className="font-semibold text-foreground">$22,400/yr</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Equity Multiple</span>
                        <span className="font-semibold text-foreground">1.68x</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Actual DSCR</span>
                        <span className="font-semibold text-foreground">1.45</span>
                      </div>
                    </div>

                    {/* Right: Export options */}
                    <div className="space-y-3 flex flex-col justify-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">Download Center</p>
                      
                      <button className="flex items-center justify-center gap-2 rounded-none border border-border bg-primary text-primary-foreground hover:bg-primary/90 transition px-3 py-2 text-xs font-semibold w-full text-center">
                        <DownloadSimple size={14} />
                        Lender-Grade Package (PDF)
                      </button>

                      <button className="flex items-center justify-center gap-2 rounded-none border border-border bg-card hover:bg-muted text-foreground transition px-3 py-2 text-xs w-full text-center">
                        <Table size={14} />
                        Export CPA-Ready P&amp;L (CSV)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Text details (col-span-5) - Placed Right on Desktop */}
            <div className="order-1 lg:order-2 lg:col-span-5 space-y-6">
              <span className="inline-block font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Phase 04 · Exit
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
                Compile CPA Exports &amp; Lender-Grade Performance Packages
              </h2>
              <div className="space-y-4 text-sm text-muted-foreground">
                <p className="leading-relaxed">
                  Generate professional performance dossiers with a single click. Keep verified records that buyers, CPA partners, and appraisers can trust.
                </p>
                <ul className="space-y-3 pl-4 list-disc marker:text-muted-foreground/60">
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
