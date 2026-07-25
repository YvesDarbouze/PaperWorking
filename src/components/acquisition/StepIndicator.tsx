'use client';

import React from 'react';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick?: (step: number) => void;
}

const STEPS = [
  { num: 1, label: 'Budget' },
  { num: 2, label: 'Market' },
  { num: 3, label: 'Property' },
  { num: 4, label: 'Analysis' },
  { num: 5, label: 'Offer' },
  { num: 6, label: 'Due Diligence' },
];

export default function StepIndicator({
  currentStep,
  completedSteps,
  onStepClick,
}: StepIndicatorProps) {
  const completionPercentage = Math.round(
    (completedSteps.length / STEPS.length) * 100
  );

  return (
    <div className="w-full space-y-4">
      {/* Top Progress Bar for Mobile & Desktop Overview */}
      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
        <span>Wizard Progress</span>
        <span>{completionPercentage}% Complete</span>
      </div>
      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 transition-all duration-500 ease-out"
          style={{ width: `${completionPercentage}%` }}
        />
      </div>

      {/* Stepper Rail */}
      <nav className="flex items-center justify-between gap-2 overflow-x-auto py-2 scrollbar-none">
        {STEPS.map((step, idx) => {
          const isActive = currentStep === step.num;
          const isCompleted = completedSteps.includes(step.num);
          const isClickable = isCompleted || step.num <= Math.max(0, ...completedSteps) + 1;

          return (
            <React.Fragment key={step.num}>
              {/* Step Circle Button */}
              <button
                disabled={!isClickable || !onStepClick}
                onClick={() => onStepClick?.(step.num)}
                className={`flex flex-col items-center gap-1.5 transition-all text-center min-w-[70px] ${
                  isClickable && onStepClick ? 'cursor-pointer hover:opacity-90' : 'cursor-default'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                    isActive
                      ? 'bg-emerald-500 border-emerald-400 text-[#0d0a0b] shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                      : isCompleted
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : isClickable
                      ? 'bg-white/5 border-white/10 text-white'
                      : 'bg-transparent border-white/5 text-slate-600'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : step.num}
                </div>
                <span
                  className={`text-[10px] font-semibold tracking-wide ${
                    isActive
                      ? 'text-emerald-400 font-bold'
                      : isCompleted
                      ? 'text-slate-200'
                      : 'text-slate-500'
                  }`}
                >
                  {step.label}
                </span>
              </button>

              {/* Connecting Line */}
              {idx < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-px min-w-[12px] max-w-[80px] self-center -mt-5 ${
                    isCompleted && completedSteps.includes(step.num + 1)
                      ? 'bg-emerald-500/30'
                      : 'bg-white/5'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </nav>
    </div>
  );
}
