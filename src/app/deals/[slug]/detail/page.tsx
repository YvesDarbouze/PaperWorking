'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  MapPin,
  TrendingUp,
  DollarSign,
  Users,
  MessageSquare,
  Share2,
  Lock,
  Sparkles,
  BarChart3,
  Mail,
  Building2,
  Maximize2,
  Radio,
} from 'lucide-react';
import Link from 'next/link';
import { formatCurrencyAmount, calculateFundingProgress } from '@/lib/deals/fundingUtils';
import InvestmentPanel from '@/components/deals/InvestmentPanel';
import ShareDeal from '@/components/deals/ShareDeal';
import UnifiedMessageThread from '@/components/deals/UnifiedMessageThread';
import InviteModal from '@/components/deals/InviteModal';
import ExpandedModal from '@/components/deals/ExpandedModal';
import BroadcastModal from '@/components/deals/BroadcastModal';
import { BusinessCard } from '@/types/deals';

const MOCK_SHARED_CARDS: BusinessCard[] = [
  {
    id: 'card_sarah_1',
    userId: 'user_sarah_j',
    name: 'Sarah Jenkins',
    email: 'sarah.j@acme-cap.com',
    phone: '(512) 555-0199',
    company: 'Acme Capital Group',
    title: 'Managing Partner',
    accreditedInvestorStatus: true,
    preferredMarkets: ['Austin, TX', 'Dallas, TX'],
    minInvestment: 50000,
    maxInvestment: 250000,
    isPublic: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'card_marcus_2',
    userId: 'user_marcus_w',
    name: 'Marcus Wright',
    email: 'm.wright@apex-fund.com',
    phone: '(214) 555-0844',
    company: 'Apex Real Estate Fund',
    title: 'Chief Investment Officer',
    accreditedInvestorStatus: true,
    preferredMarkets: ['Austin, TX', 'Houston, TX'],
    minInvestment: 100000,
    maxInvestment: 500000,
    isPublic: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const slug = (params?.slug as string) || '123mainstaustintx78701';

  const [deal, setDeal] = useState({
    id: 'deal_123mainst',
    slug,
    address: '123 Main St, Austin, TX 78701',
    propertyName: 'Austin Core Multifamily Project',
    city: 'Austin',
    state: 'TX',
    assetClass: 'Multi-family',
    subStrategy: 'FLIP',
    status: 'published',
    purchasePrice: 350000,
    rehabCost: 50000,
    arv: 480000,
    holdingCosts: 12000,
    projectedRoi: 18.5,
    fundingTarget: 200000,
    committedAmount: 130000,
    investorCount: 5,
    linkedProjectName: 'Austin Multifamily Venture',
    description:
      'High-ROI 8-unit value-add multifamily property located in prime Austin tech corridor. Heavy upside upon interior rehab and leaseup.',
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'analysis' | 'investors' | 'messages'>('overview');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isExpandedModalOpen, setIsExpandedModalOpen] = useState(false);

  useEffect(() => {
    if (searchParams?.get('expanded') === 'true') {
      setIsExpandedModalOpen(true);
    }
  }, [searchParams]);

  const isSubscribed = user?.subscriptionStatus === 'active';
  const funding = calculateFundingProgress(deal.fundingTarget, deal.committedAmount);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-100 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 pb-28">
      {/* ── Glass Header ── */}
      <div className="rounded-[14px] border border-white/10 bg-[#0a0a0f]/90 backdrop-blur-[14px] p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-[6px] text-[10px] font-extrabold uppercase tracking-wider bg-[#34d399]/20 text-[#34d399] border border-[#34d399]/30">
                {deal.assetClass}
              </span>
              <span className="px-2.5 py-1 rounded-[6px] text-[10px] font-extrabold uppercase tracking-wider bg-white/5 text-slate-300 border border-white/10">
                {deal.subStrategy}
              </span>
              <span className="px-2.5 py-1 rounded-[6px] text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {deal.status}
              </span>

              {/* Linked Project Badge */}
              {deal.linkedProjectName && (
                <Link
                  href="/dashboard/projects"
                  data-testid="linked-project-badge"
                  className="px-2.5 py-1 rounded-[6px] text-[10px] font-extrabold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1 hover:bg-sky-500/30 transition-colors"
                >
                  <Building2 className="w-3 h-3 text-sky-400" />
                  <span>Linked to Project: {deal.linkedProjectName}</span>
                </Link>
              )}
            </div>

            <h1 data-testid="deal-detail-address" className="text-2xl font-bold text-white">
              {deal.address}
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#34d399]" />
              <span>{deal.city}, {deal.state}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              data-testid="maximize-view-btn"
              onClick={() => setIsExpandedModalOpen(true)}
              className="px-3.5 py-2.5 rounded-[10px] bg-[#34d399]/[0.08] border border-[#34d399]/25 hover:bg-[#34d399]/15 text-[#34d399] font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 min-h-[44px] cursor-pointer"
            >
              <Maximize2 className="w-4 h-4 text-[#34d399]" />
              <span>Maximize View</span>
            </button>

            <button
              type="button"
              data-testid="invite-investors-btn"
              onClick={() => setIsInviteModalOpen(true)}
              className="px-4 py-2.5 rounded-[10px] bg-[#34d399] hover:bg-[#34d399]/90 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md min-h-[44px] cursor-pointer"
            >
              <Mail className="w-4 h-4 text-slate-950" />
              <span>Invite Investors</span>
            </button>

            <button
              type="button"
              data-testid="share-analysis-btn"
              onClick={() => setIsBroadcastModalOpen(true)}
              className="px-3.5 py-2.5 rounded-[10px] bg-[#34d399]/[0.08] border border-[#34d399]/25 hover:bg-[#34d399]/15 text-[#34d399] font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 min-h-[44px] cursor-pointer"
            >
              <Radio className="w-4 h-4 text-[#34d399]" />
              <span>Share Analysis</span>
            </button>

            <button
              type="button"
              data-testid="share-deal-header-btn"
              onClick={() => setIsShareModalOpen(!isShareModalOpen)}
              className="p-2.5 rounded-[10px] bg-[#34d399]/[0.08] border border-[#34d399]/25 hover:bg-[#34d399]/15 text-[#34d399] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabs Navigation ── */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        {(['overview', 'analysis', 'investors', 'messages'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            data-testid={`deal-tab-${tab}`}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-[10px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === tab
                ? 'bg-[#34d399] text-slate-950 shadow-lg'
                : 'bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Tab Content: Overview ── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Media & Overview (lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="relative h-64 w-full rounded-[14px] bg-gradient-to-br from-slate-900 via-[#0a0a0f] to-slate-950 border border-white/10 overflow-hidden flex items-center justify-center">
              <div className="flex flex-col items-center justify-center space-y-2 opacity-40">
                <Building2 className="w-12 h-12 text-[#34d399]" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  Property Gallery & Pro-Forma Documents
                </span>
              </div>
            </div>

            <div className="rounded-[14px] border border-white/10 p-6 bg-[#0a0a0f]/90 backdrop-blur-[14px] space-y-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Property Description</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{deal.description}</p>
            </div>
          </div>

          {/* Right Column: Funding Progress & Investment Panel (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Funding Progress Card */}
            <div className="rounded-[14px] border border-white/10 p-6 bg-[#0a0a0f]/90 backdrop-blur-[14px] space-y-4">
              <div className="flex items-center justify-between font-mono">
                <span className="text-xs font-bold text-slate-400 uppercase font-sans">Crowdfund Target</span>
                <span className="text-base font-bold text-[#34d399]">{funding.formattedTarget}</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 font-sans">Committed ({funding.percentFunded}%)</span>
                  <span className="font-bold text-white">{funding.formattedCommitted}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-[#34d399] rounded-full transition-all duration-500"
                    style={{ width: `${funding.percentFunded}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Investment Commitment Panel */}
            <InvestmentPanel
              dealId={deal.id}
              fundingTarget={deal.fundingTarget || 200000}
              committedAmount={deal.committedAmount || 130000}
            />
          </div>
        </div>
      )}

      {/* ── Tab Content: Investors ── */}
      {activeTab === 'investors' && (
        <div data-testid="investors-tab-content" className="rounded-[14px] border border-white/10 p-6 bg-[#0a0a0f]/90 backdrop-blur-[14px] space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-[#34d399]" />
              <span>Interested & Committed Investors</span>
            </h3>
            <p className="text-xs text-slate-400">
              Profiles of investors who expressed interest and shared their business cards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MOCK_SHARED_CARDS.map((card) => (
              <div
                key={card.id}
                data-testid={`shared-card-${card.id}`}
                className="p-5 rounded-[12px] border border-white/10 bg-white/[0.02] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">{card.name}</h4>
                    <p className="text-xs text-slate-400">{card.title} · {card.company}</p>
                  </div>
                  {card.accreditedInvestorStatus && (
                    <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-extrabold uppercase bg-[#34d399]/20 text-[#34d399] border border-[#34d399]/30">
                      Accredited
                    </span>
                  )}
                </div>

                <div className="text-xs space-y-1 font-mono text-slate-300 pt-2 border-t border-white/5">
                  <div>Email: {card.email}</div>
                  <div>Phone: {card.phone}</div>
                  <div>Check Size: {formatCurrencyAmount(card.minInvestment || 0)} – {formatCurrencyAmount(card.maxInvestment || 0)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab Content: Messages ── */}
      {activeTab === 'messages' && (
        <div data-testid="messages-tab-content" className="rounded-[14px] border border-white/10 p-6 bg-[#0a0a0f]/90 backdrop-blur-[14px]">
          <UnifiedMessageThread dealId={deal.id} />
        </div>
      )}

      {/* Modals */}
      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        dealId={deal.id}
        dealAddress={deal.address}
      />

      {isShareModalOpen && (
        <ShareDeal
          address={deal.address}
          slug={deal.slug}
          percentFunded={funding.percentFunded}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}

      <BroadcastModal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        dealId={deal.id}
        dealAddress={deal.address}
        purchasePrice={deal.purchasePrice}
        projectedRoi={deal.projectedRoi}
      />

      <ExpandedModal
        isOpen={isExpandedModalOpen}
        onClose={() => setIsExpandedModalOpen(false)}
        deal={deal}
        source="detail"
        isSubscribed={isSubscribed}
      />
    </div>
  );
}
