'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, CheckCircle, ShieldAlert, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { submitTakedownReport } from '@/actions/takedown';

export default function TakedownPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0d0a0b] flex items-center justify-center text-white px-4">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    }>
      <TakedownPageInner />
    </Suspense>
  );
}

function TakedownPageInner() {
  const searchParams = useSearchParams();
  const initialListingId = searchParams.get('listingId') || '';
  const initialAddress = searchParams.get('address') || '';

  const [reporterName, setReporterName] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [relationship, setRelationship] = useState('owner');
  const [propertyAddress, setPropertyAddress] = useState(initialAddress);
  const [listingId, setListingId] = useState(initialListingId);
  const [reason, setReason] = useState('unauthorized');
  const [details, setDetails] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reporterName || !reporterEmail || !propertyAddress || !details) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await submitTakedownReport({
        reporterName,
        reporterEmail,
        relationship,
        listingId: listingId || undefined,
        propertyAddress,
        reason,
        details,
      });

      if (res.success) {
        setSuccess(true);
      } else {
        throw new Error('Failed to submit report');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0a0b] text-[#e8e6ea] flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Brand Header */}
      <header className="px-8 py-6 flex items-center justify-between border-b border-white/5 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-white">
            Paper<span className="font-light text-[var(--color-primary)]">Working</span>
          </span>
        </div>
        <Link href="/" className="text-xs text-[var(--color-muted)] hover:text-white transition-colors">
          Back to website
        </Link>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center px-4 py-16 z-10">
        <div className="w-full max-w-xl glass-card rounded-2xl p-8 border border-white/5 relative overflow-hidden bg-[var(--color-surface)]/20 backdrop-blur-xl">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-500/5 rounded-full blur-[50px] pointer-events-none" />

          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Header Icon & Title */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 text-red-500 mb-4 border border-red-500/20">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Property Owner Takedown Request</h2>
                <p className="text-xs text-[var(--color-muted)] mt-2">
                  Submit a report for property listings posted without authorization.
                </p>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{error}</p>
                </div>
              )}

              {/* Form Fields */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[var(--color-muted)] mb-1.5 font-semibold">Your Name *</label>
                    <input
                      type="text"
                      required
                      value={reporterName}
                      onChange={(e) => setReporterName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 transition-colors"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[var(--color-muted)] mb-1.5 font-semibold">Your Email *</label>
                    <input
                      type="email"
                      required
                      value={reporterEmail}
                      onChange={(e) => setReporterEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 transition-colors"
                      placeholder="jane@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[var(--color-muted)] mb-1.5 font-semibold">Claim / Relationship *</label>
                    <select
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 transition-colors text-white"
                    >
                      <option value="owner" className="bg-[#121014]">Property Owner</option>
                      <option value="tenant" className="bg-[#121014]">Tenant</option>
                      <option value="agent" className="bg-[#121014]">Authorized Agent</option>
                      <option value="other" className="bg-[#121014]">Other Affected Party</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[var(--color-muted)] mb-1.5 font-semibold">Listing ID (Optional)</label>
                    <input
                      type="text"
                      value={listingId}
                      onChange={(e) => setListingId(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 transition-colors"
                      placeholder="listing_123"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-[var(--color-muted)] mb-1.5 font-semibold">Property Address *</label>
                  <input
                    type="text"
                    required
                    value={propertyAddress}
                    onChange={(e) => setPropertyAddress(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 transition-colors"
                    placeholder="123 Main St, Austin, TX 78701"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-[var(--color-muted)] mb-1.5 font-semibold">Reason for Request *</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 transition-colors text-white"
                  >
                    <option value="unauthorized" className="bg-[#121014]">Listing posted without owner consent</option>
                    <option value="incorrect" className="bg-[#121014]">Misrepresented property information</option>
                    <option value="intellectual_property" className="bg-[#121014]">Copyright or trademark infringement</option>
                    <option value="other" className="bg-[#121014]">Other / Privacy concerns</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-[var(--color-muted)] mb-1.5 font-semibold">Details & Supporting Evidence *</label>
                  <textarea
                    required
                    rows={4}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 transition-colors resize-none"
                    placeholder="Please explain why this listing should be taken down and verify your connection to the property."
                  />
                </div>
              </div>

              {/* Action Button */}
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-500 active:scale-[0.99] transition-all py-3.5 px-4 rounded-xl font-bold text-sm uppercase tracking-wider text-white flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  {loading ? 'Submitting Report…' : 'Submit Takedown Request'}
                </button>
              </div>

              <p className="text-[11px] text-center text-[var(--color-muted)] leading-relaxed">
                Reports are placed in our operator queue with a 24-hour SLA. While reviewed,
                public visibility of the listing is suspended.
              </p>
            </form>
          ) : (
            <div className="space-y-6 text-center py-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 mb-2 border border-emerald-500/20">
                <CheckCircle className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">Takedown Request Submitted</h3>
              <p className="text-sm text-[var(--color-muted)] leading-relaxed max-w-sm mx-auto">
                We have received your request. The listing has been temporarily suspended from public search and views.
                Our moderation team will review the claim within 24 hours.
              </p>
              
              <div className="pt-4">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)] hover:underline uppercase tracking-wider"
                >
                  Return to homepage
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-8 py-6 text-center border-t border-white/5 text-[11px] text-[var(--color-muted)]">
        &copy; {new Date().getFullYear()} PaperWorking Inc. All rights reserved. 
        Read our terms of service and compliance rules.
      </footer>
    </div>
  );
}
