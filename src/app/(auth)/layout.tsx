import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import Logo from '@/components/brand/Logo';
import GlowEffect from '@/components/auth/GlowEffect';

export const metadata: Metadata = {
  title: 'Sign In — PaperWorking',
  robots: 'noindex, nofollow',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative min-h-screen bg-[#0b141a] flex flex-col items-center overflow-x-hidden font-sans text-on-surface"
      style={{
        backgroundImage:
          'radial-gradient(circle at 50% 50%, rgba(87, 241, 219, 0.03) 0%, transparent 50%), ' +
          'linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), ' +
          'linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)',
        backgroundSize: '100% 100%, 40px 40px, 40px 40px',
      }}
    >
      {/* Moving Glow Background Elements */}
      <GlowEffect />

      {/* Simplified TopAppBar */}
      <nav className="fixed top-0 left-0 w-full z-50 flex justify-center items-center px-6 md:px-10 bg-[#0b141a]/40 backdrop-blur-md border-b border-white/5 h-16">
        <div className="w-full max-w-7xl flex items-center justify-between">
          <Logo href="/" size="sm" className="text-[#57f1db]" />
          <div className="hidden md:block">
            <span className="text-xs font-medium tracking-widest text-[#859490] uppercase">
              System Status: <span className="text-[#57f1db]">Active</span>
            </span>
          </div>
        </div>
      </nav>

      {/* Main Content Container */}
      <main className="flex-grow flex items-center justify-center w-full px-4 py-8 mt-16 z-10">
        {children}
      </main>

      {/* Shared Footer */}
      <footer className="w-full py-8 flex flex-col items-center gap-2 bg-transparent mt-auto relative z-10">
        <div className="flex items-center gap-6 mb-2">
          <Link
            href="/privacy"
            className="text-xs text-[#859490] hover:text-[#57f1db] transition-all"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="text-xs text-[#859490] hover:text-[#57f1db] transition-all"
          >
            Terms of Service
          </Link>
          <a
            href="#"
            className="text-xs text-[#859490] hover:text-[#57f1db] transition-all"
          >
            Security Audit
          </a>
        </div>
        <p className="text-xs text-[#859490]/60">
          © {new Date().getFullYear()} PaperWorking. Secure Infrastructure.
        </p>
      </footer>
    </div>
  );
}

