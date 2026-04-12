'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import LogoutButton from '@/components/dashboard/LogoutButton';
import Logo from '@/components/brand/Logo';

/* ═══════════════════════════════════════════════════════
   Dashboard Layout — Directives 42–45

   • Consumes useAuth() for auth-aware rendering
   • Shows minimalist loading skeleton while auth hydrates
   • Integrates LogoutButton in the header
   • Seamless transition to content (no flicker)
   ═══════════════════════════════════════════════════════ */

const navLinks = [
  { href: '/dashboard', label: 'Deal Pipeline' },
  { href: '/dashboard/evaluation', label: 'Capital Evaluation' },
  { href: '/dashboard/closing-room', label: 'Closing Room', badge: 'LOCKED' },
  { href: '/dashboard/engine-room', label: 'The Engine Room' },
];

/**
 * Full-screen minimalist loading skeleton (Directive 44)
 * Matches Clerky's aesthetic: #f2f2f2 background, subtle pulse animations
 */
function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#f2f2f2] font-sans">
      {/* Header skeleton */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-8">
            {/* Logo placeholder */}
            <div className="opacity-30">
              <Logo size="sm" />
            </div>
            {/* Nav placeholders */}
            <div className="hidden items-center gap-6 md:flex">
              <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
              <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
              <div className="h-4 w-28 animate-pulse rounded bg-gray-100" />
              <div className="h-4 w-28 animate-pulse rounded bg-gray-100" />
            </div>
          </div>
          {/* Right side placeholder */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
            <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      </header>

      {/* Content skeleton */}
      <main className="p-6">
        <div className="mb-6 space-y-3">
          <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-96 animate-pulse rounded bg-gray-100" />
        </div>
        {/* Card grid skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-lg border border-gray-200 bg-white"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  /* ─── Directive 44: Auth-aware loading skeleton ─── */
  if (loading) {
    return <DashboardSkeleton />;
  }

  /* ─── Directive 45: Seamless hydration ─────────────
     Middleware already handles redirect for unauthenticated users.
     This is a client-side safety net: if auth resolved with no user,
     we still show the skeleton (middleware redirect is in-flight). */
  if (!user) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[#f2f2f2] font-sans text-foreground">
      {/* Universal Dashboard Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-6">
          {/* Left: Logo + Navigation */}
          <div className="flex items-center">
            <Logo href="/dashboard" size="sm" />
            <nav className="ml-8 hidden items-center space-x-1 text-sm font-medium md:flex">
              {navLinks.map(({ href, label, badge }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center rounded-md px-3 py-2 transition-colors ${
                      isActive
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {label}
                    {badge && (
                      <span className="ml-2 rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: User info + Logout */}
          <div className="flex items-center gap-3">
            {/* User avatar / initial */}
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white"
              title={user.displayName || user.email || 'User'}
            >
              {(user.displayName?.[0] || user.email?.[0] || 'U').toUpperCase()}
            </div>
            <span className="hidden text-sm font-medium text-gray-700 lg:inline">
              {user.displayName || user.email}
            </span>
            {/* Directive 42: LogoutButton in dashboard header */}
            <LogoutButton compact />
          </div>
        </div>
      </header>

      {/* Page Content — rendered only after auth hydration (Directive 45) */}
      <main className="p-6">
        {children}
        <Toaster position="bottom-right" />
      </main>
    </div>
  );
}
