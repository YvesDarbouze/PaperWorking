'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Search, Bell, ChevronDown, User, LogOut, Loader2, LayoutGrid } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useUserStore } from '@/store/userStore';
import { useRouter } from 'next/navigation';
import Logo from '@/components/brand/Logo';
import { useNotification } from '@/context/NotificationContext';

/* ═══════════════════════════════════════════════════════
   TopHeader — Sticky Dashboard Banner

   Layout:  [Logo (mobile)] [Search ·····] [Bell] [Badge] [Avatar ▾]
   Palette: Inherits .dashboard-context CSS vars
   Height:  64px — matches sidebar logo row for alignment
   ═══════════════════════════════════════════════════════ */

/* ── Tier label map ── */
const TIER_LABELS: Record<string, string> = {
  Individual: 'Starter',
  Team: 'Pro',
};

export default function TopHeader() {
  const { user, logout } = useAuth();
  const { accountTier } = useUserStore();
  const router = useRouter();
  const { unreadTotal } = useNotification();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /* ── Close dropdown on outside click ── */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  /* ── Close dropdown on Escape ── */
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setDropdownOpen(false);
    }
    if (dropdownOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [dropdownOpen]);

  /* ── Logout handler ── */
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      await fetch('/api/auth/session', { method: 'DELETE' });
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
      setIsLoggingOut(false);
    }
  };

  const displayName = user?.displayName || user?.email || 'User';
  const initial = (user?.displayName?.[0] || user?.email?.[0] || 'U').toUpperCase();
  const tierLabel = TIER_LABELS[accountTier] || 'Starter';

  return (
    <header
      id="top-header"
      className="sticky top-0 z-40 w-full bg-surface/40 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-margin-mobile lg:px-margin-desktop"
      style={{ height: 64 }}
      role="banner"
    >
      {/* ══════ Mobile Logo ══════ */}
      <div className="flex-shrink-0 lg:hidden mr-4">
        <Logo href="/dashboard" size="sm" />
      </div>

      {/* ══════ Global Search ══════ */}
      <div className="flex-1 max-w-xl">
        <div className="relative w-full focus-within:ring-2 focus-within:ring-primary/50 rounded-DEFAULT transition-all">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-on-surface-variant"
            aria-hidden="true"
          />
          <input
            id="global-search"
            type="search"
            placeholder="Search deals, files, or team…"
            className="w-full bg-surface-container-low border-none rounded-DEFAULT pl-10 pr-4 py-2 text-on-surface font-sans text-sm placeholder:text-on-surface-variant/40 focus:ring-0"
            aria-label="Search deals, files, or team"
          />
        </div>
      </div>

      {/* ══════ Right Controls ══════ */}
      <div className="flex items-center gap-4 flex-shrink-0 ml-4">
        <div className="flex items-center gap-2">
          {/* ── Notification Bell ── */}
          <Link
            id="header-notifications"
            href="/dashboard/inbox"
            className="relative p-2 text-on-surface-variant hover:text-primary transition-all rounded-full hover:bg-white/5"
            aria-label={`Inbox${unreadTotal > 0 ? ` — ${unreadTotal} unread` : ''}`}
            title={`Inbox${unreadTotal > 0 ? ` — ${unreadTotal} unread` : ''}`}
          >
            <Bell className="w-[20px] h-[20px]" />
            {/* Unread badge — shows count when messages exist */}
            {unreadTotal > 0 && (
              <span
                className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-[16px] h-[16px] rounded-full text-[9px] font-bold"
                style={{ background: '#ba1a1a', color: '#ffffff', border: '1.5px solid var(--color-surface)', padding: '0 2px' }}
                aria-label={`${unreadTotal} unread messages`}
              >
                {unreadTotal > 9 ? '9+' : unreadTotal}
              </span>
            )}
          </Link>

          {/* ── Apps Launcher (Decorative) ── */}
          <button
            type="button"
            className="p-2 text-on-surface-variant hover:text-primary transition-all rounded-full hover:bg-white/5"
            aria-label="Apps launcher"
          >
            <LayoutGrid className="w-[20px] h-[20px]" />
          </button>
        </div>

        {/* ── Subscription Badge ── */}
        <span
          id="header-tier-badge"
          className="hidden sm:inline-flex items-center px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] rounded-none select-none"
          style={{
            background: 'var(--color-primary-container)',
            color: 'var(--color-on-primary-container)',
            border: '1px solid var(--color-outline-variant)',
            letterSpacing: '0.1em',
          }}
          title={`Account tier: ${tierLabel}`}
        >
          {tierLabel}
        </span>

        {/* ── Divider ── */}
        <div
          className="hidden sm:block w-px h-6 bg-white/10"
          aria-hidden="true"
        />

        {/* ── User Avatar + Dropdown ── */}
        <div className="relative" ref={dropdownRef}>
          <button
            id="header-user-menu"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-none px-2 py-1.5 transition-all duration-200 hover:bg-white/5"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
            aria-label={`Account menu for ${displayName}`}
          >
            {/* Avatar container */}
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold shrink-0 border border-primary/20 bg-primary-container/20 text-primary"
              aria-hidden="true"
            >
              {initial}
            </div>
            {/* Name — hidden on small screens */}
            <span
              className="hidden lg:inline text-sm font-medium truncate max-w-[120px] text-on-surface"
            >
              {displayName}
            </span>
            <ChevronDown
              className="w-3.5 h-3.5 shrink-0 transition-transform duration-150 text-on-surface-variant"
              style={{
                transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
              aria-hidden="true"
            />
          </button>

          {/* ── Dropdown Menu ── */}
          {dropdownOpen && (
            <div
              className="pw-dropdown-overlay absolute right-0 top-full mt-2 w-56 py-1.5 z-50"
              role="menu"
              aria-label="User menu"
            >
              {/* User info header */}
              <div
                className="px-3 py-2.5 mb-1 border-b border-white/10"
              >
                <p
                  className="text-sm font-semibold truncate text-on-surface"
                >
                  {displayName}
                </p>
                {user?.email && user.displayName && (
                  <p
                    className="text-xs truncate mt-0.5 text-on-surface-variant"
                  >
                    {user.email}
                  </p>
                )}
              </div>

              {/* Profile link */}
              <Link
                href="/dashboard/settings/profile"
                className="pw-dropdown-item flex items-center gap-2.5 px-3 py-2 text-sm text-on-surface hover:bg-white/5 transition-colors"
                role="menuitem"
                onClick={() => setDropdownOpen(false)}
              >
                <User className="w-4 h-4 text-on-surface-variant" />
                Profile
              </Link>

              {/* Divider */}
              <div
                className="my-1 border-t border-white/10"
                aria-hidden="true"
              />

              {/* Log out */}
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="pw-dropdown-item flex w-full items-center gap-2.5 px-3 py-2 text-sm text-on-surface hover:bg-white/5 transition-colors disabled:opacity-50"
                role="menuitem"
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-on-surface-variant" />
                    Signing out…
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4 text-on-surface-variant" />
                    Log Out
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
