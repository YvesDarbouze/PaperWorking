import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import Logo from '@/components/brand/Logo';

export const metadata: Metadata = {
  title: 'Sign In — PaperWorking',
  robots: 'noindex, nofollow',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center overflow-hidden">

      {/* Dot-grid texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, #2b2b2b 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Logo — top-left */}
      <div className="absolute top-6 left-8 z-20">
        <Logo href="/" size="sm" />
      </div>

      {/* Auth content */}
      <div className="relative z-10 w-full max-w-[840px] px-6 animate-in fade-in zoom-in-95 duration-500">
        {children}
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-0 right-0 text-center text-[11px] text-[#4a4a4a]">
        <Link href="/terms" className="hover:text-[#888] transition-colors">Terms of service</Link>
        <span className="mx-2">·</span>
        <Link href="/privacy" className="hover:text-[#888] transition-colors">Privacy policy</Link>
        <span className="mx-2">·</span>
        <span>©{new Date().getFullYear()} PaperWorking</span>
      </div>
    </div>
  );
}
