'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Project } from '@/types/schema';
import { useUIStore } from '@/store/uiStore';
import PhaseBadge from '../../ui/PhaseBadge';
import { Calendar, MapPin, PieChart, ChevronRight, AlertTriangle, BarChart2, ChevronDown } from 'lucide-react';
import { computeFlipMetrics, computeHoldMetrics } from '@/lib/financials/dealMetrics';
import PropertyPnLWidget from './PropertyPnLWidget';

interface KanbanCardProps {
  deal: Project;
  onSelect?: (projectId: string) => void;
  onMove?: (target: string) => void;
}

const PHASE_ORDER = ['Lead', 'Sourcing', 'Under Contract', 'Rehab', 'Renovating', 'Listed', 'Sold'];

export default function KanbanCard({ deal, onSelect, onMove }: KanbanCardProps) {
  const trackMode = useUIStore(state => state.trackMode);
  const [isExpanded, setIsExpanded] = useState(false);

  const flipMetrics = computeFlipMetrics(deal);
  const holdMetrics = computeHoldMetrics(deal);

  // Days in Phase calculation
  const phaseStart = deal.lastPhaseTransitionAt ? new Date(deal.lastPhaseTransitionAt) : new Date(deal.createdAt);
  const daysInPhase = Math.floor((new Date().getTime() - phaseStart.getTime()) / (1000 * 60 * 60 * 24));

  // Find next phase
  const currentIndex = PHASE_ORDER.indexOf(deal.status);
  const nextPhase = currentIndex < PHASE_ORDER.length - 1 ? PHASE_ORDER[currentIndex + 1] : null;

  return (
    <div
      className="group relative bg-white border border-pw-border hover:border-pw-black transition-all overflow-hidden"
      onClick={() => onSelect?.(deal.id)}
    >
      {/* Property Thumbnail */}
      <div className="relative h-32 w-full bg-gray-100 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=400&q=80"
          alt={deal.propertyName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-0 left-0">
          <PhaseBadge status={deal.status} />
        </div>

        {/* Next Phase Quick Action */}
        {nextPhase && (
          <button
            onClick={(e) => { e.stopPropagation(); onMove?.(nextPhase); }}
            className="absolute top-0 right-0 bg-pw-accent hover:bg-black text-white p-2 shadow-lg transform translate-x-12 group-hover:translate-x-0 transition-transform duration-300"
            title={`Move to ${nextPhase}`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        <div className="absolute bottom-0 right-0 flex items-center bg-white/90 backdrop-blur-sm px-2 py-1">
          <Calendar className="w-3 h-3 mr-1 text-pw-black" />
          <span className="text-[10px] font-black text-pw-black tracking-tighter">{daysInPhase} DAYS</span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Header */}
        <div>
          <h4 className="text-xs font-black text-pw-black uppercase tracking-tight truncate">{deal.propertyName}</h4>
          <div className="flex items-center text-pw-muted mt-1">
            <MapPin className="w-3 h-3 mr-1" />
            <p className="text-[10px] uppercase tracking-wide truncate">{deal.address}</p>
          </div>
        </div>

        {/* ARV / MAO chips — always visible */}
        {(flipMetrics.arv > 0 || flipMetrics.mao > 0) && (
          <div className="flex items-center gap-2 flex-wrap">
            {flipMetrics.arv > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.15em] bg-gray-100 text-pw-black border border-pw-border/40">
                ARV {`$${flipMetrics.arv.toLocaleString()}`}
              </span>
            )}
            {flipMetrics.mao > 0 && (
              <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.15em] border ${
                flipMetrics.maoViolated
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-gray-50 text-pw-muted border-pw-border/40'
              }`}>
                MAO {`$${flipMetrics.mao.toLocaleString()}`}
                {flipMetrics.maoViolated && (
                  <AlertTriangle className="w-2.5 h-2.5 ml-1 text-red-500" />
                )}
              </span>
            )}
          </div>
        )}

        {/* Dynamic Content */}
        <AnimatePresence mode="wait">
          {trackMode === 'FLIP' ? (
            <motion.div
              key="flip"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-3"
            >
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[9px] font-black text-pw-muted uppercase tracking-[0.2em]">Est. Net Profit</p>
                  <p className={`text-xl font-light tabular-nums ${flipMetrics.netProjectedProfit < 0 ? 'text-red-600' : 'text-pw-black'}`}>
                    ${flipMetrics.netProjectedProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
                {/* Circular rehab progress */}
                {flipMetrics.rehabBudget > 0 && (
                  <div className="relative flex items-center justify-center flex-shrink-0">
                    <svg className="w-10 h-10 transform -rotate-90">
                      <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="2" fill="transparent" className="text-gray-100" />
                      <circle
                        cx="20" cy="20" r="16"
                        stroke="currentColor" strokeWidth="2" fill="transparent"
                        strokeDasharray={100.5}
                        style={{ strokeDashoffset: 100.5 - (Math.min(flipMetrics.rehabPct, 1) * 100.5) }}
                        className={`transition-all duration-1000 ${flipMetrics.rehabPct >= 1 ? 'text-red-500' : 'text-pw-black'}`}
                      />
                    </svg>
                    <span className="absolute text-[9px] font-black text-pw-black">{Math.round(flipMetrics.rehabPct * 100)}%</span>
                  </div>
                )}
              </div>

              {/* Rehab budget bar */}
              {flipMetrics.rehabBudget > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-pw-muted uppercase tracking-[0.2em]">Rehab</span>
                    <span className="text-[9px] font-black text-pw-black tabular-nums">
                      ${flipMetrics.rehabActual.toLocaleString()} / ${flipMetrics.rehabBudget.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-0.5 w-full bg-gray-100">
                    <div
                      className={`h-full transition-all duration-700 ${flipMetrics.rehabPct >= 1 ? 'bg-red-500' : 'bg-pw-black'}`}
                      style={{ width: `${Math.min(flipMetrics.rehabPct * 100, 100)}%` }}
                    />
                  </div>
                  {flipMetrics.rehabDelta < 0 && (
                    <p className="text-[9px] text-red-600 font-black">
                      ${Math.abs(flipMetrics.rehabDelta).toLocaleString()} over budget
                    </p>
                  )}
                </div>
              )}

              {/* Daily burn rate */}
              {flipMetrics.hasBurnRate && (
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black text-pw-muted uppercase tracking-[0.2em]">Daily Burn</span>
                  <span className="text-[9px] font-black text-pw-black tabular-nums">
                    ${flipMetrics.dailyBurnRate.toFixed(0)}/day
                  </span>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="hold"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-3 p-3 bg-gray-50 border border-pw-border"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[9px] font-black text-pw-muted uppercase tracking-[0.2em]">Monthly Rent</p>
                  <p className="text-lg font-light text-pw-black tabular-nums">
                    ${holdMetrics.monthlyRent.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-pw-muted uppercase tracking-[0.2em]">Cash-on-Cash</p>
                  <p className={`text-sm font-black tabular-nums ${holdMetrics.cashOnCashYield >= 8 ? 'text-green-700' : holdMetrics.cashOnCashYield < 0 ? 'text-red-600' : 'text-pw-black'}`}>
                    {holdMetrics.cashOnCashYield.toFixed(1)}%
                  </p>
                </div>
              </div>
              {holdMetrics.monthlyCashFlow !== 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black text-pw-muted uppercase tracking-[0.2em]">Cash Flow</span>
                  <span className={`text-[9px] font-black tabular-nums ${holdMetrics.monthlyCashFlow >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {holdMetrics.monthlyCashFlow >= 0 ? '+' : '-'}${Math.abs(holdMetrics.monthlyCashFlow).toLocaleString()}/mo
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="flex justify-between items-center pt-3 border-t border-pw-border">
          <div className="flex -space-x-1.5">
            {[1, 2].map(i => (
              <div key={i} className="w-5 h-5 border border-pw-black bg-gray-200" />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center text-pw-muted">
              <PieChart className="w-3 h-3 mr-1" />
              <span className="text-[10px] font-bold uppercase tracking-widest">4 Tasks</span>
            </div>
            {/* P&L toggle */}
            <button
              onClick={(e) => { e.stopPropagation(); setIsExpanded(v => !v); }}
              className="flex items-center text-pw-muted hover:text-pw-black transition-colors"
              aria-label="Toggle P&L breakdown"
            >
              <BarChart2 className="w-3 h-3 mr-1" />
              <span className="text-[10px] font-bold uppercase tracking-widest">P&L</span>
              <ChevronDown className={`w-3 h-3 ml-0.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* P&L drawer */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            key="pnl-drawer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.19, 1, 0.22, 1] }}
            className="overflow-hidden border-t border-pw-border/40"
          >
            <PropertyPnLWidget deal={deal} mode="compact" trackMode={trackMode} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
