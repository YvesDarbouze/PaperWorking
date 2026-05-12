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
    icon: <LayoutDashboard className="w-4 h-4" />,
    exact: true,
  },
  {
    id: 'users',
    label: 'Users',
    href: '/admin/users',
    icon: <Users className="w-4 h-4" />,
  },
  {
    id: 'subscriptions',
    label: 'Billing',
    href: '/admin/subscriptions',
    icon: <CreditCard className="w-4 h-4" />,
  },
  {
    id: 'tickets',
    label: 'Tickets',
    href: '/admin/tickets',
    icon: <Ticket className="w-4 h-4" />,
  },
  {
    id: 'audit',
    label: 'Audit Logs',
    href: '/admin/audit',
    icon: <ShieldCheck className="w-4 h-4" />,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    href: '/admin/analytics',
    icon: <BarChart3 className="w-4 h-4" />,
  },
];

function SidebarLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive = item.exact
    ? pathname === item.href
    : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      id={`admin-nav-${item.id}`}
      aria-current={isActive ? 'page' : undefined}
      className="group flex items-center gap-3 px-3 py-2.5 transition-all duration-150 focus-visible:outline-2 focus-visible:outline-pw-black focus-visible:outline-offset-2"
      style={{
        background: isActive ? '#0d0d0d' : 'transparent',
        color: isActive ? '#f2f2f2' : 'var(--text-secondary)',
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
      <span aria-hidden="true" className="shrink-0">{item.icon}</span>
      <span className="text-xs font-bold uppercase tracking-[0.15em] truncate">
        {item.label}
      </span>
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

export default function AdminSidebar() {
  return (
    <aside
      className="flex flex-col shrink-0 h-screen sticky top-0 overflow-y-auto"
      style={{
        width: 240,
        background: 'var(--bg-canvas)',
        borderRight: '1px solid var(--border-ui)',
      }}
      aria-label="Admin navigation"
    >
      {/* Logo */}
      <div
        className="flex items-center px-5 h-16 shrink-0"
        style={{ borderBottom: '1px solid var(--border-ui)' }}
      >
        <Logo href="/admin" size="sm" />
      </div>

      {/* Admin badge */}
      <div className="px-5 pt-4 pb-2">
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-widest"
          style={{
            background: '#0d0d0d',
            color: '#f2f2f2',
            borderRadius: 4,
          }}
        >
          <ShieldCheck className="w-3 h-3" />
          Admin Panel
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto" aria-label="Admin menu">
        <p
          className="px-3 pt-2 pb-2 text-[9px] font-bold uppercase tracking-[0.3em]"
          style={{ color: 'var(--border-ui)' }}
        >
          Management
        </p>
        <ul className="space-y-0.5" role="list">
          {NAV_ITEMS.map((item) => (
            <li key={item.id} role="listitem">
              <SidebarLink item={item} />
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer — back to dashboard */}
      <div
        className="px-3 py-4 shrink-0"
        style={{ borderTop: '1px solid var(--border-ui)' }}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-3 py-2.5 text-xs font-bold uppercase tracking-[0.15em] transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)';
            (e.currentTarget as HTMLAnchorElement).style.background = '#e8e8e8';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-secondary)';
            (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <p
          className="px-3 pt-3 text-[9px] font-bold uppercase tracking-[0.25em]"
          style={{ color: '#c0c0c0' }}
        >
          PaperWorking Admin
        </p>
      </div>
    </aside>
  );
}
