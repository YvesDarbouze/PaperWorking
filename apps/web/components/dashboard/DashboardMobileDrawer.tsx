'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { resolveDrawerNav, isNavItemActive } from '@/lib/navigation/nav-contract';
import Logo from '@/components/marketing/Logo';
import { PROFILE_CARD } from '@/lib/dashboard/content';

interface DashboardMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DashboardMobileDrawer({ isOpen, onClose }: DashboardMobileDrawerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { navContext, profile, logout } = useAuth();
  const drawerItems = resolveDrawerNav(navContext);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on route change
  const prevPathRef = useRef(pathname);
  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      onClose();
    }
  }, [pathname, onClose]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  async function handleLogout() {
    onClose();
    await logout();
    router.push('/login');
  }

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
      data-testid="dashboard-mobile-drawer"
      className="fixed inset-0 z-[100] flex justify-end md:hidden"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer Panel */}
      <div
        ref={drawerRef}
        className="relative z-10 flex h-full w-[85%] max-w-[340px] flex-col border-l border-white/10 bg-[#0d0a0f] p-5 shadow-2xl overflow-y-auto pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))]"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <Logo href="/dashboard" tone="dashboard" theme="dark" size={20} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 mb-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-primary)]/15 border border-[color:var(--color-primary)]/30 text-[color:var(--color-primary)] font-bold text-sm">
            {PROFILE_CARD.displayName[0] || 'I'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">
              {PROFILE_CARD.displayName}
            </p>
            <p className="text-[11px] text-white/50 capitalize truncate">
              {profile?.accountType || PROFILE_CARD.role} · {profile?.subscriptionPlan || 'Pro'}
            </p>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 space-y-1">
          <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-widest text-white/40">
            Workspace Tools
          </p>

          {drawerItems.map((item) => {
            const isActive = isNavItemActive(pathname || '', item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                data-testid={`drawer-link-${item.id}`}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 min-h-[44px] text-sm font-medium no-underline transition active:scale-[0.98] ${
                  isActive
                    ? 'bg-[color:var(--color-primary)]/15 border border-[color:var(--color-primary)]/30 text-[color:var(--color-primary)] font-semibold'
                    : 'text-white/70 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[20px] ${
                    isActive ? 'text-[color:var(--color-primary)]' : 'text-white/40'
                  }`}
                >
                  {item.icon}
                </span>
                <span className="flex-1 truncate">{item.label}</span>
                {item.isLocked && (
                  <span className="material-symbols-outlined text-[15px] text-amber-400">lock</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Drawer Footer Actions */}
        <div className="border-t border-white/10 pt-4 mt-6 space-y-2">
          <Link
            href="/support"
            onClick={onClose}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 min-h-[44px] text-sm text-white/70 hover:text-white hover:bg-white/5 no-underline transition"
          >
            <span className="material-symbols-outlined text-[20px] text-white/40">smart_toy</span>
            <span>Support & Pepper AI</span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            data-testid="drawer-sign-out"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 min-h-[44px] text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
