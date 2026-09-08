'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import UserAccountMenu from '@/components/shared/UserAccountMenu';
import { Button } from '@/components/ui/Button';
import { PROFILE_CARD } from '@/lib/dashboard/content';
import { getPageLabel } from '@/lib/navigation/nav-contract';

const DEALS_MENU_ITEMS = [
  {
    href: '/dashboard/deals',
    icon: 'travel_explore',
    label: 'Explore Marketplace',
    desc: 'Discover syndications & active rounds',
  },
  {
    href: '/dashboard/deals?filter=saved',
    icon: 'bookmark',
    label: 'Saved Deals',
    desc: 'Shortlisted investment deals',
  },
  {
    href: '/dashboard/insights',
    icon: 'analytics',
    label: 'Underwriting Calculator',
    desc: 'IRR, DSCR & return models',
  },
] as const;

const VENDORS_MENU_ITEMS = [
  {
    href: '/dashboard/marketplace',
    icon: 'storefront',
    label: 'Vendor Directory',
    desc: 'Legal, GC, CPA & title partners',
  },
  {
    href: '/vendor-portal',
    icon: 'request_quote',
    label: 'Submit RFP / Quote Request',
    desc: 'Source qualified bids',
  },
] as const;

function TopBarDropdown({
  id,
  label,
  items,
}: {
  id: string;
  label: string;
  items: readonly { href: string; icon: string; label: string; desc?: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;
    setFocusedIndex(0);
    const timer = setTimeout(() => {
      itemRefs.current[0]?.focus();
    }, 10);

    const onDocClick = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onDocClick);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', onDocClick);
    };
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (focusedIndex + 1) % items.length;
      setFocusedIndex(next);
      itemRefs.current[next]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (focusedIndex - 1 + items.length) % items.length;
      setFocusedIndex(prev);
      itemRefs.current[prev]?.focus();
    }
  };

  return (
    <div className="relative" onKeyDown={handleKeyDown}>
      <Button
        ref={triggerRef}
        type="button"
        variant="secondary"
        size="sm"
        roleVariant="dropdown"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={`${id}-menu`}
        id={`${id}-trigger`}
        data-testid={`topbar-${id}-dropdown`}
      >
        {label}
      </Button>

      {open && (
        <div
          ref={menuRef}
          id={`${id}-menu`}
          role="menu"
          aria-labelledby={`${id}-trigger`}
          className="absolute left-0 top-full z-50 mt-2 min-w-[240px] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.6)]"
        >
          {items.map((item, idx) => (
            <Link
              key={item.href}
              ref={(el) => {
                itemRefs.current[idx] = el;
              }}
              href={item.href}
              role="menuitem"
              tabIndex={focusedIndex === idx ? 0 : -1}
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className="flex items-start gap-2.5 rounded-lg px-3 py-2 text-left text-xs no-underline transition-colors hover:bg-white/[0.06] focus:bg-white/[0.08] focus:outline-none"
            >
              <span className="material-symbols-outlined text-[18px] text-[var(--accent)] shrink-0 mt-0.5">
                {item.icon}
              </span>
              <div>
                <p className="font-semibold text-[#fdfffc]">{item.label}</p>
                {item.desc && <p className="text-[10px] text-white/45">{item.desc}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

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
        <div className="relative flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 transition-all focus-within:border-[var(--accent)]/60 focus-within:ring-2 focus-within:ring-[var(--accent)]/60 focus-within:ring-offset-2 focus-within:ring-offset-[#121014]">
          <span className="material-symbols-outlined text-[18px] text-white/40">search</span>
          <input
            type="search"
            placeholder="Search deals by name or address..."
            className="w-full bg-transparent text-sm text-white/85 outline-none placeholder:text-white/35"
            aria-label="Search deals"
          />
        </div>
        <TopBarDropdown id="deals" label="Deals" items={DEALS_MENU_ITEMS} />
        <TopBarDropdown id="vendors" label="Vendors" items={VENDORS_MENU_ITEMS} />
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <Button
          href="/support"
          variant="tertiary"
          size="sm"
          className="hidden sm:inline-flex"
        >
          Support
        </Button>
        <UserAccountMenu
          displayName={PROFILE_CARD.displayName}
          accountType={profile?.accountType}
          role={PROFILE_CARD.role}
          onSignOut={handleLogout}
        />
      </div>
    </header>
  );
}
