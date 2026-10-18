import type { Metadata } from 'next';
import Link from 'next/link';
import { Gavel } from '@phosphor-icons/react/dist/ssr';
import {
  COOKIE_SECTIONS,
  LEGAL_DRAFT_NOTICE,
  LEGAL_LAST_UPDATED,
} from '@/lib/marketing/legal-data';

export const metadata: Metadata = {
  title: 'Cookie Policy | PaperWorking',
  description:
    'How PaperWorking uses essential session cookies, workspace storage, and security tokens.',
};

export default function CookiesPage() {
  return (
    <div
      data-testid="cookies-policy-page"
      className="mx-auto max-w-3xl px-4 sm:px-6 md:px-8 pt-8 pb-14 sm:pt-10 sm:pb-16 md:pt-12 md:pb-20"
    >
      <div
        data-testid="legal-draft-notice"
        className="mb-8 flex items-center gap-3 rounded-none border border-border bg-muted/40 px-4 py-3 text-xs font-medium text-muted-foreground"
      >
        <Gavel className="h-4 w-4 text-foreground shrink-0" />
        <span>
          <strong className="text-foreground">{LEGAL_DRAFT_NOTICE}:</strong> This document describes verified, active platform session cookies and browser storage practices, subject to final legal counsel certification.
        </span>
      </div>

      <p className="mb-2.5 font-[family-name:var(--font-jetbrains-mono)] text-[11px] sm:text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Legal
      </p>
      <h1 className="landing-display mb-2 text-3xl font-semibold tracking-[-0.02em] text-foreground sm:text-4xl">
        Cookie Policy
      </h1>
      <p className="mb-10 text-sm text-muted-foreground">
        Last updated {LEGAL_LAST_UPDATED}
      </p>

      <div className="space-y-8">
        {COOKIE_SECTIONS.map((section) => (
          <section
            key={section.heading}
            className="rounded-none border border-border bg-card p-6 text-card-foreground shadow-sm ring-1 ring-foreground/10"
          >
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              {section.heading}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {section.body}
            </p>
            {section.subsections && section.subsections.length > 0 && (
              <div className="mt-4 space-y-3 border-t border-border pt-3">
                {section.subsections.map((sub) => (
                  <div
                    key={sub.title}
                    className="rounded-none border border-border/50 bg-muted/20 p-3 text-xs"
                  >
                    <h3 className="font-semibold text-foreground">{sub.title}</h3>
                    <p className="mt-1 text-muted-foreground leading-relaxed">
                      {sub.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-border pt-6">
        <Link
          href="/privacy"
          data-testid="cookies-privacy-link"
          className="inline-flex min-h-[44px] items-center justify-center rounded-none border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground no-underline hover:bg-muted transition"
        >
          Privacy Policy
        </Link>
        <Link
          href="/terms"
          data-testid="cookies-terms-link"
          className="inline-flex min-h-[44px] items-center justify-center rounded-none border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground no-underline hover:bg-muted transition"
        >
          Terms of Service
        </Link>
        <Link
          href="/contact"
          data-testid="cookies-contact-link"
          className="inline-flex min-h-[44px] items-center justify-center rounded-none border border-border bg-muted/40 px-4 py-2 text-xs font-semibold text-foreground no-underline hover:bg-muted transition"
        >
          Contact Support
        </Link>
      </div>
    </div>
  );
}
