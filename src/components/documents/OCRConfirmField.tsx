'use client';

import React, { useState } from 'react';
import {
  Check, Pencil, AlertTriangle, Sparkles, Eye, X,
} from 'lucide-react';
import { getConfidenceTier } from '@/lib/ocr/types';
import type { ConfidenceTier } from '@/lib/ocr/types';

/* ═══════════════════════════════════════════════════════
   OCRConfirmField — Confirm-and-Harden UI Component

   Displays a single OCR-extracted field with confidence
   tier coloring and confirm/edit actions.

   Confidence tiers:
     GREEN (≥95%) — Auto-prefill, one-click confirm
     AMBER (70–94%) — Prefill with review flag
     RED (<70%) — No prefill, hint only with tooltip

   Glass-card aesthetic with PaperWorking design tokens.
   ═══════════════════════════════════════════════════════ */

interface OCRConfirmFieldProps {
  fieldName: string;
  /** Human-readable label for the field */
  label: string;
  extractedValue: string | number | null;
  confidence: number;
  confirmed: boolean;
  /** Current value in the project (if different from extracted) */
  currentValue?: string | number | null;
  /** Raw source text from the document */
  sourceText?: string;
  onConfirm: (fieldName: string, value: string | number | null) => void;
  onEdit: (fieldName: string) => void;
  /** Format function for display */
  formatValue?: (value: string | number | null) => string;
}

const TIER_STYLES: Record<ConfidenceTier, {
  bg: string;
  border: string;
  pill: string;
  pillText: string;
  icon: React.ReactNode;
  label: string;
}> = {
  green: {
    bg: 'bg-pw-success-container/30',
    border: 'border-pw-success-border/50',
    pill: 'bg-pw-success-container border-pw-success-border',
    pillText: 'text-pw-success',
    icon: <Sparkles className="w-3 h-3" />,
    label: 'High confidence',
  },
  amber: {
    bg: 'bg-amber-500/5',
    border: 'border-amber-500/20',
    pill: 'bg-amber-500/10 border-amber-500/20',
    pillText: 'text-amber-600',
    icon: <AlertTriangle className="w-3 h-3" />,
    label: 'Review suggested',
  },
  red: {
    bg: 'bg-red-500/5',
    border: 'border-red-500/20',
    pill: 'bg-red-500/10 border-red-500/20',
    pillText: 'text-red-600',
    icon: <Eye className="w-3 h-3" />,
    label: 'Low confidence',
  },
};

export function OCRConfirmField({
  fieldName,
  label,
  extractedValue,
  confidence,
  confirmed,
  currentValue,
  sourceText,
  onConfirm,
  onEdit,
  formatValue,
}: OCRConfirmFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(extractedValue ?? ''));
  const [showSource, setShowSource] = useState(false);

  const tier = getConfidenceTier(confidence);
  const style = TIER_STYLES[tier];
  const displayValue = formatValue
    ? formatValue(extractedValue)
    : String(extractedValue ?? '—');
  const confidencePercent = Math.round(confidence * 100);

  // ── Confirmed state ────────────────────────────────
  if (confirmed) {
    return (
      <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-text-secondary uppercase tracking-wider mb-0.5">
            {label}
          </p>
          <p className="text-sm font-medium text-text-primary tabular-nums truncate">
            {displayValue}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="hardened-badge inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600">
            <Check className="w-3 h-3" />
            Confirmed from OCR
          </span>
        </div>
      </div>
    );
  }

  // ── Editing state ──────────────────────────────────
  if (isEditing) {
    return (
      <div className={`px-4 py-3 rounded-lg ${style.bg} border ${style.border}`}>
        <p className="text-xs text-text-secondary uppercase tracking-wider mb-1.5">
          {label}
        </p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            className="flex-1 px-3 py-1.5 text-sm bg-bg-surface border border-border-accent rounded-md text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/40 tabular-nums"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const val = typeof extractedValue === 'number'
                  ? Number(editValue) || 0
                  : editValue;
                onConfirm(fieldName, val);
                setIsEditing(false);
              }
              if (e.key === 'Escape') {
                setEditValue(String(extractedValue ?? ''));
                setIsEditing(false);
              }
            }}
          />
          <button
            onClick={() => {
              const val = typeof extractedValue === 'number'
                ? Number(editValue) || 0
                : editValue;
              onConfirm(fieldName, val);
              setIsEditing(false);
            }}
            className="p-1.5 rounded-md bg-pw-success-container text-pw-success hover:bg-pw-success/20 transition"
            title="Confirm edited value"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setEditValue(String(extractedValue ?? ''));
              setIsEditing(false);
            }}
            className="p-1.5 rounded-md text-text-secondary hover:text-red-500 hover:bg-red-500/10 transition"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {sourceText && (
          <p className="mt-1.5 text-[10px] text-text-secondary italic truncate">
            Source: &ldquo;{sourceText}&rdquo;
          </p>
        )}
      </div>
    );
  }

  // ── Red tier: hint-only (no prefill) ───────────────
  if (tier === 'red') {
    return (
      <div className={`px-4 py-3 rounded-lg ${style.bg} border ${style.border}`}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-text-secondary uppercase tracking-wider">
            {label}
          </p>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full border ${style.pill} ${style.pillText}`}>
            {style.icon}
            {confidencePercent}% — Enter manually
          </span>
        </div>
        <div className="flex items-center gap-2">
          <p className="flex-1 text-sm text-text-secondary italic">
            No auto-fill — confidence too low
          </p>
          <button
            onClick={() => {
              setEditValue(String(extractedValue ?? ''));
              setIsEditing(true);
              onEdit(fieldName);
            }}
            className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-white/10 transition"
            title="Enter value manually"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
        {extractedValue !== null && extractedValue !== undefined && (
          <div
            className="mt-1.5 relative group/tip"
            onMouseEnter={() => setShowSource(true)}
            onMouseLeave={() => setShowSource(false)}
          >
            <p className="text-[10px] text-text-secondary cursor-help">
              OCR suggested: <span className="font-mono">{displayValue}</span>
            </p>
            {showSource && sourceText && (
              <div className="absolute bottom-full left-0 mb-1 px-3 py-2 bg-surface-container-highest border border-border-accent rounded-lg shadow-lg text-[10px] text-text-secondary max-w-[300px] z-10">
                Source: &ldquo;{sourceText}&rdquo;
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Green/Amber tier: prefilled with confirm action ──
  return (
    <div className={`px-4 py-3 rounded-lg ${style.bg} border ${style.border}`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-text-secondary uppercase tracking-wider">
          {label}
        </p>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full border ${style.pill} ${style.pillText}`}>
          {style.icon}
          {confidencePercent}%
          {tier === 'amber' ? ' — Review' : ''}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="flex-1 text-sm font-medium text-text-primary tabular-nums truncate">
          {displayValue}
          {currentValue !== undefined && currentValue !== null && currentValue !== extractedValue && (
            <span className="ml-2 text-[10px] text-text-secondary">
              (current: {String(currentValue)})
            </span>
          )}
        </p>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onConfirm(fieldName, extractedValue)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-full bg-pw-success-container border border-pw-success-border text-pw-success hover:bg-pw-success/20 transition active:scale-95"
            title="Confirm this value"
          >
            <Check className="w-3 h-3" />
            Confirm
          </button>
          <button
            onClick={() => {
              setEditValue(String(extractedValue ?? ''));
              setIsEditing(true);
              onEdit(fieldName);
            }}
            className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-white/10 transition"
            title="Edit value"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {sourceText && tier === 'amber' && (
        <p className="mt-1 text-[10px] text-text-secondary italic truncate">
          Source: &ldquo;{sourceText}&rdquo;
        </p>
      )}
    </div>
  );
}
