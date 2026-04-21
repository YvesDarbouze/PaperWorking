'use client';

import React, { useMemo, useState } from 'react';
import { Project } from '@/types/schema';
import { Timer, Edit3 } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   DOMCountdown — Days on Market Progress Tracker

   Lists active properties with visual progress bars tracking
   current DOM against a configurable threshold (default: 160 days).
   Color-coded: Green (0-60d), Yellow (61-120d), Red (121+d).
   ═══════════════════════════════════════════════════════════════ */

interface DealDOM {
  id: string;
  address: string;
  status: string;
  listingDate: Date | null;
  currentDOM: number;
  phase: 'green' | 'yellow' | 'red';
}

function shortAddress(addr: string): string {
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

      let phase: DealDOM['phase'] = 'green';
      if (currentDOM > 120) phase = 'red';
      else if (currentDOM > 60) phase = 'yellow';

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

const PHASE_COLORS = {
  green:  { bg: 'bg-pw-muted/20', fill: 'bg-pw-muted', text: 'text-pw-muted' },
  yellow: { bg: 'bg-amber-100', fill: 'bg-amber-400', text: 'text-amber-500' },
  red:    { bg: 'bg-red-100', fill: 'bg-red-400', text: 'text-red-500' },
};

interface DOMCountdownProps {
  projects: Project[];
}

export default function DOMCountdown({ projects }: DOMCountdownProps) {
  const [maxDOM, setMaxDOM] = useState(160);
  const [editing, setEditing] = useState(false);
  const deals = useMemo(() => computeDOMData(projects), [projects]);

  return (
    <div className="space-y-3">
      {/* Threshold Control */}
      <div className="flex items-center justify-between">
        <p className="ag-label opacity-60 text-[9px]">DOM Threshold</p>
        {editing ? (
          <input
            type="number"
            value={maxDOM}
            onChange={(e) => setMaxDOM(Math.max(30, parseInt(e.target.value) || 160))}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => e.key === 'Enter' && setEditing(false)}
            className="w-16 text-right text-sm font-medium bg-pw-bg px-2 py-1 rounded-lg border border-pw-border/30 text-pw-black focus:outline-none focus:border-pw-black"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-pw-black hover:text-pw-muted transition-colors"
          >
            {maxDOM}d
            <Edit3 className="w-3 h-3 text-pw-muted" />
          </button>
        )}
      </div>

      {/* Deal List */}
      {deals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-pw-muted opacity-30">
          <Timer className="w-8 h-8 mb-2 stroke-1" />
          <p className="text-xs font-medium">No active listings</p>
        </div>
      ) : (
        deals.map(deal => {
          const colors = PHASE_COLORS[deal.phase];
          const pct = Math.min((deal.currentDOM / maxDOM) * 100, 100);
          return (
            <div key={deal.id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-pw-black tracking-tight truncate max-w-[180px]">
                  {deal.address}
                </span>
                <span className={`text-base font-light tracking-tight ${colors.text}`}>
                  {deal.currentDOM}
                  <span className="text-[10px] ml-0.5 opacity-50">d</span>
                </span>
              </div>
              <div className={`h-1.5 rounded-full ${colors.bg} overflow-hidden`}>
                <div
                  className={`h-full rounded-full ${colors.fill} transition-all duration-700`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
