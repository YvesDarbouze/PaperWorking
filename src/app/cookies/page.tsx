import { Metadata } from 'next';
import Link from 'next/link';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';

/* ═══════════════════════════════════════════════════════
   /cookies — Cookie Policy page
   
   Obsidian glass theme. Unified LandingHeader navigation.
   ═══════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: 'Cookie Policy | PaperWorking',
  description:
    'How PaperWorking uses cookies and similar technologies to keep your session secure and improve your experience.',
};

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface dark">
      <LandingHeader />

      <main className="max-w-3xl mx-auto px-6 md:px-margin-desktop pt-32 pb-24">
        <p className="font-label-sm text-label-sm text-primary uppercase tracking-widest mb-4">
          Legal
        </p>
        <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight leading-none mb-3">
          Cookie Policy
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-16">
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>

        <div className="space-y-10">
          {/* What Are Cookies */}
          <section
            className="rounded-2xl p-8 sm:p-10"
            style={{
              background: 'linear-gradient(135deg, rgba(34,43,50,0.4), rgba(20,29,35,0.8))',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderTop: '1px solid rgba(255,255,255,0.12)',
              borderLeft: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <h2 className="font-label-md text-label-md text-on-surface mb-4">
              What Are Cookies
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              Cookies are small text files stored on your device when you visit a
              website. They help us recognize your browser, remember your
              preferences, and keep your session secure.
            </p>
          </section>

          {/* How We Use Cookies */}
          <section
            className="rounded-2xl p-8 sm:p-10"
            style={{
              background: 'linear-gradient(135deg, rgba(34,43,50,0.4), rgba(20,29,35,0.8))',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderTop: '1px solid rgba(255,255,255,0.12)',
              borderLeft: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <h2 className="font-label-md text-label-md text-on-surface mb-4">
              How We Use Cookies
            </h2>
            <ul className="space-y-4 font-body-md text-body-md text-on-surface-variant leading-relaxed list-none pl-0">
              <li>
                <strong className="text-on-surface">Essential cookies</strong> — Required
                for authentication, session management, and security. These cannot
                be disabled without breaking core functionality.
              </li>
              <li>
                <strong className="text-on-surface">Preference cookies</strong> — Remember
                your display settings, selected dashboard layout, and preferred
                date range filters.
              </li>
              <li>
                <strong className="text-on-surface">Analytics cookies</strong> — Help us
                understand how investors use the platform so we can improve
                navigation and feature prioritization. We use privacy-respecting
                analytics that do not sell your data.
              </li>
            </ul>
          </section>

          {/* Third-Party Cookies */}
          <section
            className="rounded-2xl p-8 sm:p-10"
            style={{
              background: 'linear-gradient(135deg, rgba(34,43,50,0.4), rgba(20,29,35,0.8))',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderTop: '1px solid rgba(255,255,255,0.12)',
              borderLeft: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <h2 className="font-label-md text-label-md text-on-surface mb-4">
              Third-Party Cookies
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              PaperWorking uses Firebase Authentication and Stripe for payment
              processing. These services may set their own cookies to maintain
              secure sessions. We do not control third-party cookies, but we only
              integrate with providers that meet our security and privacy
              standards.
            </p>
          </section>

          {/* Managing Your Preferences */}
          <section
            className="rounded-2xl p-8 sm:p-10"
            style={{
              background: 'linear-gradient(135deg, rgba(34,43,50,0.4), rgba(20,29,35,0.8))',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderTop: '1px solid rgba(255,255,255,0.12)',
              borderLeft: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <h2 className="font-label-md text-label-md text-on-surface mb-4">
              Managing Your Preferences
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              Most browsers let you block or delete cookies through their settings
              menu. Please note that disabling essential cookies will prevent you
              from logging in to PaperWorking.
            </p>
          </section>

          {/* Questions */}
          <section
            className="rounded-2xl p-8 sm:p-10"
            style={{
              background: 'linear-gradient(135deg, rgba(34,43,50,0.4), rgba(20,29,35,0.8))',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderTop: '1px solid rgba(255,255,255,0.12)',
              borderLeft: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <h2 className="font-label-md text-label-md text-on-surface mb-4">
              Questions?
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              If you have questions about how we use cookies, contact us at{' '}
              <a
                href="mailto:privacy@paperworking.co"
                className="text-primary hover:underline decoration-primary/50 transition-colors"
              >
                privacy@paperworking.co
              </a>
              . For more about how we handle your data, see our{' '}
              <Link
                href="/privacy"
                className="text-primary hover:underline decoration-primary/50 transition-colors"
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
