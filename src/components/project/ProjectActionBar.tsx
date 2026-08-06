'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Archive,
  Briefcase,
  ChevronDown,
  Copy,
  ListChecks,
  Mail,
  MoreHorizontal,
  Settings,
  Share2,
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════════════════════════
   ProjectActionBar — the project workspace header actions.

   Replaces six equal-weight buttons (SETTINGS · EXPORT PDF · SHARE CPA ·
   INSTRUMENTS · HIRE PROFESSIONAL · ARCHIVE) that read as one undifferentiated
   row, with a three-tier hierarchy:

     PRIMARY   — the current phase action, the only filled button
     SECONDARY — Share (CPA / Copy link / Email)
     TERTIARY  — Settings (icon) and More (Instruments, Hire, Archive)

   "Export PDF" is deliberately absent: export belongs to Reports / Tax
   Intelligence, which owns the branded PDF pipeline. Keeping a `window.print()`
   button here produced an unbranded page dump that looked like a product
   feature.

   Spacing is `gap-3` (12px) throughout, so no two controls touch.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface ProjectActionBarProps {
  projectId: string;
  /** Label for the primary action, e.g. "Continue Workflow". */
  primaryLabel: string;
  /** Where the primary action goes. */
  primaryHref: string;
  onArchive: () => void;
  /** Opens the project settings panel. Falls back to a toast if omitted. */
  onOpenSettings?: () => void;
  /** Billing/CPA share target; falls back to the current URL. */
  shareUrl?: string;
  testId?: string;
}

/** Small dropdown that closes on outside click and Escape. */
function Menu({
  label,
  icon,
  align = 'right',
  testId,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  align?: 'left' | 'right';
  testId: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid={testId}
        className="pw-interactive-custom flex items-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-semibold transition-colors cursor-pointer"
        style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-ui)' }}
      >
        {icon}
        <span className="hidden md:inline">{label}</span>
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {open && (
        <div
          role="menu"
          data-testid={`${testId}-menu`}
          className={`absolute top-full mt-2 z-50 min-w-[200px] rounded-xl border overflow-hidden shadow-2xl ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
          style={{ background: 'var(--pw-surface)', borderColor: 'var(--pw-border)' }}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  onClick,
  href,
  icon,
  children,
  danger,
  testId,
}: {
  onClick?: () => void;
  href?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  danger?: boolean;
  testId?: string;
}) {
  const cls =
    'pw-interactive-custom w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-left transition-colors cursor-pointer hover:bg-white/5';
  const style = { color: danger ? '#f87171' : 'var(--text-primary)' };

  if (href) {
    return (
      <a href={href} className={cls} style={style} role="menuitem" data-testid={testId}>
        {icon}
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls} style={style} role="menuitem" data-testid={testId}>
      {icon}
      {children}
    </button>
  );
}

export function ProjectActionBar({
  projectId,
  primaryLabel,
  primaryHref,
  onArchive,
  onOpenSettings,
  shareUrl,
  testId = 'project-actions',
}: ProjectActionBarProps) {
  const url = () =>
    shareUrl ?? (typeof window !== 'undefined' ? window.location.href : '');

  return (
    <div
      className="flex items-center gap-3 shrink-0 flex-wrap justify-end"
      data-testid={testId}
    >
      {/* ── PRIMARY ── the only filled control on the bar */}
      <a
        href={primaryHref}
        data-testid={`${testId}-primary`}
        className="pw-interactive-custom flex items-center h-9 px-4 rounded-lg text-xs font-bold tracking-wide transition-colors cursor-pointer bg-slate-100 text-slate-900 hover:bg-white"
      >
        {primaryLabel}
      </a>

      {/* ── SECONDARY ── Share */}
      <Menu label="Share" icon={<Share2 className="w-3.5 h-3.5" />} testId={`${testId}-share`}>
        {(close) => (
          <>
            <MenuItem
              testId={`${testId}-share-cpa`}
              icon={<Mail className="w-3.5 h-3.5 opacity-70" />}
              onClick={() => {
                navigator.clipboard?.writeText(url());
                toast.success('CPA share link copied.');
                close();
              }}
            >
              Share with CPA
            </MenuItem>
            <MenuItem
              testId={`${testId}-share-copy`}
              icon={<Copy className="w-3.5 h-3.5 opacity-70" />}
              onClick={() => {
                navigator.clipboard?.writeText(url());
                toast.success('Link copied.');
                close();
              }}
            >
              Copy Link
            </MenuItem>
            <MenuItem
              testId={`${testId}-share-email`}
              icon={<Mail className="w-3.5 h-3.5 opacity-70" />}
              href={`mailto:?subject=${encodeURIComponent('PaperWorking project')}&body=${encodeURIComponent(url())}`}
            >
              Email
            </MenuItem>
          </>
        )}
      </Menu>

      {/* ── TERTIARY ── icon-only settings */}
      <button
        type="button"
        onClick={() => (onOpenSettings ? onOpenSettings() : toast.success('Opening settings…'))}
        aria-label="Project settings"
        data-testid={`${testId}-settings`}
        className="pw-interactive-custom flex items-center justify-center w-9 h-9 rounded-lg border transition-colors cursor-pointer"
        style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-ui)' }}
      >
        <Settings className="w-3.5 h-3.5" />
      </button>

      {/* ── TERTIARY ── overflow */}
      <Menu
        label="More"
        icon={<MoreHorizontal className="w-3.5 h-3.5" />}
        testId={`${testId}-more`}
      >
        {(close) => (
          <>
            <MenuItem
              testId={`${testId}-more-instruments`}
              icon={<ListChecks className="w-3.5 h-3.5 opacity-70" />}
              href={`/dashboard/projects/${projectId}/instruments`}
            >
              Instruments
            </MenuItem>
            <MenuItem
              testId={`${testId}-more-hire`}
              icon={<Briefcase className="w-3.5 h-3.5 opacity-70" />}
              href="/dashboard/marketplace"
            >
              Hire Professional
            </MenuItem>
            <div style={{ borderTop: '1px solid var(--pw-border)' }} />
            <MenuItem
              testId={`${testId}-more-archive`}
              icon={<Archive className="w-3.5 h-3.5 opacity-70" />}
              danger
              onClick={() => {
                close();
                onArchive();
              }}
            >
              Archive Project
            </MenuItem>
          </>
        )}
      </Menu>
    </div>
  );
}

export default ProjectActionBar;
