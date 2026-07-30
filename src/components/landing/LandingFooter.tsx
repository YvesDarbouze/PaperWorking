'use client';

import Link from 'next/link';
import Logo from '@/components/brand/Logo';

/* ═══════════════════════════════════════════════════════
   LandingFooter — Antigravity-style sitemap footer.

   5-column desktop grid:
     Brand  |  Main Navigation  |  Support & Resources  |  Authentication  |  Legal
   ═══════════════════════════════════════════════════════ */

interface FooterColumn {
  heading: string;
  links: { label: string; href: string; external?: boolean }[];
}

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: 'Main Navigation',
    links: [
      { label: 'How It Works',  href: '/how-it-works' },
      { label: 'Marketplaces',  href: '/marketplaces' },
      { label: 'Pricing',       href: '/pricing'      },
      { label: 'Support',       href: '/support'      },
    ],
  },
  {
    heading: 'Support & Resources',
    links: [
      { label: 'Support Center',     href: '/support'               },
      { label: 'The Playbook (33 Metrics)', href: '/support/metrics' },
      { label: 'Real Estate Glossary', href: '/support/glossary' },
      { label: 'Knowledge Base',     href: '/help'                  },
      { label: 'Help Center',        href: '/help'                  },
      { label: 'Company Blog',       href: '/blog'                  },
      { label: 'Case Studies',       href: '/blog'                  },
      { label: 'Changelog',          href: '/changelog'             },
    ],
  },
  {
    heading: 'Account',
    links: [
      { label: 'Start 14-Day Trial',      href: '/pricing'          },
      { label: 'Sign In',                 href: '/login'            },
      { label: 'Create Account',          href: '/register'         },
      { label: 'Forgot Password',         href: '/forgot-password'  },
      { label: 'Accept Team Invite',      href: '/invite'           },
    ],
  },
  {
    heading: 'Company & Legal',
    links: [
      { label: 'About',            href: '/about'          },
      { label: 'Careers',          href: '/careers'        },
      { label: 'Contact',          href: '/contact'        },
      { label: 'Privacy Policy',   href: '/privacy'        },
      { label: 'Terms of Service', href: '/terms'          },
      { label: 'Cookie Policy',    href: '/cookies'        },
    ],
  },
];

function FooterCol({ heading, links }: FooterColumn) {
  return (
    <div>
      <p
        className="mb-4 text-[11px] font-semibold uppercase tracking-[0.07em] type-eyebrow"
        style={{ color: 'var(--color-on-surface-variant)' }}
      >
        {heading}
      </p>
      <ul className="space-y-2.5">
        {links.map(({ label, href, external }) => (
          <li key={label}>
            <Link
              href={href}
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer' : undefined}
              className="text-[13.5px] transition-opacity duration-150 type-small type-cta"
              style={{ color: 'var(--color-on-surface-variant)', opacity: 0.8, textDecoration: 'none' }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-on-surface)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.8'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-on-surface-variant)'; }}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function LandingFooter() {
  return (
    <footer
      className="w-full"
      style={{ borderTop: '1px solid color-mix(in srgb, var(--color-on-background) 7%, transparent)' }}
    >
      <div className="max-w-[1280px] mx-auto px-5 md:px-10 pt-16 pb-12">

        {/* ── Top: Brand + Columns ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 md:gap-8 mb-16">

          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Logo href="/" surface="marketing-footer" className="mb-5" />
            <p
              className="text-[13.5px] leading-relaxed mb-6 type-caption"
              style={{ color: 'var(--color-on-surface-variant)', opacity: 0.75, maxWidth: '200px' }}
            >
              Precision deal management for serious real estate investors.
            </p>

            {/* CTA */}
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold transition-opacity duration-150 active:scale-[0.98] type-cta"
              style={{
                background: 'var(--color-on-surface)',
                color: 'var(--color-surface)',
                borderRadius: '9999px',
                padding: '8px 16px',
                textDecoration: 'none',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Start Free Trial
              <span
                className="material-symbols-outlined text-[13px]"
                style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}
              >
                arrow_forward
              </span>
            </Link>
          </div>

          {/* Link columns */}
          {FOOTER_COLUMNS.map(col => (
            <FooterCol key={col.heading} {...col} />
          ))}
        </div>

        {/* ── Bottom bar ── */}
        <div
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-8"
          style={{ borderTop: '1px solid color-mix(in srgb, var(--color-on-background) 6%, transparent)' }}
        >
          {/* Copyright */}
          <p
            className="text-[12.5px] type-caption"
            style={{ color: 'var(--color-on-surface-variant)', opacity: 0.80 }}
          >
            © 2026 PaperWorking Corp. All rights reserved.
          </p>

          {/* Bottom links */}
          <div className="flex items-center gap-5">
            {[
              { label: 'Privacy',     href: '/privacy'        },
              { label: 'Terms',       href: '/terms'          },
              { label: 'Cookies',     href: '/cookies'        },
              { label: 'Subprocessors', href: '/subprocessors' },
            ].map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="text-[12.5px] transition-opacity duration-150 type-caption type-cta"
                style={{ color: 'var(--color-on-surface-variant)', opacity: 0.80, textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.80')}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

      </div>
    </footer>
  );
}
