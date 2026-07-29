import React from 'react';
import { Check } from 'lucide-react';
import { Plan } from '@/types/Plan';

interface PlanCardProps {
  plan: Plan;
  isCurrent: boolean;
  isUpgrade: boolean;
  isLoading: boolean;
  onSelect: (planId: string) => void;
}

export const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  isCurrent,
  isUpgrade,
  isLoading,
  onSelect,
}) => {
  return (
    <div
      className={`relative flex flex-col justify-between rounded-xl border p-6 bg-white transition-all ${
        isCurrent
          ? 'border-[#6B8E6B] ring-1 ring-[#6B8E6B]'
          : plan.recommended
          ? 'border-slate-200 shadow-md'
          : 'border-slate-150 hover:border-slate-350'
      }`}
    >
      {/* Popular Badge indicator */}
      {plan.recommended && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#6B8E6B] rounded-t-xl" />
      )}

      {/* Top badges */}
      <div className="absolute top-4 right-4 flex gap-1">
        {isCurrent && (
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[#6B8E6B]/10 text-[#557255] rounded-md border border-[#6B8E6B]/20">
            Current
          </span>
        )}
        {plan.recommended && !isCurrent && (
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[#6B8E6B] text-white rounded-md">
            Popular
          </span>
        )}
      </div>

      {/* Plan Header */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-slate-900 mt-2">{plan.label}</h4>
        <p className="text-[11px] text-slate-400 mt-1 leading-normal min-h-[32px]">
          {plan.description}
        </p>
        <p className="text-2xl font-extrabold text-slate-900 mt-4">{plan.price}</p>
      </div>

      {/* Features list */}
      <ul className="space-y-2.5 mb-8 flex-1">
        {plan.features.map((feat, idx) => (
          <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 leading-[1.6]">
            <Check className="w-3.5 h-3.5 text-[#6B8E6B] shrink-0 mt-0.5" />
            <span>{feat}</span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <button
        onClick={() => !isCurrent && onSelect(plan.id)}
        disabled={isCurrent || isLoading}
        className={`w-full h-10 px-4 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
          isCurrent
            ? 'bg-slate-50 text-slate-450 border border-slate-200 cursor-not-allowed'
            : 'bg-[#6B8E6B] hover:bg-[#557255] text-white disabled:opacity-50'
        }`}
      >
        {isLoading && (
          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
        )}
        {isCurrent ? 'Your Current Plan' : isUpgrade ? 'Upgrade' : 'Downgrade'}
      </button>
    </div>
  );
};
