'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Ticket,
  ShieldCheck,
  BarChart3,
  ArrowLeft,
} from 'lucide-react';
import Logo from '@/components/brand/Logo';

/* ═══════════════════════════════════════════════════════
   AdminSidebar — Admin Panel Navigation

   Route Map:
     • Overview       → /admin
     • Users          → /admin/users
     • Subscriptions  → /admin/subscriptions
     • Tickets        → /admin/tickets
     • Audit Logs     → /admin/audit
     • Analytics      → /admin/analytics
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
    id: 'overview',
    label: 'Overview',
    href: '/admin',
    icon: <LayoutDashboard className="w-4 h-4" strokeWidth={1.5} />,
    exact: true,
  },
  {
    id: 'users',
    label: 'Users',
    href: '/admin/users',
    icon: <Users className="w-4 h-4" strokeWidth={1.5} />,
  },
  {
    id: 'subscriptions',
    label: 'Billing',
    href: '/admin/subscriptions',
    icon: <CreditCard className="w-4 h-4" strokeWidth={1.5} />,
  },
  {
    id: 'tickets',
    label: 'Tickets',
    href: '/admin/tickets',
    icon: <Ticket className="w-4 h-4" strokeWidth={1.5} />,
  },
  {
    id: 'audit',
    label: 'Audit Logs',
    href: '/admin/audit',
    icon: <ShieldCheck className="w-4 h-4" strokeWidth={1.5} />,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    href: '/admin/analytics',
    icon: <BarChart3 className="w-4 h-4" strokeWidth={1.5} />,
  },
];

function SidebarLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive = item.exact
    ? pathname === item.href
    : Boolean(pathname?.startsWith(item.href));

  return (
    <Link
      href={item.href}
      id={`admin-nav-${item.id}`}
      aria-current={isActive ? 'page' : undefined}
      className={`group flex items-center gap-3 px-4 py-2.5 transition-all duration-200 active:scale-95 border ${
        isActive
          ? 'text-primary font-bold bg-white/5 border-primary/20'
          : 'text-on-surface-variant border-transparent hover:text-on-surface hover:bg-white/5'
      }`}
    >
      <span aria-hidden="true" className="shrink-0">{item.icon}</span>
      <span className="text-xs font-bold uppercase tracking-[0.15em] truncate">
        {item.label}
      </span>
      {isActive && (
        <span
          className="ml-auto w-1.5 h-1.5 rounded-full shrink-0 bg-primary"
          aria-hidden="true"
        />
      )}
    </Link>
  );
}

export default function AdminSidebar() {
  return (
    <aside
      className="flex flex-col shrink-0 h-screen sticky top-0 overflow-y-auto w-64 bg-surface-container/60 backdrop-blur-xl border-r border-black/10 dark:border-white/10"
      aria-label="Admin navigation"
    >
      {/* Logo */}
      <div className="flex items-center px-5 h-16 shrink-0 border-b border-black/10 dark:border-white/10">
        <Logo href="/admin" surface="app-sidebar" />
      </div>

      {/* Admin badge */}
      <div className="px-5 pt-4 pb-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-widest bg-primary text-on-primary border border-primary/20">
          <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.5} />
          Admin Panel
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto" aria-label="Admin menu">
        <p className="px-4 pt-2 pb-2 text-[9px] font-bold uppercase tracking-[0.3em] text-on-surface-variant/40">
          Management
        </p>
        <ul className="space-y-1" role="list">
          {NAV_ITEMS.map((item) => (
            <li key={item.id} role="listitem">
              <SidebarLink item={item} />
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer — back to dashboard */}
      <div className="px-3 py-4 shrink-0 border-t border-black/10 dark:border-white/10">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.15em] text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          Back to Dashboard
        </Link>
        <p className="px-4 pt-3 text-[9px] font-bold uppercase tracking-[0.25em] text-on-surface-variant/40">
          PaperWorking Admin
        </p>
      </div>
    </aside>
  );
}
