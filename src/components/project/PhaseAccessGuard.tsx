'use client';

import React from 'react';
import { Lock, ArrowLeft } from 'lucide-react';
import { usePhaseAccess } from '@/hooks/usePhaseAccess';
import Link from 'next/link';

interface PhaseAccessGuardProps {
  phaseId: 'phase-1' | 'phase-2' | 'phase-3' | 'phase-4';
  phaseName: string;
  children: React.ReactNode;
}

export function PhaseAccessGuard({ phaseId, phaseName, children }: PhaseAccessGuardProps) {
  const { canView, loading } = usePhaseAccess(phaseId);

  if (loading) {
    return <>{children}</>;
  }

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-white/10 flex items-center justify-center mb-6 shadow-inner relative">
          <Lock className="w-6 h-6 text-red-400" />
          <div className="absolute inset-0 rounded-full border border-red-500/20 animate-ping opacity-40" />
        </div>
        
        <h2 className="text-xl font-bold text-white tracking-tight mb-2">
          Access Restricted
        </h2>
        <p className="text-xs text-[#9E9DA0] max-w-sm mb-6 leading-relaxed">
          You do not have view permissions for <span className="font-semibold text-white">{phaseName}</span>. Please request access from the project's Lead Investor.
        </p>

        <Link
          href="/dashboard/command-center"
          className="flex items-center gap-1.5 px-4 py-2 border border-white/10 text-[10px] font-bold uppercase tracking-wider text-white bg-white/[0.02] hover:bg-white/[0.05] rounded-xl transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Return to Portfolio
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
