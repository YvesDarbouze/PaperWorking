'use client';

import { useState } from 'react';
import {
  parseStoredCashFlowEvents,
  serializeCashFlowEventsForPersistence,
  type StoredCashFlowEvent,
} from '@paperworking/financial-engine';
import { patchProjectFromBff } from '@/lib/projects/project-api';
import { PROJECT_KPIS_REFRESH_EVENT } from '@/components/insights/ProjectScorecardPanel';
import CashFlowScheduleSection from '@/components/projects/CashFlowScheduleSection';

type FinancialFormState = {
  purchasePrice: string;
  potentialRentalIncomeMonthly: string;
  otherIncomeAnnual: string;
  vacancyRatePercent: string;
  operatingExpenseTaxes: string;
  operatingExpenseInsurance: string;
  maintenanceReserves: string;
  propertyManagementFee: string;
  loanAmount: string;
  loanInterestRate: string;
  loanTermYears: string;
  totalCashInvested: string;
  numberOfUnits: string;
  occupiedUnits: string;
  ppePreviousYear: string;
  ppeCurrentYear: string;
  depreciationCurrentYear: string;
  financialRiskScore: string;
  marketRiskScore: string;
  operationalRiskScore: string;
  complianceRiskScore: string;
};

function toNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function initialFromFinancials(
  financials?: Record<string, unknown> | null,
  purchasePrice?: number | null,
): FinancialFormState {
  const fin = financials ?? {};
  const monthlyRent =
    fin.potentialRentalIncomeMonthly != null
      ? String(fin.potentialRentalIncomeMonthly)
      : fin.monthlyGrossRent != null
        ? String(fin.monthlyGrossRent)
        : '';
  return {
    purchasePrice:
      purchasePrice != null
        ? String(purchasePrice)
        : fin.purchasePrice != null
          ? String(fin.purchasePrice)
          : '',
    potentialRentalIncomeMonthly: monthlyRent,
    otherIncomeAnnual:
      fin.otherIncome != null
        ? String(fin.otherIncome)
        : fin.otherIncomeAnnual != null
          ? String(fin.otherIncomeAnnual)
          : '',
    vacancyRatePercent: fin.vacancyRatePercent != null ? String(fin.vacancyRatePercent) : '',
    operatingExpenseTaxes:
      fin.operatingExpenseTaxes != null ? String(fin.operatingExpenseTaxes) : '',
    operatingExpenseInsurance:
      fin.operatingExpenseInsurance != null ? String(fin.operatingExpenseInsurance) : '',
    maintenanceReserves:
      fin.maintenanceReserves != null
        ? String(fin.maintenanceReserves)
        : fin.maintenance != null
          ? String(fin.maintenance)
          : '',
    propertyManagementFee:
      fin.propertyManagementFee != null ? String(fin.propertyManagementFee) : '',
    loanAmount: fin.loanAmount != null ? String(fin.loanAmount) : '',
    loanInterestRate: fin.loanInterestRate != null ? String(fin.loanInterestRate) : '',
    loanTermYears: fin.loanTermYears != null ? String(fin.loanTermYears) : '',
    totalCashInvested: fin.totalCashInvested != null ? String(fin.totalCashInvested) : '',
    numberOfUnits: fin.numberOfUnits != null ? String(fin.numberOfUnits) : '',
    occupiedUnits: fin.occupiedUnits != null ? String(fin.occupiedUnits) : '',
    ppePreviousYear: fin.ppePreviousYear != null ? String(fin.ppePreviousYear) : '',
    ppeCurrentYear: fin.ppeCurrentYear != null ? String(fin.ppeCurrentYear) : '',
    depreciationCurrentYear:
      fin.depreciationCurrentYear != null ? String(fin.depreciationCurrentYear) : '',
    financialRiskScore: fin.financialRiskScore != null ? String(fin.financialRiskScore) : '',
    marketRiskScore: fin.marketRiskScore != null ? String(fin.marketRiskScore) : '',
    operationalRiskScore:
      fin.operationalRiskScore != null ? String(fin.operationalRiskScore) : '',
    complianceRiskScore:
      fin.complianceRiskScore != null ? String(fin.complianceRiskScore) : '',
  };
}

export default function ProjectFinancialInputsPanel({
  projectId,
  purchasePrice,
  financials,
  onSaved,
}: {
  projectId: string;
  purchasePrice?: number | null;
  financials?: Record<string, unknown> | null;
  onSaved?: () => void;
}) {
  const [form, setForm] = useState<FinancialFormState>(() =>
    initialFromFinancials(financials, purchasePrice),
  );
  const [cashFlowEvents, setCashFlowEvents] = useState<StoredCashFlowEvent[]>(() =>
    parseStoredCashFlowEvents(financials),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function updateField(key: keyof FinancialFormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleCashFlowChange(events: StoredCashFlowEvent[]) {
    setCashFlowEvents(events);
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const patch: Record<string, unknown> = {};
    const price = toNumber(form.purchasePrice);
    const rent = toNumber(form.potentialRentalIncomeMonthly);
    const otherIncome = toNumber(form.otherIncomeAnnual);
    const vacancy = toNumber(form.vacancyRatePercent);
    const tax = toNumber(form.operatingExpenseTaxes);
    const insurance = toNumber(form.operatingExpenseInsurance);
    const maintenance = toNumber(form.maintenanceReserves);
    const mgmt = toNumber(form.propertyManagementFee);
    const loan = toNumber(form.loanAmount);
    const rate = toNumber(form.loanInterestRate);
    const term = toNumber(form.loanTermYears);
    const cash = toNumber(form.totalCashInvested);
    const units = toNumber(form.numberOfUnits);
    const occupied = toNumber(form.occupiedUnits);
    const ppePrev = toNumber(form.ppePreviousYear);
    const ppeCurr = toNumber(form.ppeCurrentYear);
    const depreciation = toNumber(form.depreciationCurrentYear);
    const finRisk = toNumber(form.financialRiskScore);
    const mktRisk = toNumber(form.marketRiskScore);
    const opsRisk = toNumber(form.operationalRiskScore);
    const compRisk = toNumber(form.complianceRiskScore);

    if (price !== undefined) patch.purchasePrice = price;
    if (rent !== undefined) {
      patch.potentialRentalIncomeMonthly = rent;
      patch.monthlyGrossRent = rent;
    }
    if (otherIncome !== undefined) patch.otherIncome = otherIncome;
    if (vacancy !== undefined) patch.vacancyRatePercent = vacancy;
    if (tax !== undefined) patch.operatingExpenseTaxes = tax;
    if (insurance !== undefined) patch.operatingExpenseInsurance = insurance;
    if (maintenance !== undefined) patch.maintenanceReserves = maintenance;
    if (mgmt !== undefined) patch.propertyManagementFee = mgmt;
    if (loan !== undefined) patch.loanAmount = loan;
    if (rate !== undefined) patch.loanInterestRate = rate;
    if (term !== undefined) patch.loanTermYears = term;
    if (cash !== undefined) patch.totalCashInvested = cash;
    if (units !== undefined) patch.numberOfUnits = units;
    if (occupied !== undefined) patch.occupiedUnits = occupied;
    if (ppePrev !== undefined) patch.ppePreviousYear = ppePrev;
    else if (form.ppePreviousYear.trim() === '') patch.ppePreviousYear = null;
    if (ppeCurr !== undefined) patch.ppeCurrentYear = ppeCurr;
    else if (form.ppeCurrentYear.trim() === '') patch.ppeCurrentYear = null;
    if (depreciation !== undefined) patch.depreciationCurrentYear = depreciation;
    else if (form.depreciationCurrentYear.trim() === '') patch.depreciationCurrentYear = null;
    if (finRisk !== undefined) patch.financialRiskScore = finRisk;
    else if (form.financialRiskScore.trim() === '') patch.financialRiskScore = null;
    if (mktRisk !== undefined) patch.marketRiskScore = mktRisk;
    else if (form.marketRiskScore.trim() === '') patch.marketRiskScore = null;
    if (opsRisk !== undefined) patch.operationalRiskScore = opsRisk;
    else if (form.operationalRiskScore.trim() === '') patch.operationalRiskScore = null;
    if (compRisk !== undefined) patch.complianceRiskScore = compRisk;
    else if (form.complianceRiskScore.trim() === '') patch.complianceRiskScore = null;
    patch.cashFlowEvents = serializeCashFlowEventsForPersistence(cashFlowEvents);

    const projectPatch: Record<string, unknown> = { financials: patch };
    if (price !== undefined) projectPatch.purchasePrice = price;

    try {
      await patchProjectFromBff(projectId, projectPatch);
      setSaved(true);
      window.dispatchEvent(
        new CustomEvent(PROJECT_KPIS_REFRESH_EVENT, { detail: { projectId } }),
      );
      onSaved?.();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save financial inputs');
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="min-w-0 rounded-2xl border border-white/10 bg-black/25 p-5">
      <h2 className="mb-1 text-lg font-semibold">Project financial inputs</h2>
      <p className="mb-4 text-xs text-white/55">
        These values drive scorecard KPIs using NetSuite definitions. Leave fields blank to show
        N/A where data is required.
      </p>

      <form onSubmit={handleSubmit} className="grid min-w-0 gap-4 md:grid-cols-2">
        <label className="text-sm md:col-span-2">
          <span className="mb-1 block text-xs text-white/55">Purchase price ($)</span>
          <input
            type="number"
            value={form.purchasePrice}
            onChange={(e) => updateField('purchasePrice', e.target.value)}
            className="w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
          />
        </label>

        <p className="md:col-span-2 text-[11px] font-semibold uppercase tracking-wide text-[#00DD94]">
          Income (GOI / NOI)
        </p>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-white/55">Potential rental income ($/mo)</span>
          <input
            type="number"
            value={form.potentialRentalIncomeMonthly}
            onChange={(e) => updateField('potentialRentalIncomeMonthly', e.target.value)}
            className="w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-white/55">Other income ($/yr)</span>
          <input
            type="number"
            value={form.otherIncomeAnnual}
            onChange={(e) => updateField('otherIncomeAnnual', e.target.value)}
            className="w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-white/55">Vacancy rate (%) — not deducted from GOI</span>
          <input
            type="number"
            value={form.vacancyRatePercent}
            onChange={(e) => updateField('vacancyRatePercent', e.target.value)}
            className="w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
          />
        </label>

        <p className="md:col-span-2 text-[11px] font-semibold uppercase tracking-wide text-[#00DD94]">
          Operating expenses (NOI)
        </p>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-white/55">Property tax ($/yr)</span>
          <input
            type="number"
            value={form.operatingExpenseTaxes}
            onChange={(e) => updateField('operatingExpenseTaxes', e.target.value)}
            className="w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-white/55">Insurance ($/yr)</span>
          <input
            type="number"
            value={form.operatingExpenseInsurance}
            onChange={(e) => updateField('operatingExpenseInsurance', e.target.value)}
            className="w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-white/55">Maintenance reserves ($/yr)</span>
          <input
            type="number"
            value={form.maintenanceReserves}
            onChange={(e) => updateField('maintenanceReserves', e.target.value)}
            className="w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-white/55">Property management ($/yr)</span>
          <input
            type="number"
            value={form.propertyManagementFee}
            onChange={(e) => updateField('propertyManagementFee', e.target.value)}
            className="w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
          />
        </label>

        <p className="md:col-span-2 text-[11px] font-semibold uppercase tracking-wide text-[#00DD94]">
          Financing (Cash Flow debt payments)
        </p>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-white/55">Loan amount ($)</span>
          <input
            type="number"
            value={form.loanAmount}
            onChange={(e) => updateField('loanAmount', e.target.value)}
            className="w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-white/55">Loan interest rate (%)</span>
          <input
            type="number"
            step="0.01"
            value={form.loanInterestRate}
            onChange={(e) => updateField('loanInterestRate', e.target.value)}
            className="w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-white/55">Loan term (years)</span>
          <input
            type="number"
            value={form.loanTermYears}
            onChange={(e) => updateField('loanTermYears', e.target.value)}
            className="w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-white/55">Total cash invested ($)</span>
          <input
            type="number"
            value={form.totalCashInvested}
            onChange={(e) => updateField('totalCashInvested', e.target.value)}
            className="w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
          />
        </label>

        <p className="md:col-span-2 text-[11px] font-semibold uppercase tracking-wide text-[#00DD94]">
          CapEx accounting (NetSuite CapEx KPI)
        </p>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-white/55">PP&amp;E previous year ($)</span>
          <input
            type="number"
            value={form.ppePreviousYear}
            onChange={(e) => updateField('ppePreviousYear', e.target.value)}
            className="w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-white/55">PP&amp;E current year ($)</span>
          <input
            type="number"
            value={form.ppeCurrentYear}
            onChange={(e) => updateField('ppeCurrentYear', e.target.value)}
            className="w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-sm md:col-span-2">
          <span className="mb-1 block text-xs text-white/55">Depreciation current year ($)</span>
          <input
            type="number"
            value={form.depreciationCurrentYear}
            onChange={(e) => updateField('depreciationCurrentYear', e.target.value)}
            className="w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
          />
        </label>

        <p className="md:col-span-2 text-[11px] font-semibold uppercase tracking-wide text-[#00DD94]">
          Risk assessment (NetSuite average of four scores)
        </p>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-white/55">Financial risk (0–100)</span>
          <input
            type="number"
            min="0"
            max="100"
            value={form.financialRiskScore}
            onChange={(e) => updateField('financialRiskScore', e.target.value)}
            className="w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-white/55">Market risk (0–100)</span>
          <input
            type="number"
            min="0"
            max="100"
            value={form.marketRiskScore}
            onChange={(e) => updateField('marketRiskScore', e.target.value)}
            className="w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-white/55">Operational risk (0–100)</span>
          <input
            type="number"
            min="0"
            max="100"
            value={form.operationalRiskScore}
            onChange={(e) => updateField('operationalRiskScore', e.target.value)}
            className="w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-white/55">Compliance risk (0–100)</span>
          <input
            type="number"
            min="0"
            max="100"
            value={form.complianceRiskScore}
            onChange={(e) => updateField('complianceRiskScore', e.target.value)}
            className="w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-xs text-white/55">Number of units</span>
          <input
            type="number"
            value={form.numberOfUnits}
            onChange={(e) => updateField('numberOfUnits', e.target.value)}
            className="w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-white/55">Occupied units</span>
          <input
            type="number"
            value={form.occupiedUnits}
            onChange={(e) => updateField('occupiedUnits', e.target.value)}
            className="w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
          />
        </label>

        <CashFlowScheduleSection events={cashFlowEvents} onChange={handleCashFlowChange} />

        <div className="md:col-span-2 flex items-center justify-between gap-3 pt-2">
          <div className="text-xs text-white/55">
            {saved ? 'Saved — scorecard refreshed.' : null}
            {error ? <span className="text-red-300">{error}</span> : null}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#00DD94] px-5 py-2 text-xs font-semibold text-[#0a0a0f] disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save financial inputs'}
          </button>
        </div>
      </form>
    </article>
  );
}
