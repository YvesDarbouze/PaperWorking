'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import UserAccountMenu from '@/components/shared/UserAccountMenu';
import { Button } from '@/components/ui/Button';
import { PROFILE_CARD } from '@/lib/dashboard/content';
import { getPageLabel } from '@/lib/navigation/nav-contract';
import { SEED_RAW_DEALS, SEED_MARKETPLACE_VENDORS } from '@/lib/marketplace/seed-data';
import { SEED_PROJECTS } from '@/lib/projects/seed-data';

import {
  List,
  CaretRight,
  MagnifyingGlass,
  Tag,
  Calculator,
  Storefront,
  FileText,
  X,
} from '@/components/icons/PhosphorIcons';

export interface TopBarSearchResult {
  id: string;
  category: 'DEAL' | 'PROJECT' | 'VENDOR';
  title: string;
  subtitle: string;
  badge: string;
  href: string;
}

export function searchDashboardTopBar(rawQuery: string): TopBarSearchResult[] {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return [];

  const results: TopBarSearchResult[] = [];
  const isAllDealsQuery = q === 'deal' || q === 'deals';
  const isAllProjectsQuery = q === 'project' || q === 'projects';
  const isAllVendorsQuery = q === 'vendor' || q === 'vendors';

  for (const deal of SEED_RAW_DEALS) {
    const projectMeta = deal.projects?.[0];
    const dealName = projectMeta?.name || deal.address;
    const fields = [
      deal.address,
      deal.slug,
      deal.id,
      projectMeta?.name,
      projectMeta?.city,
      projectMeta?.state,
      projectMeta?.propertyType,
      projectMeta?.subStrategy,
      deal.dealType,
      deal.calculatorResults?.strategy,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (isAllDealsQuery || fields.includes(q)) {
      const price = deal.purchasePrice ?? deal.calculatorResults?.purchasePrice ?? 0;
      const irr = deal.targetIrr ?? deal.projectedRoi ?? deal.calculatorResults?.targetIrr ?? 0;
      results.push({
        id: `deal-${deal.id}`,
        category: 'DEAL',
        title: dealName,
        subtitle: deal.address,
        badge: `$${price.toLocaleString()} · ${irr}% IRR`,
        href: `/deals/${deal.slug || deal.id}`,
      });
    }
  }

  for (const project of SEED_PROJECTS) {
    if (project.isArchived) continue;
    const fields = [
      project.propertyName,
      project.address,
      project.city,
      project.currentPhase,
      project.status,
      project.exit_strategy,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (isAllProjectsQuery || fields.includes(q)) {
      results.push({
        id: `project-${project.id}`,
        category: 'PROJECT',
        title: project.propertyName,
        subtitle: project.address,
        badge: `Phase: ${String(project.currentPhase).toUpperCase()}`,
        href: `/project/${project.id}`,
      });
    }
  }

  for (const vendor of SEED_MARKETPLACE_VENDORS) {
    const fields = [
      vendor.companyName,
      vendor.type,
      vendor.city,
      vendor.location,
      ...(vendor.licensingStates ?? []),
      ...(vendor.specialties ?? []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (isAllVendorsQuery || fields.includes(q)) {
      results.push({
        id: `vendor-${vendor.id}`,
        category: 'VENDOR',
        title: vendor.companyName,
        subtitle: `${vendor.type} · ${vendor.location}`,
        badge: vendor.feeRangeLabel,
        href: `/dashboard/marketplace?search=${encodeURIComponent(vendor.companyName)}`,
      });
    }
  }

  return results.slice(0, 8);
}

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
              ref={(el: HTMLAnchorElement | null) => {
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
  initialSearchQuery?: string;
}

export default function DashboardTopBar({
  onOpenMenu,
  initialSearchQuery = '',
}: DashboardTopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, logout } = useAuth();
  const pageLabel = getPageLabel(pathname || '/dashboard');

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const searchResults = useMemo(() => searchDashboardTopBar(searchQuery), [searchQuery]);
  const trimmedSearch = searchQuery.trim();
  const showSearchResults = searchOpen && trimmedSearch.length > 0;

  useEffect(() => {
    if (!searchOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
    };
  }, [searchOpen]);

  function handleSearchSelect(href: string) {
    setSearchOpen(false);
    setHighlightedIndex(-1);
    router.push(href);
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSearchOpen(true);
      if (searchResults.length > 0) {
        setHighlightedIndex((prev) => (prev + 1) % searchResults.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSearchOpen(true);
      if (searchResults.length > 0) {
        setHighlightedIndex((prev) => (prev <= 0 ? searchResults.length - 1 : prev - 1));
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setSearchOpen(false);
      setHighlightedIndex(-1);
      if (searchQuery) {
        setSearchQuery('');
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!trimmedSearch) return;
      if (highlightedIndex >= 0 && searchResults[highlightedIndex]) {
        handleSearchSelect(searchResults[highlightedIndex].href);
      } else {
        handleSearchSelect(`/dashboard/deals?search=${encodeURIComponent(trimmedSearch)}`);
      }
    }
  }

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

      <div className="hidden max-w-xl flex-1 items-center gap-2 lg:flex">
        <div ref={searchContainerRef} className="relative min-w-[260px] flex-1">
          <div
            className={`relative flex w-full min-h-[44px] items-center gap-2 rounded-none border border-input bg-card pl-3 ${
              searchQuery.length > 0 ? 'pr-10' : 'pr-3'
            } py-1.5 transition-all focus-within:border-ring focus-within:ring-1 focus-within:ring-ring`}
          >
            <MagnifyingGlass className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchOpen(true);
                setHighlightedIndex(-1);
              }}
              onFocus={() => {
                if (searchQuery.trim().length > 0) {
                  setSearchOpen(true);
                }
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search deals by name or address"
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              aria-label="Search deals"
              aria-expanded={showSearchResults}
              aria-controls="dashboard-topbar-search-results"
              data-testid="dashboard-topbar-search-input"
            />
            {searchQuery.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchOpen(false);
                  setHighlightedIndex(-1);
                  searchInputRef.current?.focus();
                }}
                aria-label="Clear search"
                data-testid="clear-topbar-search-btn"
                className="absolute right-0 top-0 bottom-0 flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-none text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <X className="h-3.5 w-3.5" weight="bold" />
              </button>
            ) : null}
          </div>

          {showSearchResults && (
            <div
              id="dashboard-topbar-search-results"
              data-testid="dashboard-topbar-search-results"
              role="listbox"
              aria-label="Search results"
              className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[380px] overflow-y-auto rounded-none border border-border bg-popover p-1.5 text-popover-foreground shadow-xl ring-1 ring-foreground/10"
            >
              {searchResults.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {searchResults.map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={highlightedIndex === idx}
                      data-testid="dashboard-search-result-item"
                      onClick={() => handleSearchSelect(item.href)}
                      className={`flex w-full min-h-[44px] items-center justify-between gap-3 rounded-none px-3 py-2 text-left text-xs transition-colors hover:bg-muted focus:bg-muted focus:outline-none ${
                        highlightedIndex === idx ? 'bg-muted' : ''
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex shrink-0 items-center rounded-none border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-foreground">
                            {item.category}
                          </span>
                          <span className="truncate font-semibold text-foreground">{item.title}</span>
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{item.subtitle}</p>
                      </div>
                      <span className="shrink-0 font-mono text-[10px] font-semibold text-muted-foreground">
                        {item.badge}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-3 py-3 text-xs text-muted-foreground">
                  No deals or projects found for &apos;{trimmedSearch}&apos;
                </div>
              )}

              <div className="mt-1 border-t border-border pt-1">
                <button
                  type="button"
                  data-testid="dashboard-search-view-all"
                  onClick={() =>
                    handleSearchSelect(`/dashboard/deals?search=${encodeURIComponent(trimmedSearch)}`)
                  }
                  className="flex w-full min-h-[44px] items-center justify-between rounded-none px-3 py-2 text-left text-xs font-semibold text-foreground transition-colors hover:bg-muted focus:bg-muted focus:outline-none"
                >
                  <span>Search all deals for &apos;{trimmedSearch}&apos; in Marketplace →</span>
                </button>
              </div>
            </div>
          )}
        </div>
        <TopBarDropdown id="deals" label="Deals" items={DEALS_MENU_ITEMS} />
        <TopBarDropdown id="vendors" label="Vendors" items={VENDORS_MENU_ITEMS} />
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <Button
          href="/dashboard/support"
          data-testid="topbar-support-button"
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
