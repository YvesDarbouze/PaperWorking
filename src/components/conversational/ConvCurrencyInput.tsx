'use client';

import React, { useState, useEffect, useRef, useId } from 'react';

/**
 * ConvCurrencyInput — Oversized conversational currency input
 *
 * Design:
 *   • 52–56px bold tabular numerals, no border box
 *   • Single bottom-line accent in phaseColor
 *   • Leading $ glyph in secondary color
 *   • Auto-focuses on mount (drives per-question UX)
 *   • Emits onChange(cents: number) — same API as CurrencyInputModule
 */

interface ConvCurrencyInputProps {
  label:        string;
  value:        number;   // in cents
  onChange:     (cents: number) => void;
  phaseColor:   string;
  placeholder?: string;
  autoFocus?:   boolean;
  readOnly?:    boolean;
}

export default function ConvCurrencyInput({
  label,
  value,
  onChange,
  phaseColor,
  placeholder = '0',
  autoFocus = true,
  readOnly = false,
}: ConvCurrencyInputProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  // Convert cents → display string (dollars, comma-formatted)
  const centsToDisplay = (cents: number): string => {
    if (!cents) return '';
    return (cents / 100).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const [displayValue, setDisplayValue] = useState(centsToDisplay(value));

  // Sync when value changes externally (e.g. "Back" navigation restores prior answer)
  useEffect(() => {
    setDisplayValue(centsToDisplay(value));
  }, [value]);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      // Small delay so the slide-in animation doesn't fight the focus ring
      const t = setTimeout(() => inputRef.current?.focus(), 180);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;

    // Strip everything except digits and one decimal point
    let raw = e.target.value.replace(/[^0-9.]/g, '');
    const parts = raw.split('.');
    if (parts.length > 2) raw = parts[0] + '.' + parts.slice(1).join('');

    // Format display
    let formatted = '';
    if (raw && raw !== '.') {
      const num = parseFloat(raw);
      if (!isNaN(num)) {
        formatted = num.toLocaleString('en-US', { maximumFractionDigits: 2 });
        if (raw.endsWith('.'))   formatted += '.';
        if (raw.endsWith('.0'))  formatted += '.0';
        if (raw.endsWith('.00')) formatted += '.00';
      }
    } else if (raw === '.') {
      formatted = '.';
    }

    setDisplayValue(formatted);

    const parsed = parseFloat(raw);
    onChange(isNaN(parsed) ? 0 : Math.round(parsed * 100));
  };

  return (
    <div
      style={{
        display:       'flex',
        flexDirection: 'column',
        gap:           '12px',
        width:         '100%',
        maxWidth:      '560px',
      }}
    >
      {/* Visually hidden label for a11y */}
      <label
        htmlFor={inputId}
        style={{
          fontSize:      '11px',
          fontWeight:    700,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color:         'var(--text-secondary)',
          opacity:       0.6,
        }}
      >
        {label}
      </label>

      {/* Input row */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        {/* $ glyph */}
        <span
          style={{
            fontSize:   '36px',
            fontWeight: 700,
            color:      'var(--text-secondary)',
            opacity:    0.35,
            lineHeight: 1,
            userSelect: 'none',
          }}
          aria-hidden="true"
        >
          $
        </span>

        {/* The actual input */}
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          readOnly={readOnly}
          placeholder={placeholder}
          autoComplete="off"
          style={{
            flex:            1,
            fontSize:        '52px',
            fontWeight:      800,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing:   '-0.02em',
            lineHeight:      1,
            color:           readOnly ? phaseColor : 'var(--text-primary)',
            background:      'transparent',
            border:          'none',
            borderBottom:    `2px solid ${phaseColor}`,
            outline:         'none',
            padding:         '0 0 8px 0',
            width:           '100%',
            caretColor:      phaseColor,
            cursor:          readOnly ? 'not-allowed' : 'text',
          }}
          aria-label={label}
        />
      </div>
    </div>
  );
}
