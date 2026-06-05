"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import Link from "next/link";
import LogoutButton from "@/components/dashboard/LogoutButton";
import toast from "react-hot-toast";

/* ═══════════════════════════════════════════════════════════════
   TopAppBar — Premium dashboard header
   Features: breadcrumb, search with Cmd+K, notifications dropdown,
   theme toggle, user avatar dropdown
   ═══════════════════════════════════════════════════════════════ */

const ROUTE_LABELS: Record<string, string> = {
  "/dashboard": "Portfolio",
  "/dashboard/command-center": "Portfolio",
  "/dashboard/projects": "Projects",
  "/dashboard/data-room": "Data Room",
  "/dashboard/inbox": "Inbox",
  "/dashboard/team": "Team",
  "/dashboard/reports": "Reports",
  "/dashboard/deal-analyzer": "Deal Analyzer",
  "/dashboard/settings": "Settings",
  "/dashboard/settings/profile": "Profile",
  "/dashboard/settings/billing": "Billing",
  "/dashboard/settings/team": "Team Settings",
  "/dashboard/settings/notifications": "Notifications",
  "/dashboard/intelligence": "Intelligence",
  "/dashboard/marketplace": "Marketplace",
};

function getPageLabel(pathname: string): string {
  // Exact match first
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
  // Then prefix match (longest first)
  const sorted = Object.keys(ROUTE_LABELS).sort((a, b) => b.length - a.length);
  for (const route of sorted) {
    if (pathname.startsWith(route)) return ROUTE_LABELS[route];
  }
  return "Dashboard";
}

function getHelpSlug(pathname: string): string {
  if (pathname.includes('/settings/profile')) return 'profile';
  if (pathname.includes('/settings/billing')) return 'billing';
  if (pathname.includes('/settings')) return 'settings';
  if (pathname.includes('/command-center') || pathname === '/dashboard') return 'portfolio';
  if (pathname.includes('/projects')) return 'projects';
  if (pathname.includes('/data-room')) return 'data-room';
  if (pathname.includes('/inbox')) return 'inbox';
  if (pathname.includes('/team')) return 'team';
  if (pathname.includes('/reports')) return 'reports';
  if (pathname.includes('/deal-analyzer')) return 'deal-analyzer';
  return 'portfolio';
}

export function TopAppBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile } = useAuth();
  const { unreadTotal } = useNotification();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [changelogs, setChangelogs] = useState<Array<{ version: string; date: string; title: string }>>([]);
  const [unreadChangelogCount, setUnreadChangelogCount] = useState(0);
  const whatsNewRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch changelog metadata and compute unread count
  useEffect(() => {
    async function fetchChangelogMeta() {
      try {
        const res = await fetch('/api/changelog/metadata');
        if (res.ok) {
          const data = await res.json();
          if (data.entries) {
            setChangelogs(data.entries);
            
            // Calculate unread count
            const lastVisitStr = localStorage.getItem('paperworking_changelog_last_visit');
            if (!lastVisitStr) {
              setUnreadChangelogCount(data.entries.length);
            } else {
              const lastVisitTime = parseInt(lastVisitStr, 10);
              const unread = data.entries.filter((entry: any) => {
                const entryTime = new Date(entry.date).getTime();
                return entryTime > lastVisitTime;
              });
              setUnreadChangelogCount(unread.length);
            }
          }
        }
      } catch (e) {
        console.error('Failed to load changelog metadata', e);
      }
    }

    fetchChangelogMeta();

    const handleRead = () => {
      setUnreadChangelogCount(0);
    };
    window.addEventListener('changelog_read', handleRead);
    return () => {
      window.removeEventListener('changelog_read', handleRead);
    };
  }, []);

  // Close whatsNew dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (whatsNewRef.current && !whatsNewRef.current.contains(e.target as Node)) {
        setShowWhatsNew(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const pageLabel = getPageLabel(pathname);

  const handleDemoGuard = (e: React.MouseEvent | React.FocusEvent, actionName: string) => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/demo')) {
      e.preventDefault();
      if (e.target && 'blur' in e.target) {
        (e.target as any).blur();
      }
      toast.error(`Demo Mode: Sign up to use ${actionName}.`, {
        id: 'demo-topbar-guard',
        style: { background: '#111', color: '#fff', border: '1px solid #333' }
      });
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Cmd+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header
      className="w-full flex-shrink-0 flex items-center justify-between z-40"
      style={{
        height: '64px',
        background: 'rgba(13,10,11,0.80)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.10)',
        boxShadow: '0 0 20px -5px rgba(69,73,85,0.10)',
        padding: '0 24px',
      }}
    >
      {/* Left: Mobile logo + Breadcrumb */}
      <div className="flex items-center gap-3">
        {/* Mobile: compact logo */}
        <div className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-primary-container)' }}>
          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1", color: '#0d0a0b' }}>dataset</span>
        </div>

        {/* Breadcrumb (desktop) */}
        <div className="hidden md:flex items-center gap-2">
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: 'rgba(253,255,252,0.35)' }}
          >
            Dashboard
          </span>
          <span
            className="material-symbols-outlined text-[14px]"
            style={{ color: 'rgba(253,255,252,0.2)' }}
          >
            chevron_right
          </span>
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: 'var(--color-on-surface)' }}
          >
            {pageLabel}
          </span>
        </div>
      </div>

      {/* Center: Search (desktop) */}
      <div className="flex-1 max-w-md mx-8 hidden md:block">
        <div className="relative">
          <span
            className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] transition-colors duration-200"
            style={{ color: searchFocused ? 'var(--color-primary)' : 'rgba(253,255,252,0.3)' }}
          >
            search
          </span>
          <input
            ref={searchRef}
            className="w-full py-2 pl-10 pr-16 text-sm rounded-lg transition-all duration-200 focus:outline-none"
            placeholder="Search portfolio..."
            type="text"
            onFocus={(e) => {
              if (typeof window !== 'undefined' && window.location.pathname.startsWith('/demo')) {
                handleDemoGuard(e, 'search');
              } else {
                setSearchFocused(true);
              }
            }}
            onBlur={() => setSearchFocused(false)}
            style={{
              background: searchFocused ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${searchFocused ? 'rgba(69, 73, 85,0.3)' : 'rgba(255,255,255,0.06)'}`,
              color: 'var(--color-on-surface)',
              boxShadow: searchFocused ? '0 0 0 3px rgba(69, 73, 85,0.08)' : 'none',
            }}
          />
          {/* Cmd+K hint */}
          <div
            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pointer-events-none"
          >
            <kbd
              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(253,255,252,0.3)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Create Project — primary persistent CTA */}
        <button
          onClick={(e) => {
            if (typeof window !== 'undefined' && window.location.pathname.startsWith('/demo')) {
              handleDemoGuard(e, 'project creation');
            } else {
              router.push('/dashboard/projects/new');
            }
          }}
          className="hidden md:flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 active:scale-95"
          style={{
            background: 'rgba(45,54,61,0.5)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(253,255,252,0.9)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(69,73,85,0.4)';
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(69,73,85,0.06)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.12)';
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(45,54,61,0.5)';
          }}
        >
          <span className="material-symbols-outlined text-[16px]" style={{ color: '#454955' }}>add</span>
          New Project
        </button>

        {/* Mobile search */}
        <button
          className="md:hidden p-2 rounded-lg transition-colors duration-200"
          style={{ color: 'rgba(255, 255, 255, 0.85)' }}
        >
          <span className="material-symbols-outlined text-[20px]">search</span>
        </button>

        {/* Notifications */}
        <button
          className="p-2 rounded-lg transition-all duration-200 relative group"
          style={{ color: 'rgba(255, 255, 255, 0.85)' }}
          onClick={(e) => {
            if (typeof window !== 'undefined' && window.location.pathname.startsWith('/demo')) {
              handleDemoGuard(e, 'notifications');
            } else {
              router.push('/dashboard/inbox');
            }
          }}
        >
          <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform duration-200">notifications</span>
          {mounted && unreadTotal > 0 && (
            <span
              className="absolute top-1 right-1 min-w-4 h-4 text-[9px] font-bold rounded-full flex items-center justify-center px-1"
              style={{
                background: 'var(--color-primary)',
                color: '#0d0a0b',
                boxShadow: '0 0 8px rgba(69, 73, 85,0.5)',
              }}
            >
              {unreadTotal > 9 ? '9+' : unreadTotal}
            </span>
          )}
        </button>

        {/* "What's New" Bell-adjacent Icon */}
        <div className="relative" ref={whatsNewRef}>
          <button
            className="p-2 rounded-lg transition-all duration-200 relative group"
            style={{ color: 'rgba(255, 255, 255, 0.85)' }}
            onClick={() => setShowWhatsNew(!showWhatsNew)}
            title="What's New"
          >
            <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform duration-200">campaign</span>
            {unreadChangelogCount > 0 && (
              <span
                className="absolute top-1 right-1 min-w-2.5 h-2.5 rounded-full flex items-center justify-center bg-emerald-400"
                style={{
                  boxShadow: '0 0 8px rgba(63, 125, 32,0.5)',
                }}
              />
            )}
          </button>

          {/* What's new dropdown */}
          {showWhatsNew && (
            <div
              className="absolute right-0 top-full mt-2 w-72 py-3 rounded-xl z-50 p-4"
              style={{
                background: 'rgba(13,10,11,0.95)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(24px)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
              }}
            >
              <h4 className="text-xs uppercase tracking-widest font-black text-white mb-3">What's New</h4>
              <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar mb-3">
                {changelogs.length === 0 ? (
                  <p className="text-xs text-[var(--pw-muted)]">No updates posted yet.</p>
                ) : (
                  changelogs.map((c) => (
                    <Link
                      key={c.version}
                      href="/changelog"
                      onClick={() => setShowWhatsNew(false)}
                      className="block group"
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-400/10 px-1 py-0.5 rounded">v{c.version}</span>
                        <span className="text-[9px] text-[var(--pw-muted)]">{c.date}</span>
                      </div>
                      <p className="text-xs text-white/80 group-hover:text-emerald-400 transition-colors font-medium line-clamp-1">{c.title}</p>
                    </Link>
                  ))
                )}
              </div>
              <div className="border-t border-white/10 pt-2 text-center">
                <Link
                  href="/changelog"
                  onClick={() => setShowWhatsNew(false)}
                  className="text-xs font-bold text-emerald-400 hover:underline"
                >
                  View Full Changelog
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Contextual Help */}
        <Link
          href={`/help/${getHelpSlug(pathname)}`}
          className="p-2 rounded-lg transition-colors duration-200"
          style={{ color: 'rgba(255, 255, 255, 0.85)' }}
          title="Contextual Help"
        >
          <span className="material-symbols-outlined text-[20px]">help_outline</span>
        </Link>

        {/* Divider */}
        <div className="h-6 w-px mx-1 hidden md:block" style={{ background: 'rgba(255,255,255,0.08)' }} />

        {/* User Avatar + Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl transition-all duration-200 group"
            style={{
              background: showUserMenu ? 'rgba(255,255,255,0.06)' : 'transparent',
            }}
          >
            {!mounted || (!user && !profile) ? (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary-container) 0%, var(--color-primary) 100%)',
                  color: '#0d0a0b',
                }}
              >
                U
              </div>
            ) : user?.photoURL ? (
              <img
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover transition-all duration-200 group-hover:ring-2"
                src={user.photoURL}
                style={{ borderColor: 'var(--color-primary)' }}
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-200 group-hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary-container) 0%, var(--color-primary) 100%)',
                  color: '#0d0a0b',
                }}
              >
                {profile?.displayName ? profile.displayName.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : "U")}
              </div>
            )}
            <div className="hidden lg:block text-left">
              <p className="text-xs font-semibold leading-tight" style={{ color: 'var(--color-on-surface)' }}>
                {mounted && (profile?.displayName || user?.displayName) ? (profile?.displayName || user?.displayName) : "User"}
              </p>
              <p
                className="text-[10px] uppercase tracking-widest leading-tight"
                style={{ color: 'var(--color-primary)' }}
              >
                {mounted && profile?.role ? profile.role : "Member"}
              </p>
            </div>
            <span
              className="material-symbols-outlined text-[16px] hidden lg:block transition-transform duration-200"
              style={{
                color: 'rgba(253,255,252,0.3)',
                transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            >
              keyboard_arrow_down
            </span>
          </button>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <div
              className="absolute right-0 top-full mt-2 w-56 py-2 rounded-xl z-50"
              style={{
                background: 'rgba(13,10,11,0.95)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(24px)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
              }}
            >
              <Link
                href="/dashboard/settings/profile"
                onClick={(e) => {
                  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/demo')) {
                    handleDemoGuard(e, 'profile settings');
                  } else {
                    setShowUserMenu(false);
                  }
                }}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-150"
                style={{ color: 'rgba(253,255,252,0.7)' }}
              >
                <span className="material-symbols-outlined text-[18px]">account_circle</span>
                <span className="text-sm font-medium">Profile</span>
              </Link>
              <Link
                href="/dashboard/settings/billing"
                onClick={(e) => {
                  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/demo')) {
                    handleDemoGuard(e, 'billing settings');
                  } else {
                    setShowUserMenu(false);
                  }
                }}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-150"
                style={{ color: 'rgba(253,255,252,0.7)' }}
              >
                <span className="material-symbols-outlined text-[18px]">payments</span>
                <span className="text-sm font-medium">Billing</span>
              </Link>
              <Link
                href="/dashboard/settings"
                onClick={(e) => {
                  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/demo')) {
                    handleDemoGuard(e, 'settings');
                  } else {
                    setShowUserMenu(false);
                  }
                }}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-150"
                style={{ color: 'rgba(253,255,252,0.7)' }}
              >
                <span className="material-symbols-outlined text-[18px]">settings</span>
                <span className="text-sm font-medium">Settings</span>
              </Link>
              <div className="mx-3 my-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
              <div className="px-4 py-1">
                <LogoutButton compact={false} className="w-full flex items-center gap-3 py-2 text-sm font-medium transition-colors duration-150" style={{ color: 'rgba(253,255,252,0.5)' }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
