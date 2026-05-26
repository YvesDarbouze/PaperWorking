'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import Logo from '@/components/brand/Logo';

/* ═══════════════════════════════════════════════════════
   Admin Layout — Platform Admin Shell

   Auth + Role guard:
   • Must be authenticated
   • Must have Platform Admin or Lead Investor role
   
   Structure: Sidebar (240px) + Header (64px) + Main content
   ═══════════════════════════════════════════════════════ */

const ADMIN_ROLES = ['Platform Admin', 'Admin', 'Lead Investor'];

function AdminSkeleton() {
  return (
    <div className="dashboard-context flex min-h-screen font-sans" style={{ background: 'var(--bg-canvas)' }}>
      <aside
        className="hidden lg:flex flex-col shrink-0 h-screen sticky top-0"
        style={{ width: 240, background: 'var(--bg-canvas)', borderRight: '1px solid var(--border-ui)' }}
        aria-hidden="true"
      >
        <div className="flex items-center px-5 h-16 shrink-0" style={{ borderBottom: '1px solid var(--border-ui)' }}>
          <div className="opacity-30"><Logo size="sm" /></div>
        </div>
        <div className="flex-1 px-3 py-4 space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-8 animate-shimmer rounded-none" style={{ animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="sticky top-0 z-50 w-full"
          style={{ height: 64, background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-ui)' }}
        >
          <div className="flex h-16 items-center px-6">
            <div className="h-4 w-32 animate-shimmer rounded-none" />
          </div>
        </header>
        <main className="flex-1 px-margin-mobile py-gutter-mobile lg:px-margin-desktop lg:py-gutter-desktop" style={{ background: 'var(--bg-canvas)' }}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-36 animate-shimmer rounded-none" style={{ border: '1px solid var(--border-ui)', animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

function AccessDenied() {
  const router = useRouter();
  return (
    <div
      className="dashboard-context min-h-screen flex items-center justify-center font-sans"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <div className="text-center max-w-md px-6">
        <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center rounded-full" style={{ background: '#fef2f2' }}>
          <span className="text-2xl">🔒</span>
        </div>
        <h1 className="text-2xl font-light mb-2" style={{ color: 'var(--text-primary)' }}>Access Denied</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          You do not have permission to access the Admin Panel. Contact your organization administrator.
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="ag-button"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading || !user) return <AdminSkeleton />;

  // Role check — allow Platform Admin, Admin, and Lead Investor
  const userRole = profile?.role || '';
  if (!ADMIN_ROLES.includes(userRole)) {
    return <AccessDenied />;
  }

  return (
    <div
      className="dashboard-context flex min-h-screen font-sans"
      style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}
    >
      {/* Fixed Sidebar (desktop) */}
      <div className="hidden lg:block">
        <AdminSidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader />
        <main className="flex-1 px-margin-mobile py-gutter-mobile lg:px-margin-desktop lg:py-gutter-desktop" style={{ background: 'var(--bg-canvas)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
