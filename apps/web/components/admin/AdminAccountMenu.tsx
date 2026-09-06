'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export default function AdminAccountMenu({
  displayName = 'Platform Admin',
  onSignOut,
}: {
  displayName?: string;
  onSignOut: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const name = displayName.trim() || 'Platform Admin';
  const initial = name.charAt(0).toUpperCase();

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
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account menu for ${name}`}
        className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-2 py-1.5 transition-colors hover:border-black/20 sm:px-3"
      >
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white"
          aria-hidden
        >
          {initial}
        </span>
        <span className="hidden text-xs font-semibold text-black md:inline">{name}</span>
        <span
          className="material-symbols-outlined hidden text-[18px] text-black/45 md:inline"
          style={{ transform: open ? 'rotate(180deg)' : undefined }}
          aria-hidden
        >
          expand_more
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Admin account menu"
          className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-black/10 bg-white py-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
        >
          <div className="border-b border-black/5 px-3.5 py-2.5">
            <p className="truncate text-xs font-semibold text-black">{name}</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-black/45">
              Platform Admin
            </p>
          </div>

          <div className="px-1.5 py-1">
            <Link
              href="/dashboard"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-black/70 no-underline transition-colors hover:bg-black/[0.04] hover:text-black"
            >
              <span className="material-symbols-outlined text-[18px] text-black/45">dashboard</span>
              Back to dashboard
            </Link>
          </div>

          <div className="border-t border-black/5 px-2 pb-1.5 pt-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void onSignOut();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-black px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
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
