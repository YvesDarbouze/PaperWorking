'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminAccountMenu from '@/components/admin/AdminAccountMenu';
import Logo from '@/components/marketing/Logo';
import { performClientLogout } from '@/lib/auth/client-logout';
import {
  ADMIN_PRIMARY_NAV,
  ADMIN_ROUTE_LABELS,
  ADMIN_SECONDARY_NAV,
} from '@/lib/admin/admin-nav';

const PRIMARY_NAV = ADMIN_PRIMARY_NAV;
const SECONDARY_NAV = ADMIN_SECONDARY_NAV;
const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV];

const ROUTE_LABELS = ADMIN_ROUTE_LABELS;

function NavLink({
  item,
  onNavigate,
}: {
  item: { id: string; label: string; href: string; icon: string; exact?: boolean };
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isActive = item.exact
    ? pathname === item.href
    : Boolean(pathname?.startsWith(item.href));

  return (
    <Link
      href={item.href}
      id={`admin-nav-${item.id}`}
      aria-current={isActive ? 'page' : undefined}
      onClick={onNavigate}
      className={`group flex items-center gap-3 border px-4 py-2.5 transition-all ${
        isActive
          ? 'border-black/15 bg-black/[0.04] font-bold text-black'
          : 'border-transparent text-black/55 hover:bg-black/[0.03] hover:text-black'
      }`}
    >
      <span className="material-symbols-outlined text-[18px]" aria-hidden>
        {item.icon}
      </span>
      <span className="truncate text-xs font-bold uppercase tracking-[0.15em]">{item.label}</span>
      {isActive ? (
        <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-black" aria-hidden />
      ) : null}
    </Link>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="flex h-16 shrink-0 items-center border-b border-black/10 px-5">
        <Logo href="/admin" tone="auth" theme="light" size="sm" />
      </div>

      <div className="px-5 pb-2 pt-4">
        <span className="inline-flex items-center gap-1.5 border border-black/15 bg-black px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
          <span className="material-symbols-outlined text-[14px]">shield</span>
          Admin Panel
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Admin menu">
        <p className="px-4 pb-2 pt-2 text-[9px] font-bold uppercase tracking-[0.3em] text-black/35">
          Management
        </p>
        <ul className="space-y-1" role="list">
          {PRIMARY_NAV.map((item) => (
            <li key={item.id}>
              <NavLink item={item} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>

        <p className="px-4 pb-2 pt-5 text-[9px] font-bold uppercase tracking-[0.3em] text-black/35">
          Ops & QA
        </p>
        <ul className="space-y-1" role="list">
          {SECONDARY_NAV.map((item) => (
            <li key={item.id}>
              <NavLink item={item} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

/**
 * Admin shell — full-bleed content + sidebar on desktop,
 * drawer + scroll chips on tablet/mobile.
 */
export default function AdminPortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleSignOut() {
    await performClientLogout();
    router.replace('/login?accountType=admin&redirectTo=/admin');
  }

  const pageTitle =
    (pathname && ROUTE_LABELS[pathname]) ||
    Object.entries(ROUTE_LABELS)
      .sort((a, b) => b[0].length - a[0].length)
      .find(([route]) => route !== '/admin' && pathname?.startsWith(route))?.[1] ||
    'Admin';

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  return (
    <div className="admin-context flex min-h-screen w-full min-w-0 font-sans">
      {/* Desktop sidebar */}
      <aside
        className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-black/10 lg:flex xl:w-72"
        style={{ background: 'var(--bg-canvas)' }}
        aria-label="Admin navigation"
      >
        <SidebarBody />
      </aside>

      {/* Mobile / tablet drawer */}
      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <aside
            className="absolute inset-y-0 left-0 flex w-[min(100%,20rem)] flex-col overflow-y-auto border-r border-black/10 bg-[var(--bg-canvas)] shadow-xl"
          >
            <div className="flex h-14 items-center justify-between border-b border-black/10 px-4">
              <span className="text-xs font-bold uppercase tracking-widest">Menu</span>
              <button
                type="button"
                className="p-2 text-black/60"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <SidebarBody onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-40 w-full border-b border-black/10 backdrop-blur-md"
          style={{
            background: 'color-mix(in srgb, var(--bg-surface) 85%, transparent)',
          }}
          role="banner"
        >
          <div className="flex h-14 w-full items-center justify-between gap-3 px-3 sm:h-16 sm:px-5 lg:px-6 xl:px-8">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                className="inline-flex shrink-0 p-2 text-black/70 lg:hidden"
                aria-label="Open menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(true)}
              >
                <span className="material-symbols-outlined">menu</span>
              </button>
              <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2">
                <span className="hidden text-xs font-bold uppercase tracking-widest text-black/45 sm:inline">
                  Admin
                </span>
                <span className="hidden text-black/20 sm:inline" aria-hidden>
                  /
                </span>
                <span className="truncate text-xs font-bold uppercase tracking-widest text-black">
                  {pageTitle}
                </span>
              </nav>
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <button
                type="button"
                className="hidden p-2 text-black/45 transition hover:text-black sm:inline-flex"
                aria-label="Search"
              >
                <span className="material-symbols-outlined text-[18px]">search</span>
              </button>
              <button
                type="button"
                className="relative hidden p-2 text-black/45 transition hover:text-black sm:inline-flex"
                aria-label="Notifications"
              >
                <span className="material-symbols-outlined text-[18px]">notifications</span>
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#F06543]" />
              </button>
              <AdminAccountMenu onSignOut={handleSignOut} />
            </div>
          </div>

          {/* Tablet / mobile section chips — full width scroll */}
          <div className="w-full border-t border-black/5 lg:hidden">
            <div className="flex w-full gap-1.5 overflow-x-auto px-3 py-2 sm:px-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {ALL_NAV.map((item) => {
                const isActive =
                  'exact' in item && item.exact
                    ? pathname === item.href
                    : Boolean(pathname?.startsWith(item.href));
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`shrink-0 border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide ${
                      isActive
                        ? 'border-black bg-black text-white'
                        : 'border-black/10 bg-white text-black/65'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </header>

        <main
          className="w-full min-w-0 flex-1 px-3 py-4 sm:px-5 sm:py-6 lg:px-6 lg:py-7 xl:px-8"
          style={{ background: 'var(--bg-canvas)' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
