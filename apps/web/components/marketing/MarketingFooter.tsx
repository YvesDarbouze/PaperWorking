import Link from 'next/link';
import Logo from '@/components/marketing/Logo';
import { ArrowRight } from '@/components/icons/PhosphorIcons';
import { FOOTER_BOTTOM_LINKS, FOOTER_COLUMNS } from '@/lib/marketing/content';

export default function MarketingFooter() {
  return (
    <footer className="w-full border-t border-border bg-background">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 pb-12 pt-14 md:px-8 md:pt-16">
        <div className="mb-16 grid grid-cols-2 gap-10 md:grid-cols-5 md:gap-8">
          <div className="col-span-2 md:col-span-1">
            <Logo href="/" className="mb-5 block" tone="auth" theme="dark" size="h-6" />
            <p className="mb-6 max-w-[200px] text-[13.5px] leading-relaxed text-muted-foreground">
              Precision deal management for serious real estate investors.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 rounded-none bg-primary px-4 py-2 min-h-[44px] text-xs font-semibold text-primary-foreground no-underline transition-opacity hover:opacity-90"
            >
              Start Free 14-Day Trial
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <div key={column.heading}>
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                {column.heading}
              </p>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[13.5px] text-muted-foreground no-underline transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-start justify-between gap-4 border-t border-border pt-8 sm:flex-row sm:items-center">
          <p className="text-[12.5px] text-muted-foreground">
            © 2026 PaperWorking. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            {FOOTER_BOTTOM_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-[12.5px] text-muted-foreground no-underline transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 text-center">
          <p className="mx-auto max-w-[960px] text-[12px] leading-relaxed text-center text-muted-foreground/80">
            PaperWorking is a project management software platform, not an investment advisor or registered broker-dealer. Marketplace listings are for operational deal organization and tracking soft interest only; they do not constitute offers to sell securities.
          </p>
        </div>
      </div>
    </footer>
  );
}
