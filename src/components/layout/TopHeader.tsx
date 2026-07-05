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
      className="w-full h-20 sticky top-0 z-50 flex items-center justify-between px-margin-mobile lg:px-10 bg-glass-bg backdrop-blur-xl border-b border-outline-variant"
      role="banner"
    >
      {/* ══════ Left Content ══════ */}
      <div className="flex items-center gap-4">
        {/* Mobile Logo */}
        <div className="flex-shrink-0 lg:hidden mr-4">
          <Logo surface="app-topbar" href="/dashboard" />
        </div>
        <h2 className="hidden lg:block font-headline-md text-headline-md text-on-surface">Portfolio Dashboard</h2>
      </div>

      {/* ══════ Right Controls (Search + User Menu) ══════ */}
      <div className="flex items-center gap-6 flex-shrink-0">
        {/* Global Search */}
        <div className="hidden md:flex items-center gap-3 bg-surface-container px-4 py-2 rounded-full border border-outline-variant transition-all focus-within:border-primary">
          <Search className="w-4 h-4 text-outline" aria-hidden="true" />
          <input
            id="global-search"
            type="search"
            placeholder="Search assets..."
            className="bg-transparent border-none focus:ring-0 text-sm w-48 text-on-surface-variant placeholder:text-outline"
            aria-label="Search deals, files, or team"
          />
        </div>

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
                className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-[16px] rounded-full text-[9px] font-bold bg-error text-on-error border border-surface"
                aria-label={`${unreadTotal} unread messages`}
              >
                {unreadTotal > 9 ? '9+' : unreadTotal}
              </span>
            )}
          </Link>
        </div>

        {/* ── Subscription Badge ── */}
        <span
          id="header-tier-badge"
          className="hidden sm:inline-flex items-center px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] select-none rounded bg-primary-container/20 text-primary border border-outline-variant"
          title={`Account tier: ${tierLabel}`}
        >
          {tierLabel}
        </span>

        {/* ── User Avatar + Dropdown ── */}
        <div className="relative" ref={dropdownRef}>
          <button
            id="header-user-menu"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 transition-all duration-200 hover:opacity-80"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
            aria-label={`Account menu for ${displayName}`}
          >
            {/* Avatar container */}
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold shrink-0 border-2 border-primary bg-primary-container/20 text-primary hover:opacity-90 transition-opacity"
              aria-hidden="true"
            >
              {initial}
            </div>
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
              className="pw-dropdown-overlay absolute right-0 top-full mt-2 w-56 py-1.5 z-50 rounded-xl bg-surface-container border border-outline-variant shadow-2xl"
              role="menu"
              aria-label="User menu"
            >
              {/* User info header */}
              <div
                className="px-3 py-2.5 mb-1 border-b border-outline-variant"
              >
                <p
                  className="text-sm font-bold truncate text-on-surface"
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
                className="pw-dropdown-item flex items-center gap-2.5 px-3 py-2 text-sm text-on-surface hover:bg-surface-variant transition-colors"
                role="menuitem"
                onClick={() => setDropdownOpen(false)}
              >
                <User className="w-4 h-4 text-on-surface-variant" />
                Profile
              </Link>

              {/* Divider */}
              <div
                className="my-1 border-t border-outline-variant"
                aria-hidden="true"
              />

              {/* Log out */}
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="pw-dropdown-item flex w-full items-center gap-2.5 px-3 py-2 text-sm text-on-surface hover:bg-surface-variant transition-colors disabled:opacity-50"
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
