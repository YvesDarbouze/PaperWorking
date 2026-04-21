'use client';

import React, { useMemo, useState } from 'react';
import { Project } from '@/types/schema';
import { AlertTriangle, X, Info } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

/* ═══════════════════════════════════════════════════════════════
   TaxImplicationWarning — Short-Term Capital Gains Badge

   Shows ⚠️ badge for active deals held < 365 days.
   Profits from short-term holds are taxed at ordinary income rates.
   Tooltip explains federal (up to 37%) + state tax implications.
   ═══════════════════════════════════════════════════════════════ */

interface TaxWarning {
  id: string;
  address: string;
  daysHeld: number;
  daysUntilLongTerm: number;
  isShortTerm: boolean;
}

function shortAddress(addr: string): string {
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

  if (warnings.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
        <p className="ag-label opacity-80 text-[9px] text-amber-600">
          Short-Term Capital Gains
        </p>
        <span className="text-[9px] bg-amber-50 px-2 py-0.5 rounded-full text-amber-500 font-bold border border-amber-100">
          {warnings.length}
        </span>
      </div>

      {warnings.map(w => (
        <div key={w.id} className="relative">
          <button
            onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-amber-50/50 border border-amber-100/50 hover:bg-amber-50 transition-all text-left"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />
              <span className="text-sm font-medium text-pw-black tracking-tight truncate max-w-[140px]">
                {w.address}
              </span>
            </div>
            <span className="text-[10px] text-amber-500 font-medium flex-shrink-0">
              {w.daysUntilLongTerm}d to qualify
            </span>
          </button>

          <AnimatePresence>
            {expandedId === w.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="mt-1 px-4 py-3 bg-amber-50 rounded-xl border border-amber-100/50 text-xs text-amber-700 space-y-2">
                  <div className="flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-400" />
                    <p className="leading-relaxed">
                      <strong>Short-term capital gains</strong> apply to properties held under 1 year.
                      Profits will be taxed at ordinary income rates — up to <strong>37% federal</strong>, plus applicable state taxes.
                    </p>
                  </div>
                  <div className="flex justify-between text-[10px] pt-1 border-t border-amber-200/50">
                    <span>Held: <strong>{w.daysHeld} days</strong></span>
                    <span>Long-term in: <strong>{w.daysUntilLongTerm} days</strong></span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
