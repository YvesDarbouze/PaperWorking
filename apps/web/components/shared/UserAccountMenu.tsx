'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

const MENU_ITEMS = [
  { href: '/dashboard/settings/profile', icon: 'account_circle', label: 'Profile' },
  { href: '/dashboard/settings/billing', icon: 'payments', label: 'Billing' },
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
  const rootRef = useRef<HTMLDivElement>(null);
  const name = displayName.trim() || 'User';
  const initial = name.charAt(0).toUpperCase();
  const roleText = roleLabel(accountType, role);
  const avatarBg = avatarHue(name);

  useEffect(() => {
    if (!open) return;
    const onOut = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onOut);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onOut);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account menu for ${name}`}
        className="flex items-center gap-2.5 rounded-2xl border border-[color:var(--color-primary)] bg-[#121014]/90 py-1.5 pl-1.5 pr-3 transition-colors hover:bg-white/[0.04]"
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: avatarBg }}
          aria-hidden
        >
          {initial}
        </span>
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block truncate text-[11px] font-bold uppercase leading-tight tracking-[0.04em] text-white">
            {name}
          </span>
          <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[0.12em] text-[color:var(--color-primary)]">
            {roleText}
          </span>
        </span>
        <span
          className="material-symbols-outlined hidden text-[18px] text-white/40 sm:inline"
          style={{ transform: open ? 'rotate(180deg)' : undefined }}
        >
          expand_more
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="User menu"
          className="absolute right-0 top-full z-50 mt-2 w-[220px] overflow-hidden rounded-2xl border border-white/10 bg-[#161318] py-2 shadow-[0_20px_50px_rgba(0,0,0,0.55)]"
        >
          <div className="px-1.5 pb-1.5">
            {MENU_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] font-medium text-white/70 no-underline transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                <span className="material-symbols-outlined text-[18px] text-white/45">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            ))}
          </div>

          <div className="px-3 pb-2 pt-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void onSignOut();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--color-primary)] px-4 py-2.5 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
