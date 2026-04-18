'use client';

import { useProjectStore } from '@/store/projectStore';
import { useUIStore } from '@/store/uiStore';
import { TrendingUp, Banknote, PieChart, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { computeFlipMetrics, computeHoldMetrics, dealHealthColor } from '@/lib/financials/dealMetrics';

export default function FinancialSummaryHeader() {
  const projects = useProjectStore(state => state.projects);
  const trackMode = useUIStore(state => state.trackMode);
  const toggleTrackMode = useUIStore(state => state.toggleTrackMode);
  const viewMode = useUIStore(state => state.viewMode);

  // Portfolio aggregates
  const totalCapital = projects.reduce((acc, deal) => {
    return acc + (deal.financials.purchasePrice || 0) + (deal.financials.projectedRehabCost || 0);
  }, 0);

  const avgROI = projects.length > 0
    ? projects.reduce((acc, deal) => {
        const m = computeFlipMetrics(deal);
        return acc + m.roi;
      }, 0) / projects.length
    : 0;

  const avgYield = projects.length > 0
    ? projects.reduce((acc, deal) => {
        const m = computeHoldMetrics(deal);
        return acc + m.cashOnCashYield;
      }, 0) / projects.length
    : 0;

  const healthColors = {
    green: { dot: 'bg-green-500', text: 'text-green-700' },
    amber: { dot: 'bg-amber-400', text: 'text-amber-600' },
    red:   { dot: 'bg-red-500',   text: 'text-red-600'   },
  };

  return (
    <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4 shadow-sm">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">

          {/* Metric Group */}
          <div className="flex items-center space-x-8">
            <div className="flex flex-col">
              <div className="flex items-center text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">
                <Banknote className="w-3 h-3 mr-1.5" />
                Total Capital Deployed
              </div>
              <div className="text-2xl font-light text-gray-900 tracking-tight">
                ${totalCapital.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>

            <div className="h-10 w-px bg-gray-200" />

            <div className="flex flex-col">
              <div className="flex items-center text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">
                <TrendingUp className="w-3 h-3 mr-1.5" />
                {trackMode === 'FLIP' ? 'Est. Portfolio ROI' : 'Avg. Cash-on-Cash'}
              </div>
              <div className={`text-2xl font-light tracking-tight ${trackMode === 'FLIP' ? 'text-indigo-600' : 'text-emerald-600'}`}>
                {(trackMode === 'FLIP' ? avgROI : avgYield).toFixed(1)}%
              </div>
            </div>

            <div className="h-10 w-px bg-gray-200" />

            <div className="flex flex-col">
              <div className="flex items-center text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">
                <PieChart className="w-3 h-3 mr-1.5" />
                Active Pipelines
              </div>
              <div className="text-2xl font-light text-gray-900 tracking-tight">
                {projects.length}
              </div>
            </div>
          </div>

          {/* Global Track Toggle */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              onClick={() => toggleTrackMode()}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                trackMode === 'FLIP'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              FLIP TRACK
            </button>
            <button
              onClick={() => toggleTrackMode()}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                trackMode === 'HOLD'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              HOLD TRACK
            </button>
          </div>

          {/* Deep Focus Indicator */}
          <div className="hidden lg:flex items-center text-xs text-gray-400 font-medium bg-black/5 px-3 py-1.5 rounded-full">
            <Info className="w-3 h-3 mr-2 text-indigo-500" />
            DEEP FOCUS MODE ENABLED
          </div>
        </div>

        {/* Per-deal health strip — only in KANBAN view */}
        {viewMode === 'KANBAN' && projects.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 pt-3 border-t border-gray-100 -mx-6 px-6"
          >
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {projects.map((deal) => {
                const flip = computeFlipMetrics(deal);
                const hold = computeHoldMetrics(deal);
                const roi = trackMode === 'FLIP' ? flip.roi : hold.cashOnCashYield;
                const health = dealHealthColor(roi);
                const { dot, text } = healthColors[health];

                return (
                  <div
                    key={deal.id}
                    className="flex-shrink-0 flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 hover:border-gray-400 transition-colors cursor-default"
                  >
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
                    <span className="text-[10px] font-black text-pw-black uppercase tracking-tight max-w-[80px] truncate">
                      {deal.propertyName}
                    </span>
                    <span className={`text-[10px] font-black tabular-nums ${text}`}>
                      {roi.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
