'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';

const MENU_ITEMS = [
  { href: '/dashboard/profile', icon: 'account_circle', label: 'Profile' },
  { href: '/dashboard/settings?section=billing', icon: 'payments', label: 'Billing' },
  { href: '/dashboard/team', icon: 'group', label: 'Team' },
  { href: '/dashboard/settings', icon: 'settings', label: 'Settings' },
] as const;

function roleLabel(accountType?: string | null, explicitRole?: string | null): string {
  if (explicitRole) return explicitRole.toUpperCase();
  const acct = (accountType || 'investor').toLowerCase();
  if (acct === 'vendor') return 'VENDOR PARTNER';
  if (acct === 'admin') return 'ADMIN';
  return 'LEAD INVESTOR';
}

function avatarHue(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const hues = ['#7c6cf0', '#8b5cf6', '#6366f1', '#a78bfa', '#7c3aed'];
  return hues[hash % hues.length]!;
}

export default function UserAccountMenu({
  displayName,
  accountType,
  role,
  onSignOut,
  className = '',
}: {
  displayName: string;
  accountType?: string | null;
  role?: string | null;
  onSignOut: () => void | Promise<void>;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | HTMLButtonElement | null)[]>([]);

  const name = displayName.trim() || 'User';
  const initial = name.charAt(0).toUpperCase();
  const roleText = roleLabel(accountType, role);
  const avatarBg = avatarHue(name);

  useEffect(() => {
    if (!open) return;
    setFocusedIndex(0);
    const timer = setTimeout(() => {
      itemRefs.current[0]?.focus();
    }, 10);

    const onOut = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onOut);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', onOut);
    };
  }, [open]);

  const totalItems = MENU_ITEMS.length + 1; // items + sign out

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (focusedIndex + 1) % totalItems;
      setFocusedIndex(next);
      itemRefs.current[next]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (focusedIndex - 1 + totalItems) % totalItems;
      setFocusedIndex(prev);
      itemRefs.current[prev]?.focus();
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`} onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account menu for ${name}`}
        className="flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-transparent px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:border-white/20 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]"
      >
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: avatarBg }}
          aria-hidden
        >
          {initial}
        </span>
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block truncate text-[11px] font-bold uppercase leading-tight tracking-[0.04em] text-white">
            {name}
          </span>
          <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--accent)]">
            {roleText}
          </span>
        </span>
        <span
          className="material-symbols-outlined hidden text-[16px] text-white/50 transition-transform sm:inline"
          style={{ transform: open ? 'rotate(180deg)' : undefined }}
          aria-hidden
        >
          expand_more
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="User menu"
          className="absolute right-0 top-full z-50 mt-2 w-[220px] overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] py-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.55)]"
        >
          <div className="px-1 pb-1">
            {MENU_ITEMS.map((item, idx) => (
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
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-white/75 no-underline transition-colors hover:bg-white/[0.06] hover:text-white focus:bg-white/[0.08] focus:outline-none"
              >
                <span className="material-symbols-outlined text-[16px] text-white/45">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            ))}
          </div>

          <div className="border-t border-white/8 px-2 pt-1.5 pb-0.5">
            <Button
              ref={(el) => {
                itemRefs.current[MENU_ITEMS.length] = el as HTMLButtonElement | null;
              }}
              type="button"
              roleVariant="default"
              variant="secondary"
              size="sm"
              className="w-full justify-center text-xs"
              onClick={() => {
                setOpen(false);
                void onSignOut();
              }}
              icon={<span className="material-symbols-outlined text-[15px]">logout</span>}
            >
              Sign out
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
