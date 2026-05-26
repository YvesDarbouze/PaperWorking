'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useNotification } from '@/context/NotificationContext';
import {
  LayoutDashboard,
  FolderOpen,
  Store,
  Database,
  Mail,
  Users,
  UserCircle,
  CreditCard,
  Settings,
  BarChart3,
  Plus,
} from 'lucide-react';
import LogoutButton from '@/components/dashboard/LogoutButton';
import Logo from '@/components/brand/Logo';
import WorkspaceSwitcher from '@/components/workspace/WorkspaceSwitcher';

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
     • Profile           → /dashboard/settings/profile
     • Account & Billing → /dashboard/settings/billing
     • Settings          → /dashboard/settings

   Active indicator: bold text-primary with transparent white backdrop and active indicator.
   Inactive: text-on-surface-variant, hover:bg-white/5.
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
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="w-4 h-4" strokeWidth={1.5} />,
    exact: true,
  },
  {
    id: 'projects',
    label: 'Deals',
    href: '/dashboard/projects',
    icon: <FolderOpen className="w-4 h-4" strokeWidth={1.5} />,
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    href: '/dashboard/marketplace',
    icon: <Store className="w-4 h-4" strokeWidth={1.5} />,
  },
  {
    id: 'data-hub',
    label: 'Market Data',
    href: '/dashboard/data',
    icon: <Database className="w-4 h-4" strokeWidth={1.5} />,
  },
  {
    id: 'reports',
    label: 'Reports',
    href: '/dashboard/reports',
    icon: <BarChart3 className="w-4 h-4" strokeWidth={1.5} />,
  },
  {
    id: 'inbox',
    label: 'Inbox',
    href: '/dashboard/inbox',
    icon: <Mail className="w-4 h-4" strokeWidth={1.5} />,
  },
  {
    id: 'team',
    label: 'Team',
    href: '/dashboard/team',
    icon: <Users className="w-4 h-4" strokeWidth={1.5} />,
  },
];

/* ─── Account Group ─── */
const ACCOUNT_ITEMS: NavItem[] = [
  {
    id: 'profile',
    label: 'Profile',
    href: '/dashboard/settings/profile',
    icon: <UserCircle className="w-4 h-4" strokeWidth={1.5} />,
  },
  {
    id: 'account',
    label: 'Billing',
    href: '/dashboard/settings/billing',
    icon: <CreditCard className="w-4 h-4" strokeWidth={1.5} />,
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/dashboard/settings',
    icon: <Settings className="w-4 h-4" strokeWidth={1.5} />,
    exact: true,
  },
];

/* ── Single nav link ── */
function SidebarLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const { unreadTotal } = useNotification();
  const isActive = item.exact
    ? pathname === item.href
    : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      id={`sidebar-nav-${item.id}`}
      aria-current={isActive ? 'page' : undefined}
      className={`group flex items-center gap-3 px-4 py-2.5 rounded-none transition-all duration-200 active:scale-95 border ${
        isActive
          ? 'text-primary font-bold bg-white/5 border-primary/20'
          : 'text-on-surface-variant border-transparent hover:text-on-surface hover:bg-white/5'
      }`}
    >
      {/* Icon — aria-hidden, label carries the semantics */}
      <span aria-hidden="true" className="shrink-0">
        {item.icon}
      </span>

      {/* Label */}
      <span className="text-xs font-bold uppercase tracking-wider truncate">
        {item.label}
      </span>

      {/* Unread badge for Inbox */}
      {item.id === 'inbox' && unreadTotal > 0 && (
        <span
          className={`flex items-center justify-center min-w-5 h-5 px-1.5 rounded-none text-xs font-bold transition-colors duration-150 ${
            isActive ? 'ml-auto mr-2' : 'ml-auto'
          } ${
            isActive
              ? 'bg-primary text-on-primary'
              : 'bg-surface-container-highest text-on-surface'
          }`}
          aria-label={`${unreadTotal} unread messages`}
        >
          {unreadTotal > 9 ? '9+' : unreadTotal}
        </span>
      )}

      {/* Active dot indicator (redundant visual cue for color-blind users) */}
      {isActive && (
        <span
          className="ml-auto w-1.5 h-1.5 rounded-full shrink-0 bg-primary"
          aria-hidden="true"
        />
      )}
    </Link>
  );
}

/* ── Section label ── */
function SidebarSection({ label }: { label: string }) {
  return (
    <p className="px-4 pt-6 pb-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant/40">
      {label}
    </p>
  );
}

/* ══════════════════════════════════════════
   AppSidebar
   ══════════════════════════════════════════ */
export default function AppSidebar() {
  const router = useRouter();

  return (
    <aside
      className="flex flex-col shrink-0 h-screen sticky top-0 overflow-y-auto w-64 bg-surface-container/60 backdrop-blur-xl border-r border-black/10 dark:border-white/10"
      aria-label="Primary navigation"
    >
      {/* ── Logo ── */}
      <div className="flex items-center px-5 h-16 shrink-0 border-b border-black/10 dark:border-white/10">
        <Logo href="/dashboard" size="sm" />
      </div>

      <WorkspaceSwitcher />

      {/* ── Primary Nav ── */}
      <nav className="flex-1 px-5 py-4 overflow-y-auto" aria-label="Main menu">
        <SidebarSection label="Workspace" />
        <ul className="space-y-1" role="list">
          {WORKSPACE_ITEMS.map((item) => (
            <li key={item.id} role="listitem">
              <SidebarLink item={item} />
            </li>
          ))}
        </ul>

        <SidebarSection label="Account" />
        <ul className="space-y-1" role="list">
          {ACCOUNT_ITEMS.map((item) => (
            <li key={item.id} role="listitem">
              <SidebarLink item={item} />
            </li>
          ))}
        </ul>
      </nav>

      {/* ── Create Project Button ── */}
      <div className="px-5 mb-4 shrink-0">
        <button
          onClick={() => router.push('/dashboard/projects/new')}
          className="w-full py-2.5 bg-primary text-on-primary font-bold rounded-none flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer text-xs uppercase tracking-wider"
        >
          <Plus className="w-4 h-4 text-on-primary" strokeWidth={1.5} />
          <span>Create Project</span>
        </button>
      </div>

      {/* ── Footer ── */}
      <div className="px-5 py-4 shrink-0 border-t border-black/10 dark:border-white/10">
        {/* Powered-by badge */}
        <p className="px-3 pb-3 text-xs font-bold uppercase tracking-widest text-on-surface-variant/40">
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
