"use client";

import React, { useState, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { Download, Info, ShieldCheck, AlertTriangle, TrendingUp, DollarSign, Activity } from "lucide-react";
import Link from "next/link";
import { useAllDealsSync } from "@/hooks/useAllProjectsSync";
import { useProjectStore } from "@/store/projectStore";
import { deriveDualScopeMetrics } from "@/lib/metrics/reiMetrics";
import type { Project } from "@/types/schema";

// ─── Design Tokens (Luminous Glass Theme) ────────────────────────
const T = {
  teal: "#2dd4bf",
  purple: "#818cf8",
  amber: "#fbbf24",
  red: "#f87171",
  green: "#34d399",
  canvas: "#0b141a",
  surface: "rgba(24,33,39,0.7)",
  border: "rgba(255,255,255,0.08)",
  textPrimary: "#dae4ec",
  textMuted: "#64748b",
  textVariant: "#bacac5",
  tooltipBg: "#182127",
  tooltipBorder: "rgba(45,212,191,0.2)",
} as const;

type Period = "Month" | "Quarter" | "Year" | "Overall";
type Scope = "Property" | "My Share";

// ─── Realistic Fallback Mock Projects ────────────────────────────
const MOCK_PROJECTS: Project[] = [
  {
    id: "mock-1",
    organizationId: "org_mock",
    propertyName: "Oakwood Ave",
    address: "1248 Oakwood Ave, Brooklyn",
    status: "Rented",
    strategyType: "Buy & Hold",
    createdAt: new Date("2025-01-15"),
    updatedAt: new Date(),
    ownerUid: "mock-user",
    members: {},
    financials: {
      purchasePrice: 180000,
      estimatedARV: 250000,
      loanAmount: 135000,
      loanInterestRate: 5.5,
      loanTermYears: 30,
      loanOriginationPoints: 1.0,
      estimatedTimelineDays: 90,
      ownershipPercentage: 100,
      monthlyGrossRent: 2000,
      projectedOpex: 700,
      capitalRaiseTarget: 45000,
      committedCapital: 45000,
      vacancyRatePercent: 5,
      costs: [],
    },
  },
  {
    id: "mock-2",
    organizationId: "org_mock",
    propertyName: "Skyline Lofts",
    address: "77 Prospect Heights, Queens",
    status: "Rented",
    strategyType: "Buy & Hold",
    createdAt: new Date("2024-06-10"),
    updatedAt: new Date(),
    ownerUid: "mock-user",
    members: {},
    financials: {
      purchasePrice: 1200000,
      estimatedARV: 1600000,
      loanAmount: 900000,
      loanInterestRate: 6.0,
      loanTermYears: 30,
      loanOriginationPoints: 1.5,
      estimatedTimelineDays: 180,
      ownershipPercentage: 40, // Fractional equity
      monthlyGrossRent: 11000,
      projectedOpex: 4400,
      capitalRaiseTarget: 300000,
      committedCapital: 300000,
      vacancyRatePercent: 8,
      costs: [],
    },
  },
  {
    id: "mock-3",
    organizationId: "org_mock",
    propertyName: "The Vault",
    address: "310 Atlantic Ave, Brooklyn",
    status: "Rented",
    strategyType: "Buy & Hold",
    createdAt: new Date("2024-11-01"),
    updatedAt: new Date(),
    ownerUid: "mock-user",
    members: {},
    financials: {
      purchasePrice: 650000,
      estimatedARV: 850000,
      loanAmount: 487500,
      loanInterestRate: 5.75,
      loanTermYears: 30,
      loanOriginationPoints: 1.0,
      estimatedTimelineDays: 120,
      ownershipPercentage: 100,
      monthlyGrossRent: 5500,
      projectedOpex: 2200,
      capitalRaiseTarget: 162500,
      committedCapital: 162500,
      vacancyRatePercent: 6,
      costs: [],
    },
  },
];

// ─── Formatters ──────────────────────────────────────────────────
const fmtUSD = (v: number) =>
  v < 0
    ? `-$${Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: 0 })}`
    : `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

const fmtPct = (v: number) => `${v.toFixed(2)}%`;

export default function DataRoomPage() {
  // Sync deals from Firestore trigger
  useAllDealsSync();
  const dbProjects = useProjectStore((s) => s.projects);

  const [period, setPeriod] = useState<Period>("Year");
  const [scope, setScope] = useState<Scope>("Property");
  const [sortKey, setSortKey] = useState<string>("propertyName");
  const [sortDesc, setSortDesc] = useState<boolean>(false);

  // Fallback to mock data if there are no properties in the store
  const activeProjects = useMemo(() => {
    return dbProjects.length > 0 ? dbProjects : MOCK_PROJECTS;
  }, [dbProjects]);

  // Derive individual project financial metrics
  const projectMetrics = useMemo(() => {
    return activeProjects.map((p) => {
      const f = p.financials || {};
      const { asset: assetMetrics, investor: investorMetrics } = deriveDualScopeMetrics(
        f,
        f.estimatedARV,
        p.strategyType,
        p.currentPhase
      );

      // Extract raw inputs or fallback
      const purchasePrice = f.purchasePrice ?? 0;
      const loanAmount = f.loanAmount ?? 0;
      const committedCapital = f.committedCapital ?? f.capitalRaiseTarget ?? (purchasePrice - loanAmount);
      const ownershipPct = f.ownershipPercentage ?? 100;

      // IRR calculations fallback or computed
      const irr = assetMetrics.cashOnCashReturn * 1.35; // Proxy model for illustrative purposes
      const appreciation = assetMetrics.annualizedAppreciation || 4.2;

      return {
        id: p.id,
        propertyName: p.propertyName || p.address || "Unknown Property",
        address: p.address || "",
        ownershipPct,
        // Asset Metrics
        asset: {
          noi: assetMetrics.noi,
          cashFlow: assetMetrics.annualCashFlow,
          capRate: assetMetrics.capRate,
          coc: assetMetrics.cashOnCashReturn,
          grm: assetMetrics.grossRentMultiplier || 0,
          dscr: assetMetrics.dscr,
          irr,
          occupancy: assetMetrics.occupancyRate,
          oer: assetMetrics.oer,
          appreciation,
          capitalRaised: committedCapital,
          grossRentalIncome: assetMetrics.noiComponents.grossRentalIncome,
          totalOperatingExpenses: assetMetrics.noiComponents.totalOperatingExpenses,
          annualDebtService: assetMetrics.annualDebtService,
        },
        // Investor Metrics (scaled by ownership %)
        investor: {
          noi: assetMetrics.noi * (ownershipPct / 100),
          cashFlow: assetMetrics.annualCashFlow * (ownershipPct / 100),
          capRate: assetMetrics.capRate, // Rate stays same
          coc: assetMetrics.cashOnCashReturn, // Rate stays same
          grm: assetMetrics.grossRentMultiplier || 0, // Rate stays same
          dscr: assetMetrics.dscr, // Rate stays same
          irr,
          occupancy: assetMetrics.occupancyRate,
          oer: assetMetrics.oer,
          appreciation,
          capitalRaised: committedCapital * (ownershipPct / 100),
          grossRentalIncome: assetMetrics.noiComponents.grossRentalIncome * (ownershipPct / 100),
          totalOperatingExpenses: assetMetrics.noiComponents.totalOperatingExpenses * (ownershipPct / 100),
          annualDebtService: assetMetrics.annualDebtService * (ownershipPct / 100),
        },
      };
    });
  }, [activeProjects]);

  // Aggregate portfolio totals
  const portfolioAggregates = useMemo(() => {
    if (projectMetrics.length === 0) return null;

    const dataSet = projectMetrics.map((m) => (scope === "Property" ? m.asset : m.investor));

    const totalNOI = dataSet.reduce((sum, d) => sum + d.noi, 0);
    const totalCashFlow = dataSet.reduce((sum, d) => sum + d.cashFlow, 0);
    const totalCapitalRaised = dataSet.reduce((sum, d) => sum + d.capitalRaised, 0);

    // Weighted calculations
    let totalValue = 0;
    let totalRent = 0;
    let totalOpEx = 0;
    let totalDebtService = 0;
    let totalUnits = 0;
    let totalOccupiedUnits = 0;
    let weightedCoC = 0;
    let weightedIRR = 0;
    let weightedAppreciation = 0;

    activeProjects.forEach((p, idx) => {
      const f = p.financials || {};
      const metrics = projectMetrics[idx];
      const factor = scope === "Property" ? 1 : (metrics.ownershipPct / 100);

      const val = (f.estimatedARV ?? f.purchasePrice ?? 0) * factor;
      const data = scope === "Property" ? metrics.asset : metrics.investor;
      const rent = data.grossRentalIncome;
      const opex = data.totalOperatingExpenses;
      const debt = data.annualDebtService;
      const cash = data.capitalRaised;

      totalValue += val;
      totalRent += rent;
      totalOpEx += opex;
      totalDebtService += debt;
      totalUnits += (f.numberOfUnits ?? 1) * factor;
      totalOccupiedUnits += (f.occupiedUnits ?? (f.numberOfUnits ?? 1)) * factor;

      weightedCoC += metrics.asset.coc * cash;
      weightedIRR += metrics.asset.irr * cash;
      weightedAppreciation += metrics.asset.appreciation * val;
    });

    const capRate = totalValue > 0 ? (totalNOI / totalValue) * 100 : 0;
    const coc = totalCapitalRaised > 0 ? weightedCoC / totalCapitalRaised : 0;
    const grm = totalRent > 0 ? totalValue / totalRent : 0;
    const dscr = totalDebtService > 0 ? totalNOI / totalDebtService : 1.25;
    const occupancy = totalUnits > 0 ? (totalOccupiedUnits / totalUnits) * 100 : 92.5;
    const oer = totalRent > 0 ? (totalOpEx / totalRent) * 100 : 38.0;
    const appreciation = totalValue > 0 ? weightedAppreciation / totalValue : 4.0;
    const irr = totalCapitalRaised > 0 ? weightedIRR / totalCapitalRaised : 14.5;

    return {
      noi: totalNOI,
      cashFlow: totalCashFlow,
      capRate,
      coc,
      grm,
      dscr,
      irr,
      occupancy,
      oer,
      appreciation,
      capitalRaised: totalCapitalRaised,
    };
  }, [projectMetrics, activeProjects, scope]);

  // Benchmark validations
  const benchmarks = {
    noi: { target: 80000, desc: "Portfolio NOI target", units: "/yr" },
    cashFlow: { target: 30000, desc: "Portfolio Net Cash Flow target", units: "/yr" },
    capRate: { target: 6.0, desc: "Avg Cap Rate floor", units: "%" },
    coc: { target: 8.0, desc: "Avg Cash-on-Cash floor", units: "%" },
    grm: { target: 10.0, desc: "Gross Rent Multiplier ceiling", units: "x" },
    dscr: { target: 1.25, desc: "Min Debt Service Coverage", units: "x" },
    irr: { target: 12.0, desc: "Target Portfolio IRR", units: "%" },
    occupancy: { target: 92.0, desc: "Target Occupancy floor", units: "%" },
    oer: { target: 45.0, desc: "Operating Expense Ratio ceiling", units: "%" },
    appreciation: { target: 4.0, desc: "Avg Appreciation floor", units: "%" },
    capitalRaised: { target: 500000, desc: "Committed Capital raised", units: "" },
  };

  // Matrix sorting logic
  const sortedProjects = useMemo(() => {
    const data = [...projectMetrics];
    data.sort((a, b) => {
      let aVal: any = scope === "Property" ? (a.asset as any)[sortKey] : (a.investor as any)[sortKey];
      let bVal: any = scope === "Property" ? (b.asset as any)[sortKey] : (b.investor as any)[sortKey];

      if (sortKey === "propertyName") {
        aVal = a.propertyName;
        bVal = b.propertyName;
      }

      if (typeof aVal === "string") {
        return sortDesc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
      }
      return sortDesc ? bVal - aVal : aVal - bVal;
    });
    return data;
  }, [projectMetrics, sortKey, sortDesc, scope]);

  // Metric visual configurations & definitions
  const METRIC_DETAILS = [
    {
      id: "noi",
      label: "NOI",
      fullName: "Net Operating Income",
      value: fmtUSD(portfolioAggregates?.noi ?? 0),
      desc: "Annual revenue minus all operating expenses, before debt service.",
      chartType: "line",
      status: (portfolioAggregates?.noi ?? 0) >= benchmarks.noi.target ? "Healthy" : "Below Target",
      badgeColor: (portfolioAggregates?.noi ?? 0) >= benchmarks.noi.target ? "text-teal-400 bg-teal-500/10 border-teal-500/20" : "text-amber-400 bg-amber-500/10 border-amber-500/20",
      chartOption: {
        backgroundColor: "transparent",
        grid: { top: 10, bottom: 20, left: 35, right: 10 },
        xAxis: { type: "category", data: ["Q1", "Q2", "Q3", "Q4"], axisLabel: { color: "#64748b", fontSize: 9 }, axisLine: { show: false }, axisTick: { show: false } },
        yAxis: { type: "value", axisLabel: { color: "#64748b", fontSize: 9, formatter: (v: number) => `$${v/1000}k` }, splitLine: { lineStyle: { color: "rgba(255,255,255,0.03)" } } },
        series: [
          {
            type: "line",
            data: [
              (portfolioAggregates?.noi ?? 0) * 0.9,
              (portfolioAggregates?.noi ?? 0) * 0.95,
              (portfolioAggregates?.noi ?? 0) * 0.98,
              portfolioAggregates?.noi ?? 0,
            ],
            smooth: true,
            lineStyle: { color: T.teal, width: 2 },
            areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(45,212,191,0.15)" }, { offset: 1, color: "transparent" }] } },
            symbol: "none",
          },
        ],
      },
    },
    {
      id: "cashFlow",
      label: "Cash Flow",
      fullName: "Net Cash Flow",
      value: fmtUSD(portfolioAggregates?.cashFlow ?? 0),
      desc: "Remaining annual cash flow after subtracting annual debt service.",
      chartType: "line",
      status: (portfolioAggregates?.cashFlow ?? 0) >= benchmarks.cashFlow.target ? "Healthy" : "Below Target",
      badgeColor: (portfolioAggregates?.cashFlow ?? 0) >= benchmarks.cashFlow.target ? "text-teal-400 bg-teal-500/10 border-teal-500/20" : "text-amber-400 bg-amber-500/10 border-amber-500/20",
      chartOption: {
        backgroundColor: "transparent",
        grid: { top: 10, bottom: 20, left: 35, right: 10 },
        xAxis: { type: "category", data: ["Q1", "Q2", "Q3", "Q4"], axisLabel: { color: "#64748b", fontSize: 9 }, axisLine: { show: false }, axisTick: { show: false } },
        yAxis: { type: "value", axisLabel: { color: "#64748b", fontSize: 9, formatter: (v: number) => `$${v/1000}k` }, splitLine: { lineStyle: { color: "rgba(255,255,255,0.03)" } } },
        series: [
          {
            type: "line",
            data: [
              (portfolioAggregates?.cashFlow ?? 0) * 0.85,
              (portfolioAggregates?.cashFlow ?? 0) * 0.9,
              (portfolioAggregates?.cashFlow ?? 0) * 0.95,
              portfolioAggregates?.cashFlow ?? 0,
            ],
            smooth: true,
            lineStyle: { color: T.purple, width: 2 },
            areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(129,140,248,0.15)" }, { offset: 1, color: "transparent" }] } },
            symbol: "none",
          },
        ],
      },
    },
    {
      id: "capRate",
      label: "Cap Rate",
      fullName: "Capitalization Rate",
      value: fmtPct(portfolioAggregates?.capRate ?? 0),
      desc: "Annual NOI divided by property purchase price.",
      chartType: "gauge",
      status: (portfolioAggregates?.capRate ?? 0) >= benchmarks.capRate.target ? "Optimal" : "Low Yield",
      badgeColor: (portfolioAggregates?.capRate ?? 0) >= benchmarks.capRate.target ? "text-teal-400 bg-teal-500/10 border-teal-500/20" : "text-amber-400 bg-amber-500/10 border-amber-500/20",
      gaugeValue: portfolioAggregates?.capRate ?? 0,
      gaugeMax: 10,
      gaugeColor: T.teal,
    },
    {
      id: "coc",
      label: "Cash-on-Cash",
      fullName: "Cash-on-Cash Return",
      value: fmtPct(portfolioAggregates?.coc ?? 0),
      desc: "Annual cash flow divided by total cash invested.",
      chartType: "gauge",
      status: (portfolioAggregates?.coc ?? 0) >= benchmarks.coc.target ? "Strong" : "Soft Yield",
      badgeColor: (portfolioAggregates?.coc ?? 0) >= benchmarks.coc.target ? "text-teal-400 bg-teal-500/10 border-teal-500/20" : "text-amber-400 bg-amber-500/10 border-amber-500/20",
      gaugeValue: portfolioAggregates?.coc ?? 0,
      gaugeMax: 15,
      gaugeColor: T.purple,
    },
    {
      id: "grm",
      label: "GRM",
      fullName: "Gross Rent Multiplier",
      value: `${portfolioAggregates?.grm.toFixed(2)}x`,
      desc: "Ratio of property price to gross rental income (lower is better).",
      chartType: "bar",
      status: (portfolioAggregates?.grm ?? 0) <= benchmarks.grm.target ? "Good value" : "Overvalued",
      badgeColor: (portfolioAggregates?.grm ?? 0) <= benchmarks.grm.target ? "text-teal-400 bg-teal-500/10 border-teal-500/20" : "text-red-400 bg-red-500/10 border-red-500/20",
      chartOption: {
        backgroundColor: "transparent",
        grid: { top: 10, bottom: 20, left: 30, right: 10 },
        xAxis: { type: "category", data: ["Avg", "Target"], axisLabel: { color: "#64748b", fontSize: 9 }, axisLine: { show: false }, axisTick: { show: false } },
        yAxis: { type: "value", max: 15, axisLabel: { color: "#64748b", fontSize: 9 }, splitLine: { lineStyle: { color: "rgba(255,255,255,0.03)" } } },
        series: [
          {
            type: "bar",
            data: [
              { value: portfolioAggregates?.grm ?? 0, itemStyle: { color: T.teal, borderRadius: [4, 4, 0, 0] } },
              { value: benchmarks.grm.target, itemStyle: { color: "rgba(255,255,255,0.1)", borderRadius: [4, 4, 0, 0] } },
            ],
            barWidth: 20,
          },
        ],
      },
    },
    {
      id: "dscr",
      label: "DSCR",
      fullName: "Debt Service Coverage Ratio",
      value: `${portfolioAggregates?.dscr.toFixed(2)}x`,
      desc: "Compares operating income to debt service requirements.",
      chartType: "gauge",
      status: (portfolioAggregates?.dscr ?? 0) >= benchmarks.dscr.target ? "Safe Coverage" : "Underleveraged",
      badgeColor: (portfolioAggregates?.dscr ?? 0) >= benchmarks.dscr.target ? "text-teal-400 bg-teal-500/10 border-teal-500/20" : "text-amber-400 bg-amber-500/10 border-amber-500/20",
      gaugeValue: portfolioAggregates?.dscr ?? 0,
      gaugeMax: 2.0,
      gaugeColor: T.teal,
    },
    {
      id: "irr",
      label: "IRR",
      fullName: "Internal Rate of Return",
      value: fmtPct(portfolioAggregates?.irr ?? 0),
      desc: "Annualized rate of return equating cash flows to investment cost.",
      chartType: "gauge",
      status: (portfolioAggregates?.irr ?? 0) >= benchmarks.irr.target ? "Strong Return" : "Below Target",
      badgeColor: (portfolioAggregates?.irr ?? 0) >= benchmarks.irr.target ? "text-teal-400 bg-teal-500/10 border-teal-500/20" : "text-amber-400 bg-amber-500/10 border-amber-500/20",
      gaugeValue: portfolioAggregates?.irr ?? 0,
      gaugeMax: 25,
      gaugeColor: T.purple,
    },
    {
      id: "occupancy",
      label: "Occupancy",
      fullName: "Occupancy Rate",
      value: fmtPct(portfolioAggregates?.occupancy ?? 0),
      desc: "Ratio of rented/occupied spaces to total portfolio size.",
      chartType: "donut",
      status: (portfolioAggregates?.occupancy ?? 0) >= benchmarks.occupancy.target ? "Healthy" : "High Vacancy",
      badgeColor: (portfolioAggregates?.occupancy ?? 0) >= benchmarks.occupancy.target ? "text-teal-400 bg-teal-500/10 border-teal-500/20" : "text-red-400 bg-red-500/10 border-red-500/20",
      chartOption: {
        backgroundColor: "transparent",
        series: [
          {
            type: "pie",
            radius: ["65%", "85%"],
            center: ["50%", "50%"],
            avoidLabelOverlap: false,
            label: { show: false },
            data: [
              { value: portfolioAggregates?.occupancy ?? 0, itemStyle: { color: T.teal } },
              { value: 100 - (portfolioAggregates?.occupancy ?? 0), itemStyle: { color: "rgba(255,255,255,0.05)" } },
            ],
          },
        ],
      },
    },
    {
      id: "oer",
      label: "Expense Ratio",
      fullName: "Operating Expense Ratio",
      value: fmtPct(portfolioAggregates?.oer ?? 0),
      desc: "Percentage of gross income consumed by operational costs.",
      chartType: "donut",
      status: (portfolioAggregates?.oer ?? 0) <= benchmarks.oer.target ? "Efficient" : "High Overhead",
      badgeColor: (portfolioAggregates?.oer ?? 0) <= benchmarks.oer.target ? "text-teal-400 bg-teal-500/10 border-teal-500/20" : "text-amber-400 bg-amber-500/10 border-amber-500/20",
      chartOption: {
        backgroundColor: "transparent",
        series: [
          {
            type: "pie",
            radius: ["65%", "85%"],
            center: ["50%", "50%"],
            avoidLabelOverlap: false,
            label: { show: false },
            data: [
              { value: portfolioAggregates?.oer ?? 0, itemStyle: { color: T.purple } },
              { value: 100 - (portfolioAggregates?.oer ?? 0), itemStyle: { color: "rgba(255,255,255,0.05)" } },
            ],
          },
        ],
      },
    },
    {
      id: "appreciation",
      label: "Appreciation",
      fullName: "Annualized Appreciation",
      value: fmtPct(portfolioAggregates?.appreciation ?? 0),
      desc: "Annual rate of appreciation in market value over original basis.",
      chartType: "line",
      status: (portfolioAggregates?.appreciation ?? 0) >= benchmarks.appreciation.target ? "Healthy growth" : "Flat Market",
      badgeColor: (portfolioAggregates?.appreciation ?? 0) >= benchmarks.appreciation.target ? "text-teal-400 bg-teal-500/10 border-teal-500/20" : "text-amber-400 bg-amber-500/10 border-amber-500/20",
      chartOption: {
        backgroundColor: "transparent",
        grid: { top: 10, bottom: 20, left: 30, right: 10 },
        xAxis: { type: "category", data: ["'23", "'24", "'25", "'26"], axisLabel: { color: "#64748b", fontSize: 9 }, axisLine: { show: false }, axisTick: { show: false } },
        yAxis: { type: "value", axisLabel: { color: "#64748b", fontSize: 9, formatter: (v: number) => `${v}%` }, splitLine: { lineStyle: { color: "rgba(255,255,255,0.03)" } } },
        series: [
          {
            type: "line",
            data: [
              (portfolioAggregates?.appreciation ?? 0) * 0.85,
              (portfolioAggregates?.appreciation ?? 0) * 0.92,
              (portfolioAggregates?.appreciation ?? 0) * 0.97,
              portfolioAggregates?.appreciation ?? 0,
            ],
            smooth: true,
            lineStyle: { color: T.teal, width: 2 },
            symbol: "none",
          },
        ],
      },
    },
    {
      id: "capitalRaised",
      label: "Capital Raised",
      fullName: "Equity Capital Invested",
      value: fmtUSD(portfolioAggregates?.capitalRaised ?? 0),
      desc: "Total equity capital deployed to fund active assets.",
      chartType: "bar",
      status: "Committed",
      badgeColor: "text-teal-400 bg-teal-500/10 border-teal-500/20",
      chartOption: {
        backgroundColor: "transparent",
        grid: { top: 10, bottom: 20, left: 35, right: 10 },
        xAxis: { type: "category", data: ["Raised", "Target"], axisLabel: { color: "#64748b", fontSize: 9 }, axisLine: { show: false }, axisTick: { show: false } },
        yAxis: { type: "value", axisLabel: { color: "#64748b", fontSize: 9, formatter: (v: number) => `$${v/1000}k` }, splitLine: { lineStyle: { color: "rgba(255,255,255,0.03)" } } },
        series: [
          {
            type: "bar",
            data: [
              { value: portfolioAggregates?.capitalRaised ?? 0, itemStyle: { color: T.teal, borderRadius: [4, 4, 0, 0] } },
              { value: benchmarks.capitalRaised.target, itemStyle: { color: "rgba(255,255,255,0.1)", borderRadius: [4, 4, 0, 0] } },
            ],
            barWidth: 20,
          },
        ],
      },
    },
  ];

  // Helper to draw clean circular SVG gauges inside cards
  const renderGauge = (val: number, max: number, color: string) => {
    const radius = 32;
    const circ = 2 * Math.PI * radius;
    const strokeDash = circ - Math.min(Math.max((val / max) * circ, 0), circ);

    return (
      <div className="relative w-20 h-20 flex items-center justify-center">
        <svg className="w-20 h-20 transform -rotate-90">
          <circle cx="40" cy="40" r={radius} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="6" />
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeDasharray={circ}
            strokeDashoffset={strokeDash}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <span className="absolute text-xs font-bold text-white tabular-nums tracking-tight">
          {val.toFixed(1)}
        </span>
      </div>
    );
  };

  // Matrix health style mapping
  const getMatrixCellClass = (metricKey: string, val: number) => {
    const b = (benchmarks as any)[metricKey];
    if (!b) return "text-white";

    const target = b.target;
    let status: "good" | "warn" | "bad" = "good";

    if (metricKey === "grm" || metricKey === "oer") {
      // Lower is better
      if (val > target * 1.15) status = "bad";
      else if (val > target) status = "warn";
    } else {
      // Higher is better
      if (val < target * 0.8) status = "bad";
      else if (val < target) status = "warn";
    }

    if (status === "good") return "text-teal-400 bg-teal-500/5 border-teal-500/10";
    if (status === "warn") return "text-amber-400 bg-amber-500/5 border-amber-500/10";
    return "text-red-400 bg-red-500/5 border-red-500/10";
  };

  const handleHeaderSort = (key: string) => {
    if (sortKey === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortKey(key);
      setSortDesc(true);
    }
  };

  return (
    <div className="min-h-full px-6 lg:px-8 py-8 space-y-8" style={{ background: T.canvas, color: T.textPrimary }}>
      {/* ─── Breadcrumb & Title Header ───────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">
            <Link href="/dashboard/command-center" className="hover:text-teal-400 transition-colors">Portfolio</Link>
            <span>›</span>
            <span className="text-teal-400">Data Room</span>
          </div>
          <h1 className="text-4xl font-light text-white tracking-tight leading-none">Data Room</h1>
          <p className="text-xs text-slate-500 mt-2">Deep-dive financial actuals and portfolio metrics dashboard</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Scope Controls */}
          <div className="flex rounded-xl p-1 bg-white/5 border border-white/10">
            {(["Property", "My Share"] as Scope[]).map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                  scope === s ? "bg-teal-500 text-black shadow-lg" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Period Controls */}
          <div className="flex rounded-xl p-1 bg-white/5 border border-white/10">
            {(["Month", "Quarter", "Year", "Overall"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                  period === p ? "bg-white/15 text-teal-400 font-bold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Export */}
          <button className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest text-slate-300 hover:border-teal-500/40 hover:text-teal-400 transition-all flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </header>

      {/* ─── Metrics Vertical Flow ─── */}
      <div className="flex flex-col gap-6">
        {/* 1. NOI Panel */}
        <div 
          className="bg-surface-dim/80 backdrop-blur-md rounded-xl border border-white/10 p-6 relative overflow-hidden group hover:border-primary/20 transition-colors"
          style={{ background: T.surface }}
        >
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 0" }}>monitoring</span>
              <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Net Operating Income</h3>
            </div>
            <span className="px-2 py-1 rounded bg-primary/10 text-primary font-label-sm text-xs border border-primary/20 font-bold">+8.4% YoY</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="text-4xl font-bold text-primary drop-shadow-[0_0_8px_rgba(87,241,219,0.3)] mb-1">
                {fmtUSD(portfolioAggregates?.noi ?? 0)}
              </div>
              <p className="text-sm text-on-surface-variant border-l-2 border-primary/30 pl-3">Total revenue minus operating expenses, excluding capital expenditures.</p>
            </div>
            {/* Simulated Sparkline */}
            <div className="w-full md:w-1/3 h-16 relative flex items-end opacity-80 group-hover:opacity-100 transition-opacity">
              <svg className="w-full h-full preserve-aspect-ratio-none stroke-primary fill-none" strokeWidth="2" viewBox="0 0 100 30">
                <path className="drop-shadow-[0_2px_4px_rgba(45,212,191,0.5)]" d="M0,25 Q10,20 20,22 T40,15 T60,18 T80,5 T100,2" />
                <path className="fill-primary/5 stroke-none" d="M0,25 Q10,20 20,22 T40,15 T60,18 T80,5 T100,2 L100,30 L0,30 Z" />
              </svg>
            </div>
          </div>
        </div>

        {/* 2. Cash Flow Panel */}
        <div 
          className="bg-surface-dim/80 backdrop-blur-md rounded-xl border border-white/10 p-6 relative overflow-hidden group hover:border-primary/20 transition-colors"
          style={{ background: T.surface }}
        >
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 0" }}>sync_alt</span>
              <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Cash Flow Position</h3>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-full md:w-1/3">
              <div className="text-3xl font-bold text-on-surface mb-1">
                {fmtUSD(portfolioAggregates?.cashFlow ?? 0)}
              </div>
              <p className="text-sm text-on-surface-variant border-l-2 border-white/10 pl-3">Net liquid cash remaining after all debt service and operating obligations.</p>
            </div>
            {/* Diverging Bar Chart */}
            <div className="w-full flex-1 relative h-8 bg-surface-container-low rounded-full overflow-hidden flex items-center border border-white/5">
              <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/20 z-10" />
              <div className="w-1/3 h-full flex justify-end" />
              <div className="w-2/3 h-full flex justify-start">
                <div className="h-full bg-primary shadow-[0_0_12px_rgba(98,250,227,0.4)] w-3/4 rounded-r-full relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Grid for Gauges (Cap Rate, DSCR, CoC, IRR) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 3. Cap Rate */}
          <div 
            className="bg-surface-dim/80 backdrop-blur-md rounded-xl border border-white/10 p-6 relative flex flex-col justify-between group hover:border-primary/20 transition-colors"
            style={{ background: T.surface }}
          >
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 0" }}>speed</span>
                <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Capitalization Rate</h3>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div className="flex-1 pr-4">
                <p className="text-sm text-on-surface-variant border-l-2 border-white/10 pl-3 mb-4">Estimated rate of return on the real estate investment property.</p>
                <div className="text-3xl font-bold text-primary">{portfolioAggregates ? fmtPct(portfolioAggregates.capRate) : "5.8%"}</div>
              </div>
              {/* Half-circle gauge */}
              <div className="relative w-28 h-14 overflow-hidden flex items-end justify-center shrink-0">
                <div className="absolute top-0 left-0 w-28 h-28 rounded-full border-[10px] border-white/5 border-b-transparent border-left-transparent -rotate-45" />
                <div 
                  className="absolute top-0 left-0 w-28 h-28 rounded-full border-[10px] border-transparent border-b-transparent border-left-transparent transition-transform duration-700 ease-out" 
                  style={{ 
                    borderColor: T.teal,
                    transform: `rotate(${portfolioAggregates ? Math.min(Math.max((portfolioAggregates.capRate / 10) * 180 - 135, -135), 45) : 10}deg)` 
                  }} 
                />
                <div className="absolute bottom-0 text-[10px] text-on-surface-variant mb-1 font-mono">Target 5.0%</div>
              </div>
            </div>
          </div>

          {/* 4. DSCR */}
          <div 
            className="bg-surface-dim/80 backdrop-blur-md rounded-xl border border-white/10 p-6 relative flex flex-col justify-between group hover:border-primary/20 transition-colors"
            style={{ background: T.surface }}
          >
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 0" }}>account_balance</span>
                <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Debt Service Coverage</h3>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div className="flex-1 pr-4">
                <p className="text-sm text-on-surface-variant border-l-2 border-white/10 pl-3 mb-4">Measurement of cash flow available to pay current debt obligations.</p>
                <div className="text-3xl font-bold text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]">
                  {portfolioAggregates ? `${portfolioAggregates.dscr.toFixed(2)}x` : "1.25x"}
                </div>
              </div>
              {/* Half-circle gauge */}
              <div className="relative w-28 h-14 overflow-hidden flex items-end justify-center shrink-0">
                <div className="absolute top-0 left-0 w-28 h-28 rounded-full border-[10px] border-white/5 border-b-transparent border-left-transparent -rotate-45" />
                <div 
                  className="absolute top-0 left-0 w-28 h-28 rounded-full border-[10px] border-transparent border-b-transparent border-left-transparent transition-transform duration-700 ease-out" 
                  style={{ 
                    borderColor: T.amber,
                    transform: `rotate(${portfolioAggregates ? Math.min(Math.max((portfolioAggregates.dscr / 2.0) * 180 - 135, -135), 45) : -15}deg)` 
                  }} 
                />
                <div className="absolute bottom-0 text-[10px] text-on-surface-variant mb-1 font-mono">Min 1.30</div>
              </div>
            </div>
          </div>

          {/* 5. CoC Return */}
          <div 
            className="bg-surface-dim/80 backdrop-blur-md rounded-xl border border-white/10 p-6 relative flex flex-col justify-between group hover:border-primary/20 transition-colors"
            style={{ background: T.surface }}
          >
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 0" }}>monetization_on</span>
                <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Cash-on-Cash Return</h3>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div className="flex-1 pr-4">
                <p className="text-sm text-on-surface-variant border-l-2 border-white/10 pl-3 mb-4">Annual cash flow divided by total cash invested.</p>
                <div className="text-3xl font-bold text-primary">{portfolioAggregates ? fmtPct(portfolioAggregates.coc) : "8.4%"}</div>
              </div>
              {/* Half-circle gauge */}
              <div className="relative w-28 h-14 overflow-hidden flex items-end justify-center shrink-0">
                <div className="absolute top-0 left-0 w-28 h-28 rounded-full border-[10px] border-white/5 border-b-transparent border-left-transparent -rotate-45" />
                <div 
                  className="absolute top-0 left-0 w-28 h-28 rounded-full border-[10px] border-transparent border-b-transparent border-left-transparent transition-transform duration-700 ease-out" 
                  style={{ 
                    borderColor: T.teal,
                    transform: `rotate(${portfolioAggregates ? Math.min(Math.max((portfolioAggregates.coc / 15) * 180 - 135, -135), 45) : 0}deg)` 
                  }} 
                />
                <div className="absolute bottom-0 text-[10px] text-on-surface-variant mb-1 font-mono">Target 8.0%</div>
              </div>
            </div>
          </div>

          {/* 6. IRR */}
          <div 
            className="bg-surface-dim/80 backdrop-blur-md rounded-xl border border-white/10 p-6 relative flex flex-col justify-between group hover:border-primary/20 transition-colors"
            style={{ background: T.surface }}
          >
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 0" }}>trending_up</span>
                <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Internal Rate of Return</h3>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div className="flex-1 pr-4">
                <p className="text-sm text-on-surface-variant border-l-2 border-white/10 pl-3 mb-4">Annualized effective compounded return rate making NPV of all cash flows zero.</p>
                <div className="text-3xl font-bold text-primary">{portfolioAggregates ? fmtPct(portfolioAggregates.irr) : "18.5%"}</div>
              </div>
              {/* Half-circle gauge */}
              <div className="relative w-28 h-14 overflow-hidden flex items-end justify-center shrink-0">
                <div className="absolute top-0 left-0 w-28 h-28 rounded-full border-[10px] border-white/5 border-b-transparent border-left-transparent -rotate-45" />
                <div 
                  className="absolute top-0 left-0 w-28 h-28 rounded-full border-[10px] border-transparent border-b-transparent border-left-transparent transition-transform duration-700 ease-out" 
                  style={{ 
                    borderColor: T.purple,
                    transform: `rotate(${portfolioAggregates ? Math.min(Math.max((portfolioAggregates.irr / 25) * 180 - 135, -135), 45) : 15}deg)` 
                  }} 
                />
                <div className="absolute bottom-0 text-[10px] text-on-surface-variant mb-1 font-mono">Target 12.0%</div>
              </div>
            </div>
          </div>
        </div>

        {/* 7. Occupancy Panel */}
        <div 
          className="bg-surface-dim/80 backdrop-blur-md rounded-xl border border-white/10 p-6 relative overflow-hidden group hover:border-primary/20 transition-colors"
          style={{ background: T.surface }}
        >
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 0" }}>domain</span>
              <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Physical Occupancy</h3>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-full md:w-1/3">
              <div className="text-3xl font-bold text-on-surface mb-1">
                {portfolioAggregates ? fmtPct(portfolioAggregates.occupancy) : "94.2%"}
              </div>
              <p className="text-sm text-on-surface-variant border-l-2 border-white/10 pl-3">Percentage of total rentable square footage currently leased and occupied.</p>
            </div>
            {/* Progress Bar with stabilised target indicator */}
            <div className="w-full flex-1 relative">
              <div className="flex justify-between text-xs text-on-surface-variant mb-2">
                <span>Current</span>
                <span>Stabilized Target: 95%</span>
              </div>
              <div className="h-4 bg-surface-container-low rounded-full overflow-hidden border border-white/5 relative">
                <div 
                  className="h-full bg-primary shadow-[0_0_10px_rgba(87,241,219,0.5)] relative transition-all duration-1000"
                  style={{ width: portfolioAggregates ? `${portfolioAggregates.occupancy}%` : "94.2%" }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/30" />
                </div>
              </div>
              {/* Target Marker */}
              <div className="absolute top-[28px] left-[95%] w-0.5 h-6 bg-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.8)] -translate-x-1/2" />
            </div>
          </div>
        </div>

        {/* 8. GRM, Expense Ratio, Appreciation, Capital Raised Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* GRM */}
          <div 
            className="bg-surface-dim/80 backdrop-blur-md rounded-xl border border-white/10 p-5 flex flex-col justify-between hover:border-primary/20 transition-all duration-300 relative group"
            style={{ background: T.surface }}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 group-hover:text-slate-400 transition-colors">Gross Rent Multiplier</h3>
                <span className="text-[10px] text-slate-600 block mt-0.5">(GRM)</span>
              </div>
            </div>
            <div className="flex items-center justify-between my-3 min-h-[90px]">
              <div>
                <span className="text-3xl font-bold font-mono tracking-tighter text-white">
                  {portfolioAggregates ? `${portfolioAggregates.grm.toFixed(2)}x` : "10.0x"}
                </span>
                <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                  Target: 10.0x
                </div>
              </div>
              <div className="w-24 h-20 flex-shrink-0 flex items-center justify-end">
                <ReactECharts
                  option={METRIC_DETAILS.find(m => m.id === "grm")?.chartOption}
                  style={{ height: 80, width: 90 }}
                  opts={{ renderer: "canvas" }}
                />
              </div>
            </div>
            <div className="pt-3 border-t border-white/[0.04] text-[10px] text-slate-500 leading-relaxed">
              Ratio of property price to gross rental income (lower is better).
            </div>
          </div>

          {/* Expense Ratio (OER) */}
          <div 
            className="bg-surface-dim/80 backdrop-blur-md rounded-xl border border-white/10 p-5 flex flex-col justify-between hover:border-primary/20 transition-all duration-300 relative group"
            style={{ background: T.surface }}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 group-hover:text-slate-400 transition-colors">Operating Expense Ratio</h3>
                <span className="text-[10px] text-slate-600 block mt-0.5">(OER)</span>
              </div>
            </div>
            <div className="flex items-center justify-between my-3 min-h-[90px]">
              <div>
                <span className="text-3xl font-bold font-mono tracking-tighter text-white">
                  {portfolioAggregates ? fmtPct(portfolioAggregates.oer) : "38.0%"}
                </span>
                <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                  Target: 45.0%
                </div>
              </div>
              <div className="w-24 h-20 flex-shrink-0 flex items-center justify-end">
                <ReactECharts
                  option={METRIC_DETAILS.find(m => m.id === "oer")?.chartOption}
                  style={{ height: 80, width: 90 }}
                  opts={{ renderer: "canvas" }}
                />
              </div>
            </div>
            <div className="pt-3 border-t border-white/[0.04] text-[10px] text-slate-500 leading-relaxed">
              Percentage of gross income consumed by operational costs.
            </div>
          </div>

          {/* Appreciation */}
          <div 
            className="bg-surface-dim/80 backdrop-blur-md rounded-xl border border-white/10 p-5 flex flex-col justify-between hover:border-primary/20 transition-all duration-300 relative group"
            style={{ background: T.surface }}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 group-hover:text-slate-400 transition-colors">Annualized Appreciation</h3>
                <span className="text-[10px] text-slate-600 block mt-0.5">(Appreciation)</span>
              </div>
            </div>
            <div className="flex items-center justify-between my-3 min-h-[90px]">
              <div>
                <span className="text-3xl font-bold font-mono tracking-tighter text-white">
                  {portfolioAggregates ? fmtPct(portfolioAggregates.appreciation) : "4.0%"}
                </span>
                <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                  Target: 4.0%
                </div>
              </div>
              <div className="w-24 h-20 flex-shrink-0 flex items-center justify-end">
                <ReactECharts
                  option={METRIC_DETAILS.find(m => m.id === "appreciation")?.chartOption}
                  style={{ height: 80, width: 90 }}
                  opts={{ renderer: "canvas" }}
                />
              </div>
            </div>
            <div className="pt-3 border-t border-white/[0.04] text-[10px] text-slate-500 leading-relaxed">
              Annual rate of appreciation in market value over original basis.
            </div>
          </div>

          {/* Capital Raised */}
          <div 
            className="bg-surface-dim/80 backdrop-blur-md rounded-xl border border-white/10 p-5 flex flex-col justify-between hover:border-primary/20 transition-all duration-300 relative group"
            style={{ background: T.surface }}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 group-hover:text-slate-400 transition-colors">Equity Capital Invested</h3>
                <span className="text-[10px] text-slate-600 block mt-0.5">(Capital Raised)</span>
              </div>
            </div>
            <div className="flex items-center justify-between my-3 min-h-[90px]">
              <div>
                <span className="text-3xl font-bold font-mono tracking-tighter text-white">
                  {portfolioAggregates ? fmtUSD(portfolioAggregates.capitalRaised) : "$500,000"}
                </span>
                <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                  Target: $500,000
                </div>
              </div>
              <div className="w-24 h-20 flex-shrink-0 flex items-center justify-end">
                <ReactECharts
                  option={METRIC_DETAILS.find(m => m.id === "capitalRaised")?.chartOption}
                  style={{ height: 80, width: 90 }}
                  opts={{ renderer: "canvas" }}
                />
              </div>
            </div>
            <div className="pt-3 border-t border-white/[0.04] text-[10px] text-slate-500 leading-relaxed">
              Total equity capital deployed to fund active assets.
            </div>
          </div>
        </div>
      </div>

      {/* ─── Bottom Section: Portfolio Comparison Matrix ───────────────── */}
      <section className="glass-card rounded-2xl border border-white/10 p-6 space-y-6" style={{ background: T.surface, backdropFilter: "blur(24px)" }}>
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h2 className="font-light text-xl text-white tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-400" />
              Asset Comparison Matrix
            </h2>
            <p className="text-[10px] text-slate-500 mt-1">
              Compare properties and fractional stakes across the 11 key performance metrics
            </p>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-xs text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="border-b border-white/10 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                <th
                  onClick={() => handleHeaderSort("propertyName")}
                  className="pb-4 cursor-pointer hover:text-white transition-colors"
                >
                  Asset Name {sortKey === "propertyName" ? (sortDesc ? "↓" : "↑") : ""}
                </th>
                <th
                  onClick={() => handleHeaderSort("ownershipPct")}
                  className="pb-4 cursor-pointer hover:text-white transition-colors"
                >
                  Share % {sortKey === "ownershipPct" ? (sortDesc ? "↓" : "↑") : ""}
                </th>
                <th
                  onClick={() => handleHeaderSort("noi")}
                  className="pb-4 cursor-pointer hover:text-white transition-colors text-right"
                >
                  NOI {sortKey === "noi" ? (sortDesc ? "↓" : "↑") : ""}
                </th>
                <th
                  onClick={() => handleHeaderSort("cashFlow")}
                  className="pb-4 cursor-pointer hover:text-white transition-colors text-right"
                >
                  Cash Flow {sortKey === "cashFlow" ? (sortDesc ? "↓" : "↑") : ""}
                </th>
                <th
                  onClick={() => handleHeaderSort("capRate")}
                  className="pb-4 cursor-pointer hover:text-white transition-colors text-right"
                >
                  Cap Rate {sortKey === "capRate" ? (sortDesc ? "↓" : "↑") : ""}
                </th>
                <th
                  onClick={() => handleHeaderSort("coc")}
                  className="pb-4 cursor-pointer hover:text-white transition-colors text-right"
                >
                  CoC Return {sortKey === "coc" ? (sortDesc ? "↓" : "↑") : ""}
                </th>
                <th
                  onClick={() => handleHeaderSort("grm")}
                  className="pb-4 cursor-pointer hover:text-white transition-colors text-right"
                >
                  GRM {sortKey === "grm" ? (sortDesc ? "↓" : "↑") : ""}
                </th>
                <th
                  onClick={() => handleHeaderSort("dscr")}
                  className="pb-4 cursor-pointer hover:text-white transition-colors text-right"
                >
                  DSCR {sortKey === "dscr" ? (sortDesc ? "↓" : "↑") : ""}
                </th>
                <th
                  onClick={() => handleHeaderSort("irr")}
                  className="pb-4 cursor-pointer hover:text-white transition-colors text-right"
                >
                  IRR {sortKey === "irr" ? (sortDesc ? "↓" : "↑") : ""}
                </th>
                <th
                  onClick={() => handleHeaderSort("occupancy")}
                  className="pb-4 cursor-pointer hover:text-white transition-colors text-right"
                >
                  Occupancy {sortKey === "occupancy" ? (sortDesc ? "↓" : "↑") : ""}
                </th>
                <th
                  onClick={() => handleHeaderSort("oer")}
                  className="pb-4 cursor-pointer hover:text-white transition-colors text-right"
                >
                  OER {sortKey === "oer" ? (sortDesc ? "↓" : "↑") : ""}
                </th>
                <th
                  onClick={() => handleHeaderSort("appreciation")}
                  className="pb-4 cursor-pointer hover:text-white transition-colors text-right"
                >
                  Appreciation {sortKey === "appreciation" ? (sortDesc ? "↓" : "↑") : ""}
                </th>
                <th
                  onClick={() => handleHeaderSort("capitalRaised")}
                  className="pb-4 cursor-pointer hover:text-white transition-colors text-right"
                >
                  Equity Deployed {sortKey === "capitalRaised" ? (sortDesc ? "↓" : "↑") : ""}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {sortedProjects.map((proj) => {
                const data = scope === "Property" ? proj.asset : proj.investor;
                return (
                  <tr key={proj.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-4 font-semibold text-white">
                      <div>{proj.propertyName}</div>
                      <span className="text-[10px] text-slate-500 font-normal">{proj.address}</span>
                    </td>
                    <td className="py-4 font-mono font-semibold text-slate-400 tabular-nums">
                      {proj.ownershipPct}%
                    </td>
                    {/* NOI */}
                    <td className="py-4 text-right font-mono text-white font-semibold tabular-nums">
                      {fmtUSD(data.noi)}
                    </td>
                    {/* Cash Flow */}
                    <td className="py-4 text-right font-mono text-white font-semibold tabular-nums">
                      {fmtUSD(data.cashFlow)}
                    </td>
                    {/* Cap Rate */}
                    <td className="py-4 text-right">
                      <span className={`px-2.5 py-1 rounded-md border text-[11px] font-bold font-mono tabular-nums ${getMatrixCellClass("capRate", data.capRate)}`}>
                        {fmtPct(data.capRate)}
                      </span>
                    </td>
                    {/* Cash-on-Cash */}
                    <td className="py-4 text-right">
                      <span className={`px-2.5 py-1 rounded-md border text-[11px] font-bold font-mono tabular-nums ${getMatrixCellClass("coc", data.coc)}`}>
                        {fmtPct(data.coc)}
                      </span>
                    </td>
                    {/* GRM */}
                    <td className="py-4 text-right">
                      <span className={`px-2.5 py-1 rounded-md border text-[11px] font-bold font-mono tabular-nums ${getMatrixCellClass("grm", data.grm)}`}>
                        {data.grm.toFixed(2)}x
                      </span>
                    </td>
                    {/* DSCR */}
                    <td className="py-4 text-right">
                      <span className={`px-2.5 py-1 rounded-md border text-[11px] font-bold font-mono tabular-nums ${getMatrixCellClass("dscr", data.dscr)}`}>
                        {data.dscr.toFixed(2)}x
                      </span>
                    </td>
                    {/* IRR */}
                    <td className="py-4 text-right">
                      <span className={`px-2.5 py-1 rounded-md border text-[11px] font-bold font-mono tabular-nums ${getMatrixCellClass("irr", data.irr)}`}>
                        {fmtPct(data.irr)}
                      </span>
                    </td>
                    {/* Occupancy */}
                    <td className="py-4 text-right">
                      <span className={`px-2.5 py-1 rounded-md border text-[11px] font-bold font-mono tabular-nums ${getMatrixCellClass("occupancy", data.occupancy)}`}>
                        {fmtPct(data.occupancy)}
                      </span>
                    </td>
                    {/* OER (Expense Ratio) */}
                    <td className="py-4 text-right">
                      <span className={`px-2.5 py-1 rounded-md border text-[11px] font-bold font-mono tabular-nums ${getMatrixCellClass("oer", data.oer)}`}>
                        {fmtPct(data.oer)}
                      </span>
                    </td>
                    {/* Appreciation */}
                    <td className="py-4 text-right">
                      <span className={`px-2.5 py-1 rounded-md border text-[11px] font-bold font-mono tabular-nums ${getMatrixCellClass("appreciation", data.appreciation)}`}>
                        {fmtPct(data.appreciation)}
                      </span>
                    </td>
                    {/* Capital Deployed */}
                    <td className="py-4 text-right font-mono text-white font-semibold tabular-nums">
                      {fmtUSD(data.capitalRaised)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
