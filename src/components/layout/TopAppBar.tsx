"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
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

const SEARCHABLE_VENDORS = [
  { id: 'v1', name: 'Prime Structural Engineering', category: 'Inspector', location: 'Miami, FL' },
  { id: 'v2', name: 'Capital Bridge Lending', category: 'Lender', location: 'New York, NY' },
  { id: 'v3', name: 'Coastal Title & Escrow', category: 'Attorney', location: 'Fort Lauderdale, FL' },
  { id: 'v4', name: 'ProBuild Contractors', category: 'Contractor', location: 'Brooklyn, NY' },
  { id: 'v5', name: 'Premier Property Group', category: 'Property Manager', location: 'Miami, FL' },
  { id: 'v6', name: 'NextGen Realty Partners', category: 'Agent', location: 'Newark, NJ' }
];

export function TopAppBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile } = useAuth();
  const { unreadTotal } = useNotification();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const projects = useProjectStore((s) => s.projects);

  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState([
    {
      id: "not-mention-1",
      type: "mention",
      title: "Sarah K. mentioned you",
      body: '"Can you check the rehab budget?" on 123 Main St',
      time: "2m ago",
      read: false,
      href: "/dashboard/projects",
    },
    {
      id: "not-doc-1",
      type: "document",
      title: "Document Uploaded",
      body: "'Executed Purchase Agreement' for 456 Oak Ave",
      time: "15m ago",
      read: false,
      href: "/dashboard/data-room",
    },
    {
      id: "not-team-1",
      type: "team_request",
      title: "Join Team Request",
      body: "John Doe requested to join your Team Workspace (InvestCo)",
      time: "1h ago",
      read: false,
      actionNeeded: true,
      senderName: "John Doe",
    }
  ]);

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

  // Close notifications dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
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

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return projects.filter(p => 
      (p.propertyName && p.propertyName.toLowerCase().includes(q)) ||
      (p.address && p.address.toLowerCase().includes(q))
    );
  }, [projects, searchQuery]);

  const filteredVendors = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return SEARCHABLE_VENDORS.filter(v => 
      v.name.toLowerCase().includes(q) ||
      v.category.toLowerCase().includes(q) ||
      v.location.toLowerCase().includes(q)
    );
  }, [searchQuery]);

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
      <div className="flex-1 max-w-md mx-8 hidden md:block" ref={searchContainerRef}>
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
            placeholder="Search portfolio, projects, vendors…"
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
          {/* Cmd+K hint */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pointer-events-none">
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
          </div>

          {/* Autocomplete dropdown */}
          {searchFocused && searchQuery.trim() !== "" && (
            <div
              className="absolute left-0 right-0 top-full mt-2 rounded-xl z-50 overflow-hidden"
              style={{
                background: isDark ? 'rgba(13,10,11,0.96)' : '#FFFFFF',
                border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(69,73,85,0.12)',
                backdropFilter: 'blur(24px)',
                boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.4)' : '0 10px 30px rgba(0,0,0,0.1)',
                maxHeight: '320px',
                overflowY: 'auto'
              }}
            >
              {/* Projects section */}
              {filteredProjects.length > 0 && (
                <div className="p-3 border-b border-solid" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(69,73,85,0.08)' }}>
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: isDark ? 'rgba(253,255,252,0.4)' : 'rgba(69,73,85,0.5)' }}>
                    Projects
                  </div>
                  <div className="space-y-1">
                    {filteredProjects.map(p => (
                      <Link
                        key={p.id}
                        href={`/dashboard/projects/${p.id}`}
                        onClick={() => {
                          setSearchFocused(false);
                          setSearchQuery("");
                        }}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold hover:bg-primary/10 transition-colors duration-150"
                        style={{ color: isDark ? '#FFF' : '#121317' }}
                      >
                        <span className="material-symbols-outlined text-[16px]" style={{ color: '#3279F9' }}>folder</span>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-left">{p.propertyName || p.address}</p>
                          <p className="text-[10px] truncate text-left" style={{ color: isDark ? 'rgba(253,255,252,0.4)' : 'rgba(69,73,85,0.5)' }}>
                            {p.address}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Vendors section */}
              {filteredVendors.length > 0 && (
                <div className="p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: isDark ? 'rgba(253,255,252,0.4)' : 'rgba(69,73,85,0.5)' }}>
                    Vendors & Professionals
                  </div>
                  <div className="space-y-1">
                    {filteredVendors.map(v => (
                      <Link
                        key={v.id}
                        href={`/dashboard/marketplace`}
                        onClick={() => {
                          setSearchFocused(false);
                          setSearchQuery("");
                        }}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold hover:bg-primary/10 transition-colors duration-150"
                        style={{ color: isDark ? '#FFF' : '#121317' }}
                      >
                        <span className="material-symbols-outlined text-[16px]" style={{ color: '#7A9EAA' }}>handyman</span>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-left">{v.name}</p>
                          <p className="text-[10px] truncate text-left" style={{ color: isDark ? 'rgba(253,255,252,0.4)' : 'rgba(69,73,85,0.5)' }}>
                            {v.category} · {v.location}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {filteredProjects.length === 0 && filteredVendors.length === 0 && (
                <div className="p-4 text-center text-xs" style={{ color: isDark ? 'rgba(253,255,252,0.4)' : 'rgba(69,73,85,0.5)' }}>
                  No projects or vendors match "{searchQuery}"
                </div>
              )}
            </div>
          )}
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
        <div className="relative" ref={notificationsRef}>
          <button
            className="p-2 rounded-lg transition-all duration-200 relative group"
            style={{ color: 'rgba(255, 255, 255, 0.85)' }}
            onClick={(e) => {
              if (typeof window !== 'undefined' && window.location.pathname.startsWith('/demo')) {
                handleDemoGuard(e, 'notifications');
              } else {
                setShowNotifications(!showNotifications);
              }
            }}
          >
            <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform duration-200">notifications</span>
            {mounted && notifications.filter(n => !n.read).length > 0 && (
              <span
                className="absolute top-1 right-1 min-w-4 h-4 text-[9px] font-bold rounded-full flex items-center justify-center px-1"
                style={{
                  background: 'var(--color-primary)',
                  color: '#0d0a0b',
                  boxShadow: '0 0 8px rgba(69, 73, 85,0.5)',
                }}
              >
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div
              className="absolute right-0 top-full mt-2 w-80 py-2 rounded-xl z-50 text-left"
              style={{
                background: isDark ? 'rgba(13,10,11,0.96)' : '#FFFFFF',
                border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(69,73,85,0.12)',
                backdropFilter: 'blur(24px)',
                boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.4)' : '0 10px 30px rgba(0,0,0,0.1)',
              }}
            >
              <div className="px-4 py-2 flex items-center justify-between border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(69,73,85,0.08)' }}>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: isDark ? 'rgba(253,255,252,0.6)' : 'rgba(69,73,85,0.7)' }}>
                  Notifications
                </span>
                <button
                  onClick={() => {
                    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                    toast.success("All notifications marked as read");
                  }}
                  className="text-[10px] font-semibold transition-opacity duration-150 hover:opacity-75"
                  style={{ color: '#3279F9' }}
                >
                  Mark all read
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto animate-fade-in">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs" style={{ color: isDark ? 'rgba(253,255,252,0.4)' : 'rgba(69,73,85,0.5)' }}>
                    No notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`flex flex-col gap-1.5 p-3.5 border-b transition-colors duration-150 ${n.read ? 'opacity-60' : ''}`}
                      style={{
                        borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(69,73,85,0.06)',
                        background: n.read ? 'transparent' : (isDark ? 'rgba(50, 121, 249, 0.03)' : 'rgba(50, 121, 249, 0.02)')
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <span
                            className="material-symbols-outlined text-[16px] mt-0.5"
                            style={{
                              color: n.type === 'mention' ? '#3279F9' : n.type === 'document' ? '#7A9EAA' : '#ffac5a'
                            }}
                          >
                            {n.type === 'mention' ? 'chat' : n.type === 'document' ? 'description' : 'group_add'}
                          </span>
                          <div className="flex-1">
                            <p className="text-xs font-bold leading-tight" style={{ color: isDark ? '#FFF' : '#121317' }}>
                              {n.title}
                            </p>
                            <p className="text-[11px] mt-0.5 leading-snug" style={{ color: isDark ? 'rgba(253,255,252,0.7)' : 'rgba(69,73,85,0.8)' }}>
                              {n.body}
                            </p>
                          </div>
                        </div>
                        <span className="text-[9px] shrink-0" style={{ color: isDark ? 'rgba(253,255,252,0.3)' : 'rgba(69,73,85,0.4)' }}>
                          {n.time}
                        </span>
                      </div>

                      {n.actionNeeded && (
                        <div className="flex items-center gap-2 pl-6 mt-1">
                          <button
                            onClick={() => {
                              toast.success(`Request accepted. ${n.senderName} has joined the workspace.`);
                              setNotifications(prev => prev.filter(item => item.id !== n.id));
                            }}
                            className="text-[10px] font-bold px-2.5 py-1 rounded bg-primary text-white hover:bg-primary/90 transition-colors cursor-pointer"
                            style={{ background: '#3279F9' }}
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => {
                              toast.success("Request declined.");
                              setNotifications(prev => prev.filter(item => item.id !== n.id));
                            }}
                            className="text-[10px] font-bold px-2.5 py-1 rounded border hover:bg-white/5 transition-colors cursor-pointer"
                            style={{
                              borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(69,73,85,0.2)',
                              color: isDark ? 'rgba(253,255,252,0.7)' : 'rgba(69,73,85,0.8)'
                            }}
                          >
                            Decline
                          </button>
                        </div>
                      )}

                      {!n.actionNeeded && n.href && (
                        <Link
                          href={n.href}
                          onClick={() => {
                            setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item));
                            setShowNotifications(false);
                          }}
                          className="text-[10px] font-semibold pl-6 self-start hover:underline text-left"
                          style={{ color: '#3279F9' }}
                        >
                          View details →
                        </Link>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

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
