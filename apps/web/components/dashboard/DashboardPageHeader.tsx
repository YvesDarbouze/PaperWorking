import type { ReactNode } from 'react';
import Link from 'next/link';

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
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
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
      className="flex items-center gap-1.5 rounded-lg border border-white/12 bg-[#454955]/90 px-3.5 py-2 text-[12px] font-semibold text-[#fdfffc] no-underline"
    >
      {icon ? <span className="material-symbols-outlined text-[15px]">{icon}</span> : null}
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
      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-3.5 py-2 text-[12px] font-semibold text-white/70 no-underline hover:text-white"
    >
      {icon ? <span className="material-symbols-outlined text-[15px]">{icon}</span> : null}
      {children}
    </Link>
  );
}
