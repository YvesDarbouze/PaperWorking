'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import UserAccountMenu from '@/components/shared/UserAccountMenu';
import { Button } from '@/components/ui/Button';
import { PROFILE_CARD } from '@/lib/dashboard/content';
import { getPageLabel } from '@/lib/navigation/nav-contract';

import {
  List,
  CaretRight,
  MagnifyingGlass,
  Tag,
  Calculator,
  Storefront,
  FileText,
} from '@/components/icons/PhosphorIcons';

function getDropdownIcon(icon: string) {
  switch (icon) {
    case 'travel_explore':
      return <MagnifyingGlass className="h-4 w-4 text-foreground shrink-0 mt-0.5" />;
    case 'bookmark':
      return <Tag className="h-4 w-4 text-foreground shrink-0 mt-0.5" />;
    case 'analytics':
      return <Calculator className="h-4 w-4 text-foreground shrink-0 mt-0.5" />;
    case 'storefront':
      return <Storefront className="h-4 w-4 text-foreground shrink-0 mt-0.5" />;
    case 'request_quote':
      return <FileText className="h-4 w-4 text-foreground shrink-0 mt-0.5" />;
    default:
      return <Tag className="h-4 w-4 text-foreground shrink-0 mt-0.5" />;
  }
}

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
          className="absolute left-0 top-full z-50 mt-2 min-w-[240px] rounded-none border border-border bg-popover text-popover-foreground p-1.5 shadow-xl ring-1 ring-foreground/10"
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
              className="flex items-start gap-2.5 rounded-none px-3 py-2 min-h-[44px] text-left text-xs no-underline transition-colors hover:bg-muted focus:bg-muted focus:outline-none"
            >
              {getDropdownIcon(item.icon)}
              <div>
                <p className="font-semibold text-foreground">{item.label}</p>
                {item.desc && <p className="text-[10px] text-muted-foreground">{item.desc}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

interface DashboardTopBarProps {
  onOpenMenu?: () => void;
}

export default function DashboardTopBar({ onOpenMenu }: DashboardTopBarProps) {
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
      className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-border bg-card/95 px-3 backdrop-blur-[20px] md:px-6"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open navigation menu"
          data-testid="mobile-topbar-menu"
          className="flex h-11 w-11 items-center justify-center rounded-none bg-card border border-border text-foreground hover:bg-muted md:hidden touch-target shrink-0 min-h-[44px] min-w-[44px]"
        >
          <List className="h-5 w-5" />
        </button>
        <div className="hidden items-center gap-2 md:flex">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Dashboard</span>
          <CaretRight className="h-3 w-3 text-muted-foreground" />
          <span className="truncate text-xs font-bold uppercase tracking-widest text-foreground">
            {pageLabel}
          </span>
        </div>
        <p className="text-sm font-semibold text-foreground md:hidden truncate">{pageLabel}</p>
      </div>

      <div className="hidden max-w-md flex-1 items-center gap-2 lg:flex">
        <div className="relative flex w-full items-center gap-2 rounded-none border border-input bg-card px-3 py-1.5 transition-all focus-within:border-ring focus-within:ring-1 focus-within:ring-ring">
          <MagnifyingGlass className="h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search deals by name or address..."
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
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
