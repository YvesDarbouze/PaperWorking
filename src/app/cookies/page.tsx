import { Metadata } from 'next';
import Link from 'next/link';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';

/* ═══════════════════════════════════════════════════════
   /cookies — Cookie Policy page
   
   Lightweight, legally defensible cookie disclosure.
   Follows Antigravity grayscale design system.
   ═══════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: 'Cookie Policy | PaperWorking',
  description:
    'How PaperWorking uses cookies and similar technologies to keep your session secure and improve your experience.',
};

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-canvas)' }}>
      <MarketingNavbar />

      <main className="max-w-3xl mx-auto px-6 pt-32 pb-24">
        <p
          className="text-[10px] font-black uppercase tracking-[0.35em] mb-6"
          style={{ color: 'var(--text-secondary)' }}
        >
          Legal
        </p>
        <h1
          className="text-4xl sm:text-5xl font-black tracking-tighter leading-none mb-6"
          style={{ color: 'var(--text-primary)' }}
        >
          Cookie Policy
        </h1>
        <p
          className="text-sm mb-12"
          style={{ color: 'var(--text-secondary)' }}
        >
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>

        <div
          className="prose prose-neutral max-w-none"
          style={{ color: 'var(--text-secondary)' }}
        >
          <section className="mb-10">
            <h2
              className="text-lg font-bold tracking-tight mb-3"
              style={{ color: 'var(--text-primary)' }}
            >
              What Are Cookies
            </h2>
            <p className="text-sm leading-relaxed">
              Cookies are small text files stored on your device when you visit a
              website. They help us recognize your browser, remember your
              preferences, and keep your session secure.
            </p>
          </section>

          <section className="mb-10">
            <h2
              className="text-lg font-bold tracking-tight mb-3"
              style={{ color: 'var(--text-primary)' }}
            >
              How We Use Cookies
            </h2>
            <ul className="space-y-4 text-sm leading-relaxed list-none pl-0">
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>Essential cookies</strong> — Required
                for authentication, session management, and security. These cannot
                be disabled without breaking core functionality.
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>Preference cookies</strong> — Remember
                your display settings, selected dashboard layout, and preferred
                date range filters.
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>Analytics cookies</strong> — Help us
                understand how investors use the platform so we can improve
                navigation and feature prioritization. We use privacy-respecting
                analytics that do not sell your data.
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2
              className="text-lg font-bold tracking-tight mb-3"
              style={{ color: 'var(--text-primary)' }}
            >
              Third-Party Cookies
            </h2>
            <p className="text-sm leading-relaxed">
              PaperWorking uses Firebase Authentication and Stripe for payment
              processing. These services may set their own cookies to maintain
              secure sessions. We do not control third-party cookies, but we only
              integrate with providers that meet our security and privacy
              standards.
            </p>
          </section>

          <section className="mb-10">
            <h2
              className="text-lg font-bold tracking-tight mb-3"
              style={{ color: 'var(--text-primary)' }}
            >
              Managing Your Preferences
            </h2>
            <p className="text-sm leading-relaxed">
              Most browsers let you block or delete cookies through their settings
              menu. Please note that disabling essential cookies will prevent you
              from logging in to PaperWorking.
            </p>
          </section>

          <section className="mb-10">
            <h2
              className="text-lg font-bold tracking-tight mb-3"
              style={{ color: 'var(--text-primary)' }}
            >
              Questions?
            </h2>
            <p className="text-sm leading-relaxed">
              If you have questions about how we use cookies, contact us at{' '}
              <a
                href="mailto:privacy@paperworking.co"
                className="font-medium hover:underline"
                style={{ color: 'var(--text-primary)' }}
              >
                privacy@paperworking.co
              </a>
              . For more about how we handle your data, see our{' '}
              <Link
                href="/privacy"
                className="font-medium hover:underline"
                style={{ color: 'var(--text-primary)' }}
              >
                Privacy Policy
              </Link>
              .
            </p>
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
