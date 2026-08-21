'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { MouseEvent } from 'react';
import Logo from '@/components/marketing/Logo';
import { useAuth } from '@/context/AuthContext';
import {
  isNavItemActive,
  resolveAccountNav,
  resolvePrimaryNav,
  type NavItem,
} from '@/lib/navigation/nav-contract';

function SidebarLink({
  item,
  isActive,
  onNavigate,
}: {
  item: NavItem;
  isActive: boolean;
  onNavigate?: (item: NavItem, event: MouseEvent) => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={(event) => onNavigate?.(item, event)}
      className="group relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 transition-all duration-150"
      style={{
        background: isActive ? 'rgba(69, 73, 85, 0.25)' : 'transparent',
        color: isActive ? 'rgba(253,255,252,0.92)' : 'rgba(253,255,252,0.65)',
        border: isActive ? '1px solid rgba(255,255,255,0.10)' : '1px solid transparent',
        textDecoration: 'none',
      }}
    >
      <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
      <span className="flex-1 truncate text-sm font-medium">{item.label}</span>
      {item.isLocked ? (
        <span className="material-symbols-outlined text-[16px] text-amber-400">lock</span>
      ) : null}
    </Link>
  );
}

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { navContext } = useAuth();
  const primary = resolvePrimaryNav(navContext);
  const account = resolveAccountNav(navContext);

  function handleNavigate(item: NavItem, event: MouseEvent) {
    if (!item.isLocked) return;
    // Keep the lock affordance, but still allow opening Deals during local migration preview.
    if (item.id === 'deals' && process.env.NODE_ENV !== 'production') {
      return;
    }
    event.preventDefault();
    router.push('/dashboard/settings/billing?paywall=deals');
  }

  return (
    <aside
      className="hidden h-screen w-[240px] shrink-0 flex-col border-r border-white/6 bg-[#121014] md:flex"
    >
      <div className="border-b border-white/6 px-5 py-5">
        <Logo href="/dashboard" tone="dashboard" theme="dark" size={22} />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/45">
          Workspace
        </p>
        {primary.map((item) => {
          const isActive = isNavItemActive(pathname || '', item.href);
          return (
            <SidebarLink
              key={item.id}
              item={item}
              isActive={isActive}
              onNavigate={handleNavigate}
            />
          );
        })}

        <p className="px-3 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/45">
          Account
        </p>
        {account.map((item) => (
          <SidebarLink
            key={item.id}
            item={item}
            isActive={isNavItemActive(pathname || '', item.href)}
          />
        ))}
      </nav>
    </aside>
  );
}
