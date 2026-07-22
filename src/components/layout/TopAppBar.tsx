"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/lib/utils/ThemeProvider";
import Link from "next/link";
import LogoutButton from "@/components/dashboard/LogoutButton";
import toast from "react-hot-toast";
import { useProjectStore } from "@/store/projectStore";
import Logo from "@/components/brand/Logo";

/* ═══════════════════════════════════════════════════════════════
   TopAppBar — Premium dashboard header
   Features: breadcrumb, search with Cmd+K, notifications dropdown,
   theme toggle, user avatar dropdown
   ═══════════════════════════════════════════════════════════════ */

const PHASE_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  'Phase 1: Find & Fund':       { bg: 'rgba(89,89,89,0.12)',  text: '#808080' },
  'Phase 2: Acquisition':       { bg: 'rgba(37,99,235,0.10)', text: '#2563EB' },
  'Phase 3: Holding & Rehab':   { bg: 'rgba(234,88,12,0.10)', text: '#EA580C' },
  'Phase 4: Closing & Exit':    { bg: 'rgba(63, 125, 32,0.10)', text: '#3f7d20' },
  // v2 equivalents
  'Phase 1: Acquisition':       { bg: 'rgba(89,89,89,0.12)',  text: '#808080' },
  'Phase 2: Transaction':       { bg: 'rgba(37,99,235,0.10)', text: '#2563EB' },
  'Phase 3: Rehab':             { bg: 'rgba(234,88,12,0.10)', text: '#EA580C' },
  'Phase 4: Hold / Exit':       { bg: 'rgba(63, 125, 32,0.10)', text: '#3f7d20' },
  // v3 equivalents
  'Phase 2: Fund':              { bg: 'rgba(37,99,235,0.10)', text: '#2563EB' },
  'Phase 3: Hold':              { bg: 'rgba(234,88,12,0.10)', text: '#EA580C' },
  'Phase 4: Exit':              { bg: 'rgba(63, 125, 32,0.10)', text: '#3f7d20' },
};

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

export function TopAppBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    projects: any[];
    vendors: any[];
  }>({ projects: [], vendors: [] });

  const [searchQuery, setSearchQuery] = useState("");
  const [searchScope, setSearchScope] = useState<'deals' | 'vendors'>('deals');
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const projects = useProjectStore((s) => s.projects);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Reset activeIndex when query or scope changes
  useEffect(() => {
    setActiveIndex(-1);
  }, [searchQuery, searchScope]);



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
      } else if (e.key === "Escape") {
        setSearchFocused(false);
        searchRef.current?.blur();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Debounced search results fetched dynamically from the database
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ projects: [], vendors: [] });
      setIsLoading(false);
      setIsError(false);
      return;
    }

    setIsLoading(true);
    setIsError(false);

    const delayDebounceFn = setTimeout(async () => {
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
          const response = await fetch(`/api/vendors`, { headers });
          if (!response.ok) throw new Error('Failed to fetch vendors');
          const data = await response.json();
          if (data.success) {
            const q = searchQuery.toLowerCase();
            const vendors = (data.vendors || []).map((v: any) => ({
              ...v,
              name: v.displayName || v.companyName || v.name || ''
            }));
            const filtered = vendors.filter((v: any) =>
              (v.name && v.name.toLowerCase().includes(q)) ||
              (v.type && v.type.toLowerCase().includes(q)) ||
              (v.category && v.category.toLowerCase().includes(q)) ||
              (v.licensingStates && v.licensingStates.some((s: string) => s.toLowerCase().includes(q))) ||
              (v.serviceAreas && v.serviceAreas.some((a: string) => a.toLowerCase().includes(q))) ||
              (v.location && v.location.toLowerCase().includes(q))
            );
            setSearchResults(prev => ({ ...prev, vendors: filtered }));
          } else {
            throw new Error(data.error || 'Failed to fetch vendors');
          }
        }
      } catch (err) {
        console.error('Search fetch error:', err);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, searchScope, user]);

  const filteredProjects = searchResults.projects;
  const filteredVendors = searchResults.vendors;

  return (
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
      {/* Left: Mobile logo + Breadcrumb */}
      <div className="flex items-center gap-3">
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

      {/* Center: Search (desktop) */}
      <div className="flex-1 max-w-2xl mx-8 hidden md:block" ref={searchContainerRef}>
        <div className="relative">
          <span
            className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] transition-colors duration-200"
            style={{ color: searchFocused ? 'var(--color-primary)' : isDark ? 'rgba(253,255,252,0.3)' : 'rgba(69,73,85,0.4)' }}
          >
            search
          </span>
          <input
            ref={searchRef}
            className="w-full py-2 pl-10 pr-16 text-sm rounded-lg transition-all duration-200 focus:outline-none"
            placeholder={searchScope === 'deals' ? "Search deals by name or address..." : "Search vendors by name, category, or location..."}
            type="text"
            onFocus={(e) => {
              if (typeof window !== 'undefined' && window.location.pathname.startsWith('/demo')) {
                handleDemoGuard(e, 'search');
              } else {
                setSearchFocused(true);
              }
            }}
            onChange={(e) => setSearchQuery(e.target.value)}
            value={searchQuery}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setSearchFocused(false);
                searchRef.current?.blur();
                return;
              }
              const isDeals = searchScope === 'deals';
              const items = isDeals ? filteredProjects : filteredVendors;
              const total = items.length;
              if (total > 0) {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setActiveIndex(prev => (prev < total - 1 ? prev + 1 : 0));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActiveIndex(prev => (prev > 0 ? prev - 1 : total - 1));
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  if (activeIndex >= 0 && activeIndex < total) {
                    const selectedItem = items[activeIndex];
                    if (isDeals) {
                      router.push(`/dashboard/projects/${selectedItem.id}`);
                    } else {
                      router.push(`/dashboard/marketplace/${selectedItem.id}`);
                    }
                    setSearchFocused(false);
                    setSearchQuery("");
                    setActiveIndex(-1);
                  }
                }
              }
            }}
            style={{
              background: isDark
                ? (searchFocused ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)')
                : (searchFocused ? 'rgba(69,73,85,0.06)'    : 'rgba(69,73,85,0.04)'),
              border: `1px solid ${searchFocused
                ? 'rgba(69,73,85,0.35)'
                : isDark ? 'rgba(255,255,255,0.07)' : 'rgba(69,73,85,0.12)'}`,
              color: 'var(--color-on-surface)',
              boxShadow: searchFocused ? '0 0 0 3px rgba(69,73,85,0.08)' : 'none',
            }}
          />
          {/* Cmd+K hint or Spinner */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pointer-events-none">
            {isLoading ? (
              <div 
                className="w-4 h-4 rounded-full border-2 border-solid animate-spin" 
                style={{ 
                  borderTopColor: 'transparent',
                  borderColor: isDark ? 'rgba(255,255,255,0.4) rgba(255,255,255,0.15) rgba(255,255,255,0.15)' : 'rgba(98, 124, 133, 0.6) rgba(98, 124, 133, 0.15) rgba(98, 124, 133, 0.15)' 
                }}
              />
            ) : (
              <kbd
                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(69,73,85,0.07)',
                  color: isDark ? 'rgba(253,255,252,0.3)' : 'rgba(69,73,85,0.4)',
                  border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(69,73,85,0.12)',
                }}
              >
                ⌘K
              </kbd>
            )}
          </div>

          {/* Autocomplete dropdown */}
          {searchFocused && (
            <div
              id="search-results-dropdown"
              className="absolute left-0 right-0 top-full mt-2 rounded-xl z-50 overflow-hidden"
              style={{
                background: isDark ? 'rgba(13,10,11,0.96)' : '#FFFFFF',
                border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(69,73,85,0.12)',
                backdropFilter: 'blur(24px)',
                boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.4)' : '0 10px 30px rgba(0,0,0,0.1)',
                maxHeight: '340px',
                overflowY: 'auto'
              }}
            >
              {/* Scope Segmented Control */}
              <div className="p-2.5 border-b border-solid" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(69,73,85,0.08)' }}>
                <div className="flex p-0.5 rounded-lg bg-black/5 dark:bg-white/5 relative">
                  <button
                    onClick={() => setSearchScope('deals')}
                    className="flex-1 py-1.5 rounded-md text-xs font-bold transition-all duration-150 relative z-10 cursor-pointer text-center"
                    style={{
                      background: searchScope === 'deals' ? '#627C85' : 'transparent',
                      color: searchScope === 'deals' ? '#FFFFFF' : (isDark ? 'rgba(253,255,252,0.5)' : 'rgba(69,73,85,0.6)'),
                      boxShadow: searchScope === 'deals' ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                    }}
                  >
                    Deals
                  </button>
                  <button
                    onClick={() => setSearchScope('vendors')}
                    className="flex-1 py-1.5 rounded-md text-xs font-bold transition-all duration-150 relative z-10 cursor-pointer text-center"
                    style={{
                      background: searchScope === 'vendors' ? '#627C85' : 'transparent',
                      color: searchScope === 'vendors' ? '#FFFFFF' : (isDark ? 'rgba(253,255,252,0.5)' : 'rgba(69,73,85,0.6)'),
                      boxShadow: searchScope === 'vendors' ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                    }}
                  >
                    Vendors
                  </button>
                </div>
              </div>

              {/* Scoped Content */}
              {isLoading ? (
                <div className="p-8 text-center text-xs flex flex-col items-center gap-2">
                  <div 
                    className="w-5 h-5 rounded-full border-2 border-solid animate-spin" 
                    style={{ 
                      borderTopColor: 'transparent',
                      borderColor: '#627C85 rgba(98, 124, 133, 0.2) rgba(98, 124, 133, 0.2)' 
                    }}
                  />
                  <span style={{ color: isDark ? 'rgba(253,255,252,0.4)' : 'rgba(69,73,85,0.5)' }}>
                    Searching...
                  </span>
                </div>
              ) : isError ? (
                <div className="p-8 text-center text-xs flex flex-col items-center gap-2 text-red-500">
                  <span className="material-symbols-outlined text-[24px]">error</span>
                  <span>Failed to retrieve search results.</span>
                </div>
              ) : searchScope === 'deals' ? (
                <>
                  {searchQuery.trim() === "" ? (
                    <div className="p-5 text-center text-xs" style={{ color: isDark ? 'rgba(253,255,252,0.4)' : 'rgba(69,73,85,0.5)' }}>
                      <span className="material-symbols-outlined text-[20px] mb-1.5 block opacity-50">search</span>
                      Type to search deal name or address
                    </div>
                  ) : filteredProjects.length > 0 ? (
                    <div className="p-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: isDark ? 'rgba(253,255,252,0.4)' : 'rgba(69,73,85,0.5)' }}>
                        Deals & Projects ({filteredProjects.length})
                      </div>
                      <div className="space-y-1">
                        {filteredProjects.map((p, index) => {
                          const phaseColor = PHASE_BADGE_COLORS[p.phaseStatus ?? ''] ?? PHASE_BADGE_COLORS['Phase 1: Find & Fund'];
                          const isActive = index === activeIndex;
                          return (
                            <Link
                              key={p.id}
                              href={`/dashboard/projects/${p.id}`}
                              onClick={() => {
                                setSearchFocused(false);
                                setSearchQuery("");
                                setActiveIndex(-1);
                              }}
                              onMouseEnter={() => setActiveIndex(index)}
                              onMouseLeave={() => setActiveIndex(-1)}
                              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors duration-150"
                              style={{
                                color: isDark ? '#FFF' : '#121317',
                                background: isActive
                                  ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(69,73,85,0.06)')
                                  : 'transparent'
                              }}
                            >
                              <span className="material-symbols-outlined text-[16px]" style={{ color: '#627C85' }}>folder</span>
                              <div className="flex-1 min-w-0 text-left flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="truncate font-semibold">{p.address || p.propertyName}</p>
                                  {p.propertyName && p.propertyName !== p.address && (
                                    <p className="text-[10px] truncate" style={{ color: isDark ? 'rgba(253,255,252,0.4)' : 'rgba(69,73,85,0.5)' }}>
                                      {p.propertyName}
                                    </p>
                                  )}
                                </div>
                                <span
                                  className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider whitespace-nowrap"
                                  style={{
                                    background: phaseColor.bg,
                                    color: phaseColor.text
                                  }}
                                >
                                  {p.phaseStatus || `Phase ${p.currentPhase || 1}`}
                                </span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-[22px] opacity-40" style={{ color: isDark ? 'rgba(253,255,252,0.3)' : 'rgba(69,73,85,0.4)' }}>search_off</span>
                      <span style={{ color: isDark ? 'rgba(253,255,252,0.4)' : 'rgba(69,73,85,0.5)' }}>
                        No deals match "{searchQuery}"
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSearchScope('vendors');
                        }}
                        className="mt-1 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all duration-150 active:scale-95 cursor-pointer"
                        style={{
                          background: 'rgba(98, 124, 133, 0.1)',
                          color: '#627C85',
                          border: '1px solid rgba(98, 124, 133, 0.2)'
                        }}
                      >
                        Search in Vendors instead
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {searchQuery.trim() === "" ? (
                    <div className="p-5 text-center text-xs" style={{ color: isDark ? 'rgba(253,255,252,0.4)' : 'rgba(69,73,85,0.5)' }}>
                      <span className="material-symbols-outlined text-[20px] mb-1.5 block opacity-50">search</span>
                      Type to search vendors by name, category, or location
                    </div>
                  ) : filteredVendors.length > 0 ? (
                    <div className="p-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: isDark ? 'rgba(253,255,252,0.4)' : 'rgba(69,73,85,0.5)' }}>
                        Vendors & Professionals ({filteredVendors.length})
                      </div>
                      <div className="space-y-1">
                        {filteredVendors.map((v, index) => {
                          const isActive = index === activeIndex;
                          return (
                            <Link
                              key={v.id}
                              href={`/dashboard/marketplace/${v.id}`}
                              onClick={() => {
                                setSearchFocused(false);
                                setSearchQuery("");
                                setActiveIndex(-1);
                              }}
                              onMouseEnter={() => setActiveIndex(index)}
                              onMouseLeave={() => setActiveIndex(-1)}
                              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors duration-150"
                              style={{
                                color: isDark ? '#FFF' : '#121317',
                                background: isActive
                                  ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(69,73,85,0.06)')
                                  : 'transparent'
                              }}
                            >
                              <span className="material-symbols-outlined text-[16px]" style={{ color: '#7A9EAA' }}>handyman</span>
                              <div className="flex-1 min-w-0 text-left">
                                <p className="truncate font-semibold">{v.name}</p>
                                <p className="text-[10px] truncate" style={{ color: isDark ? 'rgba(253,255,252,0.4)' : 'rgba(69,73,85,0.5)' }}>
                                  {v.category} · {v.location}
                                </p>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-[22px] opacity-40" style={{ color: isDark ? 'rgba(253,255,252,0.3)' : 'rgba(69,73,85,0.4)' }}>search_off</span>
                      <span style={{ color: isDark ? 'rgba(253,255,252,0.4)' : 'rgba(69,73,85,0.5)' }}>
                        No vendors match "{searchQuery}"
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSearchScope('deals');
                        }}
                        className="mt-1 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all duration-150 active:scale-95 cursor-pointer"
                        style={{
                          background: 'rgba(98, 124, 133, 0.1)',
                          color: '#627C85',
                          border: '1px solid rgba(98, 124, 133, 0.2)'
                        }}
                      >
                        Search in Deals instead
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Mobile search */}
        <button
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
