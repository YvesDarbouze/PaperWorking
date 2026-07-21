'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { DollarSign, Percent, Sparkles, TrendingUp, HelpCircle } from 'lucide-react';
import type { Project } from '@/types/schema';
import toast from 'react-hot-toast';
import { deriveAllMetrics } from '@/lib/metrics/reiMetrics';

interface IncomeAssumptionsCardProps {
  project: Project;
  phaseColor?: string;
  onSave: (updates: any) => Promise<void>;
}

export function IncomeAssumptionsCard({
  project,
  phaseColor = '#ffac5a',
  onSave,
}: IncomeAssumptionsCardProps) {
  const unitCount = Math.max(1, project.units || 1);

  // Initialize per-unit rents
  const [unitRents, setUnitRents] = useState<number[]>(() => {
    if (project.financials?.unitRents && project.financials.unitRents.length === unitCount) {
      return [...project.financials.unitRents];
    }
    // Fallback: split gross_rent_per_unit evenly, or default to 0
    const totalRent = project.financials?.gross_rent_per_unit || 0;
    if (totalRent > 0) {
      const avg = Math.round((totalRent / unitCount) * 100) / 100;
      return Array(unitCount).fill(avg);
    }
    return Array(unitCount).fill(0);
  });

  // Initialize other income and vacancy percentage
  const [otherIncome, setOtherIncome] = useState<string>(() => {
    return project.financials?.other_income !== undefined && project.financials?.other_income !== null
      ? project.financials.other_income.toString()
      : '0';
  });

  const [vacancyPct, setVacancyPct] = useState<string>(() => {
    return project.financials?.vacancy_pct !== undefined && project.financials?.vacancy_pct !== null
      ? project.financials.vacancy_pct.toString()
      : '7'; // Default to middle of 5-8% range
  });

  const [isSaving, setIsSaving] = useState(false);

  // Sync state when project changes
  useEffect(() => {
    const existingRents = project.financials?.unitRents || [];
    let nextRents = [...existingRents];
    if (nextRents.length !== unitCount) {
      if (nextRents.length < unitCount) {
        const totalRent = project.financials?.gross_rent_per_unit || 0;
        const defaultRent = totalRent > 0 ? Math.round((totalRent / unitCount) * 100) / 100 : 0;
        while (nextRents.length < unitCount) {
          nextRents.push(defaultRent);
        }
      } else {
        nextRents = nextRents.slice(0, unitCount);
      }
    }
    setUnitRents(nextRents);

    setOtherIncome(
      project.financials?.other_income !== undefined && project.financials?.other_income !== null
        ? project.financials.other_income.toString()
        : '0'
    );

    setVacancyPct(
      project.financials?.vacancy_pct !== undefined && project.financials?.vacancy_pct !== null
        ? project.financials.vacancy_pct.toString()
        : '7'
    );
  }, [project.id, unitCount]);

  const handleUnitRentChange = (index: number, val: number) => {
    const next = [...unitRents];
    next[index] = Math.max(0, val);
    setUnitRents(next);
  };

  // Calculations (must match reiMetrics.ts exactly)
  const monthlyGrossRent = useMemo(() => {
    return unitRents.reduce((a, b) => a + b, 0);
  }, [unitRents]);

  const annualGrossRent = useMemo(() => {
    return monthlyGrossRent * 12;
  }, [monthlyGrossRent]);

  const otherIncomeVal = useMemo(() => {
    return parseFloat(otherIncome) || 0;
  }, [otherIncome]);

  const annualOtherIncome = useMemo(() => {
    return otherIncomeVal * 12;
  }, [otherIncomeVal]);

  const vacancyRate = useMemo(() => {
    return parseFloat(vacancyPct) || 0;
  }, [vacancyPct]);

  const annualVacancyLoss = useMemo(() => {
    return annualGrossRent * (vacancyRate / 100);
  }, [annualGrossRent, vacancyRate]);

  const annualEGI = useMemo(() => {
    return annualGrossRent + annualOtherIncome - annualVacancyLoss;
  }, [annualGrossRent, annualOtherIncome, annualVacancyLoss]);

  const monthlyEGI = useMemo(() => {
    return annualEGI / 12;
  }, [annualEGI]);

  const liveMetrics = useMemo(() => {
    const tempFinancials = {
      purchasePrice: 100000,
      monthlyGrossRent: monthlyGrossRent,
      other_income: otherIncomeVal,
      vacancyRatePercent: vacancyRate,
    };
    return deriveAllMetrics(tempFinancials as any, undefined, 'RENT', 1);
  }, [monthlyGrossRent, otherIncomeVal, vacancyRate]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = {
        'financials.gross_rent_per_unit': monthlyGrossRent,
        'financials.other_income': otherIncomeVal,
        'financials.vacancy_pct': vacancyRate,
        'financials.unitRents': unitRents,
      };

      await onSave(updates);
      toast.success('Income assumptions saved successfully!');
    } catch (err) {
      console.error('Failed to save income assumptions:', err);
      toast.error('Failed to save income assumptions');
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="rounded-xl border border-white/5 bg-[#161217] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.01] px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5">
            <TrendingUp className="h-4 w-4 text-[#ffac5a]" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-white">Income Assumptions</h4>
            <p className="text-[9px] text-[#9E9DA0]">"What will this property realistically bring in?"</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-3 py-1 rounded bg-[#241e26] border border-white/10 hover:bg-white/5 text-white text-[9px] font-bold uppercase tracking-widest transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Income'}
        </button>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Per-unit inputs */}
          <div className="space-y-4">
            <div>
              <span className="block text-[8px] uppercase tracking-widest text-[#9E9DA0] font-bold mb-2">
                Unit Rents ({unitCount} leasable units)
              </span>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {unitRents.map((rent, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white/[0.01] border border-white/5 p-2 rounded-lg gap-3">
                    <span className="text-xs text-white/70 font-semibold uppercase tracking-wider text-[10px]">
                      Unit {idx + 1}
                    </span>
                    <div className="relative w-[130px]">
                      <DollarSign className="absolute left-2 top-1.5 h-3.5 w-3.5 text-[#9E9DA0]" />
                      <input
                        type="number"
                        value={rent || ''}
                        onChange={(e) => handleUnitRentChange(idx, parseFloat(e.target.value) || 0)}
                        placeholder={idx === 0 ? "Gross Monthly Rent" : "0"}
                        className="w-full pl-6 pr-2.5 rounded py-1 text-xs bg-[#161217] border border-white/10 text-white focus:outline-none focus:border-[#ffac5a] font-mono text-right"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Other income input */}
            <div className="flex items-center justify-between bg-white/[0.01] border border-white/5 p-3 rounded-lg gap-3">
              <div>
                <span className="block text-[10px] text-white/70 font-semibold uppercase tracking-wider">Other Income</span>
                <span className="block text-[8px] text-[#9E9DA0] mt-0.5">Parking, laundry, storage, etc. (monthly)</span>
              </div>
              <div className="relative w-[130px]">
                <DollarSign className="absolute left-2 top-1.5 h-3.5 w-3.5 text-[#9E9DA0]" />
                <input
                  type="number"
                  value={otherIncome}
                  onChange={(e) => setOtherIncome(e.target.value)}
                  placeholder="0"
                  className="w-full pl-6 pr-2.5 rounded py-1 text-xs bg-[#161217] border border-white/10 text-white focus:outline-none focus:border-[#ffac5a] font-mono text-right"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Vacancy and EGI Rollups */}
          <div className="space-y-6 flex flex-col justify-between">
            {/* Vacancy input */}
            <div className="bg-white/[0.01] border border-white/5 p-4 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-[10px] text-white/70 font-semibold uppercase tracking-wider">Vacancy Allowance</span>
                  <span className="block text-[8px] text-[#9E9DA0] mt-0.5">Assumed market vacancy percentage</span>
                </div>
                <div className="relative w-[80px]">
                  <input
                    type="number"
                    value={vacancyPct}
                    onChange={(e) => setVacancyPct(e.target.value)}
                    placeholder="7"
                    className="w-full pr-6 pl-2.5 rounded py-1 text-xs bg-[#161217] border border-white/10 text-white focus:outline-none focus:border-[#ffac5a] font-mono text-right"
                  />
                  <Percent className="absolute right-2.5 top-1.5 h-3.5 w-3.5 text-[#9E9DA0]" />
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[8px] text-yellow-400/80 bg-yellow-400/5 border border-yellow-400/10 rounded px-2.5 py-1.5">
                <HelpCircle className="h-3 w-3 shrink-0" />
                <span>Default is typically 5%–8% depending on local asset submarket conditions.</span>
              </div>
            </div>

            {/* Live EGI display */}
            <div className="bg-white/[0.02] border border-white/10 p-5 rounded-lg space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#9E9DA0] tracking-wider">Scheduled Gross Rent</span>
                  <span className="block text-[8px] text-[#9E9DA0] mt-0.5">Sum of unit rents ({formatCurrency(monthlyGrossRent)} / mo)</span>
                </div>
                <span className="text-sm font-mono font-bold text-white">{formatCurrency(annualGrossRent)} / yr</span>
              </div>

              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#9E9DA0] tracking-wider">Vacancy Loss</span>
                  <span className="block text-[8px] text-[#9E9DA0] mt-0.5">Based on {vacancyRate}% vacancy rate</span>
                </div>
                <span className="text-sm font-mono font-semibold text-red-400">-{formatCurrency(annualVacancyLoss)} / yr</span>
              </div>

              <div className="flex flex-col gap-3 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#ffac5a] tracking-wider flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Effective Gross Income (EGI)
                    </span>
                    <span className="block text-[8px] text-[#9E9DA0] mt-0.5">Local Calculated EGI</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-mono font-bold text-[#ffac5a] block">{formatCurrency(annualEGI)} / yr</span>
                    <span className="text-[9px] font-mono text-[#9E9DA0]">{formatCurrency(monthlyEGI)} / mo</span>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 p-2 rounded-lg">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-white/70 tracking-wider">Engine Function EGI</span>
                    <span className="block text-[8px] text-[#9E9DA0] mt-0.5">deriveAllMetrics() output</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-mono font-bold text-white block">
                      {formatCurrency(liveMetrics.noiComponents.egi ?? 0)} / yr
                    </span>
                    <span className="text-[9px] font-mono text-[#9E9DA0]">
                      {formatCurrency((liveMetrics.noiComponents.egi ?? 0) / 12)} / mo
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
