import Link from 'next/link';

export const metadata = { title: 'Privacy Policy — PaperWorking' };

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-pw-bg px-6 py-20 max-w-3xl mx-auto">
      <Link href="/" className="text-xs font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity">
        ← Back
      </Link>
      <h1 className="mt-10 text-4xl font-light tracking-tighter text-pw-black">Privacy Mandates</h1>
      <p className="mt-4 text-sm text-pw-muted">Privacy Policy · Last updated April 2026</p>
      <div className="mt-12 space-y-8 text-sm text-pw-muted leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-pw-black mb-3">1. Information We Collect</h2>
          <p>We collect account information (name, email), deal and pipeline data you enter, and usage analytics to improve the platform.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-pw-black mb-3">2. How We Use Your Data</h2>
          <p>Your data is used solely to provide PaperWorking's features. We do not sell or share your deal data with third parties.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-pw-black mb-3">3. Data Storage</h2>
          <p>Data is stored securely using Firebase (Google Cloud) infrastructure with encryption at rest and in transit.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-pw-black mb-3">4. Your Rights</h2>
          <p>You may request deletion of your account and associated data at any time by contacting support.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-pw-black mb-3">5. Cookies</h2>
          <p>We use HttpOnly session cookies for authentication only. No third-party advertising cookies are set.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-pw-black mb-3">6. Contact</h2>
          <p>For privacy inquiries, contact <a href="mailto:privacy@paperworking.co" className="text-pw-black underline">privacy@paperworking.co</a>.</p>
        </section>
      </div>
    </main>
  );
}
