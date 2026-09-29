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
import { List } from '@/components/icons/PhosphorIcons';
import { getNavPhosphorIcon } from './nav-icons';

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
      className="fixed bottom-0 left-0 right-0 z-40 flex min-h-[60px] pb-[max(0.4rem,env(safe-area-inset-bottom))] w-full items-center justify-around border-t border-border bg-card/95 px-1 backdrop-blur-xl shadow-lg md:hidden pointer-events-auto rounded-none"
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
              className={`group relative flex flex-1 flex-col items-center justify-center py-1.5 px-0.5 min-h-[52px] text-center transition-all duration-150 touch-target ${
                isActive ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isActive && (
                <span
                  className="absolute -top-px h-0.5 w-8 rounded-none bg-primary"
                  aria-hidden="true"
                />
              )}
              <List className="h-5 w-5 transition-transform duration-150 group-active:scale-95" />
              <span
                className={`mt-0.5 text-[10px] tracking-tight truncate max-w-[68px] ${
                  isActive ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'
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
            className={`group relative flex flex-1 flex-col items-center justify-center py-1.5 px-0.5 min-h-[52px] text-center no-underline transition-all duration-150 touch-target ${
              isActive ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {isActive && (
              <span
                className="absolute -top-px h-0.5 w-8 rounded-none bg-primary"
                aria-hidden="true"
              />
            )}
            {getNavPhosphorIcon(item.id, 'h-5 w-5 transition-transform duration-150 group-active:scale-95')}
            <span
              className={`mt-0.5 text-[10px] tracking-tight truncate max-w-[68px] ${
                isActive ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'
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
