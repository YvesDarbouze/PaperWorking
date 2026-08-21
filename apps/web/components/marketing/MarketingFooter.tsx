import Link from 'next/link';
import Logo from '@/components/marketing/Logo';
import { FOOTER_BOTTOM_LINKS, FOOTER_COLUMNS } from '@/lib/marketing/content';

export default function MarketingFooter() {
  return (
    <footer className="w-full" style={{ borderTop: '1px solid var(--nav-border)' }}>
      <div className="w-full min-w-0 px-5 pb-12 pt-16 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16">
        <div className="mb-16 grid grid-cols-2 gap-10 md:grid-cols-5 md:gap-8">
          <div className="col-span-2 md:col-span-1">
            <Logo href="/" className="mb-5 block" tone="auth" theme="dark" size="h-10" />
            <p
              className="mb-6 max-w-[200px] text-[13.5px] leading-relaxed"
              style={{ color: 'var(--color-on-surface-variant)', opacity: 0.75 }}
            >
              Precision deal management for serious real estate investors.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[12.5px] font-semibold text-[#0d0a0b] no-underline transition-opacity hover:opacity-85"
            >
              Start Free 14-Day Trial
              <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
            </Link>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <div key={column.heading}>
              <p
                className="mb-4 text-[11px] font-semibold uppercase tracking-[0.07em]"
                style={{ color: 'var(--color-on-surface-variant)' }}
              >
                {column.heading}
              </p>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[13.5px] no-underline transition-opacity hover:opacity-100"
                      style={{ color: 'var(--color-on-surface-variant)', opacity: 0.8 }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="flex flex-col items-start justify-between gap-4 border-t pt-8 sm:flex-row sm:items-center"
          style={{ borderColor: 'rgba(253, 255, 252, 0.06)' }}
        >
          <p
            className="text-[12.5px]"
            style={{ color: 'var(--color-on-surface-variant)', opacity: 0.8 }}
          >
            © 2026 PaperWorking Corp. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            {FOOTER_BOTTOM_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-[12.5px] no-underline transition-opacity hover:opacity-100"
                style={{ color: 'var(--color-on-surface-variant)', opacity: 0.8 }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
