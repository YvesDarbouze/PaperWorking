'use client';

import { useMemo, useState, useCallback } from 'react';
import { Project } from '@/types/schema';
import { computeAutopsyMetrics, AutopsyMetrics } from '@/lib/math/calculatorUtils';
import {
  TrendingUp, BarChart3, DollarSign, Clock,
  Lock, Download, Loader2, AlertTriangle, CheckCircle,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   DealAutopsy — Phase 4 Exit Intelligence

   Four core KPIs (spec-compliant):
     1. Net Profit    = Gross Sale Price − Total Cost Basis
     2. ROI           = Net Profit / Total Cost Basis
     3. Cash-on-Cash  = Net Profit / Out-of-Pocket Cash
     4. Profit Margin = Net Profit / Gross Sale Price

   Values are locked (visual + ARIA) once status = 'Sold'.
   Printable PDF generated client-side via jspdf + autotable.
   ═══════════════════════════════════════════════════════════════ */

// ── Health Band ───────────────────────────────────────────────
type Band = 'green' | 'yellow' | 'red';

const BAND_STYLES: Record<Band, { card: string; value: string; icon: React.ReactNode }> = {
  green:  {
    card:  'bg-emerald-900/20 border-emerald-700/50',
    value: 'text-emerald-400',
    icon:  <CheckCircle  className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />,
  },
  yellow: {
    card:  'bg-amber-900/20 border-amber-700/50',
    value: 'text-amber-400',
    icon:  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />,
  },
  red:    {
    card:  'bg-red-900/20 border-red-700/50',
    value: 'text-red-400',
    icon:  <AlertTriangle className="w-3.5 h-3.5 text-red-500" aria-hidden="true" />,
  },
};

function roiBand(v: number): Band {
  if (v >= 25) return 'green';
  if (v >= 15) return 'yellow';
  return 'red';
}

function marginBand(v: number): Band {
  if (v >= 20) return 'green';
  if (v >= 10) return 'yellow';
  return 'red';
}

function profitBand(v: number): Band {
  if (v > 0)  return 'green';
  if (v === 0) return 'yellow';
  return 'red';
}

// ── Formatting ────────────────────────────────────────────────
function fmt$(n: number): string {
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function fmtPct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

// ── KPI Card ──────────────────────────────────────────────────
interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
  band: Band;
  locked: boolean;
}

function KPICard({ icon, label, value, subtext, band, locked }: KPICardProps) {
  const s = BAND_STYLES[band];
  return (
    <div
      className={`flex flex-col p-4 rounded-xl border transition-all ${s.card} ${locked ? 'opacity-100' : 'opacity-90'}`}
      aria-label={`${label}: ${value}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="p-1.5 rounded-lg bg-white/5" aria-hidden="true">{icon}</div>
        <div className="flex items-center gap-1">
          {locked && <Lock className="w-3 h-3 text-gray-500" aria-hidden="true" />}
          {s.icon}
        </div>
      </div>
      <p className="text-[10px] font-mono tracking-widest text-gray-400 uppercase mb-1">{label}</p>
      <p className={`text-2xl font-light tracking-tight ${s.value}`}>{value}</p>
      <p className="text-[10px] text-gray-500 mt-1">{subtext}</p>
    </div>
  );
}

// ── Comparison Row ────────────────────────────────────────────
function CompRow({ label, estimated, actual, isTotal = false }: {
  label: string;
  estimated: string;
  actual: string;
  isTotal?: boolean;
}) {
  return (
    <div className={`grid grid-cols-3 gap-4 px-4 py-2.5 text-xs ${
      isTotal
        ? 'bg-white/5 border-t border-gray-700/50 font-semibold'
        : 'border-b border-gray-800/50'
    }`}>
      <span className="text-gray-300">{label}</span>
      <span className="text-gray-400 text-right font-mono">{estimated}</span>
      <span className="text-gray-200 text-right font-mono">{actual}</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
interface DealAutopsyProps {
  deal: Project;
}

export default function DealAutopsy({ deal }: DealAutopsyProps) {
  const m: AutopsyMetrics = useMemo(() => computeAutopsyMetrics(deal), [deal]);
  const isSold = deal.status === 'Sold';
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleDownloadPDF = useCallback(async () => {
    setPdfLoading(true);
    try {
      const { generateAutopsyPDF } = await import('@/lib/pdf/autopsyReport');
      generateAutopsyPDF(deal, m);
    } catch {
      // noop — jspdf errors are non-fatal for the user
    } finally {
      setPdfLoading(false);
    }
  }, [deal, m]);

  return (
    <section
      className="bg-pw-black border border-gray-800 rounded-2xl overflow-hidden shadow-2xl"
      aria-label={`Deal Autopsy — ${deal.propertyName}`}
      aria-live="polite"
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-black/40">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10" aria-hidden="true">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white tracking-wide">Project Autopsy</h2>
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mt-0.5">
              Phase 4 Exit Intelligence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Finalized / Projected badge */}
          {isSold ? (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-900/40 border border-emerald-700 text-emerald-400"
              role="status"
              aria-label="Values finalized and locked at closing"
            >
              <Lock className="w-3 h-3" aria-hidden="true" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Finalized</span>
            </div>
          ) : (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-900/40 border border-amber-700 text-amber-400"
              role="status"
              aria-label="Values are projected until deal is marked Sold"
            >
              <span className="text-[10px] font-bold uppercase tracking-widest">Projected</span>
            </div>
          )}

          {/* PDF Export */}
          <button
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
            aria-label={`Download PDF autopsy report for ${deal.propertyName}`}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-gray-700 text-gray-300 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-pw-black"
          >
            {pdfLoading
              ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
              : <Download className="w-3 h-3" aria-hidden="true" />
            }
            {pdfLoading ? 'Generating…' : 'PDF Report'}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">

        {/* ── Four Core KPIs ──────────────────────────────── */}
        <fieldset
          disabled={isSold}
          aria-label="Core performance KPIs"
          className="grid grid-cols-2 md:grid-cols-4 gap-3 border-0 p-0"
        >
          <KPICard
            icon={<DollarSign  className="w-4 h-4 text-gray-400" />}
            label="Net Profit"
            value={fmt$(m.netProfit)}
            subtext="Gross sale − total cost basis"
            band={profitBand(m.netProfit)}
            locked={isSold}
          />
          <KPICard
            icon={<TrendingUp  className="w-4 h-4 text-gray-400" />}
            label="ROI"
            value={fmtPct(m.roi)}
            subtext="Net profit ÷ total cost basis · target ≥ 25%"
            band={roiBand(m.roi)}
            locked={isSold}
          />
          <KPICard
            icon={<BarChart3   className="w-4 h-4 text-gray-400" />}
            label="Cash-on-Cash"
            value={fmtPct(m.coc)}
            subtext={`Net profit ÷ ${fmt$(m.outOfPocketCash)} out-of-pocket`}
            band={roiBand(m.coc)}
            locked={isSold}
          />
          <KPICard
            icon={<TrendingUp  className="w-4 h-4 text-gray-400" />}
            label="Profit Margin"
            value={fmtPct(m.profitMargin)}
            subtext="Net profit ÷ sale price · target ≥ 20%"
            band={marginBand(m.profitMargin)}
            locked={isSold}
          />
        </fieldset>

        {/* ── Time Metrics ────────────────────────────────── */}
        <div
          className="grid grid-cols-2 gap-3"
          aria-label="Time metrics"
        >
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-800 bg-black/40">
            <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" aria-hidden="true" />
            <div>
              <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Days on Market</p>
              <p className="text-lg font-light text-white mt-0.5" aria-label={`Days on market: ${m.dom !== null ? m.dom : 'unknown'}`}>
                {m.dom !== null ? `${m.dom}d` : '—'}
              </p>
              <p className="text-[9px] text-gray-600 mt-0.5">
                {deal.financials?.listingDate ? 'Listing date → sold date' : 'Estimated from hold period'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-800 bg-black/40">
            <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" aria-hidden="true" />
            <div>
              <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Total Hold Period</p>
              <p className="text-lg font-light text-white mt-0.5" aria-label={`Hold period: ${m.holdDays !== null ? m.holdDays : 'unknown'} days`}>
                {m.holdDays !== null ? `${m.holdDays}d` : '—'}
              </p>
              <p className="text-[9px] text-gray-600 mt-0.5">Acquisition → closed</p>
            </div>
          </div>
        </div>

        {/* ── Estimates vs Actuals Table ───────────────────── */}
        <div>
          <h3 className="text-[10px] font-mono tracking-widest text-gray-500 uppercase mb-3">
            Original Estimates vs. Final Actuals
          </h3>
          <div
            className="rounded-xl border border-gray-800 overflow-hidden"
            role="table"
            aria-label="Estimates vs actuals comparison"
          >
            {/* Table header */}
            <div
              className="grid grid-cols-3 gap-4 px-4 py-2 bg-white/5 text-[10px] font-bold text-gray-400 uppercase tracking-widest"
              role="row"
            >
              <span role="columnheader">Line Item</span>
              <span className="text-right" role="columnheader">Estimated</span>
              <span className="text-right" role="columnheader">Actual</span>
            </div>

            <CompRow
              label="Purchase Price"
              estimated={fmt$(m.purchasePrice)}
              actual={fmt$(m.purchasePrice)}
            />
            <CompRow
              label="Rehab Budget"
              estimated={m.projectedRehabCost ? fmt$(m.projectedRehabCost) : '—'}
              actual={fmt$(m.actualRehabCost)}
            />
            <CompRow
              label="After-Repair Value (ARV)"
              estimated={fmt$(m.estimatedARV)}
              actual={fmt$(m.grossSalePrice)}
            />
            <CompRow
              label="Acquisition Costs"
              estimated="—"
              actual={fmt$(m.acquisitionCosts)}
            />
            <CompRow
              label="Holding Costs"
              estimated="—"
              actual={fmt$(m.holdingCosts)}
            />
            <CompRow
              label="Sell-Side Fees & Commissions"
              estimated="—"
              actual={fmt$(m.sellClosingCosts)}
            />
            <CompRow
              label="Total Cost Basis"
              estimated={m.projectedRehabCost ? fmt$(m.purchasePrice + m.projectedRehabCost) : '—'}
              actual={fmt$(m.totalCostBasis)}
              isTotal
            />
            <CompRow
              label="Net Profit"
              estimated={m.projectedRehabCost && m.estimatedARV
                ? fmt$(m.estimatedARV - m.purchasePrice - m.projectedRehabCost)
                : '—'
              }
              actual={fmt$(m.netProfit)}
              isTotal
            />
          </div>
        </div>

        {/* ── Financing Summary ────────────────────────────── */}
        {m.loanAmount > 0 && (
          <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-800/60 bg-black/20 text-xs text-gray-500">
            <span>Loan Amount: <span className="text-gray-300 font-mono">{fmt$(m.loanAmount)}</span></span>
            <span>Out-of-Pocket Cash: <span className="text-gray-300 font-mono">{fmt$(m.outOfPocketCash)}</span></span>
            <span>Total Cost Basis: <span className="text-gray-300 font-mono">{fmt$(m.totalCostBasis)}</span></span>
          </div>
        )}

        {/* ── Finalized Lock Notice ────────────────────────── */}
        {isSold && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-800/40 bg-emerald-900/10"
            role="note"
            aria-label="This autopsy is finalized and locked"
          >
            <Lock className="w-4 h-4 text-emerald-600 flex-shrink-0" aria-hidden="true" />
            <p className="text-[11px] text-emerald-600">
              <strong>Record Finalized.</strong> All values are locked at the closing date and cannot be altered. Download the PDF for your investor records.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
