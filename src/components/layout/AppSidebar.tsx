'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderOpen,
  Database,
  Mail,
  Users,
  UserCircle,
  CreditCard,
  Settings,
} from 'lucide-react';
import LogoutButton from '@/components/dashboard/LogoutButton';
import Logo from '@/components/brand/Logo';

/* ═══════════════════════════════════════════════════════
   AppSidebar — Primary Authenticated Navigation Shell

   Route Map:
     WORKSPACE
     • Command Center   → /dashboard
     • Project Folders   → /dashboard/projects
     • Data Hub          → /dashboard/data
     • Inbox             → /dashboard/inbox
     • Team Directory    → /dashboard/team

     ACCOUNT
     • Profile           → /dashboard/profile
     • Account & Billing → /dashboard/account
     • Settings          → /dashboard/settings

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

/* ─── Workspace Group ─── */
const WORKSPACE_ITEMS: NavItem[] = [
  {
    id: 'command-center',
    label: 'Command Center',
    href: '/dashboard',
    icon: <LayoutDashboard className="w-4 h-4" />,
    exact: true,
  },
  {
    id: 'projects',
    label: 'Projects',
    href: '/dashboard/projects',
    icon: <FolderOpen className="w-4 h-4" />,
  },
  {
    id: 'data-hub',
    label: 'Data Hub',
    href: '/dashboard/data',
    icon: <Database className="w-4 h-4" />,
  },
  {
    id: 'inbox',
    label: 'Inbox',
    href: '/dashboard/inbox',
    icon: <Mail className="w-4 h-4" />,
  },
  {
    id: 'team',
    label: 'Team',
    href: '/dashboard/team',
    icon: <Users className="w-4 h-4" />,
  },
];

/* ─── Account Group ─── */
const ACCOUNT_ITEMS: NavItem[] = [
  {
    id: 'profile',
    label: 'Profile',
    href: '/dashboard/profile',
    icon: <UserCircle className="w-4 h-4" />,
  },
  {
    id: 'account',
    label: 'Account & Billing',
    href: '/dashboard/account',
    icon: <CreditCard className="w-4 h-4" />,
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
        color: isActive ? 'var(--bg-canvas)' : 'var(--text-secondary)',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)';
          (e.currentTarget as HTMLAnchorElement).style.background = '#e8e8e8';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-secondary)';
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
          style={{ background: 'var(--bg-canvas)' }}
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
      style={{ color: 'var(--border-ui)' }}
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
        background: 'var(--bg-canvas)',
        borderRight: '1px solid var(--border-ui)',
      }}
      aria-label="Primary navigation"
    >
      {/* ── Logo ── */}
      <div
        className="flex items-center px-5 h-16 shrink-0"
        style={{ borderBottom: '1px solid var(--border-ui)' }}
      >
        <Logo href="/dashboard" size="sm" />
      </div>

      {/* ── Primary Nav ── */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto" aria-label="Main menu">
        <SidebarSection label="Workspace" />
        <ul className="space-y-0.5" role="list">
          {WORKSPACE_ITEMS.map((item) => (
            <li key={item.id} role="listitem">
              <SidebarLink item={item} />
            </li>
          ))}
        </ul>

        <SidebarSection label="Account" />
        <ul className="space-y-0.5" role="list">
          {ACCOUNT_ITEMS.map((item) => (
            <li key={item.id} role="listitem">
              <SidebarLink item={item} />
            </li>
          ))}
        </ul>
      </nav>

      {/* ── Footer ── */}
      <div
        className="px-3 py-4 shrink-0"
        style={{ borderTop: '1px solid var(--border-ui)' }}
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
