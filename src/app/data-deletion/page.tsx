import Link from 'next/link';

export const metadata = {
  title: 'Data Deletion Instructions — PaperWorking',
  description:
    'Learn how to request deletion of your data from PaperWorking. We respect your right to privacy and make it easy to remove your account and associated data.',
};

export default function DataDeletionPage() {
  return (
    <main className="min-h-screen bg-bg-primary px-6 py-20 max-w-3xl mx-auto">
      <Link
        href="/"
        className="text-xs font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
      >
        ← Back
      </Link>

      <h1 className="mt-10 text-4xl font-normal tracking-tighter text-text-primary">
        Data Deletion Instructions
      </h1>
      <p className="mt-4 text-sm text-text-secondary">
        How to delete your data · Last updated May 2026
      </p>

      <div className="mt-12 space-y-8 text-sm text-text-secondary leading-relaxed">
        {/* ---- Overview ---- */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            Overview
          </h2>
          <p>
            PaperWorking respects your right to control your personal data. If
            you would like to delete your account and all associated data from
            our platform, you may do so at any time using one of the methods
            described below.
          </p>
        </section>

        {/* ---- Option 1 ---- */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            Option 1 — Delete from Your Account Settings
          </h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>
              Log in to your PaperWorking account at{' '}
              <a
                href="https://paperworking.co"
                className="text-text-primary underline"
              >
                paperworking.co
              </a>
              .
            </li>
            <li>
              Navigate to <strong>Dashboard → Settings → Account</strong>.
            </li>
            <li>
              Scroll to the <strong>"Delete Account"</strong> section at the
              bottom of the page.
            </li>
            <li>
              Click <strong>"Delete My Account &amp; Data"</strong> and confirm
              the action.
            </li>
          </ol>
          <p className="mt-3">
            This will permanently remove your account and all associated data
            including deals, pipelines, documents, and analytics.
          </p>
        </section>

        {/* ---- Option 2 ---- */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            Option 2 — Email a Data Deletion Request
          </h2>
          <p>
            If you are unable to access your account or prefer to submit a
            request manually, send an email to{' '}
            <a
              href="mailto:privacy@paperworking.co"
              className="text-text-primary underline"
            >
              privacy@paperworking.co
            </a>{' '}
            with the subject line <strong>"Data Deletion Request"</strong>.
          </p>
          <p className="mt-3">
            Please include the email address associated with your PaperWorking
            account so we can locate your records. We will process your request
            within <strong>30 days</strong> and send a confirmation once
            complete.
          </p>
        </section>

        {/* ---- What gets deleted ---- */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            What Data Is Deleted
          </h2>
          <p>Upon processing your deletion request, we will remove:</p>
          <ul className="list-disc list-inside space-y-2 mt-3">
            <li>Your user profile and account credentials</li>
            <li>All deals, pipeline entries, and associated documents</li>
            <li>Rehab budgets, financial analyses, and investor reports</li>
            <li>Activity logs, analytics, and usage data</li>
            <li>Any stored preferences or settings</li>
          </ul>
          <p className="mt-3">
            Certain anonymized, aggregated data that cannot be used to identify
            you may be retained for platform improvement purposes.
          </p>
        </section>

        {/* ---- Third-party logins ---- */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            Third-Party Login Permissions
          </h2>
          <p>
            If you signed up using a third-party provider (e.g., Google or
            Facebook), deleting your PaperWorking data does not revoke the
            third-party app permission. To fully disconnect:
          </p>
          <ul className="list-disc list-inside space-y-2 mt-3">
            <li>
              <strong>Google:</strong> Visit{' '}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-primary underline"
              >
                Google Account Permissions
              </a>{' '}
              and remove PaperWorking.
            </li>
            <li>
              <strong>Facebook:</strong> Go to{' '}
              <a
                href="https://www.facebook.com/settings?tab=applications"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-primary underline"
              >
                Facebook App Settings
              </a>{' '}
              and remove PaperWorking.
            </li>
          </ul>
        </section>

        {/* ---- Contact ---- */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            Contact
          </h2>
          <p>
            For any questions about your data or this process, contact us at{' '}
            <a
              href="mailto:privacy@paperworking.co"
              className="text-text-primary underline"
            >
              privacy@paperworking.co
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
