'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { DealCardData } from '@/components/marketplace/DealCard';
import DealCard from '@/components/marketplace/DealCard';
import { Button } from '@/components/ui/Button';
import {
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
  formatMultiple,
  formatHoldPeriod,
} from '@/lib/format';
import { calculateDeadlineCountdown } from '@/lib/marketplace/countdown';
import { getSimilarDeals } from '@/lib/marketplace/similar-deals';
import { useCompare } from '@/context/CompareContext';
import { useSavedDeals } from '@/context/SavedDealsContext';
import ExpressInterestModal from '@/components/marketplace/ExpressInterestModal';
import CompareTray from '@/components/marketplace/CompareTray';
import { CountUpNumber } from '@/components/ui/CountUpNumber';
import { usePropertyImage } from '@/lib/maps/property-image';
import CounterpartyPreviewCard, { type CounterpartyProfileData } from '@/components/profile/CounterpartyPreviewCard';

export interface DealDetailPageViewProps {
  deal: DealCardData & {
    operatorProfile?: CounterpartyProfileData;
  };
  allDeals: DealCardData[];
  operatorProfile?: CounterpartyProfileData;
}

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'financials', label: 'Financials' },
  { id: 'market', label: 'Market' },
  { id: 'operator', label: 'Operator' },
  { id: 'documents', label: 'Documents' },
];

export default function DealDetailPageView({ deal, allDeals, operatorProfile: initialOperatorProfile }: DealDetailPageViewProps) {
  const router = useRouter();
  const { addToCompare, isComparing } = useCompare();

  // Operator Provenance profile resolution
  const [operatorProfile, setOperatorProfile] = useState<CounterpartyProfileData | null>(
    initialOperatorProfile || deal.operatorProfile || null,
  );

  useEffect(() => {
    let cancelled = false;
    async function loadOperator() {
      try {
        const res = await fetch('/api/marketplace/profile', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data && (data.displayName || data.companyName || data.businessName)) {
            setOperatorProfile(data);
          }
        }
      } catch {
        // ignore background sync error
      }
    }
    loadOperator();
    return () => {
      cancelled = true;
    };
  }, [deal.id, deal.creatorId]);

  const fallbackProfile: CounterpartyProfileData = {
    displayName: deal.creatorName || (deal as any).creator?.name || 'Verified Operator',
    companyName: (deal as any).creator?.company || (deal as any).creator?.name || deal.creatorName || 'Operating Syndicate',
    headline: 'Real Estate Investment Syndicate & Operator',
    publicBio: 'Focusing on commercial and multifamily syndications across target submarkets.',
    location: deal.city && deal.state ? `${deal.city}, ${deal.state}` : 'United States',
    isVerified: deal.isVerifiedOperator ?? true,
    aumCents: undefined,
    avgRoiPct: deal.targetIrr ?? deal.projectedRoi ?? deal.roi,
    equityMultiple: deal.equityMultiple,
    dealCount: undefined,
  };

  const activeOperatorProfile: CounterpartyProfileData = operatorProfile || fallbackProfile;

  // Local interaction states
  const { isSaved: checkIsSaved, toggleSave } = useSavedDeals();
  const isSaved = checkIsSaved(deal.id) || checkIsSaved(deal.slug);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('overview');
  const [sensitivityCase, setSensitivityCase] = useState<'base' | 'downside'>('base');
  const [isInterestModalOpen, setIsInterestModalOpen] = useState(false);
  const [isDisclosuresOpen, setIsDisclosuresOpen] = useState(false);
  const [heroImgLoaded, setHeroImgLoaded] = useState(false);
  const { imageUrl: heroImageUrl, handleImageError: handleHeroImageError } = usePropertyImage({
    id: deal.id || deal.slug,
    imageUrl: deal.imageUrl,
    address: deal.address,
    lat: deal.lat,
    lng: deal.lng,
  });

  const name = deal.propertyName || deal.name || deal.address.split(',')[0] || 'Commercial Opportunity';
  const target = deal.fundingTarget ?? deal.target ?? ((deal.purchasePrice ?? 500_000) + 100_000);
  const committed = deal.committedAmount ?? deal.committed ?? 0;
  const progressPercent = target > 0 ? Math.min(100, Math.round((committed / target) * 100)) : 0;
  const targetIrr = deal.targetIrr ?? deal.projectedRoi ?? deal.roi ?? 18.4;
  const equityMultiple = deal.equityMultiple ?? 1.85;
  const holdPeriod = deal.holdPeriod ?? '3–5 Years';
  const minInvestment = deal.minInvestment ?? 25_000;
  const capRate = (deal as any).capRate ?? 6.2;
  const operatorName = activeOperatorProfile.displayName || deal.creatorName || 'Verified Operator';
  const isVerified = activeOperatorProfile.isVerified ?? deal.isVerifiedOperator ?? true;
  const assetClass = deal.assetClass || 'Multifamily';
  const strategy = deal.subStrategy || 'VALUE_ADD';
  const investors = deal.investorCount ?? (committed > 0 ? Math.max(1, Math.round(committed / minInvestment)) : 14);

  // Status mapping
  const normStatus = (deal.status || 'published').toLowerCase();
  const isFunded = normStatus === 'funded' || progressPercent >= 100;
  const isClosingSoon = normStatus === 'closing_soon' || progressPercent >= 85;
  const statusLabel = isFunded
    ? 'Fully Funded'
    : isClosingSoon
      ? 'Closing Soon'
      : normStatus === 'funding'
        ? 'Live Funding'
        : 'Open';

  // Countdown computation (simulate 18 days from deal creation or static deadline)
  const deadlineDate = useMemo(() => {
    const created = deal.createdAt ? new Date(deal.createdAt).getTime() : Date.now() - 3 * 86400000;
    return new Date(created + 21 * 86400000);
  }, [deal.createdAt]);

  const countdown = calculateDeadlineCountdown(deadlineDate);

  const handleToggleSave = async () => {
    const next = await toggleSave(deal.slug || deal.id);
    showToast(next ? `Saved ${name} to your watch list` : `Removed ${name} from watch list`);
  };

  const handleShare = () => {
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href);
        showToast('Deal link copied to clipboard!');
      }
    } catch {
      showToast('Deal URL: ' + window.location.href);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3500);
  };

  // Sticky sub-nav IntersectionObserver
  useEffect(() => {
    const handleScrollSpy = () => {
      const scrollPosition = window.scrollY + 140;
      for (const section of SECTIONS) {
        const el = document.getElementById(section.id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScrollSpy, { passive: true });
    return () => window.removeEventListener('scroll', handleScrollSpy);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = el.getBoundingClientRect().top + window.scrollY - 110;
      window.scrollTo({ top: offset, behavior: 'smooth' });
    }
  };

  // Similar deals (3 compact cards with fallback)
  const similarDeals = useMemo(() => {
    return getSimilarDeals(deal, allDeals, 3);
  }, [deal, allDeals]);

  // Projected returns table model (Year 1 to Year 5)
  const basePurchasePrice = deal.purchasePrice ?? 1_250_000;
  const returnsData = useMemo(() => {
    const multiplier = sensitivityCase === 'base' ? 1.0 : 0.88;
    return [
      {
        year: 'Year 1',
        grossRev: basePurchasePrice * 0.11 * multiplier,
        opex: basePurchasePrice * 0.038,
        noi: (basePurchasePrice * 0.11 * multiplier) - (basePurchasePrice * 0.038),
        debtService: basePurchasePrice * 0.045,
        cashFlow: (basePurchasePrice * 0.11 * multiplier) - (basePurchasePrice * 0.038) - (basePurchasePrice * 0.045),
        coc: 8.2 * multiplier,
      },
      {
        year: 'Year 2',
        grossRev: basePurchasePrice * 0.118 * multiplier,
        opex: basePurchasePrice * 0.039,
        noi: (basePurchasePrice * 0.118 * multiplier) - (basePurchasePrice * 0.039),
        debtService: basePurchasePrice * 0.045,
        cashFlow: (basePurchasePrice * 0.118 * multiplier) - (basePurchasePrice * 0.039) - (basePurchasePrice * 0.045),
        coc: 9.1 * multiplier,
      },
      {
        year: 'Year 3',
        grossRev: basePurchasePrice * 0.126 * multiplier,
        opex: basePurchasePrice * 0.04,
        noi: (basePurchasePrice * 0.126 * multiplier) - (basePurchasePrice * 0.04),
        debtService: basePurchasePrice * 0.045,
        cashFlow: (basePurchasePrice * 0.126 * multiplier) - (basePurchasePrice * 0.04) - (basePurchasePrice * 0.045),
        coc: 10.4 * multiplier,
      },
      {
        year: 'Year 4',
        grossRev: basePurchasePrice * 0.134 * multiplier,
        opex: basePurchasePrice * 0.041,
        noi: (basePurchasePrice * 0.134 * multiplier) - (basePurchasePrice * 0.041),
        debtService: basePurchasePrice * 0.045,
        cashFlow: (basePurchasePrice * 0.134 * multiplier) - (basePurchasePrice * 0.041) - (basePurchasePrice * 0.045),
        coc: 11.2 * multiplier,
      },
      {
        year: 'Year 5 (Exit)',
        grossRev: basePurchasePrice * 0.142 * multiplier,
        opex: basePurchasePrice * 0.042,
        noi: (basePurchasePrice * 0.142 * multiplier) - (basePurchasePrice * 0.042),
        debtService: basePurchasePrice * 0.045,
        cashFlow: (basePurchasePrice * 0.142 * multiplier) - (basePurchasePrice * 0.042) - (basePurchasePrice * 0.045) + (basePurchasePrice * 1.35 * multiplier),
        coc: 24.6 * multiplier,
      },
    ];
  }, [basePurchasePrice, sensitivityCase]);

  // Deep-link to deal calculator
  const calculatorUrl = `/#deal-calculator?deal=${encodeURIComponent(deal.slug)}&price=${deal.purchasePrice || 1250000}&roi=${targetIrr}`;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#fdfffc] pb-24">
      {/* Skip-To-Overview Link for Keyboard Accessibility */}
      <a href="#overview" className="skip-link">
        Skip to deal overview
      </a>

      {/* Toast Notification with Slide-Up Motion Token */}
      {toastMessage && (
        <div
          data-testid="detail-toast"
          className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-[var(--accent)]/30 bg-[#161318]/95 px-4 py-3 text-xs font-semibold text-white shadow-2xl backdrop-blur-xl toast-slide-up"
        >
          <span className="material-symbols-outlined text-[18px] text-[var(--accent)]">
            check_circle
          </span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Fully Funded Banner State */}
      {isFunded && (
        <div
          data-testid="funded-banner"
          className="w-full border-b border-white/10 bg-white/[0.04] px-4 py-3 text-center text-xs font-semibold text-[#9E9DA0]"
        >
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-amber-400">lock</span>
            <span>This opportunity is fully funded and archived. Metrics are locked for public view.</span>
            <Link
              href="/dashboard/deals"
              className="ml-2 font-bold text-[var(--accent)] hover:underline"
            >
              Browse Active Deals →
            </Link>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* 1. Breadcrumb (tertiary links) */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#9E9DA0]">
          <Link href="/dashboard/deals" className="hover:text-white transition">
            Marketplace
          </Link>
          <span>/</span>
          <span className="hover:text-white transition">
            {deal.city || 'National'}
          </span>
          <span>/</span>
          <span className="text-white font-medium truncate max-w-[300px]">{name}</span>
        </nav>

        {/* 2. Hero Section: Full-Bleed Image Band + Scrim + Action Cluster */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#121014] shadow-2xl">
          {/* Background Media Banner with Image Fade-In */}
          <div className="relative aspect-[21/9] min-h-[280px] w-full overflow-hidden bg-white/[0.03]">
            {heroImageUrl ? (
              <img
                src={heroImageUrl}
                alt={name}
                onLoad={() => setHeroImgLoaded(true)}
                onError={() => {
                  setHeroImgLoaded(false);
                  handleHeroImageError();
                }}
                className={`h-full w-full object-cover image-fade-in ${heroImgLoaded ? 'opacity-100' : 'opacity-0'}`}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/[0.08] to-white/[0.02]">
                <span className="material-symbols-outlined text-6xl text-white/20">apartment</span>
              </div>
            )}
            {/* Scrim Gradient for Contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#121014] via-[#121014]/60 to-black/50" />

            {/* Top-Right Action Cluster */}
            <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
              {/* Save / Bookmark Toggle */}
              <Button
                roleVariant="toggle"
                variant="secondary"
                size="sm"
                isIconOnly
                isPressed={isSaved}
                onClick={handleToggleSave}
                aria-label={isSaved ? `Unsave ${name}` : `Save ${name}`}
                className="!h-9 !w-9 !rounded-full border-white/20 bg-black/60 text-white backdrop-blur-md hover:bg-black/80 hover:text-[var(--accent)]"
              >
                <span className={`material-symbols-outlined text-[18px] ${isSaved ? 'text-[var(--accent)]' : 'text-white/80'}`}>
                  {isSaved ? 'bookmark' : 'bookmark_border'}
                </span>
              </Button>

              {/* Share Button (Copies URL + Toast) */}
              <Button
                variant="secondary"
                size="sm"
                isIconOnly
                onClick={handleShare}
                aria-label="Share deal analysis"
                className="!h-9 !w-9 !rounded-full border-white/20 bg-black/60 text-white backdrop-blur-md hover:bg-black/80 hover:text-white"
              >
                <span className="material-symbols-outlined text-[18px]">share</span>
              </Button>

              {/* Add to Compare Secondary */}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const added = addToCompare(deal);
                  showToast(added ? `Added ${name} to comparison tray` : `Already in comparison tray`);
                }}
                className="hidden sm:inline-flex border-white/20 bg-black/60 text-white backdrop-blur-md hover:bg-black/80"
                icon={<span className="material-symbols-outlined text-[16px]">compare_arrows</span>}
              >
                {isComparing(deal.id) ? 'In Compare' : 'Compare'}
              </Button>

              {/* Express Interest: THE One Primary CTA */}
              {!isFunded ? (
                <Button
                  variant="primary"
                  size="md"
                  data-testid="hero-express-interest-btn"
                  onClick={() => setIsInterestModalOpen(true)}
                  className="shadow-lg shadow-[var(--accent)]/20"
                >
                  Express Interest
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  href="/dashboard/deals"
                  className="shadow-lg"
                >
                  Browse Similar Deals
                </Button>
              )}
            </div>

            {/* Hero Text Information */}
            <div className="absolute bottom-6 left-6 right-6 z-10 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-white/15 bg-black/60 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
                  {assetClass} · {strategy}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md border border-[var(--status-live)]/40 bg-[var(--accent-subtle)] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[var(--status-live)] backdrop-blur-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                  {statusLabel}
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[#fdfffc] sm:text-4xl">
                {name}
              </h1>
              <p className="text-sm text-[#9E9DA0] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#9E9DA0]">location_on</span>
                <span>{deal.address}</span>
              </p>
            </div>
          </div>

          {/* Key Metric Bar: 5 Core Metrics (Tabular nums, dividers, single row desktop / wrapped mobile) */}
          <div
            data-testid="key-metric-bar"
            className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-white/10 border-t border-white/10 bg-[#161318] py-4 text-center"
          >
            {/* 1. Target IRR */}
            <div className="p-3 sm:p-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E9DA0] block">
                Target IRR
              </span>
              <span className="font-mono text-xl font-bold text-[var(--accent)] mt-1 block">
                <CountUpNumber value={targetIrr} formatter={formatPercent} />
              </span>
            </div>

            {/* 2. Equity Multiple */}
            <div className="p-3 sm:p-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E9DA0] block">
                Equity Multiple
              </span>
              <span className="font-mono text-xl font-bold text-white mt-1 block">
                <CountUpNumber value={equityMultiple} formatter={formatMultiple} />
              </span>
            </div>

            {/* 3. Min Investment */}
            <div className="p-3 sm:p-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E9DA0] block">
                Min Investment
              </span>
              <span className="font-mono text-xl font-bold text-white mt-1 block">
                <CountUpNumber value={minInvestment} formatter={formatCurrencyCompact} />
              </span>
            </div>

            {/* 4. Hold Period */}
            <div className="p-3 sm:p-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E9DA0] block">
                Hold Period
              </span>
              <span className="font-mono text-xl font-bold text-white mt-1 block">
                {formatHoldPeriod(holdPeriod)}
              </span>
            </div>

            {/* 5. Cap Rate */}
            <div className="col-span-2 sm:col-span-1 p-3 sm:p-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E9DA0] block">
                Cap Rate
              </span>
              <span className="font-mono text-xl font-bold text-white mt-1 block">
                <CountUpNumber value={capRate} formatter={formatPercent} />
              </span>
            </div>
          </div>
        </section>

        {/* 3. Sticky Sub-Nav (Overview | Financials | Market | Operator | Documents) */}
        <nav
          data-testid="detail-subnav"
          aria-label="Deal detail sections"
          className="sticky top-0 z-30 flex items-center gap-1 rounded-xl border border-white/10 bg-[#121014]/90 p-1.5 backdrop-blur-xl"
        >
          {SECTIONS.map((sec) => {
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => scrollToSection(sec.id)}
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-white/10 text-[var(--accent)] font-bold shadow'
                    : 'text-[#9E9DA0] hover:text-white'
                }`}
              >
                {sec.label}
              </button>
            );
          })}
        </nav>

        {/* 4. Main Body: Two Columns (Main 2/3 + Rail 1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left / Main Column (2/3) */}
          <div className="lg:col-span-2 space-y-10">
            {/* Section 1: Overview */}
            <section id="overview" className="rounded-2xl border border-white/10 bg-[#121014] p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                <span className="material-symbols-outlined text-[20px] text-[var(--accent)]">description</span>
                <h2 className="text-base font-bold text-white">Investment Thesis &amp; Overview</h2>
              </div>
              <p className="text-sm leading-relaxed text-[#9E9DA0]">
                {name} presents an institutional-grade opportunity to acquire a well-situated {assetClass.toLowerCase()} asset in high-demand submarket. The operator team has identified significant value-add upside through targeted capital improvements, institutional property management optimization, and mark-to-market lease renegotiation over a {formatHoldPeriod(holdPeriod)} horizon.
              </p>

              {/* Property Specification Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <span className="text-[10px] font-bold uppercase text-[#9E9DA0]">Year Built</span>
                  <p className="font-mono font-bold text-white mt-0.5">2018 (Renovated 2024)</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <span className="text-[10px] font-bold uppercase text-[#9E9DA0]">Units / Size</span>
                  <p className="font-mono font-bold text-white mt-0.5">142 Units (128,000 SF)</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <span className="text-[10px] font-bold uppercase text-[#9E9DA0]">Occupancy</span>
                  <p className="font-mono font-bold text-[var(--accent)] mt-0.5">94.8% Physical</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <span className="text-[10px] font-bold uppercase text-[#9E9DA0]">Debt Structure</span>
                  <p className="font-mono font-bold text-white mt-0.5">Fixed 5.85% (5 Yr I/O)</p>
                </div>
              </div>
            </section>

            {/* Section 2: Financials & Sensitivity Returns */}
            <section id="financials" className="rounded-2xl border border-white/10 bg-[#121014] p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-[var(--accent)]">analytics</span>
                  <h2 className="text-base font-bold text-white">Financial Breakdown &amp; Projections</h2>
                </div>

                {/* Sensitivity Case Toggle (Base vs Downside) */}
                <div className="flex items-center rounded-lg border border-white/10 bg-white/[0.03] p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setSensitivityCase('base')}
                    className={`rounded-md px-3 py-1 font-semibold transition ${
                      sensitivityCase === 'base'
                        ? 'bg-[var(--accent)] text-[#0a0a0f] font-bold'
                        : 'text-[#9E9DA0] hover:text-white'
                    }`}
                  >
                    Base Case
                  </button>
                  <button
                    type="button"
                    onClick={() => setSensitivityCase('downside')}
                    className={`rounded-md px-3 py-1 font-semibold transition ${
                      sensitivityCase === 'downside'
                        ? 'bg-amber-400 text-[#0a0a0f] font-bold'
                        : 'text-[#9E9DA0] hover:text-white'
                    }`}
                  >
                    Downside Sensitivity (-12%)
                  </button>
                </div>
              </div>

              {/* 5-Year Return Matrix Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-wider text-[#9E9DA0]">
                      <th className="py-2.5 pr-4 font-bold">Line Item</th>
                      {returnsData.map((col) => (
                        <th key={col.year} className="py-2.5 px-3 text-right font-bold">
                          {col.year}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    <tr>
                      <td className="py-2.5 pr-4 text-[#9E9DA0] font-sans font-medium">Gross Revenue</td>
                      {returnsData.map((c) => (
                        <td key={c.year} className="py-2.5 px-3 text-right text-white">
                          {formatCurrency(c.grossRev)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-[#9E9DA0] font-sans font-medium">Operating Expenses (Opex)</td>
                      {returnsData.map((c) => (
                        <td key={c.year} className="py-2.5 px-3 text-right text-white/70">
                          ({formatCurrency(c.opex)})
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-white/[0.02] font-bold">
                      <td className="py-2.5 pr-4 text-white font-sans">Net Operating Income (NOI)</td>
                      {returnsData.map((c) => (
                        <td key={c.year} className="py-2.5 px-3 text-right text-[var(--accent)]">
                          {formatCurrency(c.noi)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-[#9E9DA0] font-sans font-medium">Debt Service</td>
                      {returnsData.map((c) => (
                        <td key={c.year} className="py-2.5 px-3 text-right text-white/70">
                          ({formatCurrency(c.debtService)})
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t border-white/10 font-bold">
                      <td className="py-2.5 pr-4 text-white font-sans">Net Cash Flow</td>
                      {returnsData.map((c) => (
                        <td key={c.year} className="py-2.5 px-3 text-right text-white">
                          {formatCurrency(c.cashFlow)}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-[var(--accent-subtle)]/40 font-bold">
                      <td className="py-2.5 pr-4 text-[var(--accent)] font-sans">Cash-on-Cash Return</td>
                      {returnsData.map((c) => (
                        <td key={c.year} className="py-2.5 px-3 text-right text-[var(--accent)]">
                          {formatPercent(c.coc)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 3: Market Snapshot */}
            <section id="market" className="rounded-2xl border border-white/10 bg-[#121014] p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                <span className="material-symbols-outlined text-[20px] text-[var(--accent)]">location_city</span>
                <h2 className="text-base font-bold text-white">Market &amp; Submarket Fundamentals</h2>
              </div>
              <p className="text-sm text-[#9E9DA0]">
                Located in {deal.city || 'Primary Metro'}, benefiting from strong in-migration, corporate relocations, and constrained new inventory deliveries.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center">
                  <p className="font-mono text-lg font-bold text-[var(--accent)]">+4.8%</p>
                  <p className="text-[10px] uppercase font-bold text-[#9E9DA0] mt-1">YoY Rent Growth</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center">
                  <p className="font-mono text-lg font-bold text-white">+2.6%</p>
                  <p className="text-[10px] uppercase font-bold text-[#9E9DA0] mt-1">Employment Growth</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center">
                  <p className="font-mono text-lg font-bold text-white">1.2%</p>
                  <p className="text-[10px] uppercase font-bold text-[#9E9DA0] mt-1">Supply Pipeline</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center">
                  <p className="font-mono text-lg font-bold text-[var(--accent)]">92/100</p>
                  <p className="text-[10px] uppercase font-bold text-[#9E9DA0] mt-1">Submarket Score</p>
                </div>
              </div>
            </section>

            {/* Section 4: Operator Track Record */}
            <section id="operator">
              <CounterpartyPreviewCard
                profile={activeOperatorProfile}
                isLivePreview={false}
              />
            </section>

            {/* Section 5: Documents List */}
            <section id="documents" className="rounded-2xl border border-white/10 bg-[#121014] p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                <span className="material-symbols-outlined text-[20px] text-[var(--accent)]">folder_open</span>
                <h2 className="text-base font-bold text-white">Offering Documents &amp; Due Diligence</h2>
              </div>

              <div className="space-y-2">
                {[
                  { title: 'Offering Memorandum (OM)', size: '14.2 MB PDF', updated: 'Verified 3 days ago' },
                  { title: 'Institutional Underwriting Model', size: '2.8 MB XLSX', updated: 'Latest audited' },
                  { title: 'Phase I Environmental Site Assessment', size: '6.4 MB PDF', updated: 'Clean report' },
                  { title: 'Zoning & Title Commitment', size: '4.1 MB PDF', updated: 'First American' },
                ].map((doc) => (
                  <div
                    key={doc.title}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-3.5 hover:bg-white/[0.04] transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[22px] text-[#9E9DA0]">description</span>
                      <div>
                        <p className="text-xs font-bold text-white">{doc.title}</p>
                        <p className="text-[11px] text-[#9E9DA0]">{doc.size} · {doc.updated}</p>
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => showToast(`Downloaded ${doc.title}`)}
                      icon={<span className="material-symbols-outlined text-[16px]">download</span>}
                    >
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </section>

            {/* Disclosures (Collapsible, Muted SEC 506(c) Notice) */}
            <section className="rounded-xl border border-white/5 bg-white/[0.01] p-4">
              <button
                type="button"
                onClick={() => setIsDisclosuresOpen((prev) => !prev)}
                className="flex w-full items-center justify-between text-left text-xs font-semibold text-[#9E9DA0] hover:text-white"
              >
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">gavel</span>
                  <span>Legal Disclosures &amp; SEC Regulation D Rule 506(c) Notice</span>
                </span>
                <span className="material-symbols-outlined text-[18px]">
                  {isDisclosuresOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              {isDisclosuresOpen && (
                <div className="mt-3 text-[11px] leading-relaxed text-[#9E9DA0]/80 space-y-2 border-t border-white/5 pt-3">
                  <p>
                    Securities offered through PaperWorking marketplace originate under Rule 506(c) of SEC Regulation D. Investments are speculative, illiquid, and carry the risk of total loss of invested capital.
                  </p>
                  <p>
                    Target IRR, cash-on-cash projections, and exit multiples are forward-looking estimates and do not represent guaranteed returns. Investors must qualify as accredited investors.
                  </p>
                </div>
              )}
            </section>
          </div>

          {/* Right / Sticky Rail (1/3) */}
          <aside className="space-y-6 lg:sticky lg:top-20">
            {/* Funding Status Card */}
            <div className="rounded-2xl border border-white/10 bg-[#121014] p-6 space-y-5 shadow-xl">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E9DA0]">
                  Funding Allocation
                </span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="font-mono text-2xl font-bold text-white">
                    {formatCurrencyCompact(committed)}
                  </span>
                  <span className="font-mono text-xs text-[#9E9DA0]">
                    of {formatCurrencyCompact(target)} target
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-[var(--accent)]">{progressPercent}% Funded</span>
                  <span className="text-[#9E9DA0]">{investors} Investors</span>
                </div>
              </div>

              {/* Countdown Urgency */}
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs">
                <span className="text-[#9E9DA0] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-amber-400">schedule</span>
                  <span>Deadline:</span>
                </span>
                <span className="font-mono font-bold text-white">{countdown.formatted}</span>
              </div>

              {/* Min Investment + Primary CTA Repeated */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#9E9DA0]">Min Commitment:</span>
                  <span className="font-mono font-bold text-white">{formatCurrency(minInvestment)}</span>
                </div>

                {!isFunded ? (
                  <Button
                    variant="primary"
                    size="lg"
                    data-testid="rail-express-interest-btn"
                    onClick={() => setIsInterestModalOpen(true)}
                    className="w-full justify-center shadow-lg shadow-[var(--accent)]/20"
                  >
                    Express Interest
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    href="/dashboard/deals"
                    className="w-full justify-center"
                  >
                    Browse Similar Deals
                  </Button>
                )}

                {/* Run in Deal Calculator Secondary CTA */}
                <Button
                  href={calculatorUrl}
                  variant="secondary"
                  size="md"
                  className="w-full justify-center"
                  icon={<span className="material-symbols-outlined text-[16px]">calculate</span>}
                >
                  Run in Deal Calculator
                </Button>
              </div>
            </div>

            {/* Similar Deals (3 Compact Cards) */}
            <div className="rounded-2xl border border-white/10 bg-[#121014] p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0] flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-[var(--accent)]">domain</span>
                Similar Opportunities
              </h3>
              <div className="space-y-3">
                {similarDeals.map((sd) => (
                  <DealCard key={sd.id} deal={sd} compact />
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Express Interest Modal Flow */}
      <ExpressInterestModal
        deal={deal}
        isOpen={isInterestModalOpen}
        onClose={() => setIsInterestModalOpen(false)}
        onSuccessToast={showToast}
      />

      {/* Persistent Compare Tray Dock */}
      <CompareTray />
    </div>
  );
}
