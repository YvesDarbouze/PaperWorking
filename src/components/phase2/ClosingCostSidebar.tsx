'use client';

import { useState, useRef } from 'react';
import { RotateCcw, Pencil } from 'lucide-react';
import {
  computeClosingCostLines,
  totalClosingCosts,
  type ClosingCostInputs,
  type ClosingCostOverrides,
  type ClosingCostLine,
} from '@/lib/math/closingCosts';

/* ═══════════════════════════════════════════════════════════════
   ClosingCostSidebar
   ───────────────────────────────────────────────────────────────
   Replaces the three hardcoded line items (Origination $2,450,
   Recording Tax $1,800, Prepaids $950) in the Phase 2 sidebar
   with a live-computed, per-line overridable model.

   Behaviour:
   • Computes values from financials on every render — changing the
     loan amount or purchase price immediately recalculates.
   • Click a computed amount to enter an override; blur/Enter saves.
   • Each overridden line shows a reset (↺) button.
   • "C" badge = computed from formula; edit icon = user overridden.
   • Total = sum of final line amounts (no separate hardcoded total).
   • All state changes are emitted via onOverridesChange so the
     parent can persist to Firestore.
   ═══════════════════════════════════════════════════════════════ */

interface ClosingCostSidebarProps {
  financials: ClosingCostInputs;
  overrides: ClosingCostOverrides;
  purchasePrice: number;
  /** Called whenever overrides change; parent persists to Firestore */
  onOverridesChange: (next: ClosingCostOverrides) => void;
  /** Export button callback */
  onExport?: () => void;
  phaseColor?: string;
}

function fmt(dollars: number): string {
  return `$${Math.round(dollars).toLocaleString('en-US')}`;
}

function parseDollars(raw: string): number | null {
  const n = parseFloat(raw.replace(/[^0-9.]/g, ''));
  return isNaN(n) ? null : Math.round(n);
}

function LineRow({
  line,
  editingId,
  draftValue,
  onStartEdit,
  onDraftChange,
  onCommit,
  onReset,
  phaseColor,
}: {
  line: ClosingCostLine;
  editingId: string | null;
  draftValue: string;
  onStartEdit: (id: string, current: number) => void;
  onDraftChange: (v: string) => void;
  onCommit: () => void;
  onReset: (id: string) => void;
  phaseColor: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditing = editingId === line.id;

  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-2 gap-2">
      {/* Label + basis */}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-[#9E9DA0] leading-tight">{line.label}</p>
        <p className="text-[9px] text-[#9E9DA0]/50 truncate mt-0.5" title={line.basis}>
          {line.basis}
        </p>
      </div>

      {/* Amount / edit field */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Override/computed badge */}
        {line.isOverridden ? (
          <span title="User override" style={{ color: phaseColor }}>
            <Pencil className="w-2.5 h-2.5" />
          </span>
        ) : (
          <span
            className="text-[8px] font-bold rounded px-1 py-0.5"
            style={{ background: phaseColor + '20', color: phaseColor }}
            title="Computed from formula"
          >
            C
          </span>
        )}

        {isEditing ? (
          <input
            ref={inputRef}
            autoFocus
            className="w-24 px-2 py-1 rounded text-xs font-mono border outline-none text-right"
            style={{
              background: 'rgba(255,255,255,0.06)',
              borderColor: phaseColor + '60',
              color: '#fff',
            }}
            value={draftValue}
            onChange={(e) => onDraftChange(e.target.value)}
            onBlur={onCommit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onCommit();
              if (e.key === 'Escape') onCommit();
            }}
            placeholder="Enter $"
          />
        ) : (
          <button
            onClick={() => onStartEdit(line.id, line.amount)}
            className="font-mono text-xs text-[#9E9DA0] hover:text-white transition-colors cursor-pointer"
            title="Click to override"
          >
            {fmt(line.amount)}
          </button>
        )}

        {/* Reset override */}
        {line.isOverridden && !isEditing && (
          <button
            onClick={() => onReset(line.id)}
            className="text-[#9E9DA0]/50 hover:text-[#9E9DA0] transition-colors cursor-pointer"
            title="Reset to computed value"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

export function ClosingCostSidebar({
  financials,
  overrides,
  purchasePrice,
  onOverridesChange,
  onExport,
  phaseColor = '#7A9EAA',
}: ClosingCostSidebarProps) {
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState('');

  const lines = computeClosingCostLines(financials, overrides);
  const total = totalClosingCosts(lines);

  function startEdit(id: string, current: number) {
    setEditingId(id);
    setDraftValue(String(current));
  }

  function commitEdit() {
    if (!editingId) return;
    const parsed = parseDollars(draftValue);
    if (parsed !== null && parsed >= 0) {
      const line = lines.find((l) => l.id === editingId);
      if (line && parsed !== line.computed) {
        onOverridesChange({ ...overrides, [editingId]: parsed });
      } else if (line && parsed === line.computed) {
        // User typed back the computed value — clear override
        const next = { ...overrides };
        delete next[editingId];
        onOverridesChange(next);
      }
    }
    setEditingId(null);
    setDraftValue('');
  }

  function resetOverride(id: string) {
    const next = { ...overrides };
    delete next[id];
    onOverridesChange(next);
  }

  return (
    <div className="bg-surface-container-low/50 backdrop-blur-md border border-white/5 rounded-2xl p-5 shadow-lg relative flex flex-col justify-between">
      <div className="space-y-4">
        <h3 className="font-label-md text-sm text-on-surface flex items-center gap-2 font-bold">
          <span className="material-symbols-outlined text-[#ffdcc0] text-[18px]">calculate</span>
          Live Cost Basis
        </h3>

        <div className="space-y-2.5 text-xs">
          {/* Purchase Price (read-only, not overridable) */}
          <div className="flex justify-between border-b border-white/5 pb-2 text-[#9E9DA0]">
            <span>Property Price</span>
            <span className="font-mono">{fmt(purchasePrice)}</span>
          </div>

          {/* Computed / overridable lines */}
          {lines.map((line) => (
            <LineRow
              key={line.id}
              line={line}
              editingId={editingId}
              draftValue={draftValue}
              onStartEdit={startEdit}
              onDraftChange={setDraftValue}
              onCommit={commitEdit}
              onReset={resetOverride}
              phaseColor={phaseColor}
            />
          ))}

          {/* Total */}
          <div className="flex justify-between font-bold text-sm text-white pt-1">
            <span>Total Closing Costs</span>
            <span className="font-mono" style={{ color: phaseColor }}>
              {fmt(total)}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 pt-1">
          <div className="flex items-center gap-1">
            <span className="text-[8px] font-bold rounded px-1 py-0.5" style={{ background: phaseColor + '20', color: phaseColor }}>C</span>
            <span className="text-[9px] text-[#9E9DA0]/60">computed</span>
          </div>
          <div className="flex items-center gap-1">
            <Pencil className="w-2.5 h-2.5" style={{ color: phaseColor }} />
            <span className="text-[9px] text-[#9E9DA0]/60">overridden — click to edit, ↺ to reset</span>
          </div>
        </div>
      </div>

      <button
        onClick={onExport}
        className="mt-6 w-full py-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-on-surface font-label-md text-xs font-semibold transition-all active:scale-97 text-center"
      >
        Export Closing Ledger
      </button>
    </div>
  );
}
