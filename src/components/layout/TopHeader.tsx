'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Search, Bell, ChevronDown, User, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useUserStore } from '@/store/userStore';
import { useRouter } from 'next/navigation';
import Logo from '@/components/brand/Logo';
import { useInboxThreads } from '@/hooks/useInboxThreads';

/* ═══════════════════════════════════════════════════════
   TopHeader — Sticky Dashboard Banner

   Layout:  [Logo (mobile)] [Search ·····] [Bell] [Badge] [Avatar ▾]
   Palette: Inherits .dashboard-context CSS vars
   Height:  64px — matches sidebar logo row for alignment
   ═══════════════════════════════════════════════════════ */

/* ── Tier label map ── */
const TIER_LABELS: Record<string, string> = {
  Individual: 'Starter',
  Team: 'Pro Tier',
};

export default function TopHeader() {
  const { user, logout } = useAuth();
  const { accountTier } = useUserStore();
  const router = useRouter();
  const { unreadTotal } = useInboxThreads();

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
      className="sticky top-0 z-50 w-full backdrop-blur-md"
      style={{
        height: 64,
        background: 'color-mix(in srgb, var(--bg-surface) 85%, transparent)',
        borderBottom: '1px solid var(--border-ui)',
      }}
      role="banner"
    >
      <div className="flex h-16 items-center gap-4 px-4 sm:px-6">

        {/* ══════ Mobile Logo ══════ */}
        <div className="flex-shrink-0 lg:hidden">
          <Logo href="/dashboard" size="sm" />
        </div>

        {/* ══════ Global Search ══════ */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: 'var(--text-secondary)' }}
              aria-hidden="true"
            />
            <input
              id="global-search"
              type="search"
              placeholder="Search projects, files, or team..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg transition-all duration-150 outline-none"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-ui)',
                color: 'var(--text-primary)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#0d0d0d';
                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(13,13,13,0.08)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-ui)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              aria-label="Search projects, files, or team"
            />
          </div>
        </div>

        {/* ══════ Right Controls ══════ */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">

          {/* ── Notification Bell ── */}
          <Link
            id="header-notifications"
            href="/dashboard/inbox"
            className="relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e8e8e8';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
            aria-label={`Inbox${unreadTotal > 0 ? ` — ${unreadTotal} unread` : ''}`}
            title={`Inbox${unreadTotal > 0 ? ` — ${unreadTotal} unread` : ''}`}
          >
            <Bell className="w-[18px] h-[18px]" />
            {/* Unread badge — shows count when messages exist */}
            {unreadTotal > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold"
                style={{ background: '#0d0d0d', color: '#ffffff', border: '2px solid var(--bg-surface)', padding: '0 3px' }}
                aria-label={`${unreadTotal} unread messages`}
              >
                {unreadTotal > 99 ? '99+' : unreadTotal}
              </span>
            )}
          </Link>

          {/* ── Subscription Badge ── */}
          <span
            id="header-tier-badge"
            className="hidden sm:inline-flex items-center px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] rounded-full select-none"
            style={{
              background: '#0d0d0d',
              color: '#ffffff',
              letterSpacing: '0.1em',
            }}
            title={`Account tier: ${tierLabel}`}
          >
            {tierLabel}
          </span>

          {/* ── Divider ── */}
          <div
            className="hidden sm:block w-px h-6"
            style={{ background: 'var(--border-ui)' }}
            aria-hidden="true"
          />

          {/* ── User Avatar + Dropdown ── */}
          <div className="relative" ref={dropdownRef}>
            <button
              id="header-user-menu"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors"
              style={{ color: 'var(--text-primary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e8e8e8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
              aria-label={`Account menu for ${displayName}`}
            >
              {/* Avatar circle */}
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold shrink-0"
                style={{ background: '#0d0d0d', color: '#ffffff' }}
                aria-hidden="true"
              >
                {initial}
              </div>
              {/* Name — hidden on small screens */}
              <span
                className="hidden lg:inline text-sm font-medium truncate max-w-[120px]"
                style={{ color: 'var(--text-primary)' }}
              >
                {displayName}
              </span>
              <ChevronDown
                className="w-3.5 h-3.5 shrink-0 transition-transform duration-150"
                style={{
                  color: 'var(--text-secondary)',
                  transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
                aria-hidden="true"
              />
            </button>

            {/* ── Dropdown Menu ── */}
            {dropdownOpen && (
              <div
                className="absolute right-0 top-full mt-1.5 w-56 rounded-lg py-1.5 shadow-lg"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-ui)',
                  zIndex: 100,
                }}
                role="menu"
                aria-label="User menu"
              >
                {/* User info header */}
                <div
                  className="px-3 py-2.5 mb-1"
                  style={{ borderBottom: '1px solid var(--border-ui)' }}
                >
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {displayName}
                  </p>
                  {user?.email && user.displayName && (
                    <p
                      className="text-xs truncate mt-0.5"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {user.email}
                    </p>
                  )}
                </div>

                {/* Profile link */}
                <Link
                  href="/dashboard/profile"
                  className="flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f0f0f0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                  role="menuitem"
                  onClick={() => setDropdownOpen(false)}
                >
                  <User className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                  Profile
                </Link>

                {/* Divider */}
                <div
                  className="my-1"
                  style={{ borderTop: '1px solid var(--border-ui)' }}
                  aria-hidden="true"
                />

                {/* Log out */}
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors disabled:opacity-50"
                  style={{ color: 'var(--text-primary)' }}
                  onMouseEnter={(e) => {
                    if (!isLoggingOut) e.currentTarget.style.background = '#f0f0f0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                  role="menuitem"
                >
                  {isLoggingOut ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--text-secondary)' }} />
                      Signing out…
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                      Log Out
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
