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
    .filter(d => d.status === 'fund' || d.status === 'hold')
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
  low:  { text: 'text-[#7F7F7F]',  fill: 'bg-[#CCCCCC]',  label: 'HEALTHY' },
  med:  { text: 'text-[#595959]', fill: 'bg-[#A5A5A5]', label: 'EXTENDED' },
  high: { text: 'text-[#1A1A1A]',   fill: 'bg-[#595959]',   label: 'STAGNANT' },
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
          <Calendar className="w-3 h-3 text-[#A5A5A5]" />
          <p className="ag-label opacity-40 text-[10px] font-bold uppercase tracking-[0.1em]">Target Velocity</p>
        </div>
        {editing ? (
          <input
            type="number"
            value={maxDOM}
            onChange={(e) => setMaxDOM(Math.max(30, parseInt(e.target.value) || 160))}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => e.key === 'Enter' && setEditing(false)}
            className="w-16 text-right text-xs font-mono bg-[#F2F2F2] px-2 py-1 rounded border border-[#CCCCCC]/30 text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-xs font-mono text-[#1A1A1A] hover:text-[#595959] transition-all group/edit"
          >
            {maxDOM} Days
            <Edit3 className="w-2.5 h-2.5 text-[#A5A5A5] group-hover/edit:text-[#1A1A1A] transition-colors" />
          </button>
        )}
      </div>

      {/* Deal List */}
      {deals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-[#A5A5A5] opacity-30">
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
                  <span className="text-xs font-bold text-[#1A1A1A] tracking-tight truncate max-w-[200px]">
                    {deal.address}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-normal text-[#1A1A1A] tracking-tight font-mono">
                      {deal.currentDOM}
                      <span className="text-[10px] ml-0.5 opacity-40">d</span>
                    </span>
                  </div>
                </div>
                
                <div className="relative h-1.5 rounded-full bg-[#F2F2F2] overflow-hidden shadow-inner">
                  <div
                    className={`absolute left-0 top-0 h-full rounded-full ${cfg.fill} transition-all duration-1000 ease-out`}
                    style={{ width: `${pct}%` }}
                  />
                  {/* Threshold Tick */}
                  <div className="absolute right-0 top-0 w-px h-full bg-[#CCCCCC]" title="Threshold reached" />
                </div>

                <div className="flex justify-between items-center text-[9px] font-bold tracking-[0.1em]">
                  <span className="text-[#7F7F7F] opacity-40 uppercase">{deal.status}</span>
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
