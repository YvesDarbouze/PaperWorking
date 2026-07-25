import React from "react";
import Link from "next/link";
import { useProjectStore } from "@/store/projectStore";
import { deriveAllMetrics } from "@/lib/metrics/reiMetrics";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * KPIDashStrip — 10 REIL Metric KPI Cards
 *
 * Displays all 10 core REI metrics in a responsive grid.
 * Each card is a glass surface with status zone indicators.
 */

interface KPIMetric {
  slug: string;
  label: string;
  value: string;
  icon: string;
  status: "healthy" | "watch" | "alert";
}

const statusColors: Record<KPIMetric["status"], { bg: string; dot: string; label: string }> = {
  healthy: {
    bg: "rgba(63, 125, 32,0.1)",
    dot: "#3f7d20",
    label: "Healthy",
  },
  watch: {
    bg: "rgba(245,158,11,0.1)",
    dot: "#F59E0B",
    label: "Watch",
  },
  alert: {
    bg: "rgba(239,68,68,0.1)",
    dot: "#F06543",
    label: "Alert",
  },
};

export function KPIDashStrip() {
  const projects = useProjectStore((s) => s.projects);
  const projectsSynced = useProjectStore((s) => s.projectsSynced);

  if (projectsSynced && projects.length === 0) {
    return (
      <EmptyState
        title="No portfolio metrics yet"
        description="Add your first project to compute core financial and operational yield metrics."
        variant="compact"
      />
    );
  }

  // Aggregation
  let totalNOI = 0;
  let totalCashFlow = 0;
  let totalPropertyValue = 0;
  let totalPurchasePrice = 0;
  let totalCapRateNOI = 0;
  let totalCapRatePrice = 0;
  let totalCashInvested = 0;
  let totalOperatingIncome = 0;
  let totalOperatingExpenses = 0;
  let totalDebtService = 0;
  
  let occupancyCount = 0;
  let totalOccupancy = 0;
  let appreciationCount = 0;
  let totalAppreciation = 0;
  let irrCount = 0;
  let totalIRR = 0;
  let cocCount = 0;
  let totalCOC = 0;
  let grmCount = 0;
  let totalGRM = 0;

  for (const p of projects) {
    const f = p.financials;
    if (!f) continue;
    const metrics = deriveAllMetrics(
      f,
      f.estimatedCurrentValue || f.estimatedARV,
      p.dispositionType,
      p.currentPhase,
      p.createdAt
    );

    totalNOI += metrics.noi || 0;
    totalCashFlow += metrics.annualCashFlow || 0;
    
    const pp = f.purchasePrice ?? f.targetPrice ?? 0;
    totalPurchasePrice += pp;
    totalPropertyValue += (f.estimatedCurrentValue || f.estimatedARV || pp || 0);
    totalCashInvested += metrics.totalCashInvested || 0;
    
    if (metrics.noi && pp > 0) {
      totalCapRateNOI += metrics.noi;
      totalCapRatePrice += pp;
    }

    // OER
    totalOperatingIncome += (metrics.noiComponents.grossRentalIncome + metrics.noiComponents.otherIncome) || 0;
    totalOperatingExpenses += metrics.noiComponents.totalOperatingExpenses || 0;

    // DSCR
    totalDebtService += metrics.annualDebtService || 0;

    // Occupancy
    if (f.occupancyRate !== undefined && f.occupancyRate !== null) {
      totalOccupancy += f.occupancyRate;
      occupancyCount++;
    }

    // Appreciation
    if (metrics.annualizedAppreciation !== undefined && metrics.annualizedAppreciation !== null) {
      totalAppreciation += metrics.annualizedAppreciation;
      appreciationCount++;
    }

    // IRR
    if (metrics.irr !== undefined && metrics.irr !== null) {
      totalIRR += metrics.irr;
      irrCount++;
    }

    // COC
    if (metrics.cashOnCashReturn !== undefined && metrics.cashOnCashReturn !== null) {
      totalCOC += metrics.cashOnCashReturn;
      cocCount++;
    }

    // GRM
    if (metrics.grossRentMultiplier !== undefined && metrics.grossRentMultiplier !== null) {
      totalGRM += metrics.grossRentMultiplier;
      grmCount++;
    }
  }

  const avgCapRate = totalCapRatePrice > 0 ? (totalCapRateNOI / totalCapRatePrice) * 100 : 0;
  const avgOER = totalOperatingIncome > 0 ? (totalOperatingExpenses / totalOperatingIncome) * 100 : 0;
  const avgDSCR = totalDebtService > 0 ? totalNOI / totalDebtService : 0;
  const avgOccupancy = occupancyCount > 0 ? totalOccupancy / occupancyCount : 100;
  const avgAppreciation = appreciationCount > 0 ? totalAppreciation / appreciationCount : 0;
  const avgIRR = irrCount > 0 ? totalIRR / irrCount : 0;
  const avgCOC = cocCount > 0 ? totalCOC / cocCount : 0;
  const avgGRM = grmCount > 0 ? totalGRM / grmCount : 0;

  const metricsData: KPIMetric[] = [
    {
      slug: "noi",
      label: "NOI",
      value: `$${Math.round(totalNOI).toLocaleString()}`,
      icon: "account_balance",
      status: totalNOI > 0 ? "healthy" : "alert"
    },
    {
      slug: "cash-flow",
      label: "Cash Flow",
      value: `${totalCashFlow < 0 ? '-' : ''}$${Math.round(Math.abs(totalCashFlow)).toLocaleString()}/yr`,
      icon: "payments",
      status: totalCashFlow >= 0 ? "healthy" : "alert"
    },
    {
      slug: "cap-rate",
      label: "Cap Rate",
      value: `${avgCapRate.toFixed(2)}%`,
      icon: "percent",
      status: avgCapRate >= 4 ? "healthy" : (avgCapRate > 0 ? "watch" : "alert")
    },
    {
      slug: "coc-return",
      label: "CoC Return",
      value: `${avgCOC.toFixed(2)}%`,
      icon: "savings",
      status: avgCOC >= 6 ? "healthy" : (avgCOC > 0 ? "watch" : "alert")
    },
    {
      slug: "grm",
      label: "GRM",
      value: `${avgGRM.toFixed(1)}x`,
      icon: "calculate",
      status: avgGRM > 0 && avgGRM <= 12 ? "healthy" : (avgGRM > 12 ? "watch" : "alert")
    },
    {
      slug: "dscr",
      label: "DSCR",
      value: `${avgDSCR.toFixed(2)}x`,
      icon: "shield",
      status: avgDSCR >= 1.25 ? "healthy" : (avgDSCR >= 1.0 ? "watch" : "alert")
    },
    {
      slug: "irr",
      label: "IRR",
      value: `${avgIRR.toFixed(2)}%`,
      icon: "trending_up",
      status: avgIRR >= 12 ? "healthy" : (avgIRR > 0 ? "watch" : "alert")
    },
    {
      slug: "occupancy",
      label: "Occupancy",
      value: `${Math.round(avgOccupancy)}%`,
      icon: "apartment",
      status: avgOccupancy >= 90 ? "healthy" : (avgOccupancy >= 80 ? "watch" : "alert")
    },
    {
      slug: "oer",
      label: "OER",
      value: `${avgOER.toFixed(1)}%`,
      icon: "pie_chart",
      status: avgOER <= 50 ? "healthy" : (avgOER <= 60 ? "watch" : "alert")
    },
    {
      slug: "appreciation",
      label: "Appreciation",
      value: `${avgAppreciation.toFixed(2)}%`,
      icon: "show_chart",
      status: avgAppreciation >= 2 ? "healthy" : (avgAppreciation >= 0 ? "watch" : "alert")
    }
  ];

  return (
    <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 min-w-[600px] md:min-w-0">
        {metricsData.map((metric) => {
          const status = statusColors[metric.status];
          return (
            <Link
              key={metric.slug}
              href={`/dashboard/intelligence/${metric.slug}`}
              className="group block"
            >
              <div
                className="rounded-xl p-4 md:p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-200 cursor-pointer h-full"
                style={{
                  backgroundColor: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  backdropFilter: "blur(12px)",
                }}
              >
                {/* Top accent line */}
                <div
                  className="absolute top-0 left-0 w-full h-[2px]"
                  style={{
                    background: `linear-gradient(to right, ${status.dot}, transparent)`,
                    opacity: 0.5,
                  }}
                />

                {/* Header row */}
                <div className="flex justify-between items-start mb-3">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: "rgba(253,255,252,0.5)" }}
                  >
                    {metric.label}
                  </span>
                  <span
                    className="material-symbols-outlined text-base"
                    style={{ color: "rgba(253,255,252,0.3)" }}
                  >
                    {metric.icon}
                  </span>
                </div>

                {/* Value */}
                <div
                  className="text-xl md:text-2xl font-bold tracking-tight mb-3"
                  style={{ color: "rgba(253,255,252,0.95)" }}
                >
                  {metric.value}
                </div>

                {/* Status zone badge */}
                <div
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full self-start"
                  style={{ backgroundColor: status.bg }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: status.dot }}
                  />
                  <span
                    className="text-[10px] font-medium"
                    style={{ color: status.dot }}
                  >
                    {status.label}
                  </span>
                </div>

                {/* Hover overlay */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-xl"
                  style={{ backgroundColor: "rgba(255,255,255,0.02)" }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
