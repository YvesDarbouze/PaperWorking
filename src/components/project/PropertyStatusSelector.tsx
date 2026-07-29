'use client';

import React from 'react';
import { Search, FileText, Home } from 'lucide-react';

type PropertyStatus = 'target' | 'under_contract' | 'owned';

interface PropertyStatusSelectorProps {
  onSelect: (status: PropertyStatus) => void;
  className?: string;
}

const STATUS_OPTIONS: Array<{
  value: PropertyStatus;
  icon: React.ElementType;
  title: string;
  description: string;
}> = [
  {
    value: 'target',
    icon: Search,
    title: 'Target',
    description: "I haven't purchased this yet",
  },
  {
    value: 'under_contract',
    icon: FileText,
    title: 'Under Contract',
    description: "I've signed a purchase agreement",
  },
  {
    value: 'owned',
    icon: Home,
    title: 'I Already Own This',
    description: 'I want to track an existing property',
  },
];

export function PropertyStatusSelector({ onSelect, className = '' }: PropertyStatusSelectorProps) {
  return (
    <div data-testid="property-status-selector" className={`space-y-4 ${className}`}>
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          What stage is this property in?
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          This determines your starting point in the REIL workflow.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {STATUS_OPTIONS.map(({ value, icon: Icon, title, description }) => (
          <button
            key={value}
            data-testid={`status-${value}`}
            onClick={() => onSelect(value)}
            className="flex flex-col items-center gap-3 p-6 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:border-slate-400 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all duration-200 group text-center"
          >
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 group-hover:bg-slate-200 dark:group-hover:bg-white/10 transition-colors">
              <Icon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
