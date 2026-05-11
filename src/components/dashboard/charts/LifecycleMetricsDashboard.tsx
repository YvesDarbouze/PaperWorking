'use client';

import React, { useMemo, lazy, Suspense } from 'react';
import { Project } from '@/types/schema';
import { useProjectStore } from '@/store/projectStore';
import { computeNOIComponents, computeCapRate, computeDSCR, computeAnnualDebtService } from '@/lib/metrics/reiMetrics';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area
} from 'recharts';
import { 
  Building, DollarSign, Activity, TrendingUp, AlertTriangle, 
  ShieldCheck, ArrowUpRight, ArrowDownRight, Compass, Home, Map
} from 'lucide-react';

const NOIDeepDive = lazy(() => import('./NOIDeepDive'));

/* ═══════════════════════════════════════════════════════════════
   LIFECYCLE METRICS DASHBOARD
   A comprehensive master dashboard handling 4 core 2026 REI metrics:
   1. Property-Level Financials (Agent 1) — now powered by reiMetrics engine
   2. Operational & Property Management (Agent 2)
   3. Market & Portfolio Data (Agent 3)
   4. 2026 Strategic Focus Areas (Agent 4)
   + NOI Deep Dive panel (new)
   ═══════════════════════════════════════════════════════════════ */

interface Props {
  projects?: Project[];
}

// ─── AGENT 1: Property-Level Financial Metrics ───
// Now uses the real computeNOIComponents engine instead of the crude 50% rule
export function derivePropertyFinancials(projects: Project[]) {
  return projects.map((p) => {
    const financials = p.financials;
    if (!financials) {
      return { name: (p.propertyName || 'Unknown').substring(0, 10), NOI: 0, CapRate: 0, DSCR: 0 };
    }

    // Use the real metrics engine
    const noiComponents = computeNOIComponents(financials);
    const noi = noiComponents.noi;
    
    const purchasePrice = financials.purchasePrice ?? financials.estimatedARV ?? 0;
    const capRate = computeCapRate(noi, purchasePrice);
    
    // Compute DSCR from real debt service
    const loanAmount = financials.loanAmount ?? 0;
    const loanInterestRate = financials.loanInterestRate ?? 0;
    const loanTermMonths = 360; // 30-year conventional
    const annualDebtService = computeAnnualDebtService(loanAmount, loanInterestRate, loanTermMonths);
    const dscr = annualDebtService > 0 ? Math.round((noi / annualDebtService) * 100) / 100 : 0;

    return {
      name: (p.propertyName || 'Unknown').substring(0, 10),
      NOI: Math.round(noi),
      CapRate: Math.round(capRate * 100) / 100,
      DSCR: dscr,
    };
  }).slice(0, 5); // Limit to top 5 for chart clarity
}

const PropertyFinancialsAgent = ({ projects }: { projects: Project[] }) => {
  // Aggregate NOI, Cap Rate, CoC, DSCR
  const data = useMemo(() => derivePropertyFinancials(projects), [projects]);

  return (
    <div className="bg-bg-surface border border-border-accent rounded-xl p-5 shadow-sm flex flex-col h-[350px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><DollarSign className="w-5 h-5" /></div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Property Financials</h3>
            <p className="text-xs text-text-secondary">NOI · Cap Rate · DSCR</p>
          </div>
        </div>
      </div>
      
      <div className="flex-1 min-h-0 w-full">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} angle={-45} textAnchor="end" height={40} />
              <YAxis yAxisId="left" fontSize={10} tickFormatter={(v) => `$${v / 1000}k`} tickLine={false} axisLine={false} width={40} />
              <YAxis yAxisId="right" orientation="right" fontSize={10} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} width={30} />
              <Tooltip 
                cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
              />
              <Bar yAxisId="left" dataKey="NOI" name="NOI" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar yAxisId="right" dataKey="CapRate" name="Cap Rate (%)" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-text-secondary text-sm">Add a deal to see financial metrics here</div>
        )}
      </div>
    </div>
  );
};

// ─── AGENT 2: Operational & Property Management ───
export function deriveOperationalData(projects: Project[]) {
  // When projects have real data, use real OER from NOI components
  if (projects.length > 0 && projects.some(p => p.financials)) {
    let totalGPI = 0;
    let totalOpEx = 0;
    let totalVacancyLoss = 0;
    let totalMaintenance = 0;

    projects.forEach(p => {
      if (!p.financials) return;
      const c = computeNOIComponents(p.financials);
      totalGPI += c.grossRentalIncome + c.otherIncome;
      totalOpEx += c.totalOperatingExpenses;
      totalVacancyLoss += c.vacancyLoss;
      totalMaintenance += c.maintenance;
    });

    const oer = totalGPI > 0 ? Math.round((totalOpEx / totalGPI) * 100) : 0;
    const occupancy = totalGPI > 0 ? Math.round((1 - totalVacancyLoss / totalGPI) * 100) : 100;

    // Project quarterly trends using real baseline
    return [
      { quarter: 'Q1', Occupancy: Math.max(occupancy - 4, 0), OER: Math.min(oer + 3, 100), Maintenance: Math.round(totalMaintenance * 0.28) },
      { quarter: 'Q2', Occupancy: Math.max(occupancy - 2, 0), OER: Math.min(oer + 1, 100), Maintenance: Math.round(totalMaintenance * 0.22) },
      { quarter: 'Q3', Occupancy: occupancy, OER: oer, Maintenance: Math.round(totalMaintenance * 0.30) },
      { quarter: 'Q4', Occupancy: Math.min(occupancy + 2, 100), OER: Math.max(oer - 2, 0), Maintenance: Math.round(totalMaintenance * 0.20) },
    ];
  }

  // Fallback: synthetic data
  const projectCount = Math.max(projects.length, 1);
  const baseOcc = Math.min(85 + (projectCount * 2), 98);
  
  return [
    { quarter: 'Q1', Occupancy: baseOcc - 4, OER: 45, Maintenance: 2400 + (projectCount * 100) },
    { quarter: 'Q2', Occupancy: baseOcc - 2, OER: 42, Maintenance: 1800 + (projectCount * 100) },
    { quarter: 'Q3', Occupancy: baseOcc, OER: 39, Maintenance: 3200 + (projectCount * 50) },
    { quarter: 'Q4', Occupancy: Math.min(baseOcc + 3, 100), OER: 38, Maintenance: 1200 + (projectCount * 50) },
  ];
}

const OperationalDataAgent = ({ projects }: { projects: Project[] }) => {
  // Aggregate Occupancy, Turnover, OER, Maintenance
  const data = useMemo(() => deriveOperationalData(projects), [projects]);

  return (
    <div className="bg-bg-surface border border-border-accent rounded-xl p-5 shadow-sm flex flex-col h-[350px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Activity className="w-5 h-5" /></div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Operational Health</h3>
            <p className="text-xs text-text-secondary">Occupancy · Operating Expense Ratio</p>
          </div>
        </div>
      </div>
      
      <div className="flex-1 min-h-0 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorOcc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="quarter" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis fontSize={10} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} width={40} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
            <Area type="monotone" dataKey="Occupancy" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorOcc)" />
            <Line type="monotone" dataKey="OER" stroke="#F59E0B" strokeWidth={2} dot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ─── AGENT 3: Market & Portfolio Data ───
export function deriveMarketPortfolio(projects: Project[]) {
  let totalValue = 0;
  let totalDebt = 0;
  
  projects.forEach(p => {
    totalValue += (p.financials?.estimatedARV || p.financials?.purchasePrice || 0);
    totalDebt += (p.financials?.loanAmount || 0);
  });

  const ltv = totalValue > 0 ? Math.round((totalDebt / totalValue) * 100) : 0;
  const equity = 100 - ltv;

  if (totalValue === 0) {
     return [
       { name: 'No Data', value: 100, fill: '#E5E7EB' }
     ];
  }

  return [
    { name: 'Debt (LTV)', value: ltv, fill: '#EF4444' },
    { name: 'Equity', value: equity, fill: '#3B82F6' },
  ];
}

const MarketPortfolioAgent = ({ projects }: { projects: Project[] }) => {
  // Average LTV, ARV, Market Rent Growth
  const data = useMemo(() => deriveMarketPortfolio(projects), [projects]);

  return (
    <div className="bg-bg-surface border border-border-accent rounded-xl p-5 shadow-sm flex flex-col h-[350px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Map className="w-5 h-5" /></div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Leverage & Equity</h3>
            <p className="text-xs text-text-secondary">Debt vs. Equity Exposure</p>
          </div>
        </div>
      </div>
      
      <div className="flex-1 min-h-0 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="75%"
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
            <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
          <div className="text-center">
            <span className="block text-2xl font-bold text-text-primary">{data[0].value}%</span>
            <span className="block text-[10px] uppercase tracking-wider text-text-secondary">Avg LTV</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── AGENT 4: Summary of Key 2026 Focus Areas ───
const StrategicFocusAgent = () => {
  return (
    <div className="bg-bg-surface border border-border-accent rounded-xl p-5 shadow-sm flex flex-col h-[350px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Compass className="w-5 h-5" /></div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Strategic Priorities</h3>
            <p className="text-xs text-text-secondary">Recommended focus areas for your portfolio</p>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col gap-4 overflow-y-auto pr-2 pb-2">
        <div className="p-3 rounded-lg border border-border-accent bg-bg-primary/30">
          <div className="flex items-center gap-2 mb-1">
            <Home className="w-4 h-4 text-blue-600" />
            <h4 className="text-sm font-bold text-text-primary">Proactive Monitoring</h4>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Track NOI, maintenance costs, and tenant satisfaction in real time — before small issues become costly problems.
          </p>
        </div>

        <div className="p-3 rounded-lg border border-border-accent bg-bg-primary/30">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h4 className="text-sm font-bold text-text-primary">Debt Exposure Control</h4>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Monitor DSCR and LTV ratios to manage leverage against rising capital costs. Stay bankable.
          </p>
        </div>

        <div className="p-3 rounded-lg border border-border-accent bg-bg-primary/30">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <h4 className="text-sm font-bold text-text-primary">Capital Allocation</h4>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Identify where to deploy capital next. Focus on high-growth segments; avoid saturated markets.
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── MASTER DASHBOARD COMPONENT ───
export default function LifecycleMetricsDashboard({ projects: propProjects }: Props) {
  // If projects aren't provided as a prop, pull from global store
  const storeProjects = useProjectStore(state => state.projects);
  const projects = propProjects || storeProjects || [];

  return (
    <div className="w-full space-y-6">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-text-primary tracking-tight">Portfolio Performance</h2>
        <p className="text-sm text-text-secondary">Key financial indicators across your deals</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PropertyFinancialsAgent projects={projects} />
        <OperationalDataAgent projects={projects} />
        <MarketPortfolioAgent projects={projects} />
        <StrategicFocusAgent />
      </div>

      {/* ── NOI Deep Dive Panel ── */}
      <Suspense
        fallback={
          <div className="bg-bg-surface border border-border-accent rounded-xl p-8 text-center">
            <div className="animate-pulse text-sm text-text-secondary">Loading NOI analysis…</div>
          </div>
        }
      >
        <NOIDeepDive projects={projects} />
      </Suspense>
    </div>
  );
}
