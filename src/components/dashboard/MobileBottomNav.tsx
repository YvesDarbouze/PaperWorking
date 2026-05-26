'use client';

import React from 'react';
import { LayoutDashboard, FolderTree, Store, Mail, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MobileBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: '/dashboard/projects', label: 'Projects', icon: FolderTree },
    { href: '/dashboard/marketplace', label: 'Market', icon: Store },
    { href: '/dashboard/inbox', label: 'Inbox', icon: Mail },
    { href: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 w-full z-50 rounded-t-2xl bg-surface-container-lowest/90 backdrop-blur-xl border-t border-black/10 dark:border-white/5 flex justify-around items-center h-20 pb-safe px-2">
      {navItems.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);

        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center relative transition-all duration-200 ${
              isActive
                ? 'text-primary font-bold opacity-100'
                : 'text-on-surface-variant opacity-70 hover:opacity-100'
            }`}
          >
            <Icon className="w-6 h-6" strokeWidth={isActive ? 2 : 1.5} />
            <span className="font-label-sm text-[10px] mt-1 uppercase tracking-tighter">
              {item.label}
            </span>
            {isActive && (
              <div className="absolute -bottom-2 w-1 h-1 bg-primary rounded-full shadow-[0_0_10px_#2dd4bf]"></div>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
