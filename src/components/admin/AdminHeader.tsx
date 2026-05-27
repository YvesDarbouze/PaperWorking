'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Bell, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

/* ═══════════════════════════════════════════════════════
   AdminHeader — Top bar with breadcrumbs, search, profile
   ═══════════════════════════════════════════════════════ */

const ROUTE_LABELS: Record<string, string> = {
  '/admin': 'Overview',
  '/admin/users': 'User Management',
  '/admin/subscriptions': 'Billing & Subscriptions',
  '/admin/tickets': 'Support Tickets',
  '/admin/audit': 'Audit Logs',
  '/admin/analytics': 'Analytics',
};

export default function AdminHeader() {
  const pathname = usePathname();
  const { profile } = useAuth();

  const pageTitle = ROUTE_LABELS[pathname] || 'Admin';

  return (
    <header
      className="sticky top-0 z-50 w-full backdrop-blur-md"
      style={{
        height: 64,
        background: 'color-mix(in srgb, var(--bg-surface) 85%, transparent)',
        borderBottom: '1px solid var(--border-ui)',
      }}
      role="banner"
    >
      <div className="flex h-16 items-center justify-between px-margin-mobile lg:px-margin-desktop">
        {/* Breadcrumb + Title */}
        <div className="flex items-center gap-3">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2">
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: 'var(--text-secondary)' }}
            >
              Admin
            </span>
            <span style={{ color: 'var(--border-ui)' }} aria-hidden="true">/</span>
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: 'var(--text-primary)' }}
            >
              {pageTitle}
            </span>
          </nav>
        </div>

        {/* Right side: search + notifications + profile */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <button
            className="p-2 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Notifications */}
          <button
            className="relative p-2 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {/* Notification dot */}
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
              style={{ background: '#ef4444' }}
              aria-label="3 unread notifications"
            />
          </button>

          {/* Profile pill */}
          <div
            className="flex items-center gap-2 px-3 py-1.5"
            style={{
              border: '1px solid var(--border-ui)',
            }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: '#0d0d0d', color: '#f2f2f2' }}
            >
              {(profile?.displayName || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold leading-none" style={{ color: 'var(--text-primary)' }}>
                {profile?.displayName || 'Admin'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Platform Admin
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
