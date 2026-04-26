'use client';

import Link from 'next/link';
import Logo from '@/components/brand/Logo';

/* ═══════════════════════════════════════════════════════
   LandingFooter — Antigravity Design System
   
   Multi-column footer with newsletter CTA, nav links,
   social icons, and legal. Strict grayscale palette.
   ═══════════════════════════════════════════════════════ */

/* ── Inline SVGs ── */
function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.261 5.632 5.903-5.632Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.696 4.533-4.696 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

/* ── Footer Link Columns ── */
const footerColumns = [
  {
    title: 'Product',
    links: [
      { label: 'How It Works', href: '/#how-it-works' },
      { label: 'Pricing', href: '/#pricing' },
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'News', href: '/#news' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Blog', href: '/blog' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Cookie Policy', href: '/cookies' },
    ],
  },
];

const socialLinks = [
  { label: 'X (Twitter)', href: 'https://x.com', icon: XIcon },
  { label: 'Facebook', href: 'https://facebook.com', icon: FacebookIcon },
  { label: 'LinkedIn', href: 'https://linkedin.com', icon: LinkedInIcon },
];

export default function LandingFooter() {
  return (
    <footer className="bg-[var(--pw-black)] text-white">
      {/* ── Main Footer Content ── */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">

          {/* ── Brand Column ── */}
          <div className="lg:col-span-4 space-y-6">
            <div className="text-white">
              <Logo size="sm" />
            </div>
            <p className="text-sm leading-relaxed text-white/50 max-w-xs">
              The operating system for real estate investors. Automate paperwork,
              track deals, and close faster.
            </p>

            {/* ── Newsletter ── */}
            <div className="space-y-3 pt-2">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/40">
                Stay in the loop
              </p>
              <form
                onSubmit={(e) => e.preventDefault()}
                className="flex items-stretch gap-0 max-w-xs"
              >
                <input
                  type="email"
                  placeholder="you@email.com"
                  aria-label="Email for newsletter"
                  className="flex-1 min-w-0 bg-white/[0.07] border border-white/10 text-sm text-white placeholder:text-white/30 px-4 py-2.5 rounded-l-full focus:outline-none focus:border-white/30 transition-colors"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-white text-[var(--pw-black)] text-xs font-bold uppercase tracking-widest rounded-r-full hover:bg-white/90 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Join
                </button>
              </form>
            </div>
          </div>

          {/* ── Link Columns ── */}
          {footerColumns.map((col) => (
            <div key={col.title} className="lg:col-span-2">
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-white/40 mb-5">
                {col.title}
              </h3>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/60 hover:text-white transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* ── Support + Social Column ── */}
          <div className="lg:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-white/40 mb-5">
              Support
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/support"
                  className="text-sm text-white/60 hover:text-white transition-colors duration-200"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link
                  href="/support#faq"
                  className="text-sm text-white/60 hover:text-white transition-colors duration-200"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <a
                  href="mailto:support@paperworking.co"
                  className="text-sm text-white/60 hover:text-white transition-colors duration-200"
                >
                  support@paperworking.co
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Bottom Bar ── */}
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-white/30">
            © {new Date().getFullYear()} PaperWorking Corp. All rights reserved.
          </span>

          {/* ── Social Icons ── */}
          <div className="flex items-center gap-5">
            {socialLinks.map(({ label, href, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/30 hover:text-white transition-colors duration-200"
                aria-label={label}
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
