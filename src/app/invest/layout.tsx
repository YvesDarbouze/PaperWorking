import React from 'react';

/* ═══════════════════════════════════════════════════════
   Guest Portal Layout — Minimal, Unauthenticated

   No dashboard chrome, no sidebar, no auth guard.
   Just a clean full-page container for invited investors.
   ═══════════════════════════════════════════════════════ */

export const metadata = {
  title: 'PaperWorking — Investor Portal',
  description: 'Review and sign your investment opportunity',
};

export default function InvestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {children}
    </div>
  );
}
