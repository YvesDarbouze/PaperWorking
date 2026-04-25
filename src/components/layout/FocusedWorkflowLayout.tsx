'use client';

import React from 'react';
import { X, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';

interface Step {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'complete';
}

interface FocusedWorkflowLayoutProps {
  title: string;
  subtitle?: string;
  steps: Step[];
  currentStepIndex: number;
  onExit: () => void;
  onBack?: () => void;
  onNext?: () => void;
  isNextDisabled?: boolean;
  nextLabel?: string;
  children: React.ReactNode;
}

/**
 * FocusedWorkflowLayout
 * 
 * Provides a distraction-free, full-screen environment for critical workflows.
 * Mimics high-reliability systems (Clerky) with a split-pane structural pattern.
 */
export default function FocusedWorkflowLayout({
  title,
  subtitle,
  steps,
  currentStepIndex,
  onExit,
  onBack,
  onNext,
  isNextDisabled,
  nextLabel = 'Continue',
  children
}: FocusedWorkflowLayoutProps) {
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-bg-surface text-text-primary overflow-hidden animate-in fade-in duration-300">
      
      {/* Structural Header */}
      <header className="h-20 border-b border-border-accent flex items-center justify-between px-10 bg-bg-surface shrink-0">
        <div className="flex items-center gap-8">
          <div className="bg-pw-black text-pw-white px-3 py-1 font-black text-xs uppercase tracking-widest border border-pw-black">
            PW_PROTOCOL
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-[0.3em]">{title}</h1>
            {subtitle && <p className="text-xs text-text-secondary font-bold uppercase tracking-wider mt-1">{subtitle}</p>}
          </div>
        </div>
        
        <button 
          onClick={onExit}
          className="flex items-center gap-2 group hover:text-pw-accent transition-colors"
        >
          <span className="text-xs font-black uppercase tracking-widest">Exit_Stream</span>
          <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        
        {/* Sidebar Nav (Split-Pane Sidebar) */}
        <aside className="w-[320px] border-r border-border-accent bg-bg-primary flex flex-col p-12 shrink-0 overflow-y-auto">
          <div className="mb-12">
            <p className="text-xs font-black text-text-secondary uppercase tracking-[0.4em] mb-4">WORKFLOW_PROGRESS</p>
            <div className="flex items-end gap-3 mb-2">
              <span className="text-4xl font-black tracking-tighter tabular-nums">{Math.round(progress)}%</span>
              <span className="text-xs font-black text-pw-accent uppercase mb-2">Operational</span>
            </div>
            <div className="w-full h-1 bg-pw-border">
              <div 
                className="h-full bg-pw-accent transition-all duration-700 ease-in-out" 
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <nav className="space-y-8">
            {steps.map((step, idx) => {
              const isActive = idx === currentStepIndex;
              const isComplete = idx < currentStepIndex;
              const isFuture = idx > currentStepIndex;

              return (
                <div key={step.id} className="flex gap-6 relative">
                  {/* Step Connector Line */}
                  {idx !== steps.length - 1 && (
                    <div className={`absolute left-[13px] top-8 w-px h-12 ${isComplete ? 'bg-pw-accent' : 'bg-pw-border'}`} />
                  )}
                  
                  <div className={`w-7 h-7 shrink-0 flex items-center justify-center font-mono text-xs font-black border transition-all ${
                    isActive ? 'bg-pw-black text-pw-white border-pw-black scale-110 shadow-[0_0_15px_rgba(0,0,0,0.1)]' :
                    isComplete ? 'bg-pw-accent text-pw-white border-pw-accent' :
                    'bg-bg-surface text-text-secondary border-border-accent'
                  }`}>
                    {isComplete ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  
                  <div className="pt-1">
                    <p className={`text-xs font-black uppercase tracking-widest ${
                      isActive ? 'text-text-primary' : 
                      isComplete ? 'text-text-primary/60' : 
                      'text-text-secondary'
                    }`}>
                      {step.label}
                    </p>
                    {isActive && (
                      <span className="text-xs font-bold text-pw-accent uppercase tracking-tighter animate-pulse">
                        Input Required
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="mt-auto pt-12 border-t border-border-accent">
            <div className="flex items-center gap-3 grayscale opacity-30">
              <div className="w-2 h-2 rounded-full bg-pw-accent animate-pulse" />
              <span className="text-xs font-black uppercase tracking-widest text-text-primary">Ledger_Sync_Active</span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 bg-bg-surface overflow-y-auto p-20 flex flex-col">
          <div className="max-w-3xl w-full mx-auto flex-1">
            {children}
          </div>

          {/* Persistent Footer Actions (Hierarchy Enrollment) */}
          <div className="max-w-3xl w-full mx-auto mt-20 pt-10 border-t border-border-accent flex justify-between items-center">
            {onBack ? (
              <button 
                onClick={onBack}
                className="flex items-center gap-3 text-xs font-black text-text-secondary hover:text-text-primary uppercase tracking-[0.2em] transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous_Phase
              </button>
            ) : <div />}

            {onNext && (
              <button 
                onClick={onNext}
                disabled={isNextDisabled}
                className={`
                  flex items-center gap-6 px-10 py-5 font-black text-sm uppercase tracking-[0.4em] transition-all border
                  ${isNextDisabled 
                    ? 'bg-bg-primary text-text-secondary border-border-accent cursor-not-allowed opacity-50' 
                    : 'bg-pw-black text-pw-white border-pw-black hover:bg-pw-accent hover:border-pw-accent shadow-[0_0_20px_rgba(0,0,0,0.1)] group'
                  }
                `}
              >
                <span>{nextLabel}</span>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
