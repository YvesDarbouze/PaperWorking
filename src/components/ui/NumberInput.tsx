'use client';

import { useState, useEffect, useId } from 'react';

export interface NumberInputProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  label?: string;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  hint?: string;
  className?: string;
}

function fmt(n: number | undefined): string {
  if (n === undefined || isNaN(n)) return '';
  return n.toLocaleString(undefined, { maximumFractionDigits: 10 });
}

function parse(raw: string): number | undefined {
  const cleaned = raw.replace(/[^0-9.\-]/g, '');
  if (cleaned === '' || cleaned === '-') return undefined;
  const n = parseFloat(cleaned);
  return isNaN(n) ? undefined : n;
}

export function NumberInput({
  value,
  onChange,
  label,
  placeholder = '0',
  prefix,
  suffix,
  min,
  max,
  step,
  disabled = false,
  hint,
  className = '',
}: NumberInputProps) {
  const id = useId();
  const [raw, setRaw] = useState(fmt(value));

  useEffect(() => {
    setRaw(fmt(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setRaw(text);
    const parsed = parse(text);
    if (parsed !== undefined && min !== undefined && parsed < min) return;
    if (parsed !== undefined && max !== undefined && parsed > max) return;
    onChange(parsed);
  };

  const handleBlur = () => {
    setRaw(fmt(value));
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-[9px] font-black text-text-secondary uppercase tracking-[0.25em]"
        >
          {label}
        </label>
      )}
      <div
        className={`relative flex items-center border border-border-accent bg-bg-primary focus-within:border-pw-black transition-colors ${
          disabled ? 'opacity-60 cursor-not-allowed' : ''
        }`}
      >
        {prefix && (
          <span className="pl-3 text-xs font-black text-text-secondary select-none">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          value={raw}
          disabled={disabled}
          step={step}
          min={min}
          max={max}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`flex-1 px-3 py-3 text-sm font-black text-text-primary bg-transparent outline-none tabular-nums placeholder:text-text-secondary/40 ${
            disabled ? 'cursor-not-allowed' : ''
          }`}
        />
        {suffix && (
          <span className="pr-3 text-xs font-black text-text-secondary select-none">
            {suffix}
          </span>
        )}
      </div>
      {hint && (
        <p className="text-[9px] text-text-secondary font-bold tracking-wide">{hint}</p>
      )}
    </div>
  );
}
