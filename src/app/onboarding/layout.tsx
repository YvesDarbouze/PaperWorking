import React from 'react';

/* ═══════════════════════════════════════════════════════
   Onboarding Layout — Minimal (No Sidebar)
   
   Used for the intent selection and any future onboarding
   screens. Matches the dark "Luminous Glass" aesthetic
   from the ProjectCreationWizard.
   ═══════════════════════════════════════════════════════ */

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-[#091015] selection:bg-primary/30 overflow-hidden">
      {/* ── Ambient Background Layer ── */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -left-[5%] w-[30%] h-[30%] bg-[#0566d9]/5 blur-[100px] rounded-full" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />
      </div>

      {/* ── Top Brand Bar ── */}
      <header className="fixed top-0 w-full z-50 bg-[#091015]/80 backdrop-blur-xl border-b border-white/10 h-16 flex items-center justify-center px-5 md:px-10">
        <span className="text-[20px] font-bold text-[#57f1db] tracking-tight font-sans">
          PaperWorking
        </span>
      </header>

      {/* ── Content Canvas ── */}
      <main className="flex-grow flex flex-col items-center justify-center pt-24 pb-16 px-5">
        {children}
      </main>
    </div>
  );
}
