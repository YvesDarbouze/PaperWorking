'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CashFlowMeterProps {
  noi: number;
  annualDebtService: number;
  className?: string;
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function MeterBar({ position }: { position: number }) {
  const pct = Math.min(Math.max((position + 1) / 2, 0), 1) * 100;
  return (
    <div className="relative w-full h-3 rounded-full overflow-hidden" style={{ background: 'var(--pw-border)' }}>
      <div
        className="absolute inset-y-0 left-0 w-1/2 rounded-l-full"
        style={{ background: 'linear-gradient(to right, #ef4444, #fca5a5)' }}
      />
      <div
        className="absolute inset-y-0 right-0 w-1/2 rounded-r-full"
        style={{ background: 'linear-gradient(to right, #86efac, #22c55e)' }}
      />
      <div
        className="absolute inset-y-0 w-0.5 rounded-full"
        style={{ background: 'var(--pw-surface)', left: '50%', transform: 'translateX(-50%)' }}
      />
      <motion.div
        className="absolute top-1/2 w-3 h-3 rounded-full shadow-md border-2"
        style={{
          background: 'var(--pw-surface)',
          borderColor: position >= 0 ? '#22c55e' : '#ef4444',
          left: `${pct}%`,
          transform: 'translate(-50%, -50%)',
        }}
        initial={{ left: '50%' }}
        animate={{ left: `${pct}%` }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      />
    </div>
  );
}

export default function CashFlowMeter({ noi, annualDebtService, className = '' }: CashFlowMeterProps) {
  const monthlyNOI = noi / 12;
  const monthlyDebtService = annualDebtService / 12;
  const monthlyCashFlow = monthlyNOI - monthlyDebtService;

  const isPositive = monthlyCashFlow >= 0;

  const maxRange = useMemo(() => {
    const absMax = Math.max(Math.abs(monthlyNOI), Math.abs(monthlyDebtService), 500);
    return absMax * 1.2;
  }, [monthlyNOI, monthlyDebtService]);

  const needlePosition = useMemo(() => {
    return Math.min(Math.max(monthlyCashFlow / maxRange, -1), 1);
  }, [monthlyCashFlow, maxRange]);

  const dscr = monthlyDebtService > 0 ? (monthlyNOI / monthlyDebtService).toFixed(2) : '—';

  return (
    <div
      className={`rounded-lg p-6 ${className}`}
      style={{
        background: 'var(--pw-surface)',
        border: `1px solid ${isPositive ? 'var(--pw-border)' : '#ef4444'}`,
      }}
    >
      {!isPositive && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-md" style={{ background: '#fef2f2' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="text-xs font-semibold" style={{ color: '#ef4444' }}>Negative Cash Flow — Review debt service</span>
        </div>
      )}

      <p className="ag-label mb-3" style={{ color: 'var(--pw-muted)' }}>Monthly Cash Flow</p>

      <div className="flex items-end justify-center mb-4">
        <AnimatePresence mode="wait">
          {isPositive && (
            <motion.div
              key="pulse"
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
            >
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl font-semibold font-mono"
                style={{ color: '#22c55e' }}
              >
                {fmt(monthlyCashFlow)}
              </motion.p>
            </motion.div>
          )}
          {!isPositive && (
            <motion.p
              key="negative"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl font-semibold font-mono"
              style={{ color: '#ef4444' }}
            >
              {fmt(monthlyCashFlow)}
            </motion.p>
          )}
        </AnimatePresence>
        <span className="text-sm mb-2 ml-1" style={{ color: 'var(--pw-muted)' }}>/mo</span>
      </div>

      <div className="mb-1 flex justify-between text-xs" style={{ color: 'var(--pw-muted)' }}>
        <span>Negative</span>
        <span>Break-even</span>
        <span>Positive</span>
      </div>
      <MeterBar position={needlePosition} />

      <div className="flex justify-between mt-5 pt-4" style={{ borderTop: '1px solid var(--pw-border)' }}>
        <div className="text-center">
          <p className="font-mono text-sm font-semibold" style={{ color: 'var(--pw-fg)' }}>{fmt(monthlyNOI)}</p>
          <p className="text-xs" style={{ color: 'var(--pw-muted)' }}>NOI / mo</p>
        </div>
        <div className="text-center">
          <p className="font-mono text-sm font-semibold" style={{ color: 'var(--pw-fg)' }}>{fmt(monthlyDebtService)}</p>
          <p className="text-xs" style={{ color: 'var(--pw-muted)' }}>Debt Service / mo</p>
        </div>
        <div className="text-center">
          <p className="font-mono text-sm font-semibold" style={{ color: isPositive ? '#22c55e' : '#ef4444' }}>
            {fmt(monthlyCashFlow)}
          </p>
          <p className="text-xs" style={{ color: 'var(--pw-muted)' }}>Net / mo</p>
        </div>
        <div className="text-center">
          <p className="font-mono text-sm font-semibold" style={{ color: 'var(--pw-accent)' }}>{dscr}x</p>
          <p className="text-xs" style={{ color: 'var(--pw-muted)' }}>DSCR</p>
        </div>
      </div>
    </div>
  );
}
