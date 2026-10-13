'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { DealCardData } from '@/components/marketplace/DealCard';
import DealCard from '@/components/marketplace/DealCard';
import {
  CheckCircle,
  Lock,
  Folder,
  Buildings,
  Bookmark,
  BookmarkSimple,
  ShareNetwork,
  ArrowsLeftRight,
  Chats,
  PaperPlaneTilt,
  ChatTeardropText,
  Users,
  MapPin,
  Gavel,
  FileText,
  Calculator,
  FolderOpen,
  TreeStructure,
  ChartLineUp,
  DownloadSimple,
  CaretDown,
  CaretUp,
  Clock,
  Briefcase,
} from '@phosphor-icons/react';
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
import DealOfferServicesModal from '@/components/marketplace/DealOfferServicesModal';
import CompareTray from '@/components/marketplace/CompareTray';
import { CountUpNumber } from '@/components/ui/CountUpNumber';
import { usePropertyImage } from '@/lib/maps/property-image';
import CounterpartyPreviewCard, { type CounterpartyProfileData } from '@/components/profile/CounterpartyPreviewCard';
import DealNegotiationModal from '@/components/marketplace/DealNegotiationModal';
import DealDiscussionModal from '@/components/marketplace/DealDiscussionModal';
import BroadcastDealModal from '@/components/marketing/deal-calculator/BroadcastDealModal';
import ShareDealModal from '@/components/marketplace/ShareDealModal';
import DealCrowdfundModal from '@/components/marketplace/DealCrowdfundModal';
import { useOptionalAuth } from '@/context/AuthContext';
import { isUserSubscribed, getDealCalculatorResults, type RawDealCalculatorResults } from '@/lib/marketplace/seed-data';

export interface DealDetailPageViewProps {
  deal: DealCardData & {
    operatorProfile?: CounterpartyProfileData;
  };
  allDeals: DealCardData[];
  operatorProfile?: CounterpartyProfileData;
  isSubscriber?: boolean;
}

export interface DiligenceDocumentPayload {
  filename: string;
  mimeType: string;
  content: string;
  ext: string;
}

export function generateDiligenceDocument(
  deal: DealCardData,
  docTitle: string,
  operatorName: string = 'Verified Operator'
): DiligenceDocumentPayload {
  const slug = deal.slug || deal.id || 'deal';
  const filename = `${slug}-${docTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  let content = '';
  let mimeType = 'text/plain';
  let ext = 'txt';

  const target = deal.fundingTarget ?? deal.target ?? ((deal.purchasePrice ?? 500_000) + 100_000);
  const targetIrr = deal.targetIrr ?? deal.projectedRoi ?? deal.roi ?? 18.4;
  const equityMultiple = deal.equityMultiple ?? 1.85;
  const capRate = (deal as any).capRate ?? 6.2;
  const assetClass = deal.assetClass || 'Multifamily';
  const strategy = deal.subStrategy || 'VALUE_ADD';

  if (docTitle.includes('Model')) {
    ext = 'csv';
    mimeType = 'text/csv;charset=utf-8;';
    const rows = [
      ['PaperWorking Institutional Underwriting Model', deal.name || deal.address],
      ['Property Address', deal.address],
      ['Generated At', new Date().toISOString()],
      [''],
      ['Key Financial Metric', 'Value'],
      ['Purchase Price', String(deal.purchasePrice || 0)],
      ['Rehab Budget', String((deal as any).rehabCost || (deal as any).rehabBudget || 0)],
      ['After Repair Value (ARV)', String((deal as any).arv || deal.purchasePrice || 0)],
      ['Projected ROI (%)', String(deal.projectedRoi || 0)],
      ['Target IRR (%)', String(targetIrr)],
      ['Equity Multiple', String(equityMultiple)],
      ['Cap Rate (%)', String(capRate || 0)],
      ['Funding Target', String(target || 0)],
      ['Hold Period', String(deal.holdPeriod || '3–5 Years')],
      ['Asset Class', String(assetClass || 'Residential')],
      ['Deal Strategy', String(strategy || 'Value-Add')],
    ];
    content = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  } else {
    ext = 'txt';
    mimeType = 'text/plain;charset=utf-8;';
    content = [
      `=======================================================`,
      `PAPERWORKING DUE DILIGENCE VAULT`,
      `DOCUMENT: ${docTitle.toUpperCase()}`,
      `=======================================================`,
      ``,
      `Deal Reference: ${deal.name || deal.address}`,
      `Property Address: ${deal.address}`,
      `Deal ID: ${deal.id}`,
      `Operator: ${operatorName}`,
      `Timestamp: ${new Date().toISOString()}`,
      ``,
      `FINANCIAL OVERVIEW:`,
      `- Purchase Price: $${Number(deal.purchasePrice || 0).toLocaleString()}`,
      `- Rehab / CapEx: $${Number((deal as any).rehabCost || (deal as any).rehabBudget || 0).toLocaleString()}`,
      `- Projected ARV: $${Number((deal as any).arv || deal.purchasePrice || 0).toLocaleString()}`,
      `- Target IRR: ${targetIrr}%`,
      `- Projected ROI: ${deal.projectedRoi || 0}%`,
      `- Equity Multiple: ${equityMultiple}x`,
      ``,
      `LEGAL & COMPLIANCE NOTICE:`,
      `This due diligence record is provided exclusively to verified PaperWorking subscribers`,
      `for investment evaluation purposes under Rule 506(c) of Regulation D.`,
      `All underwriting assumptions, title history, environmental evaluations, and financial`,
      `projections are confidential and proprietary to the operating partner.`,
    ].join('\n');
  }

  return { filename, mimeType, content, ext };
}

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'financials', label: 'Financials' },
  { id: 'market', label: 'Market' },
  { id: 'operator', label: 'Operator' },
  { id: 'documents', label: 'Documents' },
];

export default function DealDetailPageView({
  deal,
  allDeals,
  operatorProfile: initialOperatorProfile,
  isSubscriber,
}: DealDetailPageViewProps) {
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

  // Subscriber resolution
  const auth = useOptionalAuth();
  const isVendor = (auth?.profile?.accountType || '').toLowerCase() === 'vendor';
  const isSubscriberUser = isSubscriber !== undefined
    ? isSubscriber
    : auth?.profile
      ? isUserSubscribed(auth.profile)
      : false;

  // Local interaction states
  const { isSaved: checkIsSaved, toggleSave } = useSavedDeals();
  const isSaved = checkIsSaved(deal.id) || checkIsSaved(deal.slug);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('overview');
  const [sensitivityCase, setSensitivityCase] = useState<'base' | 'downside'>('base');
  const [isInterestModalOpen, setIsInterestModalOpen] = useState(false);
  const [isOfferServicesModalOpen, setIsOfferServicesModalOpen] = useState(false);
  const [isCrowdfundOpen, setIsCrowdfundOpen] = useState(false);
  const [isNegotiationOpen, setIsNegotiationOpen] = useState(false);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [visibility, setVisibility] = useState<'marketplace' | 'private' | string>(
    deal.visibility || 'marketplace'
  );
  const [isDiscussionOpen, setIsDiscussionOpen] = useState(false);
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
  const [localCommitted, setLocalCommitted] = useState<number>(deal.committedAmount ?? deal.committed ?? 0);
  const [localInvestors, setLocalInvestors] = useState<number>(
    deal.investorCount ??
      ((deal.committedAmount || deal.committed)
        ? Math.max(1, Math.round((deal.committedAmount || deal.committed || 0) / (deal.minInvestment || 25000)))
        : 14)
  );
  const committed = localCommitted;
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
  const investors = localInvestors;
  const calculatorResults: RawDealCalculatorResults =
    (deal as any).calculatorResults || getDealCalculatorResults(deal as any);

  // Overarching Project resolution
  const parentProjectId = deal.projectId || deal.projects?.[0]?.id;
  const primaryProject = deal.projects?.[0];
  const parentProjectName =
    deal.projectName ||
    primaryProject?.name ||
    (parentProjectId ? `Project #${parentProjectId.slice(-6)}` : null) ||
    `${name} Project Container`;
  const rawStage = primaryProject?.stage || 'ACQUISITION';
  const projectStage = rawStage.toUpperCase();
  const stageLabel =
    projectStage === 'FUND'
      ? 'Phase 02: Fund'
      : projectStage === 'HOLD'
        ? 'Phase 03: Hold'
        : projectStage === 'EXIT'
          ? 'Phase 04: Exit'
          : 'Phase 01: Acquisition';
  const completionPct = primaryProject?.progress ?? primaryProject?.completionPct ?? 25;

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
    setIsShareOpen(true);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3500);
  };

  const handleDownloadDiligenceDocument = (docTitle: string) => {
    if (typeof window === 'undefined') return;
    const { filename, mimeType, content, ext } = generateDiligenceDocument(
      deal,
      docTitle,
      operatorName
    );

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Downloaded ${docTitle}`);
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
          className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded-none border border-neutral-700 bg-neutral-900/95 px-4 py-3 text-xs font-semibold text-neutral-100 shadow-2xl backdrop-blur-xl toast-slide-up"
        >
          <CheckCircle className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Fully Funded Banner State */}
      {isFunded && (
        <div
          data-testid="funded-banner"
          className="w-full border-b border-neutral-800 bg-neutral-900/40 px-4 py-3 text-center text-xs font-semibold text-neutral-400"
        >
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
            <Lock className="h-4 w-4 text-amber-400" />
            <span>This opportunity is fully funded and archived. Metrics are locked for public view.</span>
            <Link
              href="/dashboard/deals"
              className="ml-2 font-bold text-neutral-100 hover:underline"
            >
              Browse Active Deals →
            </Link>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* 1. Breadcrumb (tertiary links) */}
        <nav
          aria-label="Breadcrumb"
          data-testid="deal-detail-breadcrumb"
          className="flex items-center gap-2 text-xs text-neutral-400 flex-wrap"
        >
          <Link href="/projects" className="hover:text-white transition">
            Projects
          </Link>
          <span>/</span>
          {(deal.projectId || deal.projects?.[0]?.id) ? (
            <>
              <Link
                href={`/project/${deal.projectId || deal.projects?.[0]?.id}`}
                className="hover:text-white transition flex items-center gap-1 text-neutral-200 font-semibold"
                title="View overarching Project workspace"
                data-testid="breadcrumb-overarching-project-link"
              >
                <Folder className="h-3.5 w-3.5" />
                <span>Project: {deal.projectName || deal.projects?.[0]?.name || 'Workspace'}</span>
              </Link>
              <span>/</span>
            </>
          ) : (
            <>
              <Link href="/dashboard/deals" className="hover:text-white transition">
                Marketplace
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-neutral-100 font-medium truncate max-w-[280px]">
            Deal Component: {name}
          </span>
        </nav>

        {/* 2. Hero Section: Full-Bleed Image Band + Scrim + Action Cluster */}
        <section className="relative overflow-hidden rounded-none border border-neutral-800 bg-neutral-950 shadow-2xl">
          {/* Background Media Banner with Image Fade-In */}
          <div className="relative aspect-[21/9] min-h-[280px] w-full overflow-hidden bg-neutral-900/30">
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
              <div className="flex h-full w-full items-center justify-center bg-neutral-900/40">
                <Buildings className="h-16 w-16 text-neutral-700" />
              </div>
            )}
            {/* Scrim Gradient for Contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-black/50" />

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
                className="!h-9 !w-9 !rounded-none border-neutral-700 bg-neutral-900/80 text-neutral-200 backdrop-blur-md hover:bg-neutral-800 hover:text-white min-h-[44px]"
              >
                {isSaved ? (
                  <Bookmark className="h-4 w-4 text-neutral-100" weight="fill" />
                ) : (
                  <BookmarkSimple className="h-4 w-4 text-neutral-400" />
                )}
              </Button>

              {/* Share Button (Copies URL + Toast) */}
              <Button
                variant="secondary"
                size="sm"
                isIconOnly
                onClick={handleShare}
                aria-label="Share deal analysis"
                className="!h-9 !w-9 !rounded-none border-neutral-700 bg-neutral-900/80 text-neutral-200 backdrop-blur-md hover:bg-neutral-800 hover:text-white min-h-[44px]"
              >
                <ShareNetwork className="h-4 w-4" />
              </Button>

              {/* Add to Compare Secondary */}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const added = addToCompare(deal);
                  showToast(added ? `Added ${name} to comparison tray` : `Already in comparison tray`);
                }}
                className="hidden lg:inline-flex border-neutral-700 bg-neutral-900/80 text-neutral-200 backdrop-blur-md hover:bg-neutral-800 rounded-none min-h-[44px]"
                icon={<ArrowsLeftRight className="h-4 w-4" />}
              >
                {isComparing(deal.id) ? 'In Compare' : 'Compare'}
              </Button>

              {/* Discussion Q&A */}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsDiscussionOpen(true)}
                className="hidden sm:inline-flex border-neutral-700 bg-neutral-900/80 text-neutral-200 backdrop-blur-md hover:bg-neutral-800 rounded-none min-h-[44px]"
                icon={<Chats className="h-4 w-4" />}
              >
                Discussion
              </Button>

              {/* Crowdfund via Email Promotion */}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsBroadcastOpen(true)}
                className="hidden md:inline-flex border-neutral-700 bg-neutral-900/80 text-neutral-200 backdrop-blur-md hover:bg-neutral-800 rounded-none min-h-[44px]"
                icon={<PaperPlaneTilt className="h-4 w-4" />}
              >
                Crowdfund
              </Button>

              {/* Share Privately / Configure Placement */}
              <Button
                variant="secondary"
                size="sm"
                data-testid="hero-share-deal-btn"
                onClick={() => setIsShareOpen(true)}
                className="hidden md:inline-flex border-neutral-700 bg-neutral-900/80 text-neutral-200 backdrop-blur-md hover:bg-neutral-800 rounded-none min-h-[44px]"
                icon={<ShareNetwork className="h-4 w-4" />}
              >
                Share
              </Button>

              {/* Negotiate in Messages */}
              <Button
                variant="secondary"
                size="md"
                data-testid="hero-negotiate-btn"
                onClick={() => setIsNegotiationOpen(true)}
                className="border-neutral-700 bg-neutral-900/80 text-neutral-200 backdrop-blur-md hover:bg-neutral-800 rounded-none min-h-[44px]"
                icon={<ChatTeardropText className="h-4 w-4" />}
              >
                Negotiate in Messages
              </Button>

              {/* Express Interest & Crowdfund Syndicate CTAs */}
              {!isFunded ? (
                isVendor ? (
                  <Button
                    variant="primary"
                    size="md"
                    data-testid="hero-offer-services-btn"
                    onClick={() => setIsOfferServicesModalOpen(true)}
                    className="rounded-none min-h-[44px]"
                    icon={<Briefcase className="h-4 w-4" />}
                  >
                    Offer Services
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="primary"
                      size="md"
                      data-testid="hero-invest-syndicate-btn"
                      onClick={() => setIsCrowdfundOpen(true)}
                      className="rounded-none min-h-[44px]"
                      icon={<Users className="h-4 w-4" />}
                    >
                      Invest in Syndicate
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      data-testid="hero-express-interest-btn"
                      onClick={() => setIsInterestModalOpen(true)}
                      className="border-neutral-700 bg-neutral-900/80 text-neutral-200 backdrop-blur-md hover:bg-neutral-800 rounded-none min-h-[44px]"
                    >
                      Express Interest
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      data-testid="hero-investor-offer-services-btn"
                      onClick={() => setIsOfferServicesModalOpen(true)}
                      className="border-neutral-700 bg-neutral-900/80 text-neutral-200 backdrop-blur-md hover:bg-neutral-800 rounded-none min-h-[44px]"
                      icon={<Briefcase className="h-4 w-4" />}
                    >
                      Offer Services
                    </Button>
                  </>
                )
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  href="/dashboard/deals"
                  className="rounded-none min-h-[44px]"
                >
                  Browse Similar Deals
                </Button>
              )}
            </div>

            {/* Hero Text Information */}
            <div className="absolute bottom-6 left-6 right-6 z-10 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-none border border-neutral-700 bg-neutral-900/80 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-200 backdrop-blur-md">
                  {assetClass} · {strategy}
                </span>
                <span className="inline-flex items-center gap-1 rounded-none border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-400 backdrop-blur-md">
                  <span className="h-1.5 w-1.5 rounded-none bg-current animate-pulse" />
                  {statusLabel}
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-100 sm:text-4xl">
                {name}
              </h1>
              <p className="text-sm text-neutral-400 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-neutral-400" />
                <span>{deal.address}</span>
              </p>
            </div>
          </div>

          {/* Key Metric Bar: 5 Core Metrics (Tabular nums, dividers, single row desktop / wrapped mobile) */}
          <div
            data-testid="key-metric-bar"
            className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-neutral-800 border-t border-neutral-800 bg-neutral-900 py-4 text-center"
          >
            {/* 1. Target IRR */}
            <div className="p-3 sm:p-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block">
                Target IRR
              </span>
              <span className="font-mono text-xl font-semibold text-neutral-100 mt-1 block">
                <CountUpNumber value={targetIrr} formatter={formatPercent} />
              </span>
            </div>

            {/* 2. Equity Multiple */}
            <div className="p-3 sm:p-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block">
                Equity Multiple
              </span>
              <span className="font-mono text-xl font-semibold text-neutral-100 mt-1 block">
                <CountUpNumber value={equityMultiple} formatter={formatMultiple} />
              </span>
            </div>

            {/* 3. Min Investment */}
            <div className="p-3 sm:p-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block">
                Min Investment
              </span>
              <span className="font-mono text-xl font-semibold text-neutral-100 mt-1 block">
                <CountUpNumber value={minInvestment} formatter={formatCurrencyCompact} />
              </span>
            </div>

            {/* 4. Hold Period */}
            <div className="p-3 sm:p-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block">
                Hold Period
              </span>
              <span className="font-mono text-xl font-semibold text-neutral-100 mt-1 block">
                {formatHoldPeriod(holdPeriod)}
              </span>
            </div>

            {/* 5. Cap Rate on Cost */}
            <div className="col-span-2 sm:col-span-1 p-3 sm:p-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block">
                Cap Rate on Cost
              </span>
              <span className="font-mono text-xl font-semibold text-neutral-100 mt-1 block">
                <CountUpNumber value={capRate} formatter={formatPercent} />
              </span>
            </div>
          </div>
        </section>

        {/* Off-Platform Closing Legal & Operational Notice */}
        <div
          data-testid="off-platform-closing-banner"
          className="rounded-none border border-neutral-800 bg-neutral-900/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg"
        >
          <div className="flex items-start sm:items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none border border-neutral-800 bg-neutral-900 text-neutral-300">
              <Gavel className="h-5 w-5 text-neutral-400" />
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-100">
                Off-Platform Relationship &amp; Closing Policy
              </h4>
              <p className="mt-0.5 text-xs text-neutral-400">
                PaperWorking powers deal discovery, institutional underwriting calculation, and in-app message negotiation. Final subscription agreements, PPM distributions, KYC/AML accreditation, and capital transfers are closed directly between counterparties outside of PaperWorking.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsDisclosuresOpen(true)}
            className="text-xs font-semibold text-neutral-300 hover:text-white underline shrink-0 whitespace-nowrap"
          >
            Review Disclosures &rarr;
          </button>
        </div>

        {/* 3. Sticky Sub-Nav (Overview | Financials | Market | Operator | Documents) */}
        <nav
          data-testid="detail-subnav"
          aria-label="Deal detail sections"
          className="sticky top-0 z-30 flex items-center gap-1 rounded-none border border-neutral-800 bg-neutral-950/90 p-1.5 backdrop-blur-xl"
        >
          {SECTIONS.map((sec) => {
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => scrollToSection(sec.id)}
                className={`rounded-none px-4 py-2 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-neutral-800 text-neutral-100 font-bold shadow'
                    : 'text-neutral-400 hover:text-white'
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
            <section id="overview" className="rounded-none border border-neutral-800 bg-neutral-950 p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
                <FileText className="h-5 w-5 text-neutral-400" />
                <h2 className="text-base font-bold text-neutral-100">Investment Thesis &amp; Overview</h2>
              </div>
              <p className="text-sm leading-relaxed text-neutral-400">
                {name} presents an institutional-grade opportunity to acquire a well-situated {assetClass.toLowerCase()} asset in high-demand submarket. The operator team has identified significant value-add upside through targeted capital improvements, institutional property management optimization, and mark-to-market lease renegotiation over a {formatHoldPeriod(holdPeriod)} horizon.
              </p>

              {/* Property Specification Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="rounded-none border border-neutral-800 bg-neutral-900/40 p-3">
                  <span className="text-[10px] font-semibold uppercase text-neutral-400">Year Built</span>
                  <p className="font-mono font-semibold text-neutral-100 mt-0.5">2018 (Renovated 2024)</p>
                </div>
                <div className="rounded-none border border-neutral-800 bg-neutral-900/40 p-3">
                  <span className="text-[10px] font-semibold uppercase text-neutral-400">Units / Size</span>
                  <p className="font-mono font-semibold text-neutral-100 mt-0.5">142 Units (128,000 SF)</p>
                </div>
                <div className="rounded-none border border-neutral-800 bg-neutral-900/40 p-3">
                  <span className="text-[10px] font-semibold uppercase text-neutral-400">Occupancy</span>
                  <p className="font-mono font-semibold text-neutral-100 mt-0.5">94.8% Physical</p>
                </div>
                <div className="rounded-none border border-neutral-800 bg-neutral-900/40 p-3">
                  <span className="text-[10px] font-semibold uppercase text-neutral-400">Debt Structure</span>
                  <p className="font-mono font-semibold text-neutral-100 mt-0.5">Fixed 5.85% (5 Yr I/O)</p>
                </div>
              </div>

              {/* Deal Calculator Results Card (Prompt 8: Post includes Deal Calculator results on the property) */}
              <div
                data-testid="deal-calculator-results-card"
                className="mt-6 rounded-none border border-neutral-800 bg-neutral-900/40 p-5 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-neutral-400" />
                    <h3 className="text-sm font-semibold text-neutral-100 tracking-tight">
                      Deal Calculator Results
                    </h3>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-none border border-neutral-700 bg-neutral-800 px-2 py-0.5 text-[10px] font-mono font-semibold text-neutral-200">
                    Verified Underwriting
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="rounded-none border border-neutral-800 bg-neutral-950 p-2.5 space-y-0.5">
                    <span className="text-[10px] uppercase font-mono text-neutral-400 tracking-wider">Purchase Price</span>
                    <p className="font-mono font-semibold text-neutral-100 text-sm">{formatCurrency(calculatorResults.purchasePrice || deal.purchasePrice || 0)}</p>
                  </div>
                  <div className="rounded-none border border-neutral-800 bg-neutral-950 p-2.5 space-y-0.5">
                    <span className="text-[10px] uppercase font-mono text-neutral-400 tracking-wider">Rehab Budget</span>
                    <p className="font-mono font-semibold text-neutral-100 text-sm">{formatCurrency(calculatorResults.rehabBudget || 0)}</p>
                  </div>
                  <div className="rounded-none border border-neutral-800 bg-neutral-950 p-2.5 space-y-0.5">
                    <span className="text-[10px] uppercase font-mono text-neutral-400 tracking-wider">ARV Valuation</span>
                    <p className="font-mono font-semibold text-neutral-100 text-sm">{formatCurrency(calculatorResults.arv || deal.purchasePrice || 0)}</p>
                  </div>
                  <div className="rounded-none border border-neutral-800 bg-neutral-950 p-2.5 space-y-0.5">
                    <span className="text-[10px] uppercase font-mono text-neutral-400 tracking-wider">Target IRR</span>
                    <p className="font-mono font-semibold text-neutral-100 text-sm">{formatPercent(calculatorResults.targetIrr || targetIrr)}</p>
                  </div>
                  <div className="rounded-none border border-neutral-800 bg-neutral-950 p-2.5 space-y-0.5">
                    <span className="text-[10px] uppercase font-mono text-neutral-400 tracking-wider">Equity Multiple</span>
                    <p className="font-mono font-semibold text-neutral-100 text-sm">{formatMultiple(calculatorResults.equityMultiple || equityMultiple)}</p>
                  </div>
                  <div className="rounded-none border border-neutral-800 bg-neutral-950 p-2.5 space-y-0.5">
                    <span className="text-[10px] uppercase font-mono text-neutral-400 tracking-wider">Cash Required</span>
                    <p className="font-mono font-semibold text-neutral-100 text-sm">{formatCurrency(calculatorResults.cashRequired || 0)}</p>
                  </div>
                  <div className="rounded-none border border-neutral-800 bg-neutral-950 p-2.5 space-y-0.5">
                    <span className="text-[10px] uppercase font-mono text-neutral-400 tracking-wider">Cap Rate On Cost</span>
                    <p className="font-mono font-semibold text-neutral-100 text-sm">{formatPercent(calculatorResults.capRateOnCost || capRate)}</p>
                  </div>
                  <div className="rounded-none border border-neutral-800 bg-neutral-950 p-2.5 space-y-0.5">
                    <span className="text-[10px] uppercase font-mono text-neutral-400 tracking-wider">Net Operating Income</span>
                    <p className="font-mono font-semibold text-neutral-100 text-sm">{formatCurrency(calculatorResults.netOperatingIncome || 0)}/yr</p>
                  </div>
                </div>
              </div>

              {/* Overarching Project Component Card */}
              <div
                data-testid="deal-overarching-project-card"
                className="mt-6 rounded-none border border-neutral-800 bg-neutral-900/40 p-5 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-neutral-400" />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                        Overarching Project
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-neutral-100 tracking-tight">
                      {parentProjectName}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-none border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-xs font-semibold text-neutral-200">
                      {stageLabel}
                    </span>
                    <span className="rounded-none border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs font-mono text-neutral-300">
                      {completionPct}% Complete
                    </span>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-neutral-400">
                  This Deal is an active investment offering component underwritten and managed within the overarching Project lifecycle.
                </p>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-neutral-800 pt-3">
                  <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <TreeStructure className="h-3.5 w-3.5 text-neutral-400" />
                    <span>Component: Syndication Offering &amp; Underwriting</span>
                  </div>
                  {parentProjectId && (
                    <Button
                      href={`/project/${parentProjectId}`}
                      variant="secondary"
                      size="sm"
                      data-testid="open-overarching-project-btn"
                      className="min-h-[44px] text-xs font-semibold rounded-none"
                    >
                      Open Project Workspace →
                    </Button>
                  )}
                </div>
              </div>
            </section>

            {/* Section 2: Financials & Sensitivity Returns */}
            <section id="financials" className="rounded-none border border-neutral-800 bg-neutral-950 p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <ChartLineUp className="h-5 w-5 text-neutral-400" />
                  <h2 className="text-base font-bold text-neutral-100">Financial Breakdown &amp; Projections</h2>
                </div>

                {/* Sensitivity Case Toggle (Base vs Downside) - Subscribers Only */}
                {isSubscriberUser && (
                  <div className="flex items-center rounded-none border border-neutral-800 bg-neutral-900 p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setSensitivityCase('base')}
                      className={`rounded-none px-3 py-1 font-semibold transition ${
                        sensitivityCase === 'base'
                          ? 'bg-neutral-800 text-neutral-100 font-bold'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Base Case
                    </button>
                    <button
                      type="button"
                      onClick={() => setSensitivityCase('downside')}
                      className={`rounded-none px-3 py-1 font-semibold transition ${
                        sensitivityCase === 'downside'
                          ? 'bg-amber-400 text-neutral-950 font-bold'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Downside Sensitivity (-12%)
                    </button>
                  </div>
                )}
              </div>

              {!isSubscriberUser ? (
                /* Institutional In-Page Subscriber Gate */
                <div
                  data-testid="subscriber-full-deal-gate"
                  className="rounded-none border border-neutral-800 bg-neutral-900/40 p-8 text-center space-y-4 shadow-xl"
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-none border border-amber-400/30 bg-amber-400/10 text-amber-300">
                    <Lock className="h-6 w-6 text-amber-300" />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                      Subscriber Only Deal Room
                    </span>
                    <h3 className="text-lg font-bold text-neutral-100 tracking-tight">
                      Users must be subscribers to see the full deal.
                    </h3>
                    <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
                      Full 5-year pro-forma cash flow schedules, downside sensitivity stress testing, debt amortization, and underwriting audits are reserved for PaperWorking subscribers.
                    </p>
                  </div>
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Button
                      href="/pricing"
                      variant="primary"
                      size="sm"
                      data-testid="gate-upgrade-subscription-btn"
                      className="min-h-[44px] px-5 text-xs font-semibold shadow-lg rounded-none"
                    >
                      Upgrade to Subscriber Pro →
                    </Button>
                    <Button
                      href="/dashboard/deals"
                      variant="secondary"
                      size="sm"
                      className="min-h-[44px] px-4 text-xs font-semibold rounded-none"
                    >
                      Browse Public Deals
                    </Button>
                  </div>
                </div>
              ) : (
                /* 5-Year Return Matrix Table */
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-800 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                        <th className="py-2.5 pr-4 font-semibold">Line Item</th>
                        {returnsData.map((col) => (
                          <th key={col.year} className="py-2.5 px-3 text-right font-semibold">
                            {col.year}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800 font-mono">
                      <tr>
                        <td className="py-2.5 pr-4 text-neutral-400 font-sans font-medium">Gross Revenue</td>
                        {returnsData.map((c) => (
                          <td key={c.year} className="py-2.5 px-3 text-right text-neutral-100">
                            {formatCurrency(c.grossRev)}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 pr-4 text-neutral-400 font-sans font-medium">Operating Expenses (Opex)</td>
                        {returnsData.map((c) => (
                          <td key={c.year} className="py-2.5 px-3 text-right text-neutral-400">
                            ({formatCurrency(c.opex)})
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-neutral-900/40 font-semibold">
                        <td className="py-2.5 pr-4 text-neutral-100 font-sans">Net Operating Income (NOI)</td>
                        {returnsData.map((c) => (
                          <td key={c.year} className="py-2.5 px-3 text-right text-neutral-100">
                            {formatCurrency(c.noi)}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 pr-4 text-neutral-400 font-sans font-medium">Debt Service</td>
                        {returnsData.map((c) => (
                          <td key={c.year} className="py-2.5 px-3 text-right text-neutral-400">
                            ({formatCurrency(c.debtService)})
                          </td>
                        ))}
                      </tr>
                      <tr className="border-t border-neutral-800 font-semibold">
                        <td className="py-2.5 pr-4 text-neutral-100 font-sans">Net Cash Flow</td>
                        {returnsData.map((c) => (
                          <td key={c.year} className="py-2.5 px-3 text-right text-neutral-100">
                            {formatCurrency(c.cashFlow)}
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-neutral-900 font-semibold">
                        <td className="py-2.5 pr-4 text-neutral-100 font-sans">Cash-on-Cash Return</td>
                        {returnsData.map((c) => (
                          <td key={c.year} className="py-2.5 px-3 text-right text-neutral-100">
                            {formatPercent(c.coc)}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Section 3: Market Snapshot */}
            <section id="market" className="rounded-none border border-neutral-800 bg-neutral-950 p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
                <Buildings className="h-5 w-5 text-neutral-400" />
                <h2 className="text-base font-bold text-neutral-100">Market &amp; Submarket Fundamentals</h2>
              </div>
              <p className="text-sm text-neutral-400">
                Located in {deal.city || 'Primary Metro'}, benefiting from strong in-migration, corporate relocations, and constrained new inventory deliveries.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-none border border-neutral-800 bg-neutral-900/40 p-4 text-center">
                  <p className="font-mono text-lg font-semibold text-neutral-100">+4.8%</p>
                  <p className="text-[10px] uppercase font-semibold text-neutral-400 mt-1">YoY Rent Growth</p>
                </div>
                <div className="rounded-none border border-neutral-800 bg-neutral-900/40 p-4 text-center">
                  <p className="font-mono text-lg font-semibold text-neutral-100">+2.6%</p>
                  <p className="text-[10px] uppercase font-semibold text-neutral-400 mt-1">Employment Growth</p>
                </div>
                <div className="rounded-none border border-neutral-800 bg-neutral-900/40 p-4 text-center">
                  <p className="font-mono text-lg font-semibold text-neutral-100">1.2%</p>
                  <p className="text-[10px] uppercase font-semibold text-neutral-400 mt-1">Supply Pipeline</p>
                </div>
                <div className="rounded-none border border-neutral-800 bg-neutral-900/40 p-4 text-center">
                  <p className="font-mono text-lg font-semibold text-neutral-100">92/100</p>
                  <p className="text-[10px] uppercase font-semibold text-neutral-400 mt-1">Submarket Score</p>
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
            <section id="documents" className="rounded-none border border-neutral-800 bg-neutral-900 p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
                <FolderOpen className="h-5 w-5 text-white" />
                <h2 className="text-base font-bold text-white">Offering Documents &amp; Due Diligence</h2>
              </div>

              {!isSubscriberUser && (
                <div
                  data-testid="subscriber-documents-gate"
                  className="rounded-none border border-neutral-700 bg-neutral-900/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <Lock className="h-4 w-4 text-amber-400 shrink-0" />
                    <span className="text-neutral-300">
                      Users must be subscribers to see the full deal and download confidential due diligence records.
                    </span>
                  </div>
                  <Button
                    href="/pricing"
                    variant="primary"
                    size="sm"
                    className="min-h-[38px] text-xs shrink-0 rounded-none"
                  >
                    Upgrade to Download →
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                {[
                  { title: 'Offering Memorandum (OM)', size: '14.2 MB PDF', updated: 'Verified 3 days ago' },
                  { title: 'Institutional Underwriting Model', size: '2.8 MB XLSX', updated: 'Latest audited' },
                  { title: 'Phase I Environmental Site Assessment', size: '6.4 MB PDF', updated: 'Clean report' },
                  { title: 'Zoning & Title Commitment', size: '4.1 MB PDF', updated: 'First American' },
                ].map((doc) => (
                  <div
                    key={doc.title}
                    className="flex items-center justify-between rounded-none border border-neutral-800 bg-neutral-900/40 p-3.5 hover:bg-neutral-800/50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-neutral-400 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-white">{doc.title}</p>
                        <p className="text-[11px] text-neutral-400">{doc.size} · {doc.updated}</p>
                      </div>
                    </div>
                    {isSubscriberUser ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDownloadDiligenceDocument(doc.title)}
                        icon={<DownloadSimple className="h-4 w-4" />}
                        className="rounded-none"
                      >
                        Download
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        href="/pricing"
                        icon={<Lock className="h-4 w-4" />}
                        className="rounded-none"
                      >
                        Subscriber Only
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Disclosures (Collapsible, Muted SEC 506(c) Notice) */}
            <section className="rounded-none border border-neutral-800 bg-neutral-900/30 p-4">
              <button
                type="button"
                onClick={() => setIsDisclosuresOpen((prev) => !prev)}
                className="flex w-full items-center justify-between text-left text-xs font-semibold text-neutral-400 hover:text-white"
              >
                <span className="flex items-center gap-1.5">
                  <Gavel className="h-4 w-4 text-neutral-400 shrink-0" />
                  <span>Legal Disclosures &amp; SEC Regulation D Rule 506(c) Notice</span>
                </span>
                {isDisclosuresOpen ? (
                  <CaretUp className="h-4 w-4 text-neutral-400" />
                ) : (
                  <CaretDown className="h-4 w-4 text-neutral-400" />
                )}
              </button>
              {isDisclosuresOpen && (
                <div className="mt-3 text-[11px] leading-relaxed text-neutral-400 space-y-2 border-t border-neutral-800 pt-3">
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
            {/* Funding Status Card / Crowdfunding Ecosystem */}
            <div
              data-testid="crowdfunding-ecosystem-widget"
              className="rounded-none border border-neutral-800 bg-neutral-900 p-6 space-y-5"
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Crowdfunding Allocation
                </span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="font-mono text-2xl font-bold text-white">
                    {formatCurrencyCompact(committed)}
                  </span>
                  <span className="font-mono text-xs text-neutral-400">
                    of {formatCurrencyCompact(target)} target
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mt-2.5 h-2 w-full overflow-hidden rounded-none bg-neutral-800">
                  <div
                    className="h-full rounded-none bg-white transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-white">{progressPercent}% Funded</span>
                  <span className="text-neutral-400">{investors} Investors</span>
                </div>
              </div>

              {/* Countdown Urgency */}
              <div className="flex items-center justify-between rounded-none border border-neutral-800 bg-neutral-900/50 p-3 text-xs">
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-amber-400" />
                  <span>Deadline:</span>
                </span>
                <span className="font-mono font-bold text-white">{countdown.formatted}</span>
              </div>

              {/* Min Investment + Primary CTA Repeated */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Min Commitment:</span>
                  <span className="font-mono font-bold text-white">{formatCurrency(minInvestment)}</span>
                </div>

                {!isFunded ? (
                  isVendor ? (
                    <Button
                      variant="primary"
                      size="lg"
                      data-testid="rail-offer-services-btn"
                      onClick={() => setIsOfferServicesModalOpen(true)}
                      className="w-full justify-center min-h-[44px] rounded-none"
                      icon={<Briefcase className="h-4 w-4" />}
                    >
                      Offer Services
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="primary"
                        size="lg"
                        data-testid="rail-invest-syndicate-btn"
                        onClick={() => setIsCrowdfundOpen(true)}
                        className="w-full justify-center min-h-[44px] rounded-none"
                        icon={<Users className="h-4 w-4" />}
                      >
                        Invest in Syndicate
                      </Button>
                      <Button
                        variant="secondary"
                        size="md"
                        data-testid="rail-express-interest-btn"
                        onClick={() => setIsInterestModalOpen(true)}
                        className="w-full justify-center min-h-[44px] rounded-none"
                      >
                        Express Interest
                      </Button>
                      <Button
                        variant="secondary"
                        size="md"
                        data-testid="rail-investor-offer-services-btn"
                        onClick={() => setIsOfferServicesModalOpen(true)}
                        className="w-full justify-center min-h-[44px] rounded-none"
                        icon={<Briefcase className="h-4 w-4" />}
                      >
                        Offer Services
                      </Button>
                    </>
                  )
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    href="/dashboard/deals"
                    className="w-full justify-center min-h-[44px] rounded-none"
                  >
                    Browse Similar Deals
                  </Button>
                )}

                {/* Run in Deal Calculator Secondary CTA */}
                <Button
                  href={calculatorUrl}
                  variant="secondary"
                  size="md"
                  className="w-full justify-center min-h-[44px] rounded-none"
                  icon={<Calculator className="h-4 w-4" />}
                >
                  Run in Deal Calculator
                </Button>
              </div>
            </div>

            {/* Overarching Project Rail Widget */}
            {parentProjectId && (
              <div
                data-testid="rail-overarching-project-widget"
                className="rounded-none border border-neutral-800 bg-neutral-900 p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <Folder className="h-3.5 w-3.5 text-neutral-400" />
                    Parent Project
                  </span>
                  <span className="rounded-none border border-neutral-700 bg-neutral-800 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-300">
                    {stageLabel}
                  </span>
                </div>
                <div className="text-sm font-bold text-white truncate">
                  {parentProjectName}
                </div>
                <p className="text-xs text-neutral-400">
                  Underwritten component of the {parentProjectName} lifecycle container.
                </p>
                <Button
                  href={`/project/${parentProjectId}`}
                  variant="secondary"
                  size="sm"
                  className="w-full justify-center min-h-[44px] text-xs font-semibold rounded-none"
                >
                  Go to Project Workspace →
                </Button>
              </div>
            )}

            {/* Similar Deals (3 Compact Cards) */}
            <div className="rounded-none border border-neutral-800 bg-neutral-900 p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                <Buildings className="h-4 w-4 text-white" />
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

      {/* Offer Services on Deal Modal */}
      {isOfferServicesModalOpen && (
        <DealOfferServicesModal
          deal={{
            id: deal.id,
            slug: deal.slug,
            name: deal.name,
            propertyName: deal.propertyName,
            address: deal.address,
            city: deal.city,
            state: deal.state,
            assetClass: deal.assetClass,
            creatorName: deal.creatorName,
          }}
          isOpen={isOfferServicesModalOpen}
          onClose={() => setIsOfferServicesModalOpen(false)}
          onSuccessToast={showToast}
        />
      )}

      {/* Crowdfunding Syndicate Commitment Modal */}
      <DealCrowdfundModal
        deal={deal}
        isOpen={isCrowdfundOpen}
        onClose={() => setIsCrowdfundOpen(false)}
        onCommitSuccess={(amount) => {
          setLocalCommitted((prev) => prev + amount);
          setLocalInvestors((prev) => prev + 1);
          setIsCrowdfundOpen(false);
          showToast(`Successfully committed ${formatCurrency(amount)} to syndication! Direct negotiation opened.`);
        }}
      />

      {/* Negotiation in Messages Modal */}
      <DealNegotiationModal
        isOpen={isNegotiationOpen}
        onClose={() => setIsNegotiationOpen(false)}
        dealId={deal.id || deal.slug}
        dealTitle={name}
        dealAddress={deal.address}
        operatorName={operatorName}
        targetIrr={targetIrr}
        minInvestment={minInvestment}
      />

      {/* Professional Discussion & Underwriting Q&A Modal */}
      <DealDiscussionModal
        isOpen={isDiscussionOpen}
        onClose={() => setIsDiscussionOpen(false)}
        dealId={deal.id || deal.slug}
        dealTitle={name}
        dealAddress={deal.address}
        targetIrr={targetIrr}
        fundingTarget={target}
      />

      {/* Crowdfund via Email Promotion Broadcast Modal */}
      <BroadcastDealModal
        isOpen={isBroadcastOpen}
        onClose={() => setIsBroadcastOpen(false)}
        dealId={deal.id || deal.slug}
        projectId={deal.projectId || undefined}
        address={deal.address}
        purchasePrice={deal.purchasePrice || 500000}
        calculations={{
          projectedIrrPct: targetIrr,
          netOperatingIncome: Math.round((deal.purchasePrice || 500000) * 0.08),
        } as any}
        onSuccess={(count) => {
          setIsBroadcastOpen(false);
          showToast(`Deal promotional memo sent to ${count} investor recipients!`);
        }}
      />

      {/* Share & Privacy Control Modal */}
      <ShareDealModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        dealId={deal.id || deal.slug}
        dealSlug={deal.slug}
        dealTitle={name}
        dealAddress={deal.address}
        currentVisibility={visibility}
        targetIrr={targetIrr}
        purchasePrice={deal.purchasePrice || 500000}
        calculatorResults={(deal as any).calculatorResults}
        onVisibilityChange={(newVis) => {
          setVisibility(newVis);
          deal.visibility = newVis;
          showToast(`Deal visibility updated to ${newVis === 'private' ? 'Private' : 'Deals Marketplace'}`);
        }}
      />

      {/* Persistent Compare Tray Dock */}
      <CompareTray />
    </div>
  );
}
