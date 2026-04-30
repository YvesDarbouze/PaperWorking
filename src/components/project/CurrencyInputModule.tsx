'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import { Info } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   CurrencyInputModule — Reusable Currency Input Component
   
   A dedicated input module for financial metrics that includes:
     • Currency formatting as the user types
     • An interactive tooltip explaining the metric
     • Phase-aware styling accent integration
   ═══════════════════════════════════════════════════════════════ */

interface CurrencyInputModuleProps {
  label: string;
  tooltipText?: string;
  initialValue?: number; // In cents
  onChange?: (valueCents: number) => void;
  phaseColor?: string;
  readOnly?: boolean;
}

export default function CurrencyInputModule({
  label,
  tooltipText,
  initialValue,
  onChange,
  phaseColor = '#595959',
  readOnly = false,
}: CurrencyInputModuleProps) {
  const inputId = useId();
  
  // Convert initial cents to dollars for the input display
  const initialDisplay = initialValue ? (initialValue / 100).toString() : '';
  
  // We sync internal display state with the prop if readOnly is true and value changes
  const [displayValue, setDisplayValue] = useState(
    initialDisplay ? Number(initialDisplay).toLocaleString('en-US') : ''
  );
  
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // If readOnly, update displayValue when initialValue changes (useful for derived fields like MAO)
  useEffect(() => {
    if (readOnly) {
       const newDisplay = initialValue ? (initialValue / 100).toLocaleString('en-US') : '';
       setDisplayValue(newDisplay);
    }
  }, [initialValue, readOnly]);

  // Close tooltip if clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setIsTooltipOpen(false);
      }
    }
    if (isTooltipOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTooltipOpen]);

  // Handle currency formatting on input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    
    // Strip non-numeric characters except for single decimal
    let raw = e.target.value.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimals
    const parts = raw.split('.');
    if (parts.length > 2) {
      raw = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Format with commas
    let formatted = '';
    if (raw) {
      const numberValue = parseFloat(raw);
      if (!isNaN(numberValue)) {
        formatted = numberValue.toLocaleString('en-US', {
          maximumFractionDigits: 2,
          minimumFractionDigits: raw.endsWith('.') ? 0 : 0
        });
        
        if (raw.endsWith('.')) formatted += '.';
        else if (raw.endsWith('.0')) formatted += '.0';
      }
    }
    
    setDisplayValue(formatted);

    // Emit the change in cents
    if (onChange) {
      const parsed = parseFloat(raw);
      const cents = isNaN(parsed) ? 0 : Math.round(parsed * 100);
      onChange(cents);
    }
  };

  return (
    <div className="flex flex-col gap-2 relative">
      <div className="flex items-center gap-1.5 relative" ref={tooltipRef}>
        <label htmlFor={inputId} className="text-xs font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </label>
        
        {tooltipText && (
          <button 
            type="button" 
            className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
            onClick={() => setIsTooltipOpen(!isTooltipOpen)}
            onMouseEnter={() => setIsTooltipOpen(true)}
            onMouseLeave={() => setIsTooltipOpen(false)}
            aria-label={`More info about ${label}`}
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Tooltip Content */}
        {isTooltipOpen && tooltipText && (
          <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-white shadow-lg rounded-md border border-gray-100 z-20 animate-in fade-in zoom-in-95 duration-150">
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              {tooltipText}
            </p>
            {/* Tooltip arrow */}
            <div className="absolute left-6 top-full -mt-[1px] w-2 h-2 bg-white border-b border-r border-gray-100 rotate-45"></div>
          </div>
        )}
      </div>

      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-gray-500 font-medium">$</span>
        </div>
        <input
          id={inputId}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          readOnly={readOnly}
          placeholder="0"
          className={`w-full pl-7 pr-4 py-2.5 text-sm font-medium tabular-nums rounded-md transition-all focus:outline-none ${readOnly ? 'cursor-not-allowed opacity-80' : ''}`}
          style={{ 
            background: 'var(--bg-inset, #F9F9F9)',
            border: '1px solid var(--border-ui)',
            color: readOnly ? phaseColor : 'var(--text-primary)'
          }}
        />
        {/* Focus border effect using phaseColor (only if not readonly) */}
        {!readOnly && (
          <div 
            className="absolute inset-0 rounded-md pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity"
            style={{ border: `1px solid ${phaseColor}`, boxShadow: `0 0 0 1px ${phaseColor}20` }}
          ></div>
        )}
      </div>
    </div>
  );
}
