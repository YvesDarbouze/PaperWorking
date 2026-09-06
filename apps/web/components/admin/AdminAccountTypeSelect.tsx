'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ADMIN_ACCOUNT_TYPE_OPTIONS,
  formatAdminAccountTypeLabel,
} from '@/lib/admin/account-types';

type AdminAccountTypeSelectProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export default function AdminAccountTypeSelect({
  value,
  onChange,
  disabled = false,
}: AdminAccountTypeSelectProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();
  const [menuStyle, setMenuStyle] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !triggerRef.current) {
      setMenuStyle(null);
      return;
    }

    function syncMenuPosition() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      setMenuStyle({
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
      });
    }

    syncMenuPosition();
    window.addEventListener('resize', syncMenuPosition);
    window.addEventListener('scroll', syncMenuPosition, true);
    return () => {
      window.removeEventListener('resize', syncMenuPosition);
      window.removeEventListener('scroll', syncMenuPosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !listRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const selectedLabel = formatAdminAccountTypeLabel(value);

  const menu =
    open && menuStyle && mounted
      ? createPortal(
          <div className="admin-context">
            <ul
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-label="Account type"
              style={{
                top: menuStyle.top,
                left: menuStyle.left,
                width: menuStyle.width,
              }}
              className="fixed z-[70] overflow-hidden rounded-xl border border-black/10 bg-white py-1 text-[#0a0a0f] shadow-lg"
            >
            {ADMIN_ACCOUNT_TYPE_OPTIONS.map((option) => {
              const isSelected = option.value === value;
              return (
                <li key={option.value} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm text-[#0a0a0f] transition hover:bg-black/[0.04] ${
                      isSelected ? 'bg-black/[0.06] font-semibold' : 'font-normal'
                    }`}
                  >
                    <span>{option.label}</span>
                    {isSelected ? (
                      <span
                        className="material-symbols-outlined text-base text-[#454955]"
                        aria-hidden
                      >
                        check
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
            </ul>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div ref={rootRef} className="w-full">
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          onClick={() => setOpen((current) => !current)}
          className="flex w-full items-center justify-between rounded-xl border border-black/10 bg-[#f6f4ef] px-3 py-2.5 text-left text-sm text-[#0a0a0f] outline-none transition hover:border-black/20 disabled:opacity-50"
        >
          <span>{selectedLabel}</span>
          <span
            className={`material-symbols-outlined text-base text-black/45 transition ${open ? 'rotate-180' : ''}`}
            aria-hidden
          >
            expand_more
          </span>
        </button>
      </div>
      {menu}
    </>
  );
}
