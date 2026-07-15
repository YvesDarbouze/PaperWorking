"use client";

import React, { useState, useMemo } from "react";
import { useTheme } from "@/lib/utils/ThemeProvider";
import toast from "react-hot-toast";

interface Submarket {
  id: string;
  name: string;
  region: string;
  capRate: number;
  coc: number;
  density: number;
  yieldLevel: "Moderate" | "High" | "Very High";
  colorIntensity: string; // Tailwind opacity suffix
}

interface SourcedDeal {
  id: string;
  title: string;
  submarketId: string;
  submarketName: string;
  price: number;
  capRate: number;
  coc: number;
  type: string;
  source: string;
}

interface MarketVendor {
  id: string;
  name: string;
  category: string;
  submarketName: string;
  rating: number;
}

const SUBMARKETS: Submarket[] = [
  { id: "sm-1", name: "Memphis Core", region: "Memphis, TN", capRate: 9.1, coc: 12.2, density: 19, yieldLevel: "Very High", colorIntensity: "30" },
  { id: "sm-2", name: "Chicago South Side", region: "Chicago, IL", capRate: 8.4, coc: 11.2, density: 14, yieldLevel: "Very High", colorIntensity: "25" },
  { id: "sm-3", name: "Atlanta Metro", region: "Atlanta, GA", capRate: 7.5, coc: 9.1, density: 8, yieldLevel: "High", colorIntensity: "15" },
  { id: "sm-4", name: "Indianapolis Suburbs", region: "Indianapolis, IN", capRate: 6.8, coc: 7.8, density: 6, yieldLevel: "Moderate", colorIntensity: "08" },
  { id: "sm-5", name: "Dallas North", region: "Dallas, TX", capRate: 6.2, coc: 5.9, density: 11, yieldLevel: "Moderate", colorIntensity: "05" },
];

const SOURCED_DEALS: SourcedDeal[] = [
  { id: "d-1", title: "Memphis Single Family Portfolio", submarketId: "sm-1", submarketName: "Memphis Core", price: 290000, capRate: 9.3, coc: 13.1, type: "SFR Portfolio", source: "Alpha Sourcing" },
  { id: "d-2", title: "Chicago South Side Brick Duplex", submarketId: "sm-2", submarketName: "Chicago South Side", price: 135000, capRate: 8.5, coc: 11.4, type: "Duplex", source: "Apex Realty" },
  { id: "d-3", title: "Atlanta Value-Add Quadplex", submarketId: "sm-3", submarketName: "Atlanta Metro", price: 420000, capRate: 7.8, coc: 9.8, type: "Quadplex", source: "Capital Sourced" },
  { id: "d-4", title: "Indianapolis Turnkey SFR", submarketId: "sm-4", submarketName: "Indianapolis Suburbs", price: 115000, capRate: 7.2, coc: 8.1, type: "Single Family", source: "Midwest Deals" },
  { id: "d-5", title: "Dallas North Luxury Triplex", submarketId: "sm-5", submarketName: "Dallas North", price: 310000, capRate: 6.5, coc: 6.2, type: "Triplex", source: "Lone Star Group" },
];

const MARKET_VENDORS: MarketVendor[] = [
  { id: "v-1", name: "ProBuild Contractors", category: "Contractor", submarketName: "Chicago South Side", rating: 4.8 },
  { id: "v-2", name: "Prime Structural Inspections", category: "Inspector", submarketName: "Memphis Core", rating: 4.9 },
  { id: "v-3", name: "Capital Bridge Lending", category: "Lender", submarketName: "Atlanta Metro", rating: 4.7 },
  { id: "v-4", name: "Coastal Title & Escrow", category: "Attorney", submarketName: "Indianapolis Suburbs", rating: 4.9 },
  { id: "v-5", name: "Premier Property Group", category: "Property Manager", submarketName: "Dallas North", rating: 4.6 },
];

export function MarketHeatmap() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [activeTab, setActiveTab] = useState<"heatmap" | "deals" | "vendors">("heatmap");
  const [selectedSubmarketId, setSelectedSubmarketId] = useState<string | null>(null);

  const t = useMemo(() => {
    return {
      heading: isDark ? "rgba(253,255,252,0.95)" : "#0d0a0b",
      subtext: isDark ? "rgba(253,255,252,0.42)" : "rgba(69,73,85,0.58)",
      muted: isDark ? "rgba(253,255,252,0.28)" : "rgba(69,73,85,0.42)",
      divider: isDark ? "rgba(255,255,255,0.06)" : "rgba(69,73,85,0.09)",
      link: isDark ? "#7A9EAA" : "#2A5F72",
      panelBg: isDark ? "linear-gradient(135deg, rgba(30,27,32,0.65) 0%, rgba(18,16,20,0.88) 100%)" : "#FFFFFF",
      panelBorder: isDark ? "rgba(255,255,255,0.08)" : "rgba(69,73,85,0.10)",
      panelShadow: isDark ? "0 8px 32px rgba(0,0,0,0.25)" : "0 2px 10px rgba(0,0,0,0.06)",
    };
  }, [isDark]);

  const activeSubmarket = useMemo(() => {
    return SUBMARKETS.find(sm => sm.id === selectedSubmarketId) || null;
  }, [selectedSubmarketId]);

  const handleAnalyzeDeal = (dealTitle: string) => {
    toast.success(`Deal "${dealTitle}" imported successfully to Deal Analyzer.`, {
      style: {
        background: isDark ? "#121317" : "#FFF",
        color: isDark ? "#FFF" : "#121317",
        border: `1px solid ${t.panelBorder}`
      }
    });
  };

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col h-full min-h-[360px]"
      style={{
        background: t.panelBg,
        backdropFilter: isDark ? "blur(24px)" : undefined,
        WebkitBackdropFilter: isDark ? "blur(24px)" : undefined,
        border: `1px solid ${t.panelBorder}`,
        boxShadow: t.panelShadow,
      }}
    >
      {/* Tab bar header */}
      <div
        className="px-5 py-3 flex items-center justify-between shrink-0"
        style={{ borderBottom: `1px solid ${t.divider}` }}
      >
        <div className="flex items-center gap-1.5">
          {["heatmap", "deals", "vendors"].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab as any);
                setSelectedSubmarketId(null);
              }}
              className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all cursor-pointer"
              style={{
                background: activeTab === tab
                  ? (isDark ? "rgba(50,121,249,0.12)" : "rgba(50,121,249,0.08)")
                  : "transparent",
                color: activeTab === tab ? "#3279F9" : t.subtext,
                border: activeTab === tab
                  ? "1px solid rgba(50,121,249,0.25)"
                  : "1px solid transparent"
              }}
            >
              {tab === "heatmap" ? "Yield Heatmap" : tab === "deals" ? "Sourced Deals" : "Local Vendors"}
            </button>
          ))}
        </div>
        <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.muted }}>
          {activeTab === "heatmap" ? "5 Submarkets" : activeTab === "deals" ? "5 Opportunities" : "Sourcing Directory"}
        </div>
      </div>

      {/* Main panel content */}
      <div className="flex-1 p-5 overflow-y-auto min-h-0 flex flex-col">
        {activeTab === "heatmap" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 flex-1 items-stretch">
            {/* Heatmap Grid (left 7 cols) */}
            <div className="md:col-span-7 flex flex-col gap-2.5">
              <p className="text-[11px] mb-1.5" style={{ color: t.subtext }}>
                Select a target submarket tile to view annualized yield cap rates, deal volumes, and local presence.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                {SUBMARKETS.map((sm) => {
                  const isSelected = sm.id === selectedSubmarketId;
                  const bgOpacity = sm.colorIntensity;

                  return (
                    <button
                      key={sm.id}
                      onClick={() => setSelectedSubmarketId(sm.id === selectedSubmarketId ? null : sm.id)}
                      className="rounded-xl p-3.5 text-left transition-all duration-200 hover:scale-[1.02] relative border cursor-pointer"
                      style={{
                        background: isSelected
                          ? (isDark ? "rgba(50, 121, 249, 0.16)" : "rgba(50, 121, 249, 0.08)")
                          : (isDark ? `rgba(50, 121, 249, 0.0${bgOpacity})` : `rgba(50, 121, 249, 0.0${bgOpacity})`),
                        borderColor: isSelected
                          ? "#3279F9"
                          : (isDark ? "rgba(255,255,255,0.06)" : "rgba(69,73,85,0.1)"),
                        boxShadow: isSelected ? "0 0 12px rgba(50, 121, 249, 0.2)" : "none",
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] font-bold" style={{ color: t.heading }}>
                          {sm.name}
                        </span>
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{
                            background: sm.yieldLevel === "Very High"
                              ? "rgba(50, 121, 249, 0.15)"
                              : sm.yieldLevel === "High"
                              ? "rgba(50, 121, 249, 0.08)"
                              : (isDark ? "rgba(255,255,255,0.04)" : "rgba(69,73,85,0.05)"),
                            color: sm.yieldLevel === "Very High" || sm.yieldLevel === "High" ? "#3279F9" : t.subtext
                          }}
                        >
                          {sm.yieldLevel} Yield
                        </span>
                      </div>
                      <p className="text-[10px] mb-2" style={{ color: t.subtext }}>
                        {sm.region}
                      </p>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-xl font-bold" style={{ color: t.heading }}>
                          {sm.capRate.toFixed(1)}%
                        </span>
                        <span className="text-[10px]" style={{ color: t.muted }}>
                          avg cap rate
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected submarket details pane (right 5 cols) */}
            <div className="md:col-span-5 flex flex-col justify-between p-4 rounded-xl border border-solid" style={{ borderColor: t.divider, background: isDark ? "rgba(255,255,255,0.01)" : "rgba(69,73,85,0.01)" }}>
              {activeSubmarket ? (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-[13px] font-bold" style={{ color: t.heading }}>
                      {activeSubmarket.name}
                    </h4>
                    <p className="text-[10px] mb-3" style={{ color: t.subtext }}>
                      {activeSubmarket.region}
                    </p>
                    <div className="h-px w-full my-2.5" style={{ background: t.divider }} />
                    <div className="grid grid-cols-2 gap-3.5 my-3">
                      <div>
                        <p className="text-[9px] uppercase tracking-wider font-bold" style={{ color: t.muted }}>
                          Cap Rate
                        </p>
                        <p className="text-[16px] font-extrabold" style={{ color: t.heading }}>
                          {activeSubmarket.capRate}%
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wider font-bold" style={{ color: t.muted }}>
                          Cash-on-Cash
                        </p>
                        <p className="text-[16px] font-extrabold" style={{ color: "#3279F9" }}>
                          {activeSubmarket.coc}%
                        </p>
                      </div>
                    </div>
                    <div className="h-px w-full my-2.5" style={{ background: t.divider }} />
                    <p className="text-[11px] leading-relaxed" style={{ color: t.subtext }}>
                      Yield density is graded as <span className="font-semibold text-primary">{activeSubmarket.yieldLevel}</span>, with <span className="font-semibold" style={{ color: t.heading }}>{activeSubmarket.density}</span> deals currently sourced or undergoing due diligence.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setActiveTab("deals");
                    }}
                    className="w-full mt-4 py-2 rounded-lg text-xs font-semibold hover:bg-primary hover:text-white transition-all duration-150 cursor-pointer text-center"
                    style={{
                      background: "rgba(50, 121, 249, 0.1)",
                      color: "#3279F9",
                      border: "1px solid rgba(50, 121, 249, 0.2)"
                    }}
                  >
                    View {activeSubmarket.density} Sourced Deals
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-12 flex-1">
                  <span className="material-symbols-outlined text-[28px] mb-2" style={{ color: t.muted }}>
                    ads_click
                  </span>
                  <p className="text-xs font-semibold" style={{ color: t.heading }}>
                    No Submarket Selected
                  </p>
                  <p className="text-[10px] max-w-[150px] mt-1" style={{ color: t.muted }}>
                    Click a submarket tile to analyze local cap rates and active deal counts.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "deals" && (
          <div className="flex-1 flex flex-col gap-2.5">
            <p className="text-[11px]" style={{ color: t.subtext }}>
              Deals sourced from active real estate co-investment groups, local professionals, and vendors.
            </p>
            <div className="space-y-2.5 flex-1 min-h-0">
              {SOURCED_DEALS.map((deal) => (
                <div
                  key={deal.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-solid transition-all duration-150 hover:bg-white/5"
                  style={{
                    borderColor: t.divider,
                    background: isDark ? "rgba(255,255,255,0.015)" : "rgba(69,73,85,0.02)"
                  }}
                >
                  <div className="min-w-0 flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[12px] font-bold truncate" style={{ color: t.heading }}>
                        {deal.title}
                      </span>
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(69,73,85,0.08)", color: t.subtext }}>
                        {deal.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]" style={{ color: t.muted }}>
                      <span>{deal.submarketName}</span>
                      <span>•</span>
                      <span>Sourced by {deal.source}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-[12px] font-bold" style={{ color: t.heading }}>
                        ${(deal.price / 1000).toFixed(0)}K
                      </p>
                      <p className="text-[9px]" style={{ color: t.muted }}>
                        Cap: <span className="font-semibold" style={{ color: "#3279F9" }}>{deal.capRate}%</span> · CoC: <span className="font-semibold">{deal.coc}%</span>
                      </p>
                    </div>
                    <button
                      onClick={() => handleAnalyzeDeal(deal.title)}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                      style={{
                        background: "#3279F9",
                        color: "#FFFFFF"
                      }}
                    >
                      Analyze
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "vendors" && (
          <div className="flex-1 flex flex-col gap-2.5">
            <p className="text-[11px]" style={{ color: t.subtext }}>
              Local professionals active in target submarkets, ready to provide structural quotes or deal closing diligence.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
              {MARKET_VENDORS.map((vendor) => (
                <div
                  key={vendor.id}
                  className="p-3.5 rounded-xl border border-solid flex flex-col justify-between transition-colors duration-150 hover:bg-white/5"
                  style={{
                    borderColor: t.divider,
                    background: isDark ? "rgba(255,255,255,0.015)" : "rgba(69,73,85,0.02)"
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="text-[12px] font-bold" style={{ color: t.heading }}>
                        {vendor.name}
                      </h4>
                      <p className="text-[10px] mt-0.5" style={{ color: t.muted }}>
                        {vendor.category} · {vendor.submarketName}
                      </p>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-400/20 bg-amber-400/10 text-amber-400">
                      ★ {vendor.rating.toFixed(1)}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      toast.success(`Opening profile for ${vendor.name}`);
                    }}
                    className="w-full mt-2 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase hover:bg-white/5 transition-colors cursor-pointer text-center"
                    style={{
                      border: `1px solid ${t.panelBorder}`,
                      color: t.subtext
                    }}
                  >
                    View Vendor Profile
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
