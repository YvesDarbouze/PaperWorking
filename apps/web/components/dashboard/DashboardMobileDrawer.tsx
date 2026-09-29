'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { resolveDrawerNav, isNavItemActive } from '@/lib/navigation/nav-contract';
import Logo from '@/components/marketing/Logo';
import { PROFILE_CARD } from '@/lib/dashboard/content';
import { Lock, X, Robot, SignOut } from '@/components/icons/PhosphorIcons';
import { getNavPhosphorIcon } from './nav-icons';

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
        className="relative z-10 flex h-full w-[85%] max-w-[340px] flex-col border-l border-border bg-card p-5 shadow-2xl overflow-y-auto pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))]"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
          <Logo href="/dashboard" tone="dashboard" theme="dark" size={24} variant="icon" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="flex h-11 w-11 items-center justify-center rounded-none bg-muted border border-border text-foreground hover:bg-muted/80 transition touch-target min-h-[44px] min-w-[44px]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-3 rounded-none border border-border bg-muted/30 p-3 mb-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none bg-muted border border-border text-foreground font-bold text-sm">
            {PROFILE_CARD.displayName[0] || 'I'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">
              {PROFILE_CARD.displayName}
            </p>
            <p className="text-[11px] text-muted-foreground capitalize truncate">
              {profile?.accountType || PROFILE_CARD.role} · {profile?.subscriptionPlan || 'Pro'}
            </p>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 space-y-1">
          <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
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
                className={`flex items-center gap-3 rounded-none px-3 py-2.5 min-h-[44px] text-sm font-medium no-underline transition ${
                  isActive
                    ? 'bg-primary/10 border border-primary text-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
                }`}
              >
                {getNavPhosphorIcon(item.id, 'h-5 w-5 shrink-0')}
                <span className="flex-1 truncate">{item.label}</span>
                {item.isLocked && (
                  <Lock className="h-4 w-4 text-amber-400 shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Drawer Footer Actions */}
        <div className="border-t border-border pt-4 mt-6 space-y-2">
          <Link
            href="/support"
            onClick={onClose}
            className="flex items-center gap-3 rounded-none px-3 py-2.5 min-h-[44px] text-sm text-muted-foreground hover:text-foreground hover:bg-muted no-underline transition"
          >
            <Robot className="h-5 w-5 text-muted-foreground" />
            <span>Support & Pepper AI</span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            data-testid="drawer-sign-out"
            className="flex w-full items-center gap-3 rounded-none px-3 py-2.5 min-h-[44px] text-sm font-medium text-destructive hover:bg-destructive/10 transition"
          >
            <SignOut className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
