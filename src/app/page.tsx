'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';
import { useAuth } from '@/context/AuthContext';
import { CustomToaster } from '@/components/ui/CustomToaster';
import { useSearchParams } from 'next/navigation';

/* ═══════════════════════════════════════════════════════
   Landing Page — Cinematic Glass Portal Redesign.
   
   Enforces Luminous Glass dark theme globally (#060f15),
   ambient radial glows, responsive 12-column bento hero,
   and clean institutional-grade layout.
   ═══════════════════════════════════════════════════════ */

function SuccessModal() {
  const searchParams = useSearchParams();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (searchParams?.get('success') === 'true') {
      setShow(true);
    }
  }, [searchParams]);
  
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-surface-container border border-outline/20 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
          <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold text-on-surface mb-3 tracking-tight">Welcome to PaperWorking</h2>
        <p className="text-on-surface-variant mb-8 text-sm leading-relaxed">
          Your 14-day free trial is active. Check your email for login instructions and next steps.
        </p>
        
        <button
          onClick={() => setShow(false)}
          className="luminous-button w-full"
        >
          <span>Get Started</span>
        </button>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  return (
    <div className="marketing-context bg-background min-h-screen text-on-background relative overflow-x-hidden terminal-grid">
      {/* Background Ambient Glows */}
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] radial-glow pointer-events-none z-0" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] radial-glow opacity-50 pointer-events-none z-0" />

      {/* Success Modal Overlay */}
      <Suspense fallback={null}>
        <SuccessModal />
      </Suspense>

      <LandingHeader />

      {/* Main Content */}
      <main className="pt-32 pb-40 relative z-10">
        {/* Hero Bento Grid Section */}
        <section className="max-w-container-max mx-auto px-6 md:px-gutter-desktop">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Main Hero Content */}
            <div className="md:col-span-8 bento-card p-12 rounded-3xl flex flex-col justify-center inner-glow min-h-[480px]">
              <div className="inline-flex items-center gap-3 bg-primary/5 w-fit px-3 py-1.5 rounded-full mb-10 border border-primary/20">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="font-mono text-[10px] text-primary uppercase tracking-[0.2em]">System Status: Operational</span>
              </div>
              <h1 className="font-headline-xl text-headline-xl mb-6 text-white leading-[1.1]">
                Stop Running Six-Figure Flips <br />
                <span className="text-primary italic">Out of Five-Column Spreadsheets.</span>
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface/60 max-w-xl mb-12 leading-relaxed">
                The deal operating system for real estate investors. Track every document, dollar, and deadline from acquisition to exit in one dashboard.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-8">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-primary rounded-xl blur-lg opacity-20 group-hover:opacity-40 transition duration-500" />
                  <Link
                    href="/register"
                    className="relative px-10 py-5 rounded-xl font-bold text-lg inline-flex items-center gap-3 bg-primary text-on-primary hover:scale-[1.02] transition-transform shadow-[0_0_25px_rgba(45,212,191,0.4)]"
                  >
                    Start Free Trial
                    <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 0, 'wght' 600" }}>arrow_forward</span>
                  </Link>
                </div>
                <span className="font-mono text-xs text-on-surface/40 uppercase tracking-widest">Free for 14 days • No credit card required • Instant setup</span>
              </div>
            </div>

            {/* Stats/Metrics Panel */}
            <div className="md:col-span-4 grid grid-rows-2 gap-8">
              <div className="bento-card p-8 rounded-3xl flex flex-col justify-between inner-glow">
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">trending_up</span>
                  </div>
                  <span className="text-primary font-bold text-3xl font-headline-md tracking-tighter">4 Phases</span>
                </div>
                <div>
                  <h4 className="font-bold text-white text-base mb-1">REIL v2 Deal Tracking</h4>
                  <p className="font-body-sm text-on-surface/50 text-sm">Acquisition through Hold/Exit</p>
                </div>
              </div>
              <div className="bento-card p-8 rounded-3xl flex flex-col justify-between inner-glow border-primary/10">
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">security</span>
                  </div>
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md font-mono text-[10px] tracking-widest uppercase">Encrypted</span>
                </div>
                <div>
                  <h4 className="font-bold text-white text-base mb-1">CPA-Ready Exports</h4>
                  <p className="font-body-sm text-on-surface/50 text-sm">One-click spreadsheet ledgers</p>
                </div>
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/5 blur-3xl rounded-full" />
              </div>
            </div>

            {/* Pipeline Visualizer Panel */}
            <div className="md:col-span-4 bento-card p-10 rounded-3xl inner-glow">
              <h3 className="font-mono text-[10px] text-primary mb-8 uppercase tracking-[0.25em]">Active Pipeline</h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-mono text-on-surface/40 uppercase">
                    <span>Project Alpha</span>
                    <span>75%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-[75%] rounded-full shadow-[0_0_8px_rgba(45,212,191,0.5)]" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-mono text-on-surface/40 uppercase">
                    <span>Beta Assets</span>
                    <span>40%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary/40 w-[40%] rounded-full" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-mono text-on-surface/40 uppercase">
                    <span>Theta Dev</span>
                    <span>90%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary/60 w-[90%] rounded-full" />
                  </div>
                </div>
              </div>
              <p className="mt-10 font-mono text-[11px] text-on-surface/40 leading-relaxed uppercase tracking-wider">
                Track deal milestones from offer to exit.
              </p>
            </div>

            {/* Process Grid */}
            <div className="md:col-span-8 bento-card p-10 rounded-3xl inner-glow">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 h-full">
                <Link href="/register" className="flex flex-col justify-between p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-primary/20 transition-all group">
                  <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform text-3xl">hub</span>
                  <div>
                    <span className="font-bold text-white text-sm block mb-1">Acquisition</span>
                    <span className="font-mono text-[9px] text-on-surface/40 uppercase tracking-widest">Know the numbers</span>
                  </div>
                </Link>
                <Link href="/register" className="flex flex-col justify-between p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-primary/20 transition-all group">
                  <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform text-3xl">verified_user</span>
                  <div>
                    <span className="font-bold text-white text-sm block mb-1">Transaction</span>
                    <span className="font-mono text-[9px] text-on-surface/40 uppercase tracking-widest">Meet deadlines</span>
                  </div>
                </Link>
                <Link href="/register" className="flex flex-col justify-between p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-primary/20 transition-all group">
                  <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform text-3xl">speed</span>
                  <div>
                    <span className="font-bold text-white text-sm block mb-1">Rehab</span>
                    <span className="font-mono text-[9px] text-on-surface/40 uppercase tracking-widest">Manage contractor draws</span>
                  </div>
                </Link>
                <Link href="/register" className="flex flex-col justify-between p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-primary/20 transition-all group">
                  <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform text-3xl">account_balance</span>
                  <div>
                    <span className="font-bold text-white text-sm block mb-1">Hold/Exit</span>
                    <span className="font-mono text-[9px] text-on-surface/40 uppercase tracking-widest">CPA tax hand-off</span>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* OS Performance Section */}
        <section className="max-w-4xl mx-auto px-6 md:px-gutter-desktop mt-48">
          <div className="bento-card p-16 rounded-[40px] text-center border-t border-t-primary/30 relative overflow-hidden shadow-2xl">
            <div className="absolute -right-32 -top-32 w-80 h-80 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute -left-32 -bottom-32 w-80 h-80 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
            <h2 className="font-headline-lg text-4xl text-primary mb-8 tracking-tight">Eliminate Profit Erosion.</h2>
            <p className="font-body-lg text-on-surface/70 max-w-2xl mx-auto text-xl leading-relaxed">
              Replace fragmented spreadsheets with a single <span className="text-white font-medium">operating system</span> built by active operators to track every document, dollar, and deadline.
            </p>
          </div>
        </section>
      </main>

      <LandingFooter />
      <CustomToaster position="bottom-center" />
    </div>
  );
}
