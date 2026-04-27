'use client';

import React, { useMemo, useState } from 'react';
import { Project } from '@/types/schema';
import { Timer, Edit3, Calendar } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   DOMCountdown — Days on Market Velocity Tracker
   
   Tracks the velocity of inventory. High DOM increases holding 
   costs and signals market stagnation.
   Aesthetics: Grayscale bars with color-coded endpoints, mono typography.
   ═══════════════════════════════════════════════════════════════ */

interface DealDOM {
  id: string;
  address: string;
  status: string;
  listingDate: Date | null;
  currentDOM: number;
  phase: 'low' | 'med' | 'high';
}

function shortAddress(addr: string): string {
  if (!addr) return 'Unnamed Property';
  const comma = addr.indexOf(',');
  return comma > 0 ? addr.slice(0, comma) : addr;
}

function computeDOMData(projects: Project[]): DealDOM[] {
  const now = new Date();
  return projects
    .filter(d => d.status !== 'Sold' && d.status !== 'Lead')
    .map(deal => {
      let listingDate: Date | null = null;
      if (deal.financials?.listingDate) {
        listingDate = new Date(deal.financials.listingDate);
      }
      const baseDate = listingDate || new Date(deal.createdAt);
      const diffMs = now.getTime() - baseDate.getTime();
      const currentDOM = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

      let phase: DealDOM['phase'] = 'low';
      if (currentDOM > 120) phase = 'high';
      else if (currentDOM > 60) phase = 'med';

      return {
        id: deal.id,
        address: shortAddress(deal.address || deal.propertyName),
        status: deal.status,
        listingDate,
        currentDOM,
        phase,
      };
    })
    .sort((a, b) => b.currentDOM - a.currentDOM);
}

const PHASE_CONFIG = {
  low:  { text: 'text-green-600',  fill: 'bg-green-500',  label: 'HEALTHY' },
  med:  { text: 'text-amber-600', fill: 'bg-amber-500', label: 'EXTENDED' },
  high: { text: 'text-red-600',   fill: 'bg-red-500',   label: 'STAGNANT' },
};

interface DOMCountdownProps {
  projects: Project[];
}

export default function DOMCountdown({ projects }: DOMCountdownProps) {
  const [maxDOM, setMaxDOM] = useState(160);
  const [editing, setEditing] = useState(false);
  const deals = useMemo(() => computeDOMData(projects), [projects]);

  return (
    <div className="space-y-8 pb-4">
      {/* Threshold Control */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Calendar className="w-3 h-3 text-text-secondary/40" />
          <p className="ag-label opacity-40 text-[10px] font-bold uppercase tracking-[0.1em]">Target Velocity</p>
        </div>
        {editing ? (
          <input
            type="number"
            value={maxDOM}
            onChange={(e) => setMaxDOM(Math.max(30, parseInt(e.target.value) || 160))}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => e.key === 'Enter' && setEditing(false)}
            className="w-16 text-right text-xs font-mono bg-bg-primary px-2 py-1 rounded border border-border-accent/30 text-text-primary focus:outline-none focus:border-pw-black"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-xs font-mono text-text-primary hover:text-pw-black transition-all group/edit"
          >
            {maxDOM} Days
            <Edit3 className="w-2.5 h-2.5 text-text-secondary/30 group-hover/edit:text-pw-black transition-colors" />
          </button>
        )}
      </div>

      {/* Deal List */}
      {deals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-text-secondary opacity-30">
          <Timer className="w-8 h-8 mb-2 stroke-[1px]" />
          <p className="text-[10px] font-bold uppercase tracking-widest">No Active Listings</p>
        </div>
      ) : (
        <div className="space-y-6">
          {deals.map(deal => {
            const cfg = PHASE_CONFIG[deal.phase];
            const pct = Math.min((deal.currentDOM / maxDOM) * 100, 100);
            return (
              <div key={deal.id} className="group/item space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-primary tracking-tight truncate max-w-[200px]">
                    {deal.address}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-light text-text-primary tracking-tight font-mono">
                      {deal.currentDOM}
                      <span className="text-[10px] ml-0.5 opacity-40">d</span>
                    </span>
                  </div>
                </div>
                
                <div className="relative h-1.5 rounded-full bg-bg-primary overflow-hidden shadow-inner">
                  <div
                    className={`absolute left-0 top-0 h-full rounded-full ${cfg.fill} transition-all duration-1000 ease-out`}
                    style={{ width: `${pct}%` }}
                  />
                  {/* Threshold Tick */}
                  <div className="absolute right-0 top-0 w-px h-full bg-red-500/20" title="Threshold reached" />
                </div>

                <div className="flex justify-between items-center text-[9px] font-bold tracking-[0.1em]">
                  <span className="text-text-secondary opacity-40 uppercase">{deal.status}</span>
                  <span className={`${cfg.text} uppercase opacity-60`}>{cfg.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
