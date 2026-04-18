'use client';

import React from 'react';
import { 
  BarChart3, 
  Users, 
  Activity, 
  TrendingUp, 
  AlertCircle, 
  Zap, 
  Clock, 
  DollarSign, 
  Map, 
  ChevronRight,
  TrendingDown
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function MarketplaceAnalytics() {
  return (
    <div className="min-h-screen bg-pw-bg p-12 lg:p-16">
      <header className="mb-16">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-12">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.4em] text-pw-subtle mb-3">Institutional Intelligence</p>
            <h1 className="text-5xl font-black text-pw-black tracking-tighter uppercase">Marketplace Audits</h1>
          </div>
          <div className="flex gap-4">
            <button className="px-8 py-4 bg-white border border-pw-border text-xs font-black uppercase tracking-[0.2em] text-pw-muted hover:text-pw-black hover:border-pw-black transition-all">
              Export Variance (CSV)
            </button>
            <button className="px-8 py-4 bg-pw-black text-white text-xs font-black uppercase tracking-[0.2em] hover:bg-pw-fg transition-all">
              Initiate Performance Audit
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-px bg-pw-border border border-pw-border mb-16">
        <StatCard 
          icon={<Users className="w-5 h-5" />}
          label="Active Professionals"
          value="248"
          trend="+12%"
          trendType="positive"
        />
        <StatCard 
          icon={<Activity className="w-5 h-5" />}
          label="Request Match Rate"
          value="94.2%"
          description="Ecosystem Liquidity"
        />
        <StatCard 
          icon={<Clock className="w-5 h-5" />}
          label="Latency Response"
          value="3.8 hrs"
          trend="-22%"
          trendType="positive" 
        />
        <StatCard 
          icon={<DollarSign className="w-5 h-5" />}
          label="Gross Procured Volume"
          value="$1.2M"
          trend="+8%"
          trendType="positive"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-16">
        {/* Fee Variance by Jurisdiction */}
        <div className="xl:col-span-2 bg-white p-12 border border-pw-border">
          <div className="flex justify-between items-start mb-12">
            <div>
              <h3 className="text-2xl font-black text-pw-black tracking-tighter uppercase">Jurisdiction Variance</h3>
              <p className="text-xs font-black text-pw-subtle mt-2 uppercase tracking-widest leading-relaxed">Cross-metro pricing consistency audit</p>
            </div>
            <select className="bg-pw-dashboard border border-pw-border px-6 py-3 text-xs font-black uppercase tracking-widest focus:outline-none focus:border-pw-black">
              <option>Appraisal Baseline</option>
              <option>Legal Baseline</option>
            </select>
          </div>
          
          <div className="border border-pw-border divide-y divide-pw-border">
            <METRO_FEE_ROW city="Austin, TX (78701)" fee={840} deviation={12} trend="up" />
            <METRO_FEE_ROW city="Nashville, TN (37203)" fee={720} deviation={8} trend="down" />
            <METRO_FEE_ROW city="Atlanta, GA (30303)" fee={680} deviation={15} trend="up" />
            <METRO_FEE_ROW city="Miami, FL (33101)" fee={1250} deviation={22} trend="up" />
            <METRO_FEE_ROW city="Dallas, TX (75201)" fee={810} deviation={5} trend="down" />
          </div>
          
          <div className="mt-12 p-8 bg-pw-black text-white flex items-start gap-8">
            <Zap className="w-10 h-10 text-white shrink-0" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] mb-2 opacity-50">Strategic Advisory</p>
              <p className="text-sm font-medium leading-relaxed">
                Appraiser fee variance in South Florida is currently 2.4x the national baseline. 
                Recommended action: Accelerate professional onboarding in Miami-Dade county to stabilize procurement costs.
              </p>
            </div>
          </div>
        </div>

        {/* Liquidity Funnel (Grayscale Institutional) */}
        <div className="bg-white border border-pw-border p-12 flex flex-col">
          <h3 className="text-2xl font-black text-pw-black uppercase tracking-tighter mb-2">Liquidity Funnel</h3>
          <p className="text-pw-subtle text-xs font-black uppercase tracking-widest mb-16">Request-to-Engagement Pipeline</p>

          <div className="flex-1 space-y-12">
            <FUNNEL_STEP label="Quotes Requested" value="1,240" percent="100%" color="bg-pw-black" />
            <FUNNEL_STEP label="Fees Logged" value="980" percent="79%" color="bg-pw-phase-4" />
            <FUNNEL_STEP label="Quotes Approved" value="412" percent="33%" color="bg-pw-phase-3" />
            <FUNNEL_STEP label="Engagements Finalized" value="288" percent="23%" color="bg-pw-phase-2" />
          </div>

          <div className="mt-16 pt-12 border-t border-pw-border">
             <div className="flex items-center gap-6">
                <div className="w-12 h-12 border border-pw-black flex items-center justify-center">
                   <TrendingUp className="w-6 h-6 text-pw-black" />
                </div>
                <div>
                   <p className="text-xs font-black uppercase tracking-[0.2em] text-pw-subtle">Process Efficiency</p>
                   <p className="text-3xl font-black text-pw-black tracking-tighter">1.4x</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, trend, trendType, description }: any) {
  return (
    <div className="bg-white p-10 flex flex-col justify-between h-52 transition-colors hover:bg-pw-dashboard">
      <div className="flex justify-between items-start">
        <div className="p-3 border border-pw-border bg-pw-dashboard text-pw-black">
          {icon}
        </div>
        {trend && (
           <span className="text-xs font-black uppercase tracking-widest text-pw-black flex items-center gap-1">
             {trendType === 'positive' && <TrendingUp className="w-3 h-3" />}
             {trend}
           </span>
        )}
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-pw-subtle mb-2">{label}</p>
        <div className="flex items-end justify-between">
          <h4 className="text-4xl font-black text-pw-black tracking-tighter">{value}</h4>
          {description && <p className="text-xs font-black text-pw-subtle uppercase tracking-widest mb-1.5">{description}</p>}
        </div>
      </div>
    </div>
  );
}

function METRO_FEE_ROW({ city, fee, deviation, trend }: any) {
  return (
    <div className="flex items-center justify-between p-6 transition-colors hover:bg-pw-dashboard">
      <div className="flex items-center gap-6">
        <div className="w-12 h-12 border border-pw-border bg-pw-dashboard flex items-center justify-center text-pw-subtle">
          <Map className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm font-black text-pw-black uppercase tracking-tighter">{city}</p>
          <p className="text-xs text-pw-subtle font-black uppercase tracking-widest mt-0.5">Fee Benchmark</p>
        </div>
      </div>
      <div className="flex items-center gap-12">
        <div className="text-right">
          <p className="text-lg font-black text-pw-black tracking-tight">${fee.toLocaleString()}</p>
          <div className="flex items-center justify-end gap-1.5 mt-0.5">
             <span className="text-xs font-black text-pw-black uppercase tracking-tighter">{deviation}% VAR</span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-pw-subtle" />
      </div>
    </div>
  );
}

function FUNNEL_STEP({ label, value, percent, color = 'bg-pw-black' }: any) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <p className="text-xs font-black uppercase tracking-widest text-pw-subtle">{label}</p>
        <p className="text-xs font-black tracking-tight text-pw-black">{value} <span className="text-xs text-pw-subtle ml-1">({percent})</span></p>
      </div>
      <div className="h-1 w-full bg-pw-dashboard">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: percent }}
          className={`h-full ${color}`}
        />
      </div>
    </div>
  );
}
