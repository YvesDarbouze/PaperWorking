"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/lib/utils/ThemeProvider";
import Link from "next/link";
import LogoutButton from "@/components/dashboard/LogoutButton";
import toast from "react-hot-toast";
import { useProjectStore } from "@/store/projectStore";
import Logo from "@/components/brand/Logo";
import { SEEDED_VENDORS } from "@/lib/vendors/seededVendors";
import { SearchDropdown } from "@/components/search/SearchDropdown";
import type { SearchItem } from "@/lib/search/searchDropdown";

import { resolveMobileDrawerNav } from "@/lib/navigation/navContract";

/* ═══════════════════════════════════════════════════════════════
   TopAppBar — Premium dashboard header
   Features: breadcrumb, search with Cmd+K, notifications dropdown,
   theme toggle, mobile navigation drawer, user avatar dropdown
   ═══════════════════════════════════════════════════════════════ */


const ROUTE_LABELS: Record<string, string> = {
  "/dashboard": "Portfolio",
  "/dashboard/command-center": "Portfolio",
  "/dashboard/projects": "Projects",
  "/dashboard/deals": "Deals Marketplace",
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

export function TopAppBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    projects: any[];
    vendors: any[];
  }>({ projects: [], vendors: [] });

  const [searchQuery, setSearchQuery] = useState("");
  /** Debounced + 3-char-gated query, emitted by <SearchDropdown />. */
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchScope, setSearchScope] = useState<'deals' | 'vendors'>('deals');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const projects = useProjectStore((s) => s.projects);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Outside-click dismissal is handled inside <SearchDropdown />.



  const pageLabel = getPageLabel(pathname || '');

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

  // Cmd+K shortcut. `searchRef` is bound to the input inside <SearchDropdown />
  // via its `inputRef` passthrough — without that this silently no-ops.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      // Escape is handled by <SearchDropdown /> itself (closes + blurs).
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Search results fetched from the database. Debounce and the 3-character
  // trigger are owned by <SearchDropdown />, which feeds `debouncedSearch`.
  useEffect(() => {
    const searchQuery = debouncedSearch;
    if (!searchQuery.trim()) {
      setSearchResults(prev => {
        if (prev.projects.length === 0 && prev.vendors.length === 0) return prev;
        return { projects: [], vendors: [] };
      });
      setIsLoading(false);
      setIsError(false);
      return;
    }

    setIsLoading(true);
    setIsError(false);

    let cancelled = false;
    const run = async () => {
      try {
        const token = await user?.getIdToken();
        if (!token) {
          setIsLoading(false);
          return;
        }

        const headers: Record<string, string> = {
          'Authorization': `Bearer ${token}`
        };

        if (searchScope === 'deals') {
          const response = await fetch(`/api/projects?q=${encodeURIComponent(searchQuery)}`, { headers });
          if (!response.ok) throw new Error('Failed to fetch projects');
          const data = await response.json();
          if (data.success) {
            setSearchResults(prev => ({ ...prev, projects: data.projects || [] }));
          } else {
            throw new Error(data.error || 'Failed to fetch projects');
          }
        } else {
          let fetchedVendors: any[] = [];
          try {
            const response = await fetch(`/api/vendors`, { headers });
            if (response.ok) {
              const data = await response.json();
              if (data.success) {
                fetchedVendors = data.vendors || [];
              }
            }
          } catch (e) {
            // Ignore API fetch error and fall back to SEEDED_VENDORS
          }

          const q = searchQuery.toLowerCase();
          const combinedRaw = [...fetchedVendors, ...SEEDED_VENDORS];
          const mapById = new Map<string, any>();
          combinedRaw.forEach(v => {
            const vid = v.id || v.name;
            if (!mapById.has(vid)) {
              mapById.set(vid, {
                ...v,
                name: v.displayName || v.companyName || v.name || ''
              });
            }
          });

          const vendors = Array.from(mapById.values());
          const filtered = vendors.filter((v: any) =>
            (v.name && v.name.toLowerCase().includes(q)) ||
            (v.type && v.type.toLowerCase().includes(q)) ||
            (v.category && v.category.toLowerCase().includes(q)) ||
            (v.bio && v.bio.toLowerCase().includes(q)) ||
            (v.licensingStates && v.licensingStates.some((s: string) => s.toLowerCase().includes(q))) ||
            (v.serviceAreas && v.serviceAreas.some((a: string) => a.toLowerCase().includes(q))) ||
            (v.location && v.location.toLowerCase().includes(q))
          );
          setSearchResults(prev => ({ ...prev, vendors: filtered }));
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Search fetch error:', err);
        setIsError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void run();
    return () => { cancelled = true; };
  }, [debouncedSearch, searchScope, user?.uid]);

  const filteredProjects = searchResults.projects;
  const filteredVendors = searchResults.vendors;

  /** Minimal shapes the dropdown mappers rely on. The upstream fetch is
   *  loosely typed; these narrow it at the point of use. */
  type ProjectHit = { id: string | number; address?: string; propertyName?: string };
  type VendorHit  = { id?: string | number; name?: string; category?: string; location?: string };

  /** Active-scope results mapped into dropdown items. */
  const searchItems = useMemo<SearchItem[]>(() => {
    if (searchScope === 'deals') {
      return (filteredProjects as ProjectHit[]).map((p) => ({
        id: String(p.id),
        label: p.address || p.propertyName || 'Untitled project',
        sublabel:
          p.propertyName && p.propertyName !== p.address ? p.propertyName : undefined,
        group: 'projects' as const,
        href: `/dashboard/projects/${p.id}`,
      }));
    }
    return (filteredVendors as VendorHit[]).map((v) => ({
      id: String(v.id || v.name),
      label: v.name || 'Unnamed vendor',
      sublabel: [v.category, v.location].filter(Boolean).join(' · ') || undefined,
      group: 'vendors' as const,
      href: `/dashboard/marketplace/${v.id}`,
    }));
  }, [searchScope, filteredProjects, filteredVendors]);

  const handleSearchSelect = useCallback((item: SearchItem) => {
    setSearchQuery('');
    setDebouncedSearch('');
    if (item.href) router.push(item.href);
  }, [router]);

  const [showMobileDrawer, setShowMobileDrawer] = useState(false);

  const drawerNavItems = useMemo(() => {
    return resolveMobileDrawerNav({
      role: profile?.role,
      accountType: profile?.accountType,
      subscriptionPlan: profile?.subscriptionPlan,
    });
  }, [profile?.role, profile?.accountType, profile?.subscriptionPlan]);

  return (
    <>
    <header
      className="w-full flex-shrink-0 flex items-center justify-between z-40"
      style={{
        height: '64px',
        background: isDark
          ? 'rgba(18,16,20,0.88)'
          : 'rgba(253,255,252,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: isDark
          ? '1px solid rgba(255,255,255,0.08)'
          : '1px solid rgba(69,73,85,0.10)',
        boxShadow: isDark
          ? '0 1px 0 rgba(255,255,255,0.04)'
          : '0 1px 0 rgba(69,73,85,0.08)',
        padding: '0 24px',
      }}
    >
      {/* Left: Mobile hamburger + Mobile logo + Breadcrumb */}
      <div className="flex items-center gap-3">
        {/* Mobile: Hamburger drawer button */}
        <button
          type="button"
          onClick={() => setShowMobileDrawer(!showMobileDrawer)}
          className="md:hidden p-1.5 rounded-lg border border-white/10 text-on-surface hover:bg-white/5 transition-colors"
          aria-label="Toggle navigation drawer"
        >
          <span className="material-symbols-outlined text-[20px] block">menu</span>
        </button>

        {/* Mobile: compact logo */}
        <Logo surface="app-topbar" href="/dashboard/command-center" className="md:hidden" />

        {/* Breadcrumb (desktop) */}
        <div className="hidden md:flex items-center gap-2">
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: isDark ? 'rgba(253,255,252,0.35)' : 'rgba(69,73,85,0.45)' }}
          >
            Dashboard
          </span>
          <span
            className="material-symbols-outlined text-[14px]"
            style={{ color: isDark ? 'rgba(253,255,252,0.2)' : 'rgba(69,73,85,0.25)' }}
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

      {/* Center: Search (desktop) — shared <SearchDropdown /> */}
      <div className="flex-1 max-w-2xl mx-8 hidden md:block" ref={searchContainerRef}>
        {/* Scope toggle is INLINE with the field, not stacked above it: the
            header has a fixed height, and a second row overflowed it and
            overlapped the breadcrumb. Keeping it outside the panel still leaves
            the dropdown a pure result surface. */}
        <div className="relative flex items-center gap-2">
          <div
            className="flex p-0.5 rounded-lg shrink-0 h-11 items-center"
            style={{ background: '#111111', border: '1px solid #222222' }}
          >
            {(['deals', 'vendors'] as const).map((scope) => (
              <button
                key={scope}
                onClick={() => setSearchScope(scope)}
                data-testid={`search-scope-${scope}`}
                className="pw-interactive-custom px-3 h-9 rounded-md text-xs font-bold transition-colors duration-150 cursor-pointer text-center capitalize"
                style={{
                  background: searchScope === scope ? '#1f2937' : 'transparent',
                  color: searchScope === scope ? '#ffffff' : '#6b7280',
                }}
              >
                {scope}
              </button>
            ))}
          </div>

          <SearchDropdown
            className="flex-1 min-w-0"
            testId="global-search"
            inputRef={searchRef}
            query={searchQuery}
            onQueryChange={setSearchQuery}
            onDebouncedQueryChange={setDebouncedSearch}
            items={searchItems}
            loading={isLoading}
            errorMessage={isError ? 'Failed to retrieve search results.' : null}
            onSelect={handleSearchSelect}
            placeholder="Search deals by name or address..."
            recentKey="pw_recent_searches"
          />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Mobile search — the desktop field is `hidden md:block`, so below
            that width this button is the only way in. It previously had no
            onClick at all and did nothing. */}
        <button
          onClick={(e) => {
            if (typeof window !== 'undefined' && window.location.pathname.startsWith('/demo')) {
              handleDemoGuard(e, 'search');
              return;
            }
            setMobileSearchOpen(true);
          }}
          aria-label="Open search"
          data-testid="mobile-search-trigger"
          className="md:hidden p-2 rounded-lg transition-colors duration-200"
          style={{ color: 'rgba(255, 255, 255, 0.85)' }}
        >
          <span className="material-symbols-outlined text-[20px]">search</span>
        </button>

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
                href="/dashboard/team"
                onClick={(e) => {
                  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/demo')) {
                    handleDemoGuard(e, 'team management');
                  } else {
                    setShowUserMenu(false);
                  }
                }}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-150"
                style={{ color: 'rgba(253,255,252,0.7)' }}
              >
                <span className="material-symbols-outlined text-[18px]">group</span>
                <span className="text-sm font-medium">Team</span>
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

    {/* Mobile full-screen search (requirement 8). <SearchDropdown /> renders
        its own fixed overlay with a close button once focused, so this only
        needs to mount it and clear state on dismiss. No backdrop blur — the
        panel is opaque so there is no background clutter behind it. */}
    {mobileSearchOpen && (
      <div className="md:hidden" data-testid="mobile-search-overlay">
        {/* Distinct testId: the desktop instance stays mounted (hidden by CSS)
            at this width, so a shared id would match two nodes. */}
        <SearchDropdown
          testId="mobile-search"
          query={searchQuery}
          onQueryChange={setSearchQuery}
          onDebouncedQueryChange={setDebouncedSearch}
          items={searchItems}
          loading={isLoading}
          errorMessage={isError ? 'Failed to retrieve search results.' : null}
          onSelect={(item) => { setMobileSearchOpen(false); handleSearchSelect(item); }}
          placeholder="Search deals by name or address..."
          recentKey="pw_recent_searches"
          autoFocus
          onRequestClose={() => setMobileSearchOpen(false)}
        />
      </div>
    )}

    {/* Mobile Slide-Out Drawer Overlay (NAV-01 / NAV-02 / NAV-03) */}
    {showMobileDrawer && (
      <div className="md:hidden fixed inset-0 z-[100] flex">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowMobileDrawer(false)}
        />

        {/* Drawer Panel */}
        <div
          className="relative w-4/5 max-w-xs h-full flex flex-col p-5 space-y-6 z-10 shadow-2xl overflow-y-auto"
          style={{
            background: isDark ? 'rgba(18,16,20,0.98)' : '#FDFFFC',
            borderRight: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-outline/10">
            <Logo surface="app-sidebar" href="/dashboard/command-center" />
            <button
              type="button"
              onClick={() => setShowMobileDrawer(false)}
              className="p-1 rounded-lg hover:bg-surface-variant text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Drawer Items */}
          <div className="space-y-1 flex-1">
            <div className="px-2 py-1 text-label-sm font-bold uppercase tracking-wider text-outline">
              Secondary Navigation
            </div>
            {drawerNavItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                onClick={(e) => {
                  if (item.isLocked) {
                    e.preventDefault();
                    toast.error("Deals Marketplace requires an active subscription.", { id: "deals-locked-drawer" });
                    router.push("/dashboard/settings/billing?paywall=deals");
                    setShowMobileDrawer(false);
                    return;
                  }
                  setShowMobileDrawer(false);
                }}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-on-surface hover:bg-surface-variant/40 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span className="text-sm font-medium flex-1">{item.label}</span>
                {item.isLocked && (
                  <span className="material-symbols-outlined text-[16px] text-amber-500">lock</span>
                )}
              </Link>
            ))}
          </div>

          {/* Footer User Info */}
          <div className="pt-4 border-t border-outline/10">
            <LogoutButton compact={false} className="w-full flex items-center gap-2 py-2 text-sm text-outline hover:text-on-surface" />
          </div>
        </div>
      </div>
    )}
    </>
  );
}
