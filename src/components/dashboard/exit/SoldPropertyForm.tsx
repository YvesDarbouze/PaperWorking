'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  DollarSign, Calendar, Upload, AlertTriangle, TrendingUp,
  TrendingDown, Clock, CheckCircle2, ChevronDown, ChevronUp, User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Project, ProjectFinancials } from '@/types/schema';

/* ══════════════════════════════════════════════════════════════
   SoldPropertyForm — Exit Strategy Decision Tree

   Two paths controlled by `strategy` prop:
   A) Sell  — mandatory: PurchasePrice (read-only), SalePrice,
              RehabCost, ClosingCosts, LegalCosts, HoldDuration,
              MonthlyHoldingCosts
              optional: commissions, marketing spend, file uploads
   B) Rent  — mandatory: MonthlyRent, LeaseStartDate, AnnualTax,
              AnnualInsurance
              optional: TenantName

   Three headline KPIs (Sell path):
     NetProfit = SalePrice - (PurchasePrice + Rehab + Holding + Closing + Legal)
     ROI       = NetProfit / (PurchasePrice + Rehab) × 100
     AnnROI    = ROI / (holdDays / 365)
   ══════════════════════════════════════════════════════════════ */

interface SoldPropertyFormProps {
  project: Project;
  strategy: 'Sell' | 'Rent';
  onSave: (updates: Partial<ProjectFinancials & { legalCosts?: number; tenantName?: string; leaseStartDate?: string; annualPropertyTax?: number; annualInsurance?: number }>) => void;
}

/* ── Helpers ── */
function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function holdDaysFrom(project: Project): number {
  const ref = project.financials?.acquisitionDate
    ? new Date(project.financials.acquisitionDate)
    : new Date((project as any).createdAt ?? Date.now());
  const end = project.financials?.soldDate
    ? new Date(project.financials.soldDate)
    : new Date();
  return Math.max(1, Math.round((end.getTime() - ref.getTime()) / 86_400_000));
}

/* ── Sub-components ── */

function FieldBox({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="p-4 border border-pw-border bg-pw-bg/50">
      <label className="block text-[9px] font-black uppercase tracking-widest mb-2 text-pw-muted">
        {label}
        {required && <span className="text-pw-accent ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function ReadOnlyField({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <FieldBox label={label}>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-black font-mono tracking-tighter text-pw-black">
          {value}
        </span>
        {note && <span className="text-[9px] font-bold uppercase tracking-wider text-pw-subtle">{note}</span>}
      </div>
    </FieldBox>
  );
}

function KpiCard({
  label, value, sub, positive, warning,
}: { label: string; value: string; sub?: string; positive?: boolean; warning?: boolean }) {
  return (
    <div className="flex-1 p-5 min-w-0 border border-pw-border bg-pw-glass-bg backdrop-blur-xl">
      <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-2 text-pw-muted">{label}</p>
      <p className={`text-3xl font-black font-mono tracking-tighter leading-none ${
        warning ? 'text-color-error' : positive === false ? 'text-pw-muted' : 'text-pw-black'
      }`}>
        {value}
      </p>
      {sub && <p className="text-[9px] font-bold mt-1.5 uppercase tracking-wider text-pw-subtle">{sub}</p>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   Main Component
   ════════════════════════════════════════════════════════════ */

export default function SoldPropertyForm({ project, strategy, onSave }: SoldPropertyFormProps) {
  const fin = project.financials ?? {} as ProjectFinancials;

  /* ── Sell fields ── */
  const [salePrice, setSalePrice] = useState((fin.actualSalePrice ?? fin.estimatedARV ?? 0).toString());
  const [rehabCost, setRehabCost] = useState((fin.projectedRehabCost ?? 0).toString());
  const [closingCosts, setClosingCosts] = useState((fin.finalClosingCosts ?? 0).toString());
  const [legalCosts, setLegalCosts] = useState('0');
  const [monthlyHolding, setMonthlyHolding] = useState((fin.totalHoldingCosts ?? 0).toString());
  const [buyerComm, setBuyerComm] = useState((fin.buyersAgentCommission ?? 3).toString());
  const [sellerComm, setSellerComm] = useState((fin.sellersAgentCommission ?? 3).toString());
  const [marketingSpend, setMarketingSpend] = useState((fin.stagingAndMarketingCosts ?? 0).toString());
  const [showOptional, setShowOptional] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [closingFileName, setClosingFileName] = useState<string | null>(null);

  /* ── Rent fields ── */
  const [monthlyRent, setMonthlyRent] = useState((fin.projectedMonthlyRent ?? 0).toString());
  const [leaseStart, setLeaseStart] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [annualTax, setAnnualTax] = useState((fin.operatingExpenseTaxes ?? 0).toString());
  const [annualInsurance, setAnnualInsurance] = useState((fin.operatingExpenseInsurance ?? 0).toString());

  /* ── Derived: hold duration ── */
  const holdDays = holdDaysFrom(project);
  const holdMonths = holdDays / 30;

  /* ── Sell KPIs ── */
  const purchasePrice = fin.purchasePrice ?? 0;
  const salePriceNum = Number(salePrice) || 0;
  const rehabNum = Number(rehabCost) || 0;
  const closingNum = Number(closingCosts) || 0;
  const legalNum = Number(legalCosts) || 0;
  const holdingNum = Number(monthlyHolding) * holdMonths;

  const totalCost = purchasePrice + rehabNum + holdingNum + closingNum + legalNum;
  const netProfit = salePriceNum - totalCost;
  const roi = (purchasePrice + rehabNum) > 0
    ? (netProfit / (purchasePrice + rehabNum)) * 100
    : 0;
  const annRoi = holdDays > 0 ? roi * (365 / holdDays) : 0;

  /* ── Validation flags ── */
  const isLoss = salePriceNum > 0 && salePriceNum < purchasePrice + rehabNum;
  const isExtendedHold = holdDays > 180;

  /* ── Sell mandatory completeness ── */
  const sellMandatoryFilled = useMemo(() => {
    return (
      salePriceNum > 0 &&
      rehabNum > 0 &&
      closingNum >= 0 &&
      Number(monthlyHolding) >= 0
    );
  }, [salePriceNum, rehabNum, closingNum, monthlyHolding]);

  /* ── Rent mandatory completeness ── */
  const rentMandatoryFilled = useMemo(() => {
    return (
      Number(monthlyRent) > 0 &&
      leaseStart !== '' &&
      Number(annualTax) >= 0 &&
      Number(annualInsurance) >= 0
    );
  }, [monthlyRent, leaseStart, annualTax, annualInsurance]);

  const canSubmit = strategy === 'Sell' ? sellMandatoryFilled : rentMandatoryFilled;

  /* ── Handlers ── */
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setClosingFileName(file.name);
  }

  function handleSave() {
    if (strategy === 'Sell') {
      onSave({
        actualSalePrice: salePriceNum,
        projectedRehabCost: rehabNum,
        finalClosingCosts: closingNum,
        totalHoldingCosts: Number(monthlyHolding),
        buyersAgentCommission: Number(buyerComm),
        sellersAgentCommission: Number(sellerComm),
        stagingAndMarketingCosts: Number(marketingSpend),
        legalCosts: legalNum,
        soldDate: new Date(),
      } as any);
      toast.success('Sale data saved.', {
        style: { background: '#182127', color: '#dae4ec' },
      });
    } else {
      onSave({
        projectedMonthlyRent: Number(monthlyRent),
        operatingExpenseTaxes: Number(annualTax),
        operatingExpenseInsurance: Number(annualInsurance),
        tenantName,
        leaseStartDate: leaseStart,
        annualPropertyTax: Number(annualTax),
        annualInsurance: Number(annualInsurance),
      } as any);
      toast.success('Rental data saved.', {
        style: { background: '#182127', color: '#dae4ec' },
      });
    }
  }

  /* ════════════
     SELL PATH
     ════════════ */
  if (strategy === 'Sell') {
    return (
      <div className="space-y-8">

        {/* ── Warning banners ── */}
        {isLoss && (
          <div className="flex items-start gap-3 p-4 border border-color-error bg-error-container/20">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-color-error" />
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-color-error">Loss_Warning</p>
              <p className="text-[10px] mt-0.5 text-pw-muted">
                Sale price is below total investment. Verify inputs.
              </p>
            </div>
          </div>
        )}
        {isExtendedHold && (
          <div className="flex items-start gap-3 p-4 border border-pw-border bg-pw-bg/50">
            <Clock className="w-4 h-4 shrink-0 mt-0.5 text-pw-muted" />
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-pw-black">Extended_Hold</p>
              <p className="text-[10px] mt-0.5 text-pw-muted">
                Hold duration exceeds 180 days ({holdDays} days). Carrying costs may erode margin.
              </p>
            </div>
          </div>
        )}

        {/* ── KPI Strip ── */}
        <div className="flex gap-px bg-pw-border overflow-hidden">
          <KpiCard
            label="Net_Profit"
            value={`${netProfit >= 0 ? '' : '−'}$${fmt(Math.abs(netProfit))}`}
            sub={`Total cost $${fmt(totalCost)}`}
            positive={netProfit >= 0}
            warning={isLoss}
          />
          <KpiCard
            label="ROI"
            value={`${roi >= 0 ? '' : '−'}${Math.abs(roi).toFixed(1)}%`}
            sub="on capital deployed"
            positive={roi >= 0}
          />
          <KpiCard
            label="Annualized_ROI"
            value={`${annRoi >= 0 ? '' : '−'}${Math.abs(annRoi).toFixed(1)}%`}
            sub={`${holdDays}d hold`}
            positive={annRoi >= 0}
          />
        </div>

        {/* ── Mandatory Fields ── */}
        <section>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-3 text-pw-muted">
            Mandatory_Fields
          </p>
          <div className="space-y-3">
            <ReadOnlyField
              label="Purchase_Price [read-only · Phase 1 Snapshot]"
              value={`$${fmt(purchasePrice)}`}
              note="immutable"
            />

            <FieldBox label="Sale_Price [$]" required>
              <input
                type="number"
                value={salePrice}
                onChange={e => setSalePrice(e.target.value)}
                className="bg-transparent text-3xl font-black font-mono w-full focus:outline-none tracking-tighter text-pw-black"
                placeholder="0"
              />
            </FieldBox>

            <FieldBox label="Overall_Rehab_Cost [$]" required>
              <input
                type="number"
                value={rehabCost}
                onChange={e => setRehabCost(e.target.value)}
                className="bg-transparent text-xl font-black font-mono w-full focus:outline-none text-pw-black"
                placeholder="0"
              />
            </FieldBox>

            <div className="grid grid-cols-2 gap-3">
              <FieldBox label="Monthly_Holding_Costs [$]" required>
                <input
                  type="number"
                  value={monthlyHolding}
                  onChange={e => setMonthlyHolding(e.target.value)}
                  className="bg-transparent text-xl font-black font-mono w-full focus:outline-none text-pw-black"
                  placeholder="0"
                />
                <p className="text-[9px] mt-1.5 font-bold uppercase tracking-wider text-pw-subtle">
                  × {holdMonths.toFixed(1)} mo = ${fmt(holdingNum)}
                </p>
              </FieldBox>

              <ReadOnlyField
                label="Hold_Duration [auto]"
                value={`${holdDays}d`}
                note={`≈ ${holdMonths.toFixed(1)} mo`}
              />
            </div>

            {/* Closing Costs — file upload + amount */}
            <FieldBox label="Closing_Costs [HUD-1 / Settlement Statement]" required>
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="number"
                  value={closingCosts}
                  onChange={e => setClosingCosts(e.target.value)}
                  className="bg-transparent text-xl font-black font-mono flex-1 focus:outline-none text-pw-black"
                  placeholder="0"
                />
                <span className="text-[9px] font-bold uppercase tracking-wider text-pw-subtle">$</span>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 pw-btn pw-btn--secondary py-1.5 px-3 text-[9px] font-black uppercase tracking-wider transition-colors"
              >
                <Upload className="w-3 h-3" />
                {closingFileName ? closingFileName : 'Upload_HUD-1'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={handleFileChange}
              />
            </FieldBox>

            <FieldBox label="Legal_Costs [$]" required>
              <input
                type="number"
                value={legalCosts}
                onChange={e => setLegalCosts(e.target.value)}
                className="bg-transparent text-xl font-black font-mono w-full focus:outline-none text-pw-black"
                placeholder="0"
              />
            </FieldBox>
          </div>
        </section>

        {/* ── Optional Fields (collapsible) ── */}
        <section>
          <button
            type="button"
            onClick={() => setShowOptional(v => !v)}
            className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] mb-3 text-pw-muted"
          >
            {showOptional ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Optional_Fields
          </button>
          {showOptional && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FieldBox label="Buyer_Commission [%]">
                  <input
                    type="number"
                    step="0.1"
                    value={buyerComm}
                    onChange={e => setBuyerComm(e.target.value)}
                    className="bg-transparent text-lg font-black font-mono w-full focus:outline-none text-pw-black"
                  />
                </FieldBox>
                <FieldBox label="Seller_Commission [%]">
                  <input
                    type="number"
                    step="0.1"
                    value={sellerComm}
                    onChange={e => setSellerComm(e.target.value)}
                    className="bg-transparent text-lg font-black font-mono w-full focus:outline-none text-pw-black"
                  />
                </FieldBox>
              </div>
              <FieldBox label="Marketing_Spend [$]">
                <input
                  type="number"
                  value={marketingSpend}
                  onChange={e => setMarketingSpend(e.target.value)}
                  className="bg-transparent text-lg font-black font-mono w-full focus:outline-none text-pw-black"
                  placeholder="0"
                />
              </FieldBox>
            </div>
          )}
        </section>

        {/* ── CTA ── */}
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSubmit}
          className={`w-full py-5 font-black text-xs uppercase tracking-[0.5em] transition-all active:scale-95 pw-btn ${
            canSubmit ? 'pw-btn--primary' : 'pw-btn--secondary opacity-50 cursor-not-allowed'
          }`}
        >
          {canSubmit ? (
            <span className="flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Finalize Sale
            </span>
          ) : (
            'Complete all required fields to continue'
          )}
        </button>
      </div>
    );
  }

  /* ════════════
     RENT PATH
     ════════════ */
  return (
    <div className="space-y-8">

      {/* ── KPI Strip (Rent) ── */}
      <div className="flex gap-px bg-pw-border overflow-hidden">
        <KpiCard
          label="Gross_Annual_Rent"
          value={`$${fmt(Number(monthlyRent) * 12)}`}
          sub="before vacancy"
        />
        <KpiCard
          label="Annual_Operating_Costs"
          value={`$${fmt(Number(annualTax) + Number(annualInsurance))}`}
          sub="tax + insurance"
        />
        <KpiCard
          label="Cash_on_Cash"
          value={
            purchasePrice > 0 && Number(monthlyRent) > 0
              ? `${(((Number(monthlyRent) * 12 - Number(annualTax) - Number(annualInsurance)) / purchasePrice) * 100).toFixed(1)}%`
              : '—'
          }
          sub="gross CoC estimate"
        />
      </div>

      {/* ── Mandatory Fields ── */}
      <section>
        <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-3 text-pw-muted">
          Mandatory_Fields
        </p>
        <div className="space-y-3">
          <FieldBox label="Monthly_Rent [$]" required>
            <input
              type="number"
              value={monthlyRent}
              onChange={e => setMonthlyRent(e.target.value)}
              className="bg-transparent text-3xl font-black font-mono w-full focus:outline-none tracking-tighter text-pw-black"
              placeholder="0"
            />
          </FieldBox>

          <FieldBox label="Lease_Start_Date" required>
            <input
              type="date"
              value={leaseStart}
              onChange={e => setLeaseStart(e.target.value)}
              className="bg-transparent text-lg font-black font-mono w-full focus:outline-none text-pw-black"
            />
          </FieldBox>

          <div className="grid grid-cols-2 gap-3">
            <FieldBox label="Annual_Property_Tax [$]" required>
              <input
                type="number"
                value={annualTax}
                onChange={e => setAnnualTax(e.target.value)}
                className="bg-transparent text-xl font-black font-mono w-full focus:outline-none text-pw-black"
                placeholder="0"
              />
            </FieldBox>
            <FieldBox label="Annual_Insurance [$]" required>
              <input
                type="number"
                value={annualInsurance}
                onChange={e => setAnnualInsurance(e.target.value)}
                className="bg-transparent text-xl font-black font-mono w-full focus:outline-none text-pw-black"
                placeholder="0"
              />
            </FieldBox>
          </div>

          {/* Tenant name — optional for privacy */}
          <FieldBox label="Tenant_Name [optional · privacy protected]">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 shrink-0 text-pw-subtle" />
              <input
                type="text"
                value={tenantName}
                onChange={e => setTenantName(e.target.value)}
                className="bg-transparent text-sm font-black w-full focus:outline-none text-pw-black"
                placeholder="—"
              />
            </div>
          </FieldBox>
        </div>
      </section>

      {/* ── CTA ── */}
      <button
        type="button"
        onClick={handleSave}
        disabled={!canSubmit}
        className={`w-full py-5 font-black text-xs uppercase tracking-[0.5em] transition-all active:scale-95 pw-btn ${
          canSubmit ? 'pw-btn--primary' : 'pw-btn--secondary opacity-50 cursor-not-allowed'
        }`}
      >
        {canSubmit ? (
          <span className="flex items-center justify-center gap-2">
            <TrendingUp className="w-4 h-4" /> Save Rental Profile
          </span>
        ) : (
          'Complete all required fields to continue'
        )}
      </button>
    </div>
  );
}
