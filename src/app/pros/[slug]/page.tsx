import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowLeft,
  Star,
  Shield,
  MapPin,
  Clock,
  CheckCircle,
  Phone,
  Globe,
  BadgeCheck,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   PaperWorking — Public Vendor Profile (/pros/[slug])
   SEO-indexable public profile for each vendor.
   Fetches vendor data by slug (url-safe companyName or uid).
   ═══════════════════════════════════════════════════════════════ */

// Dynamic page — data fetched at request time
export const dynamic = 'force-dynamic';

// ── Types ──────────────────────────────────────────────────────
interface PublicVendor {
  uid: string;
  companyName: string;
  type: string;
  bio: string;
  specialties: string[];
  licensingStates: string[];
  serviceAreas: string[];
  avgTurnaroundDays: number;
  overallRating: number;
  totalReviews: number;
  availability: string;
  feeRangeLabel: string;
  verified: boolean;
  insuranceVerified: boolean;
  website?: string;
  phone?: string;
  yearsExperience?: number;
  completedJobs?: number;
}

interface PublicReview {
  id: string;
  rating: number;
  speedRating: number;
  accuracyRating: number;
  feedback: string;
  createdAt: string;
  investorName: string;
}

// ── Metadata ───────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const displayName = slug.replace(/-/g, ' ');
  return {
    title: `${displayName} · PaperWorking Marketplace`,
    description: `View ${displayName}'s profile, ratings, and specialties on PaperWorking's vendor marketplace.`,
    openGraph: {
      title: `${displayName} · PaperWorking Marketplace`,
      description: `Real estate professional profile on PaperWorking.`,
      type: 'profile',
    },
  };
}

// ── Demo Data (replaced by Firestore fetch in production) ──────
function getDemoVendor(slug: string): PublicVendor {
  return {
    uid: slug,
    companyName: slug
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase()),
    type: 'Inspector',
    bio: 'Licensed home inspector serving the greater metropolitan area. Specialized in pre-purchase inspections for residential investment properties with 10+ years of experience.',
    specialties: [
      'Pre-Purchase',
      'Mold & Moisture',
      'Structural',
      'Multi-Family',
    ],
    licensingStates: ['FL', 'GA'],
    serviceAreas: ['33101', '33102', '33109', '33125', '33130'],
    avgTurnaroundDays: 3,
    overallRating: 4.8,
    totalReviews: 47,
    availability: 'Available',
    feeRangeLabel: '$350 - $800',
    verified: true,
    insuranceVerified: true,
    website: 'https://example.com',
    phone: '(305) 555-0142',
    yearsExperience: 12,
    completedJobs: 234,
  };
}

function getDemoReviews(): PublicReview[] {
  return [
    {
      id: '1',
      rating: 5,
      speedRating: 5,
      accuracyRating: 5,
      feedback:
        'Extremely thorough report delivered same-day. Found a foundation issue that saved us $40K. Highly recommend.',
      createdAt: '2024-11-15',
      investorName: 'Jordan M.',
    },
    {
      id: '2',
      rating: 5,
      speedRating: 4,
      accuracyRating: 5,
      feedback:
        'Detailed inspection with clear photos. Communicated well throughout. Will use again.',
      createdAt: '2024-10-28',
      investorName: 'Priya K.',
    },
    {
      id: '3',
      rating: 4,
      speedRating: 4,
      accuracyRating: 4,
      feedback:
        'Good turnaround, professional report. Slightly delayed but made up for it with thoroughness.',
      createdAt: '2024-09-12',
      investorName: 'Marcus T.',
    },
  ];
}

// ── Page Component ─────────────────────────────────────────────
export default async function VendorProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // TODO: Replace with Firestore fetch by slug
  const vendor = getDemoVendor(slug);
  const reviews = getDemoReviews();

  return (
    <div className="min-h-screen bg-[#0d0a0b] text-white font-sans antialiased">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-40 bg-[#0d0a0b]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-[#454955] font-bold text-xl tracking-tighter">
              PaperWorking
            </span>
          </Link>
          <Link
            href="/dashboard/marketplace"
            className="text-sm text-[#9E9DA0] hover:text-white transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Marketplace
          </Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Left Column: Profile Card ── */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Header */}
            <div className="glass-card rounded-xl border border-white/[0.06] p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-xl bg-[#454955]/10 border border-[#454955]/20 flex items-center justify-center text-[#454955] font-bold text-2xl">
                  {vendor.companyName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold leading-tight truncate">
                    {vendor.companyName}
                  </h1>
                  <p className="text-sm text-[#454955] font-medium">
                    {vendor.type}
                  </p>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                {vendor.verified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#454955]/10 border border-[#454955]/20 text-[#454955] text-[10px] font-bold uppercase">
                    <BadgeCheck className="w-3 h-3" /> Verified
                  </span>
                )}
                {vendor.insuranceVerified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase">
                    <Shield className="w-3 h-3" /> Insured
                  </span>
                )}
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-6">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.round(vendor.overallRating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-600'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-bold font-mono">
                  {vendor.overallRating}
                </span>
                <span className="text-xs text-[#9E9DA0]">
                  ({vendor.totalReviews} reviews)
                </span>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-xl font-bold font-mono text-[#454955]">
                    {vendor.avgTurnaroundDays}d
                  </p>
                  <p className="text-[10px] text-[#9E9DA0] uppercase tracking-wider">
                    Avg. Turnaround
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-xl font-bold font-mono text-[#454955]">
                    {vendor.completedJobs ?? '—'}
                  </p>
                  <p className="text-[10px] text-[#9E9DA0] uppercase tracking-wider">
                    Completed Jobs
                  </p>
                </div>
              </div>
            </div>

            {/* Contact & Details */}
            <div className="glass-card rounded-xl border border-white/[0.06] p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#9E9DA0] mb-3">
                Details
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-[#C0BEC2]">
                  <MapPin className="w-4 h-4 text-[#454955] flex-shrink-0" />
                  <span>{vendor.licensingStates.join(', ')}</span>
                </div>
                <div className="flex items-center gap-3 text-[#C0BEC2]">
                  <Clock className="w-4 h-4 text-[#454955] flex-shrink-0" />
                  <span>{vendor.availability}</span>
                </div>
                {vendor.phone && (
                  <div className="flex items-center gap-3 text-[#C0BEC2]">
                    <Phone className="w-4 h-4 text-[#454955] flex-shrink-0" />
                    <span>{vendor.phone}</span>
                  </div>
                )}
                {vendor.website && (
                  <div className="flex items-center gap-3 text-[#C0BEC2]">
                    <Globe className="w-4 h-4 text-[#454955] flex-shrink-0" />
                    <a
                      href={vendor.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[#454955] transition-colors truncate"
                    >
                      {vendor.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
              </div>
              <div className="pt-3 border-t border-white/[0.04]">
                <p className="text-xs text-[#9E9DA0] mb-1">Fee Range</p>
                <p className="text-lg font-bold font-mono">
                  {vendor.feeRangeLabel}
                </p>
              </div>
            </div>

            {/* CTA */}
            <Link
              href="/login"
              className="flex items-center justify-center w-full py-3.5 rounded-xl bg-[#454955] text-[#0d0a0b] text-sm font-bold hover:bg-[#454955]/90 transition-all shadow-[0_0_20px_rgba(69, 73, 85,0.2)]"
            >
              Request Quote
            </Link>

            {/* Disclosure */}
            <p className="text-[10px] text-[#6B6870] leading-relaxed text-center">
              PaperWorking does not vet vendors. You must verify credentials and references before engaging. All ratings reflect investor feedback.
            </p>
          </div>

          {/* ── Right Column: Bio + Reviews ── */}
          <div className="lg:col-span-2 space-y-8">
            {/* Bio */}
            <div className="glass-card rounded-xl border border-white/[0.06] p-8">
              <h2 className="text-lg font-bold mb-4">About</h2>
              <p className="text-sm text-[#C0BEC2] leading-relaxed whitespace-pre-line">
                {vendor.bio}
              </p>
              {vendor.yearsExperience && (
                <p className="text-sm text-[#9E9DA0] mt-3">
                  <strong className="text-white">
                    {vendor.yearsExperience}+ years
                  </strong>{' '}
                  of experience
                </p>
              )}
            </div>

            {/* Specialties */}
            <div className="glass-card rounded-xl border border-white/[0.06] p-8">
              <h2 className="text-lg font-bold mb-4">Specialties</h2>
              <div className="flex flex-wrap gap-2">
                {vendor.specialties.map((s) => (
                  <span
                    key={s}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-[#C0BEC2]"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Service Areas */}
            {vendor.serviceAreas.length > 0 && (
              <div className="glass-card rounded-xl border border-white/[0.06] p-8">
                <h2 className="text-lg font-bold mb-4">Service Areas</h2>
                <div className="flex flex-wrap gap-2">
                  {vendor.serviceAreas.map((zip) => (
                    <span
                      key={zip}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-[#9E9DA0] font-mono"
                    >
                      {zip}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div className="glass-card rounded-xl border border-white/[0.06] p-8">
              <h2 className="text-lg font-bold mb-6">
                Reviews ({reviews.length})
              </h2>
              <div className="space-y-6">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="pb-6 border-b border-white/[0.04] last:border-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center text-xs font-bold text-[#C0BEC2]">
                          {review.investorName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold">
                            {review.investorName}
                          </p>
                          <p className="text-[10px] text-[#6B6870]">
                            {review.createdAt}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: review.rating }).map((_, i) => (
                          <Star
                            key={i}
                            className="w-3 h-3 fill-amber-400 text-amber-400"
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-[#C0BEC2] leading-relaxed">
                      {review.feedback}
                    </p>
                    <div className="flex gap-4 mt-3">
                      <span className="text-[10px] text-[#6B6870] uppercase">
                        Speed:{' '}
                        <strong className="text-[#C0BEC2]">
                          {review.speedRating}/5
                        </strong>
                      </span>
                      <span className="text-[10px] text-[#6B6870] uppercase">
                        Accuracy:{' '}
                        <strong className="text-[#C0BEC2]">
                          {review.accuracyRating}/5
                        </strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
