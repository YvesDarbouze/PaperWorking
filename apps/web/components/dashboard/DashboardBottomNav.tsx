'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { isNavItemActive, resolveBottomNav } from '@/lib/navigation/nav-contract';

export default function DashboardBottomNav() {
  const pathname = usePathname();
  const { navContext } = useAuth();
  const items = resolveBottomNav(navContext);

  return (
    <nav
      className="fixed bottom-0 z-50 flex h-[72px] w-full items-center justify-around border-t border-white/6 bg-[#0d0a0b]/92 px-2 backdrop-blur-xl md:hidden"
      style={{ borderRadius: '16px 16px 0 0' }}
    >
      {items.map((item) => {
        const isActive = isNavItemActive(pathname || '', item.href);
        return (
          <Link
            key={item.id}
            href={item.href}
            className="flex flex-col items-center justify-center px-3 py-2 no-underline"
            style={{ color: isActive ? '#fdfffc' : 'rgba(253,255,252,0.4)' }}
          >
            <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
            <span className="mt-1 text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
