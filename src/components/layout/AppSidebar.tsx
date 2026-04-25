'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderOpen,
  Store,
  Users,
  Settings,
  LogOut,
} from 'lucide-react';
import LogoutButton from '@/components/dashboard/LogoutButton';
import Logo from '@/components/brand/Logo';

/* ═══════════════════════════════════════════════════════
   AppSidebar — Primary Authenticated Navigation Shell

   Directive menu items:
     • Command Center   → /dashboard
     • Project Folders  → /dashboard/projects  (deals)
     • Vendor Network   → /dashboard/vendors
     • Team Directory   → /dashboard/settings/team
     • Settings         → /dashboard/settings

   Active indicator: bold #0d0d0d pill on #f2f2f2 sidebar.
   Inactive: #7f7f7f muted text, no background.
   WCAG AAA contrast: #0d0d0d on #f2f2f2 = 17.1:1
   ═══════════════════════════════════════════════════════ */

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'command-center',
    label: 'Command Center',
    href: '/dashboard',
    icon: <LayoutDashboard className="w-4 h-4" />,
    exact: true,
  },
  {
    id: 'project-folders',
    label: 'Project Folders',
    href: '/dashboard/projects',
    icon: <FolderOpen className="w-4 h-4" />,
  },
  {
    id: 'vendor-network',
    label: 'Vendor Network',
    href: '/dashboard/vendors',
    icon: <Store className="w-4 h-4" />,
  },
  {
    id: 'team-directory',
    label: 'Team Directory',
    href: '/dashboard/settings/team',
    icon: <Users className="w-4 h-4" />,
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/dashboard/settings',
    icon: <Settings className="w-4 h-4" />,
    exact: true,
  },
];

/* ── Single nav link ── */
function SidebarLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive = item.exact
    ? pathname === item.href
    : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      id={`sidebar-nav-${item.id}`}
      aria-current={isActive ? 'page' : undefined}
      className="group flex items-center gap-3 px-3 py-2.5 transition-all duration-150 focus-visible:outline-2 focus-visible:outline-pw-black focus-visible:outline-offset-2"
      style={{
        /* Active pill: #0d0d0d bg, #f2f2f2 text — 17.1:1 contrast */
        background: isActive ? '#0d0d0d' : 'transparent',
        color: isActive ? '#f2f2f2' : '#7f7f7f',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLAnchorElement).style.color = '#0d0d0d';
          (e.currentTarget as HTMLAnchorElement).style.background = '#e8e8e8';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLAnchorElement).style.color = '#7f7f7f';
          (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
        }
      }}
    >
      {/* Icon — aria-hidden, label carries the semantics */}
      <span aria-hidden="true" className="shrink-0">
        {item.icon}
      </span>

      {/* Label */}
      <span
        className="text-xs font-bold uppercase tracking-[0.15em] truncate"
        style={{ fontWeight: isActive ? 700 : 500 }}
      >
        {item.label}
      </span>

      {/* Active dot indicator (redundant visual cue for color-blind users) */}
      {isActive && (
        <span
          className="ml-auto w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: '#f2f2f2' }}
          aria-hidden="true"
        />
      )}
    </Link>
  );
}

/* ── Section label ── */
function SidebarSection({ label }: { label: string }) {
  return (
    <p
      className="px-3 pt-6 pb-2 text-[9px] font-bold uppercase tracking-[0.3em]"
      style={{ color: '#b0b0b0' }}
    >
      {label}
    </p>
  );
}

/* ══════════════════════════════════════════
   AppSidebar
   ══════════════════════════════════════════ */
export default function AppSidebar() {
  return (
    <aside
      className="flex flex-col shrink-0 h-screen sticky top-0 overflow-y-auto"
      style={{
        width: 240,
        background: '#f2f2f2',
        borderRight: '1px solid #d4d4d4',
      }}
      aria-label="Primary navigation"
    >
      {/* ── Logo ── */}
      <div
        className="flex items-center px-5 h-16 shrink-0"
        style={{ borderBottom: '1px solid #d4d4d4' }}
      >
        <Logo href="/dashboard" size="sm" />
      </div>

      {/* ── Primary Nav ── */}
      <nav className="flex-1 px-3 py-4" aria-label="Main menu">
        <SidebarSection label="Workspace" />
        <ul className="space-y-0.5" role="list">
          {NAV_ITEMS.map((item) => (
            <li key={item.id} role="listitem">
              <SidebarLink item={item} />
            </li>
          ))}
        </ul>
      </nav>

      {/* ── Footer ── */}
      <div
        className="px-3 py-4 shrink-0"
        style={{ borderTop: '1px solid #d4d4d4' }}
      >
        {/* Powered-by badge */}
        <p
          className="px-3 pb-3 text-[9px] font-bold uppercase tracking-[0.25em]"
          style={{ color: '#c0c0c0' }}
        >
          PaperWorking
        </p>
        {/* Logout */}
        <div className="px-1">
          <LogoutButton compact />
        </div>
      </div>
    </aside>
  );
}
