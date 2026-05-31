'use client';

import { useMemo } from 'react';
import { Project } from '@/types/schema';
import { deriveAllMetrics, computeIRR, buildIRRCashFlows } from '@/lib/metrics/reiMetrics';

export type ScopeMode = 'property' | 'myShare';
export type PeriodFilter = 'M' | 'Q' | 'Y' | 'ALL';

interface CommandCenterKPIStripProps {
  projects: Project[];
  scope: ScopeMode;
  period: PeriodFilter;
}

function formatCurrency(value: number): string {
  if (!isFinite(value) || isNaN(value)) return '--';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

function formatPercent(value: number): string {
  if (!isFinite(value) || isNaN(value)) return '--';
  return `${value.toFixed(1)}%`;
}

function periodCutoff(period: PeriodFilter): Date | null {
  const now = new Date();
  switch (period) {
    case 'M': return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    case 'Q': return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    case 'Y': return new Date(now.getFullYear(), 0, 1);
    case 'ALL':
    default: return null;
  }
}

interface MetricCardData {
  label: string;
  value: string;
  isWarning: boolean;
  visualType: 'bar' | 'line' | 'badge' | 'box';
}

export default function CommandCenterKPIStrip({ projects, scope, period }: CommandCenterKPIStripProps) {
  const filteredProjects = useMemo(() => {
    const cutoff = periodCutoff(period);
    return cutoff
      ? projects.filter(p => {
          const created = p.createdAt ? new Date(p.createdAt) : null;
          return created && created >= cutoff;
        })
      : projects;
  }, [projects, period]);

  const kpis = useMemo(() => {
    if (filteredProjects.length === 0) {
      return {
        noi: 0,
        cashFlow: 0,
        capRate: 0,
        coc: 0,
        grm: 0,
        dscr: 0,
        irr: 0,
        occupancy: 100,
        oer: 0,
        appreciation: 0,
        capitalRaised: 0,
      };
    }

    let totalNOI = 0;
    let totalCashFlow = 0;
    let totalPurchasePrice = 0;
    let totalCashInvested = 0;
    let totalPropertyValue = 0;
    let totalGrossRentalIncome = 0;
    let totalOpEx = 0;
    let totalAnnualDebtService = 0;
    let totalCapitalRaised = 0;
    
    let totalUnits = 0;
    let totalOccupancyWeighted = 0;
    let totalAppreciationWeighted = 0;
    let totalAppreciationWeight = 0;
    
    const allIRRFlows: number[][] = [];

    for (const p of filteredProjects) {
      const f = p.financials;
      if (!f) continue;

      const metrics = deriveAllMetrics(
        f,
        f.estimatedCurrentValue || f.estimatedARV,
        p.strategyType,
        p.currentPhase,
        p.createdAt
      );

      const factor = scope === 'myShare'
        ? (f.ownershipPercentage ?? 100) / 100
        : 1;

      const purchasePrice = f.purchasePrice ?? f.targetPrice ?? f.targetPurchasePrice ?? 0;
      const loanAmount = f.loanAmount ?? 0;
      const committedCapital = f.committedCapital ?? f.capitalRaiseTarget ?? (purchasePrice - loanAmount);
      
      const value = (f.estimatedCurrentValue || f.estimatedARV || purchasePrice || 0) * factor;

      totalNOI += metrics.noi * factor;
      totalCashFlow += metrics.annualCashFlow * factor;
      totalPurchasePrice += purchasePrice * factor;
      totalCashInvested += metrics.totalCashInvested * factor;
      totalPropertyValue += value;
      totalGrossRentalIncome += metrics.noiComponents.grossRentalIncome * factor;
      totalOpEx += metrics.noiComponents.totalOperatingExpenses * factor;
      totalAnnualDebtService += metrics.annualDebtService * factor;
      totalCapitalRaised += committedCapital * factor;

      // Occupancy
      const units = f.numberOfUnits ?? 1;
      totalUnits += units;
      totalOccupancyWeighted += metrics.occupancyRate * units;

      // Appreciation
      totalAppreciationWeighted += (metrics.annualizedAppreciation || 0) * purchasePrice;
      totalAppreciationWeight += purchasePrice;

      // IRR cash flows
      const holdYears = f.loanTermYears ?? 5;
      const flows = buildIRRCashFlows(
        metrics.totalCashInvested * factor,
        metrics.annualCashFlow * factor,
        Math.min(holdYears, 10),
        purchasePrice,
        metrics.annualizedAppreciation || 3,
        loanAmount * factor,
        f.loanInterestRate ?? 0,
        f.loanTermYears ?? 30,
      );
      if (flows.length >= 2) allIRRFlows.push(flows);
    }

    let portfolioIRR: number | null = null;
    if (allIRRFlows.length > 0) {
      const maxLen = Math.max(...allIRRFlows.map(f => f.length));
      const merged: number[] = Array(maxLen).fill(0);
      for (const flows of allIRRFlows) {
        for (let i = 0; i < flows.length; i++) {
          merged[i] += flows[i];
        }
      }
      portfolioIRR = computeIRR(merged);
    }

    const avgCapRate = totalPurchasePrice > 0 ? (totalNOI / totalPurchasePrice) * 100 : 0;
    const avgCoC = totalCashInvested > 0 ? (totalCashFlow / totalCashInvested) * 100 : 0;
    const avgGRM = totalGrossRentalIncome > 0 ? (totalPropertyValue / totalGrossRentalIncome) : 0;
    const avgDSCR = totalAnnualDebtService > 0 ? (totalNOI / totalAnnualDebtService) : (totalNOI > 0 ? 999 : 0);
    const avgOccupancy = totalUnits > 0 ? totalOccupancyWeighted / totalUnits : 100;
    const avgOer = totalGrossRentalIncome > 0 ? (totalOpEx / totalGrossRentalIncome) * 100 : 0;
    const avgAppreciation = totalAppreciationWeight > 0 ? totalAppreciationWeighted / totalAppreciationWeight : 0;
    const computedIrr = portfolioIRR != null ? portfolioIRR * 100 : null;

    return {
      noi: totalNOI,
      cashFlow: totalCashFlow,
      capRate: avgCapRate,
      coc: avgCoC,
      grm: avgGRM,
      dscr: avgDSCR,
      irr: computedIrr ?? 0,
      occupancy: avgOccupancy,
      oer: avgOer,
      appreciation: avgAppreciation,
      capitalRaised: totalCapitalRaised,
    };
  }, [filteredProjects, scope]);

  const cardsList: MetricCardData[] = useMemo(() => {
    return [
      {
        label: 'NOI',
        value: formatCurrency(kpis.noi),
        isWarning: kpis.noi < 0,
        visualType: 'bar',
      },
      {
        label: 'Cash Flow',
        value: formatCurrency(kpis.cashFlow),
        isWarning: kpis.cashFlow < 0,
        visualType: 'line',
      },
      {
        label: 'Cap Rate',
        value: formatPercent(kpis.capRate),
        isWarning: false,
        visualType: 'badge',
      },
      {
        label: 'CoC',
        value: formatPercent(kpis.coc),
        isWarning: kpis.coc < 4 && kpis.coc > 0,
        visualType: 'badge',
      },
      {
        label: 'GRM',
        value: kpis.grm > 0 ? kpis.grm.toFixed(1) : '--',
        isWarning: false,
        visualType: 'box',
      },
      {
        label: 'DSCR',
        value: kpis.dscr === 999 ? '999' : (kpis.dscr > 0 ? kpis.dscr.toFixed(2) : '--'),
        isWarning: kpis.dscr < 1.15 && kpis.dscr > 0,
        visualType: 'box',
      },
      {
        label: 'IRR',
        value: kpis.irr > 0 ? formatPercent(kpis.irr) : '--',
        isWarning: kpis.irr < 12 && kpis.irr > 0,
        visualType: 'box',
      },
      {
        label: 'Occupancy',
        value: formatPercent(kpis.occupancy),
        isWarning: kpis.occupancy < 90,
        visualType: 'box',
      },
      {
        label: 'Exp Ratio',
        value: formatPercent(kpis.oer),
        isWarning: kpis.oer > 45,
        visualType: 'box',
      },
      {
        label: 'Appreciation',
        value: formatPercent(kpis.appreciation),
        isWarning: false,
        visualType: 'box',
      },
      {
        label: 'Cap Raised',
        value: formatCurrency(kpis.capitalRaised),
        isWarning: false,
        visualType: 'box',
      },
    ];
  }, [kpis]);

  return (
    <section className="overflow-x-auto hide-scrollbar no-scrollbar -mx-gutter-mobile px-gutter-mobile py-2">
      <div className="flex gap-3 w-max">
        {cardsList.map((card, idx) => {
          const borderBottomColor = card.isWarning
            ? 'rgba(239, 68, 68, 0.5)' // border-error/50
            : 'rgba(45, 212, 191, 0.5)'; // border-primary/50

          return (
            <div
              key={`${card.label}-${idx}`}
              className="w-32 glass-card p-3 rounded-xl flex flex-col justify-between relative overflow-hidden"
              style={{
                borderBottom: `2px solid ${borderBottomColor}`,
              }}
            >
              <div>
                <span className="font-label-sm text-[10px] text-on-surface-variant block mb-1">
                  {card.label}
                </span>
                <span className="font-headline-md text-xl text-primary font-bold">
                  {card.value}
                </span>
              </div>
              
              {/* Visual mini-sparkline matching Stitch */}
              {card.visualType === 'bar' && (
                <div className="mt-4 h-4 w-full flex items-end gap-0.5 opacity-40">
                  <div className="h-1 w-full bg-primary"></div>
                  <div className="h-2 w-full bg-primary"></div>
                  <div className="h-3 w-full bg-primary"></div>
                  <div className="h-4 w-full bg-primary"></div>
                </div>
              )}

              {card.visualType === 'line' && (
                <div className="mt-4 h-4 w-full flex items-center opacity-40">
                  <div className="w-full h-[1px] bg-primary"></div>
                </div>
              )}

              {card.visualType === 'badge' && (
                <div
                  className={`mt-4 h-4 w-full rounded border ${
                    card.isWarning
                      ? 'bg-error/10 border-error/20'
                      : 'bg-primary/5 border-primary/20'
                  }`}
                />
              )}

              {card.visualType === 'box' && (
                <div className="mt-4 h-4 w-full bg-primary/5 rounded" />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
