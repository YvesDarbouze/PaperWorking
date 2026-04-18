'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Calendar, ArrowUpRight, ArrowDownRight, Users, DollarSign } from 'lucide-react';
import { formatCentsToDollars } from '@/lib/calculations/financials';

/**
 * Reports Dashboard
 * Visualizes the performance snapshots from the Reporting API.
 */
export default function ReportsPage() {
  const [period, setPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      try {
        // Mocking organizationId for demo - in real use, this comes from user session
        const res = await fetch(`/api/reports/${period}?organizationId=primary-org`);
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error('Failed to load report');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [period]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      
      {/* ── Header ── */}
      <div className="flex justify-between items-end border-b border-gray-100 pb-8">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <div className="bg-emerald-600 p-1.5 rounded-lg">
              <BarChart3 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-[0.2em]">Institutional Intelligence</span>
          </div>
          <h1 className="text-4xl font-light text-gray-900 tracking-tight">Performance Snapshots</h1>
          <p className="text-gray-400 font-medium mt-2">Aggregated yields and capital deployment analysis.</p>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-xl">
          {(['monthly', 'quarterly', 'yearly'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-6 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${
                period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Main Ticker Card */}
          <div className="lg:col-span-2 bg-gray-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 rounded-bl-full -z-10 mix-blend-overlay opacity-20"></div>
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2 flex items-center">
              <TrendingUp className="w-3 h-3 mr-2" /> Aggregate Portfolio Yield
            </p>
            <h2 className="text-6xl font-light tracking-tighter mb-4">
              {formatCentsToDollars(data?.summary?.netProfit || 0)}
            </h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1 px-2 py-1 bg-emerald-500/20 rounded-full text-xs font-bold text-emerald-400">
                <ArrowUpRight className="w-3 h-3" />
                <span>+12.4% vs Previous</span>
              </div>
              <span className="text-xs text-gray-500 font-medium">Across {data?.count || 0} Assets</span>
            </div>
          </div>

          {/* Capital Deployed Card */}
          <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
            <div className="bg-indigo-50 w-10 h-10 rounded-xl flex items-center justify-center mb-6">
              <DollarSign className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Capex Injected</p>
            <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
              {formatCentsToDollars(data?.summary?.totalCosts || 0)}
            </h3>
            <p className="text-xs text-gray-400 mt-2 font-medium italic">Rehab + Operational Reserves</p>
          </div>

          {/* Liquidity Velocity Card */}
          <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
            <div className="bg-amber-50 w-10 h-10 rounded-xl flex items-center justify-center mb-6">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Liquidity Velocity</p>
            <h3 className="text-2xl font-bold text-gray-900 tracking-tight">84 Days</h3>
            <p className="text-xs text-gray-400 mt-2 font-medium italic">Avg. days to settle lifecycle</p>
          </div>

          {/* Detailed Breakdown Section */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="px-8 py-6 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Asset Category Performance</h4>
              <button className="text-xs font-bold text-indigo-600 hover:underline uppercase tracking-widest">Export CSV</button>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-12">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Core Residential</p>
                  <div className="flex items-end space-x-4 mb-2">
                    <span className="text-3xl font-light text-gray-900">$2.4M</span>
                    <span className="text-xs text-emerald-500 font-bold mb-1">+4.2%</span>
                  </div>
                  <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[65%]"></div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Value-Add Multifamily</p>
                  <div className="flex items-end space-x-4 mb-2">
                    <span className="text-3xl font-light text-gray-900">$1.1M</span>
                    <span className="text-xs text-rose-500 font-bold mb-1">-0.8%</span>
                  </div>
                  <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 w-[42%]"></div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Institutional REO</p>
                  <div className="flex items-end space-x-4 mb-2">
                    <span className="text-3xl font-light text-gray-900">$840K</span>
                    <span className="text-xs text-emerald-500 font-bold mb-1">+1.5%</span>
                  </div>
                  <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 w-[24%]"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
