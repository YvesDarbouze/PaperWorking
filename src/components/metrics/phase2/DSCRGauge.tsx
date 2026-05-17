'use client';

import React, { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';

function formatCurrency(val: number) {
  const absVal = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (absVal >= 1_000_000) return `${sign}$${(absVal / 1_000_000).toFixed(1)}M`;
  if (absVal >= 1_000) return `${sign}$${(absVal / 1_000).toFixed(0)}k`;
  return `${sign}$${absVal.toLocaleString()}`;
}

export interface DSCRGaugeProps {
  noi: number;
  annualDebtService: number;
  className?: string;
  isLoading?: boolean;
}

interface GaugeZone {
  from: number;
  to: number;
  color: string;
  label: string;
}

const ZONES: GaugeZone[] = [
  { from: 0, to: 1.0, color: '#f87171', label: 'Break-Even Risk' },
  { from: 1.0, to: 1.25, color: '#fde047', label: 'Caution' },
  { from: 1.25, to: 1.5, color: '#86efac', label: 'Lender Benchmark' },
  { from: 1.5, to: 2.0, color: '#4ade80', label: 'Excellent' },
];

const MAX_DSCR = 2.0;

function getZoneForDSCR(dscr: number): GaugeZone {
  return ZONES.find((z) => dscr >= z.from && dscr < z.to) || ZONES[ZONES.length - 1];
}

export default function DSCRGauge({
  noi,
  annualDebtService,
  className = '',
  isLoading = false,
}: DSCRGaugeProps) {
  const dscr = useMemo(
    () => (annualDebtService > 0 ? noi / annualDebtService : 0),
    [noi, annualDebtService],
  );

  if (isLoading) {
    return (
      <div className={`rounded-lg border border-[#CCCCCC] p-6 space-y-4 ${className}`} style={{ background: '#FFFFFF' }}>
        <div className="h-4 w-32 animate-shimmer rounded" />
        <div className="h-8 animate-shimmer rounded-full" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-14 animate-shimmer rounded" />
          <div className="h-14 animate-shimmer rounded" />
        </div>
      </div>
    );
  }

  const isAlert = dscr < 1.25 && dscr > 0;
  const clampedDSCR = Math.min(dscr, MAX_DSCR);
  const fillPct = clampedDSCR / MAX_DSCR;
  const activeZone = dscr > 0 ? getZoneForDSCR(clampedDSCR) : null;

  return (
    <div
      className={`rounded-lg border overflow-hidden ${isAlert ? 'border-[#CCCCCC]' : 'border-[#CCCCCC]'} transition-colors ${className}`}
      style={{ background: '#FFFFFF' }}
    >
      {isAlert && (
        <div className="flex items-center gap-2 px-4 py-2 bg-[#F2F2F2] border-b border-[#CCCCCC]">
          <AlertTriangle className="w-3.5 h-3.5 text-[#595959] shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
            DSCR below lender benchmark of 1.25x
          </span>
        </div>
      )}

      <div className="p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7F7F7F]">
              Debt Service Coverage Ratio
            </p>
            <p
              className="text-3xl font-normal tracking-tighter mt-1"
              style={{ color: '#0D0D0D', fontFamily: 'ui-monospace, monospace' }}
            >
              {dscr > 0 ? `${dscr.toFixed(2)}x` : '—'}
            </p>
          </div>
          {activeZone && (
            <div
              className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest"
              style={{
                background: activeZone.color + '33',
                color: activeZone.color === '#fde047' ? '#92400e' : activeZone.color === '#f87171' ? '#7f1d1d' : '#166534',
              }}
            >
              {activeZone.label}
            </div>
          )}
        </div>

        <div className="relative mb-3" aria-label={`DSCR gauge: ${dscr.toFixed(2)}`}>
          <div className="h-6 rounded-full overflow-hidden bg-[#F2F2F2] relative">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${fillPct * 100}%`,
                background: dscr > 0
                  ? `linear-gradient(90deg, #f87171 0%, #f87171 ${(1.0 / MAX_DSCR) * 100}%, #fde047 ${(1.0 / MAX_DSCR) * 100}%, #fde047 ${(1.25 / MAX_DSCR) * 100}%, #86efac ${(1.25 / MAX_DSCR) * 100}%, #4ade80 100%)`
                  : 'transparent',
              }}
            />

            <div
              className="absolute inset-y-0 w-0.5 bg-[#1A73E8]"
              style={{ left: `${(1.0 / MAX_DSCR) * 100}%` }}
              title="Break-even (1.0x)"
            />
            <div
              className="absolute inset-y-0 w-0.5 bg-[#1A73E8]"
              style={{ left: `${(1.25 / MAX_DSCR) * 100}%` }}
              title="Lender benchmark (1.25x)"
            />
            <div
              className="absolute inset-y-0 w-0.5 bg-[#595959] opacity-40"
              style={{ left: `${(1.5 / MAX_DSCR) * 100}%` }}
              title="Excellent (1.5x)"
            />
          </div>

          <div
            className="flex justify-between mt-1.5 text-[8px] font-bold text-[#A5A5A5] uppercase tracking-widest w-full"
          >
            <span>0x</span>
            <span style={{ marginLeft: `${(1.0 / MAX_DSCR) * 100 - 5}%` }}>1.0x</span>
            <span>1.25x</span>
            <span>1.5x</span>
            <span>2.0x</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px bg-[#F2F2F2] rounded-lg overflow-hidden border border-[#F2F2F2] mt-4">
          <div className="bg-white p-4">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#A5A5A5]">Annual NOI</p>
            <p className="text-base font-bold tracking-tight text-[#1A1A1A] mt-1" style={{ fontFamily: 'ui-monospace, monospace' }}>
              {formatCurrency(noi)}
            </p>
          </div>
          <div className="bg-white p-4">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#A5A5A5]">Annual Debt Service</p>
            <p className="text-base font-bold tracking-tight text-[#1A1A1A] mt-1" style={{ fontFamily: 'ui-monospace, monospace' }}>
              {formatCurrency(annualDebtService)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { level: '1.0x', desc: 'Break-even', color: '#f87171' },
            { level: '1.25x', desc: 'Lender min', color: '#fde047' },
            { level: '1.5x', desc: 'Excellent', color: '#4ade80' },
          ].map((b) => (
            <div key={b.level} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: b.color }} />
              <div>
                <p className="text-[9px] font-bold text-[#1A1A1A]">{b.level}</p>
                <p className="text-[8px] text-[#A5A5A5]">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
