import { Metadata } from 'next';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';

/* ═══════════════════════════════════════════════════════
   /data-deletion — Data Deletion Instructions
   
   Obsidian glass theme. LandingHeader + LandingFooter.
   ═══════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: 'Data Deletion Instructions — PaperWorking',
  description:
    'Learn how to request deletion of your data from PaperWorking. We respect your right to privacy and make it easy to remove your account and associated data.',
};

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface dark">
      <LandingHeader />

      <main className="max-w-3xl mx-auto px-6 md:px-margin-desktop pt-32 pb-24">
        {/* ── Hero ── */}
        <p className="font-label-sm text-label-sm text-primary uppercase tracking-widest mb-4">
          Legal
        </p>
        <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mb-3">
          Data Deletion Instructions
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-16">
          How to delete your data · Last updated May 2026
        </p>

        {/* ── Content sections ── */}
        <div className="space-y-10">
          {/* Overview */}
          <section
            className="rounded-2xl p-8 sm:p-10"
            style={{
              background: 'linear-gradient(135deg, rgba(34,43,50,0.4), rgba(22,19,24,0.8))',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderTop: '1px solid rgba(255,255,255,0.12)',
              borderLeft: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <h2 className="font-label-md text-label-md text-on-surface mb-4">
              Overview
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              PaperWorking respects your right to control your personal data. If
              you would like to delete your account and all associated data from
              our platform, you may do so at any time using one of the methods
              described below.
            </p>
          </section>

          {/* Option 1 */}
          <section
            className="rounded-2xl p-8 sm:p-10"
            style={{
              background: 'linear-gradient(135deg, rgba(34,43,50,0.4), rgba(22,19,24,0.8))',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderTop: '1px solid rgba(255,255,255,0.12)',
              borderLeft: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <h2 className="font-label-md text-label-md text-on-surface mb-4">
              Option 1 — Delete from Your Account Settings
            </h2>
            <ol className="list-decimal list-inside space-y-3 font-body-md text-body-md text-on-surface-variant leading-relaxed">
              <li>
                Log in to your PaperWorking account at{' '}
                <a
                  href="https://paperworking.co"
                  className="text-primary hover:underline decoration-primary/50"
                >
                  paperworking.co
                </a>
                .
              </li>
              <li>
                Navigate to <strong className="text-on-surface">Dashboard → Settings → Account</strong>.
              </li>
              <li>
                Scroll to the <strong className="text-on-surface">&quot;Delete Account&quot;</strong> section at the
                bottom of the page.
              </li>
              <li>
                Click <strong className="text-on-surface">&quot;Delete My Account &amp; Data&quot;</strong> and confirm
                the action.
              </li>
            </ol>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed mt-4">
              This will permanently remove your account and all associated data
              including deals, pipelines, documents, and analytics.
            </p>
          </section>

          {/* Option 2 */}
          <section
            className="rounded-2xl p-8 sm:p-10"
            style={{
              background: 'linear-gradient(135deg, rgba(34,43,50,0.4), rgba(22,19,24,0.8))',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderTop: '1px solid rgba(255,255,255,0.12)',
              borderLeft: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <h2 className="font-label-md text-label-md text-on-surface mb-4">
              Option 2 — Email a Data Deletion Request
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              If you are unable to access your account or prefer to submit a
              request manually, send an email to{' '}
              <a
                href="mailto:privacy@paperworking.co"
                className="text-primary hover:underline decoration-primary/50"
              >
                privacy@paperworking.co
              </a>{' '}
              with the subject line <strong className="text-on-surface">&quot;Data Deletion Request&quot;</strong>.
            </p>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed mt-3">
              Please include the email address associated with your PaperWorking
              account so we can locate your records. We will process your request
              within <strong className="text-on-surface">30 days</strong> and send a confirmation once
              complete.
            </p>
          </section>

          {/* What gets deleted */}
          <section
            className="rounded-2xl p-8 sm:p-10"
            style={{
              background: 'linear-gradient(135deg, rgba(34,43,50,0.4), rgba(22,19,24,0.8))',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderTop: '1px solid rgba(255,255,255,0.12)',
              borderLeft: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <h2 className="font-label-md text-label-md text-on-surface mb-4">
              What Data Is Deleted
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed mb-4">
              Upon processing your deletion request, we will remove:
            </p>
            <ul className="list-disc list-inside space-y-2 font-body-md text-body-md text-on-surface-variant">
              <li>Your user profile and account credentials</li>
              <li>All deals, pipeline entries, and associated documents</li>
              <li>Rehab budgets, financial analyses, and investor reports</li>
              <li>Activity logs, analytics, and usage data</li>
              <li>Any stored preferences or settings</li>
            </ul>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed mt-4">
              Certain anonymized, aggregated data that cannot be used to identify
              you may be retained for platform improvement purposes.
            </p>
          </section>

          {/* Third-party logins */}
          <section
            className="rounded-2xl p-8 sm:p-10"
            style={{
              background: 'linear-gradient(135deg, rgba(34,43,50,0.4), rgba(22,19,24,0.8))',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderTop: '1px solid rgba(255,255,255,0.12)',
              borderLeft: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <h2 className="font-label-md text-label-md text-on-surface mb-4">
              Third-Party Login Permissions
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed mb-4">
              If you signed up using a third-party provider (e.g., Google or
              Facebook), deleting your PaperWorking data does not revoke the
              third-party app permission. To fully disconnect:
            </p>
            <ul className="list-disc list-inside space-y-3 font-body-md text-body-md text-on-surface-variant">
              <li>
                <strong className="text-on-surface">Google:</strong> Visit{' '}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline decoration-primary/50"
                >
                  Google Account Permissions
                </a>{' '}
                and remove PaperWorking.
              </li>
              <li>
                <strong className="text-on-surface">Facebook:</strong> Go to{' '}
                <a
                  href="https://www.facebook.com/settings?tab=applications"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline decoration-primary/50"
                >
                  Facebook App Settings
                </a>{' '}
                and remove PaperWorking.
              </li>
            </ul>
          </section>

          {/* Contact */}
          <section
            className="rounded-2xl p-8 sm:p-10"
            style={{
              background: 'linear-gradient(135deg, rgba(34,43,50,0.4), rgba(22,19,24,0.8))',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderTop: '1px solid rgba(255,255,255,0.12)',
              borderLeft: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <h2 className="font-label-md text-label-md text-on-surface mb-4">
              Contact
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              For any questions about your data or this process, contact us at{' '}
              <a
                href="mailto:privacy@paperworking.co"
                className="text-primary hover:underline decoration-primary/50"
              >
                privacy@paperworking.co
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
