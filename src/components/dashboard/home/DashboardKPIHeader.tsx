'use client';

import { Card, CardContent } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area } from "recharts";
import { ArrowUpRight, ArrowDownRight, FileText, PenTool, Zap, HardDrive, Database } from "lucide-react";
import { useMetricSnapshots } from "@/hooks/useMetricSnapshots";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";

export default function DashboardKPIHeader() {
  const { snapshots, loading } = useMetricSnapshots(15);
  const { profile } = useAuth();

  // Helper to get percentage change between latest and 7 days ago (or oldest available)
  const calculateChange = (key: 'totalDocuments' | 'pendingSignatures' | 'teamEfficiencyScore' | 'storageUsageBytes') => {
    if (snapshots.length < 2) return { text: "No historical data", positive: true, pct: 0 };
    
    const latest = snapshots[snapshots.length - 1][key];
    const pastIndex = Math.max(0, snapshots.length - 8); // ~7 days ago or oldest
    const past = snapshots[pastIndex][key];

    if (past === 0) return { text: "N/A", positive: true, pct: 0 };
    
    const diff = latest - past;
    const pct = (diff / past) * 100;
    const positive = diff >= 0;
    
    // For pending signatures and storage, we might want negative to be good, but we'll stick to mathematical positive for arrows
    return {
      text: `${positive ? '↑' : '↓'} ${Math.abs(pct).toFixed(1)}% vs. last week`,
      positive: positive,
      pct
    };
  };

  const formatStorage = (bytes: number) => {
    if (bytes === 0) return "0 GB";
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  // Build the live KPI array from the latest snapshot
  const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

  const kpis = [
    {
      title: "Total Documents",
      value: latestSnapshot ? latestSnapshot.totalDocuments.toLocaleString() : "0",
      change: calculateChange('totalDocuments').text,
      positive: calculateChange('totalDocuments').positive,
      data: snapshots.map(s => ({ value: s.totalDocuments })),
      icon: FileText,
      color: "#00E5FF"
    },
    {
      title: "Pending Signatures",
      value: latestSnapshot ? latestSnapshot.pendingSignatures.toLocaleString() : "0",
      change: calculateChange('pendingSignatures').text,
      // Decreasing pending signatures is conceptually "good" but arrow direction is math based:
      positive: calculateChange('pendingSignatures').pct <= 0, 
      data: snapshots.map(s => ({ value: s.pendingSignatures })),
      icon: PenTool,
      color: "#00E5FF"
    },
    {
      title: "Team Efficiency",
      value: latestSnapshot ? `${latestSnapshot.teamEfficiencyScore}%` : "0%",
      change: calculateChange('teamEfficiencyScore').text,
      positive: calculateChange('teamEfficiencyScore').positive,
      data: snapshots.map(s => ({ value: s.teamEfficiencyScore })),
      icon: Zap,
      color: "#00E5FF"
    },
    {
      title: "Storage Usage",
      value: latestSnapshot ? formatStorage(latestSnapshot.storageUsageBytes) : "0 GB",
      change: calculateChange('storageUsageBytes').text,
      positive: calculateChange('storageUsageBytes').pct <= 0, // Lower storage growth is better
      data: snapshots.map(s => ({ value: s.storageUsageBytes / (1024 * 1024 * 1024) })), // plot in GB
      icon: HardDrive,
      color: "#A1A1AA"
    }
  ];


  if (loading) {
    return <div className="animate-pulse h-32 bg-gray-100 rounded-xl w-full"></div>;
  }

  return (
    <div className="flex flex-col gap-4">
      {snapshots.length === 0 && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg">
          <span className="text-sm">No historical KPI data found for this organization. Sparklines will be flat until the daily background job runs.</span>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          // When no data, render a flat line at 0
          const chartData = kpi.data.length > 0 ? kpi.data : Array.from({ length: 15 }).map(() => ({ value: 0 }));
          
          return (
            <div key={i} className="glass-card rounded-3xl overflow-hidden relative border border-white/5">
              <div className="p-6 relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-10 h-10 rounded-full bg-surface-container-high border border-white/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary luminous-glow" />
                  </div>
                  <div className={`flex items-center gap-1 font-label-sm text-label-sm px-3 py-1 rounded-full border ${kpi.positive ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-white/5 border-white/10 text-on-surface-variant'}`}>
                    {kpi.change.includes('↑') && <ArrowUpRight className="w-3.5 h-3.5" />}
                    {kpi.change.includes('↓') && <ArrowDownRight className="w-3.5 h-3.5" />}
                    {kpi.change.replace(/[↑↓]\s*/, '')}
                  </div>
                </div>
                <div className="flex flex-col flex-1">
                  <h3 className="font-headline-lg text-headline-lg tracking-tight text-on-surface">{kpi.value}</h3>
                  <p className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest mt-1 font-bold">{kpi.title}</p>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none opacity-50 mix-blend-screen">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`color-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={kpi.color} stopOpacity={0.6} />
                        <stop offset="95%" stopColor={kpi.color} stopOpacity={0} />
                      </linearGradient>
                      <filter id={`glow-${i}`}>
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke={kpi.color} 
                      fillOpacity={1} 
                      fill={`url(#color-${i})`} 
                      strokeWidth={2} 
                      isAnimationActive={false}
                      filter={`url(#glow-${i})`}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
