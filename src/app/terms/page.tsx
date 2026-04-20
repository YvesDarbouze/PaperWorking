import Link from 'next/link';

export const metadata = { title: 'Terms of Service — PaperWorking' };

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-pw-bg px-6 py-20 max-w-3xl mx-auto">
      <Link href="/" className="text-xs font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity">
        ← Back
      </Link>
      <h1 className="mt-10 text-4xl font-light tracking-tighter text-pw-black">Governance Protocols</h1>
      <p className="mt-4 text-sm text-pw-muted">Terms of Service · Last updated April 2026</p>
      <div className="mt-12 space-y-8 text-sm text-pw-muted leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-pw-black mb-3">1. Acceptance of Terms</h2>
          <p>By accessing or using PaperWorking, you agree to be bound by these Terms of Service and all applicable laws and regulations.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-pw-black mb-3">2. Use of Service</h2>
          <p>PaperWorking is a real estate investment operations platform. You agree to use the service only for lawful purposes and in accordance with these terms.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-pw-black mb-3">3. Confidentiality</h2>
          <p>Deal data, financial projections, and pipeline information entered into PaperWorking are confidential to your organization. You are responsible for maintaining the security of your credentials.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-pw-black mb-3">4. Limitation of Liability</h2>
          <p>PaperWorking is provided "as is." We make no warranties regarding accuracy of financial calculations or market data. Always verify critical numbers with a licensed professional.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-pw-black mb-3">5. Contact</h2>
          <p>For questions about these terms, contact <a href="mailto:legal@paperworking.co" className="text-pw-black underline">legal@paperworking.co</a>.</p>
        </section>
      </div>
    </main>
  );
}
