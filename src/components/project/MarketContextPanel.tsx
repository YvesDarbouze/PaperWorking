"use client";

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { 
  Home, 
  TrendingUp, 
  Info, 
  HelpCircle, 
  AlertCircle, 
  Calendar, 
  ShieldAlert,
  ArrowUpRight,
  DollarSign,
  Clock
} from "lucide-react";

interface MarketContextPanelProps {
  zipCode: string;
  beds?: number | null;
  propertyType?: string | null;
  projectRent?: number | null;
  projectPrice?: number | null;
  projectSqft?: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findPropertyTypeStat(stats: any[] | undefined, projectType: string | null | undefined) {
  if (!stats || !projectType) return null;
  const normalized = projectType.toLowerCase().trim();
  
  // Try exact match first
  let match = stats.find(s => s.propertyType.toLowerCase() === normalized);
  if (match) return match;
  
  // Try partial match
  match = stats.find(s => {
    const pt = s.propertyType.toLowerCase();
    return pt.includes(normalized) || normalized.includes(pt);
  });
  if (match) return match;
  
  // Try mapped names
  if (normalized.includes("single") || normalized === "sfr") {
    match = stats.find(s => s.propertyType.toLowerCase().includes("single"));
  } else if (normalized.includes("condo")) {
    match = stats.find(s => s.propertyType.toLowerCase().includes("condo"));
  } else if (normalized.includes("town")) {
    match = stats.find(s => s.propertyType.toLowerCase().includes("town"));
  } else if (normalized.includes("multi") || normalized.includes("plex") || normalized.includes("apartment")) {
    match = stats.find(s => s.propertyType.toLowerCase().includes("multi"));
  }
  return match || null;
}

function findBedroomsStat(stats: any[] | undefined, beds: number | null | undefined) {
  if (!stats || beds === undefined || beds === null) return null;
  return stats.find(s => s.bedrooms === beds) || null;
}

// ─── Sparkline SVG Sub-component ──────────────────────────────────────────────

function Sparkline({ data, color = "#00DD94" }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) {
    return <span className="text-[10px] text-[#6E7480]">No history</span>;
  }
  const width = 80;
  const height = 20;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min === 0 ? 1 : max - min;
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - 2 - ((val - min) / range) * (height - 4);
    return `${x},${y}`;
  });
  
  const pathD = `M ${points.join(" L ")}`;
  
  return (
    <svg width={width} height={height} className="overflow-visible select-none shrink-0">
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MarketContextPanel({
  zipCode,
  beds,
  propertyType,
  projectRent,
  projectPrice,
  projectSqft,
}: MarketContextPanelProps) {
  const { user } = useAuth();
  
  // Format ZIP code
  const formattedZip = zipCode ? zipCode.trim() : "";

  // Fetch zip-level market stats
  const { data: stats, isLoading, error, isError } = useQuery({
    queryKey: ["market-stats-panel", formattedZip],
    queryFn: async () => {
      const token = await user?.getIdToken();
      if (!token || !formattedZip) throw new Error("Not ready");
      const res = await fetch(`/api/reil/market-stats?zipCode=${formattedZip}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 404) {
        throw new Error("NOT_FOUND");
      }
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = await res.json();
      return data.stats;
    },
    enabled: !!formattedZip && !!user,
    staleTime: 5 * 60 * 1000, // 5 min cache in memory
    retry: false, // Don't retry on 404 errors
  });

  // Calculate comparisons
  const matchedSaleStat = useMemo(() => {
    if (!stats?.saleData) return null;
    const byType = findPropertyTypeStat(stats.saleData.dataByPropertyType, propertyType);
    const byBeds = findBedroomsStat(stats.saleData.dataByBedrooms, beds);
    return byType || byBeds || stats.saleData;
  }, [stats, propertyType, beds]);

  const matchedRentStat = useMemo(() => {
    if (!stats?.rentalData) return null;
    const byType = findPropertyTypeStat(stats.rentalData.dataByPropertyType, propertyType);
    const byBeds = findBedroomsStat(stats.rentalData.dataByBedrooms, beds);
    return byType || byBeds || stats.rentalData;
  }, [stats, propertyType, beds]);

  // Chronological 12-month history values
  const saleHistoryValues = useMemo(() => {
    if (!stats?.saleData?.history) return [];
    const keys = Object.keys(stats.saleData.history).sort();
    return keys.map(k => stats.saleData.history[k].medianPrice || 0);
  }, [stats]);

  const rentHistoryValues = useMemo(() => {
    if (!stats?.rentalData?.history) return [];
    const keys = Object.keys(stats.rentalData.history).sort();
    return keys.map(k => stats.rentalData.history[k].medianPrice || 0);
  }, [stats]);

  const domHistoryValues = useMemo(() => {
    if (!stats?.saleData?.history) return [];
    const keys = Object.keys(stats.saleData.history).sort();
    return keys.map(k => stats.saleData.history[k].medianDaysOnMarket || 0);
  }, [stats]);

  // Loading state skeleton
  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-6 space-y-4 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-4 bg-white/10 rounded w-1/4" />
          <div className="h-3 bg-white/10 rounded w-16" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-24 bg-white/5 rounded-xl" />
          <div className="h-24 bg-white/5 rounded-xl" />
          <div className="h-24 bg-white/5 rounded-xl" />
        </div>
      </div>
    );
  }

  // Unavailable state/Coverage gap
  if (isError || (error as any)?.message === "NOT_FOUND" || !stats || !formattedZip) {
    return (
      <div 
        className="rounded-2xl p-5 border flex items-start gap-3.5"
        style={{
          background: "rgba(240,101,67,0.04)",
          borderColor: "rgba(240,101,67,0.15)",
        }}
      >
        <ShieldAlert className="w-5 h-5 text-[#F06543] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-[12px] font-bold uppercase tracking-widest text-[#F06543]">
            Market Data Unavailable
          </h4>
          <p className="text-[11px] text-[#9E9DA0] font-light leading-relaxed">
            Market statistics (macro-metrics) are currently unavailable for ZIP code <span className="font-semibold text-white">{formattedZip || "N/A"}</span>.
            Underwriting comparisons and sparklines will remain placeholder-free.
          </p>
        </div>
      </div>
    );
  }

  // Extract matched metrics
  const marketPrice = matchedSaleStat?.medianPrice || stats.saleData?.medianPrice || 0;
  const marketPricePerSqft = matchedSaleStat?.medianPricePerSquareFoot || stats.saleData?.medianPricePerSquareFoot || 0;
  const marketRent = matchedRentStat?.medianPrice || stats.rentalData?.medianPrice || 0;
  const marketRentPerSqft = matchedRentStat?.medianPricePerSquareFoot || stats.rentalData?.medianPricePerSquareFoot || 0;
  const marketDOM = matchedSaleStat?.medianDaysOnMarket || stats.saleData?.medianDaysOnMarket || 45;

  // Calculate project metrics vs market medians
  const rentDiff = (projectRent && marketRent) ? projectRent - marketRent : null;
  const rentDiffPct = (rentDiff && marketRent) ? (rentDiff / marketRent) * 100 : null;

  const priceDiff = (projectPrice && marketPrice) ? projectPrice - marketPrice : null;
  const priceDiffPct = (priceDiff && marketPrice) ? (priceDiff / marketPrice) * 100 : null;

  const projectPricePerSqft = (projectPrice && projectSqft && projectSqft > 0) ? projectPrice / Number(projectSqft) : null;
  const sqftDiff = (projectPricePerSqft && marketPricePerSqft) ? projectPricePerSqft - marketPricePerSqft : null;
  const sqftDiffPct = (sqftDiff && marketPricePerSqft) ? (sqftDiff / marketPricePerSqft) * 100 : null;

  const asOfDate = stats.fetchedAt ? new Date(stats.fetchedAt).toLocaleDateString() : "";

  return (
    <div 
      className="glass-card rounded-2xl overflow-hidden"
      style={{
        background: "rgba(22,19,24,0.6)",
        border: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Header */}
      <div 
        className="flex justify-between items-center px-5 py-3.5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-[#454955]">analytics</span>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#9E9DA0] leading-none mt-0.5">
            Market Intelligence — ZIP {stats.zipCode} ({stats.city}, {stats.state})
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] text-[#6E7480] font-mono uppercase">
          <Calendar className="w-3 h-3 text-[#6B6870]" />
          As of {asOfDate}
        </div>
      </div>

      {/* Body Grid */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Median Price Card */}
        <div className="bg-white/[0.01] border border-white/5 rounded-xl p-4 flex flex-col justify-between hover:border-white/10 transition-colors">
          <div className="space-y-1.5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#6E7480]">
              Median Price ({propertyType || "Overall"})
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold text-white tabular-nums tracking-tight">
                ${marketPrice.toLocaleString()}
              </span>
              <Sparkline data={saleHistoryValues} color="#00DD94" />
            </div>
            <p className="text-[10px] text-[#6E7480] font-light">
              Avg $/Sqft: <span className="font-semibold text-white">${Math.round(marketPricePerSqft)}/sqft</span>
            </p>
          </div>

          {/* Benchmark comparison */}
          {projectPrice !== undefined && projectPrice !== null && (
            <div className="mt-3 pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px]">
              <span className="text-[#6E7480]">Project price vs market:</span>
              <div 
                className="flex items-center gap-0.5 font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: priceDiff && priceDiff <= 0 ? "rgba(16,185,129,0.15)" : "rgba(240,101,67,0.15)",
                  color: priceDiff && priceDiff <= 0 ? "#10b981" : "#F06543",
                }}
              >
                {priceDiff && priceDiff <= 0 ? "Below" : "Above"} {priceDiffPct ? `${Math.abs(Math.round(priceDiffPct))}%` : ""}
              </div>
            </div>
          )}
        </div>

        {/* Median Rent Card */}
        <div className="bg-white/[0.01] border border-white/5 rounded-xl p-4 flex flex-col justify-between hover:border-white/10 transition-colors">
          <div className="space-y-1.5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#6E7480]">
              Median Rent ({beds ? `${beds} Bedroom` : "Overall"})
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold text-white tabular-nums tracking-tight">
                ${marketRent.toLocaleString()}/mo
              </span>
              <Sparkline data={rentHistoryValues} color="#7A9EAA" />
            </div>
            <p className="text-[10px] text-[#6E7480] font-light">
              Avg $/Sqft: <span className="font-semibold text-white">${marketRentPerSqft.toFixed(2)}/sqft</span>
            </p>
          </div>

          {/* Benchmark rent comparison */}
          {projectRent !== undefined && projectRent !== null && (
            <div className="mt-3 pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px]">
              <span className="text-[#6E7480]">Project rent vs market:</span>
              <div 
                className="flex items-center gap-0.5 font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: rentDiff && rentDiff >= 0 ? "rgba(16,185,129,0.15)" : "rgba(240,101,67,0.15)",
                  color: rentDiff && rentDiff >= 0 ? "#10b981" : "#F06543",
                }}
              >
                {rentDiff && rentDiff >= 0 ? "+" : ""}{rentDiffPct ? `${Math.round(rentDiffPct)}%` : ""}
              </div>
            </div>
          )}
        </div>

        {/* Days on Market (DOM) Card */}
        <div className="bg-white/[0.01] border border-white/5 rounded-xl p-4 flex flex-col justify-between hover:border-white/10 transition-colors">
          <div className="space-y-1.5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#6E7480]">
              Median Days on Market
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold text-white tabular-nums tracking-tight">
                {marketDOM} <span className="text-xs font-normal text-[#6E7480]">days</span>
              </span>
              <Sparkline data={domHistoryValues} color="#F59E0B" />
            </div>
            <p className="text-[10px] text-[#6E7480] font-light">
              Market speed: <span className="font-semibold text-white">{marketDOM < 30 ? "Fast" : marketDOM < 60 ? "Moderate" : "Slow"}</span>
            </p>
          </div>

          {/* Source indicator */}
          <div className="mt-3 pt-2 border-t border-white/[0.04] flex items-center justify-between text-[9px] text-[#6E7480]">
            <span>Data source:</span>
            <span className="font-semibold uppercase tracking-wider font-mono text-[8px]">{stats.sourceProvider}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
