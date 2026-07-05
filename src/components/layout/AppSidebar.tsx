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
  TrendingUp,
  Lightbulb,
} from 'lucide-react';
import LogoutButton from '@/components/dashboard/LogoutButton';
import Logo from '@/components/brand/Logo';
import WorkspaceSwitcher from '@/components/workspace/WorkspaceSwitcher';

/* ═══════════════════════════════════════════════════════
   AppSidebar — Primary Authenticated Navigation Shell
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
    icon: <LayoutDashboard className="w-5 h-5" strokeWidth={1.5} />,
    exact: true,
  },
  {
    id: 'projects',
    label: 'Deals',
    href: '/dashboard/projects',
    icon: <FolderOpen className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    href: '/dashboard/marketplace',
    icon: <Store className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'intelligence',
    label: 'Intelligence',
    href: '/dashboard/intelligence',
    icon: <BarChart3 className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'insights',
    label: 'Insights',
    href: '/dashboard/insights',
    icon: <Database className="w-5 h-5" strokeWidth={1.5} />,
  },
];

/* ─── Account Group ─── */
const ACCOUNT_ITEMS: NavItem[] = [
  {
    id: 'inbox',
    label: 'Inbox',
    href: '/dashboard/inbox',
    icon: <Mail className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'team',
    label: 'Team',
    href: '/dashboard/team',
    icon: <Users className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'profile',
    label: 'Profile',
    href: '/dashboard/settings/profile',
    icon: <UserCircle className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'account',
    label: 'Billing',
    href: '/dashboard/settings/billing',
    icon: <CreditCard className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/dashboard/settings',
    icon: <Settings className="w-5 h-5" strokeWidth={1.5} />,
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
      className={`group flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 active:scale-95 ${
        isActive
          ? 'bg-primary-container text-on-primary-container font-bold'
          : 'text-on-surface-variant hover:bg-surface-variant'
      }`}
    >
      {/* Icon — aria-hidden, label carries the semantics */}
      <span aria-hidden="true" className="shrink-0 flex items-center justify-center">
        {item.icon}
      </span>

      {/* Label */}
      <span className="font-label-md text-label-md truncate">
        {item.label}
      </span>

      {/* Unread badge for Inbox */}
      {item.id === 'inbox' && unreadTotal > 0 && (
        <span
          className={`flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-bold rounded-full transition-colors duration-150 ml-auto ${
            isActive
              ? 'bg-primary text-on-primary'
              : 'bg-primary/20 text-primary'
          }`}
          aria-label={`${unreadTotal} unread messages`}
        >
          {unreadTotal > 9 ? '9+' : unreadTotal}
        </span>
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
      className="flex flex-col shrink-0 h-screen sticky top-0 overflow-y-auto w-72 p-8 border-r border-outline-variant bg-surface-container-lowest custom-scrollbar"
      aria-label="Primary navigation"
    >
      {/* ── Header ── */}
      <div className="mb-8 flex flex-col gap-4 shrink-0">
        <Logo surface="app-sidebar" href="/dashboard" />
        <h1 className="font-headline-lg text-headline-lg text-primary mt-4">Command Center</h1>
      </div>

      <div className="mb-4">
        <WorkspaceSwitcher />
      </div>

      {/* ── Primary Nav ── */}
      <nav className="flex-1 space-y-2 overflow-y-auto" aria-label="Main menu">
        <ul className="space-y-2" role="list">
          {WORKSPACE_ITEMS.map((item) => (
            <li key={item.id} role="listitem">
              <SidebarLink item={item} />
            </li>
          ))}
        </ul>

        <div className="pt-8 border-t border-outline-variant space-y-2 mt-8">
          <ul className="space-y-2" role="list">
            {ACCOUNT_ITEMS.map((item) => (
              <li key={item.id} role="listitem">
                <SidebarLink item={item} />
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* ── Create Project Button ── */}
      {/* Removed: Using Contextual FAB in DashboardHome instead */}

      {/* ── Footer ── */}
      <div className="pt-4 shrink-0 border-t border-outline-variant">
        {/* Logout */}
        <div className="">
          <LogoutButton compact />
        </div>
      </div>
    </aside>
  );
}

