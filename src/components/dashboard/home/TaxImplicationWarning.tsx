'use client';

import React, { useMemo, useState } from 'react';
import { Project } from '@/types/schema';
import { AlertTriangle, Info, ChevronRight, Scale } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

/* ═══════════════════════════════════════════════════════════════
   TaxImplicationWarning — Short-Term Capital Gains Sentinel
   
   Identifies properties held < 365 days to flag tax liability.
   Aesthetics: Soft amber alerts, structured tooltips, high-contrast 
   call-to-actions.
   ═══════════════════════════════════════════════════════════════ */

interface TaxWarning {
  id: string;
  address: string;
  daysHeld: number;
  daysUntilLongTerm: number;
  isShortTerm: boolean;
}

function shortAddress(addr: string): string {
  if (!addr) return 'Unnamed Property';
  const comma = addr.indexOf(',');
  return comma > 0 ? addr.slice(0, comma) : addr;
}

function computeTaxWarnings(projects: Project[]): TaxWarning[] {
  const now = new Date();
  return projects
    .filter(d => d.status !== 'Sold' && d.status !== 'Lead')
    .map(deal => {
      const baseDate = new Date(deal.createdAt);
      const diffMs = now.getTime() - baseDate.getTime();
      const daysHeld = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const daysUntilLongTerm = Math.max(0, 365 - daysHeld);

      return {
        id: deal.id,
        address: shortAddress(deal.address || deal.propertyName),
        daysHeld,
        daysUntilLongTerm,
        isShortTerm: daysHeld < 365,
      };
    })
    .filter(d => d.isShortTerm)
    .sort((a, b) => a.daysUntilLongTerm - b.daysUntilLongTerm);
}

interface TaxImplicationWarningProps {
  projects: Project[];
}

export default function TaxImplicationWarning({ projects }: TaxImplicationWarningProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const warnings = useMemo(() => computeTaxWarnings(projects), [projects]);

  if (warnings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-secondary opacity-30">
        <Scale className="w-8 h-8 mb-2 stroke-[1px]" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-center">No Tax Risks Identified</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-1 mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3 h-3 text-amber-500" />
          <p className="ag-label opacity-40 text-[10px] font-bold uppercase tracking-[0.1em]">Liability Alerts</p>
        </div>
        <span className="text-[10px] font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-bold border border-amber-100">
          {warnings.length} Active
        </span>
      </div>

      <div className="space-y-3">
        {warnings.map(w => (
          <div key={w.id} className="relative group/item">
            <button
              onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}
              className={`w-full flex items-center justify-between px-4 py-4 rounded-xl transition-all duration-500 border ${
                expandedId === w.id 
                  ? 'bg-amber-50 border-amber-200 shadow-sm' 
                  : 'bg-bg-surface border-border-accent/10 hover:border-amber-200 hover:bg-amber-50/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg ${expandedId === w.id ? 'bg-amber-200/50' : 'bg-amber-50'} transition-colors`}>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div className="text-left">
                  <span className="block text-xs font-bold text-text-primary tracking-tight truncate max-w-[140px]">
                    {w.address}
                  </span>
                  <span className="text-[9px] uppercase tracking-[0.05em] text-amber-700 font-bold opacity-60">
                    Short-Term Asset
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-amber-600 font-bold">
                  {w.daysUntilLongTerm}d
                </span>
                <ChevronRight className={`w-3.5 h-3.5 text-amber-400 transition-transform duration-500 ${expandedId === w.id ? 'rotate-90' : ''}`} />
              </div>
            </button>

            <AnimatePresence>
              {expandedId === w.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 p-4 bg-white/50 rounded-xl border border-amber-200/50 text-xs text-amber-800 shadow-inner">
                    <div className="flex items-start gap-3">
                      <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
                      <div className="space-y-2">
                        <p className="leading-relaxed font-medium">
                          Holding duration is currently <span className="font-bold text-amber-900">{w.daysHeld} days</span>. 
                          Exiting before 1 year triggers <span className="font-bold underline decoration-amber-300">STCG tax rates</span> (up to 37% Federal).
                        </p>
                        <div className="flex justify-between items-center text-[10px] pt-2 border-t border-amber-200/50 font-bold uppercase tracking-widest text-amber-600">
                          <span>Held: {w.daysHeld} Days</span>
                          <span className="flex items-center gap-1">
                            Long-term in {w.daysUntilLongTerm}d
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
