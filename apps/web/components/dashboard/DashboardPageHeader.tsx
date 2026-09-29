import type { ReactNode } from 'react';
import Link from 'next/link';
import { PencilSimple, Plus } from '@/components/icons/PhosphorIcons';

function renderButtonIcon(icon?: string) {
  if (!icon) return null;
  if (icon === 'edit') return <PencilSimple className="h-4 w-4 shrink-0" />;
  if (icon === 'add') return <Plus className="h-4 w-4 shrink-0" />;
  return null;
}

export default function DashboardPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-1 flex items-center gap-2.5">
          <h1 className="text-[28px] font-bold leading-none tracking-[-0.03em] text-[#fdfffc]">
            {title}
          </h1>
          <span className="mt-0.5 flex items-center gap-1">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--status-live)] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--status-live)]" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/45">
              Live
            </span>
          </span>
        </div>
        {subtitle ? <p className="text-[13px] text-white/55">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}


export function DashboardPrimaryButton({
  href,
  icon,
  children,
}: {
  href: string;
  icon?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-none border border-border bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground no-underline shadow-sm transition hover:opacity-90 touch-target"
    >
      {renderButtonIcon(icon)}
      {children}
    </Link>
  );
}

export function DashboardSecondaryButton({
  href,
  icon,
  children,
}: {
  href: string;
  icon?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-none border border-border bg-card px-4 py-2 text-xs font-semibold text-card-foreground no-underline shadow-sm transition hover:bg-muted touch-target"
    >
      {renderButtonIcon(icon)}
      {children}
    </Link>
  );
}

