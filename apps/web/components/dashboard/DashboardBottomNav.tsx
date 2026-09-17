'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  isNavItemActive,
  isDrawerRouteActive,
  resolveBottomNav,
  resolveDrawerNav,
} from '@/lib/navigation/nav-contract';

interface DashboardBottomNavProps {
  onOpenDrawer?: () => void;
  isDrawerOpen?: boolean;
}

export default function DashboardBottomNav({
  onOpenDrawer,
  isDrawerOpen = false,
}: DashboardBottomNavProps) {
  const pathname = usePathname() || '';
  const { navContext } = useAuth();
  const items = resolveBottomNav(navContext);
  const drawerItems = resolveDrawerNav(navContext);
  const isDrawerActive = isDrawerOpen || isDrawerRouteActive(pathname, drawerItems);

  return (
    <nav
      aria-label="App navigation"
      data-testid="dashboard-bottom-nav"
      className="fixed bottom-0 left-0 right-0 z-40 flex min-h-[60px] pb-[max(0.4rem,env(safe-area-inset-bottom))] w-full items-center justify-around border-t border-white/10 bg-[#0d0a0b]/95 px-1 backdrop-blur-xl shadow-[0_-4px_24px_rgba(0,0,0,0.5)] md:hidden pointer-events-auto"
      style={{ borderRadius: '16px 16px 0 0' }}
    >
      {items.map((item) => {
        const isMoreTab = item.id === 'more';
        const isActive = isMoreTab ? isDrawerActive : isNavItemActive(pathname, item.href);

        if (isMoreTab) {
          return (
            <button
              key={item.id}
              type="button"
              onClick={onOpenDrawer}
              data-testid="bottom-nav-more"
              aria-label="More navigation options"
              aria-expanded={isDrawerOpen}
              className={`group relative flex flex-1 flex-col items-center justify-center py-1.5 px-0.5 min-h-[52px] text-center transition-all duration-150 touch-press ${
                isActive ? 'text-[color:var(--color-primary)] font-semibold' : 'text-white/60 hover:text-white'
              }`}
            >
              {isActive && (
                <span
                  className="absolute -top-1 h-0.5 w-8 rounded-full bg-[color:var(--color-primary)] shadow-[0_0_10px_var(--color-primary)]"
                  aria-hidden="true"
                />
              )}
              <span
                className={`material-symbols-outlined text-[22px] transition-transform duration-150 group-active:scale-95 ${
                  isActive ? 'text-[color:var(--color-primary)]' : 'text-white/65 group-hover:text-white'
                }`}
              >
                {item.icon}
              </span>
              <span
                className={`mt-0.5 text-[10px] tracking-tight truncate max-w-[68px] ${
                  isActive ? 'font-semibold text-white' : 'font-medium text-white/60'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        }

        return (
          <Link
            key={item.id}
            href={item.href}
            data-testid={`bottom-nav-${item.id}`}
            aria-current={isActive ? 'page' : undefined}
            className={`group relative flex flex-1 flex-col items-center justify-center py-1.5 px-0.5 min-h-[52px] text-center no-underline transition-all duration-150 touch-press ${
              isActive ? 'text-[color:var(--color-primary)] font-semibold' : 'text-white/60 hover:text-white'
            }`}
          >
            {isActive && (
              <span
                className="absolute -top-1 h-0.5 w-8 rounded-full bg-[color:var(--color-primary)] shadow-[0_0_10px_var(--color-primary)]"
                aria-hidden="true"
              />
            )}
            <span
              className={`material-symbols-outlined text-[22px] transition-transform duration-150 group-active:scale-95 ${
                isActive ? 'text-[color:var(--color-primary)]' : 'text-white/65 group-hover:text-white'
              }`}
            >
              {item.icon}
            </span>
            <span
              className={`mt-0.5 text-[10px] tracking-tight truncate max-w-[68px] ${
                isActive ? 'font-semibold text-white' : 'font-medium text-white/60'
              }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
