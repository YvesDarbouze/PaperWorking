'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getPageLabel } from '@/lib/navigation/nav-contract';

export default function DashboardTopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, logout } = useAuth();
  const pageLabel = getPageLabel(pathname || '/dashboard');

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  return (
    <header
      className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-white/8 bg-[#121014]/88 px-4 backdrop-blur-[20px] md:px-6"
      style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.04)' }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="hidden items-center gap-2 md:flex">
          <span className="text-xs font-bold uppercase tracking-widest text-white/35">Dashboard</span>
          <span className="material-symbols-outlined text-[14px] text-white/20">chevron_right</span>
          <span className="truncate text-xs font-bold uppercase tracking-widest text-[#fdfffc]">
            {pageLabel}
          </span>
        </div>
        <p className="text-sm font-semibold text-[#fdfffc] md:hidden">{pageLabel}</p>
      </div>

      <div className="hidden max-w-md flex-1 items-center gap-2 lg:flex">
        <div className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
          <span className="material-symbols-outlined text-[18px] text-white/40">search</span>
          <input
            type="search"
            placeholder="Search deals by name or address..."
            className="w-full bg-transparent text-sm text-white/85 outline-none placeholder:text-white/35"
            aria-label="Search deals"
          />
        </div>
        <Link
          href="/dashboard/deals"
          className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/70 no-underline hover:text-white"
        >
          Deals
        </Link>
        <Link
          href="/dashboard/marketplace"
          className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/70 no-underline hover:text-white"
        >
          Vendors
        </Link>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-[12px] font-semibold leading-tight text-[#fdfffc]">
            {profile?.subscriptionPlan ?? 'Individual'} investor
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#627C85]">
            Lead Investor
          </p>
        </div>
        <Link
          href="/support"
          className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/75 no-underline transition-colors hover:text-white"
        >
          Support
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg bg-white/8 px-3 py-2 text-sm font-medium text-[#fdfffc]"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
