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
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
      style={{ backgroundColor: '#f2f2f2' }}
    >
      {/* ─── Logo Lockup ─── */}
      <div className="mb-8 text-[#0a0a0a]">
        <Logo href="/" size="md" />
      </div>

      {/* ─── Auth Card Container ─── */}
      <div
        className="w-full max-w-[420px] rounded-xl border px-8 py-10 shadow-sm"
        style={{
          backgroundColor: '#ffffff',
          borderColor: '#d4d4d4',
        }}
      >
        {children}
      </div>

      {/* ─── Footer ─── */}
      <p
        className="mt-8 text-center text-xs"
        style={{ color: '#737373' }}
      >
        © {new Date().getFullYear()} PaperWorking, Inc. ·{' '}
        <Link href="/privacy" className="underline hover:text-black">
          Privacy
        </Link>{' '}
        ·{' '}
        <Link href="/terms" className="underline hover:text-black">
          Terms
        </Link>
      </p>
    </div>
  );
}
