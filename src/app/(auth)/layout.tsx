import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import Logo from '@/components/brand/Logo';

/* ═══════════════════════════════════════════════════════
   PaperWorking — Auth Layout

   Shared wrapper for all auth pages (login, register, 
   forgot-password). Centers the auth card vertically
   and horizontally on the #f2f2f2 canvas with the 
   PaperWorking wordmark at the top.
   ═══════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: 'Sign In — PaperWorking',
  robots: 'noindex, nofollow',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6 py-12 bg-pw-bg"
    >
      {/* ─── Logo Lockup ─── */}
      <div className="mb-12">
        <Logo href="/" size="md" />
      </div>

      {/* ─── Auth Card Container (Antigravity v2 Geometry) ─── */}
      <div
        className="w-full max-w-[460px] rounded-[48px] bg-pw-surface border border-pw-border/10 px-10 py-12 shadow-[0_40px_100px_rgba(0,0,0,0.03)] animate-in fade-in zoom-in-95 duration-700"
      >
        {children}
      </div>

      {/* ─── Footer ─── */}
      <div className="mt-12 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-pw-muted opacity-40">
        <p>
          © {new Date().getFullYear()} PaperWorking Infrastructure ·{' '}
          <Link href="/privacy" className="hover:text-pw-black transition-colors">
            Privacy
          </Link>{' '}
          / {' '}
          <Link href="/terms" className="hover:text-pw-black transition-colors">
            Terms
          </Link>
        </p>
      </div>
    </div>
  );
}
