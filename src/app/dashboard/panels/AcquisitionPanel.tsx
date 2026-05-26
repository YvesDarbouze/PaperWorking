'use client';

import React, { useState, useMemo } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { Search, Briefcase, DollarSign, TrendingUp, BarChart2 } from 'lucide-react';
import PropertyDiscovery from '@/components/findandfund/PropertyDiscovery';
import CapitalStackProgress from '@/components/findandfund/CapitalStackProgress';
import SyndicationEngine from '@/components/findandfund/SyndicationEngine';
import InvestorInviteDrawer from '@/components/findandfund/InvestorInviteDrawer';
import LOIWizardModal from '@/components/findandfund/LOIWizardModal';
import { ARVSpreadChart, LTVGauge, DealScorecardCard } from '@/components/metrics/phase1';
import type { InvestorCommitment, LOIDocument } from '@/types/schema';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════
   FindAndFundPanel — Phase 1: Pre-Acquisition

   Orchestrates:
   • PropertyDiscovery (MLS search + property card)
   • CapitalStackProgress (funding progress bar)
   • SyndicationEngine (investor roster table)
   • InvestorInviteDrawer (slide-out invite form)
   • LOIWizardModal (3-step LOI generator)
   ═══════════════════════════════════════════════════════ */

export default function AcquisitionPanel() {
  const currentProject = useProjectStore((s) => s.currentProject);
  const updateInvestorCommitments = useProjectStore((s) => s.updateInvestorCommitments);
  const updateLOIDocuments = useProjectStore((s) => s.updateLOIDocuments);
  const updateProjectFinancials = useProjectStore((s) => s.updateProjectFinancials);

  // Local UI state
  const [showInviteDrawer, setShowInviteDrawer] = useState(false);
  const [loiWizardOpen, setLoiWizardOpen] = useState(false);
  const [loiTargetInvestor, setLoiTargetInvestor] = useState<InvestorCommitment | null>(null);

  // Derived data
  const investors = currentProject?.investorCommitments || [];
  const loiDocs = currentProject?.loiDocuments || [];

  const capitalNeeded = useMemo(() => {
    const purchase = currentProject?.financials?.purchasePrice || 0;
    const rehab = currentProject?.financials?.projectedRehabCost || 0;
    return purchase + rehab;
  }, [currentProject?.financials?.purchasePrice, currentProject?.financials?.projectedRehabCost]);

  const capitalPledged = useMemo(() => {
    return investors.reduce((sum, inv) => sum + inv.pledgedAmount, 0);
  }, [investors]);

  // ── Handlers ──────────────────────────────────────────

  const handleInviteSubmit = (data: {
    name: string;
    email: string;
    pledgeAmount: number;
    equitySplit: number;
    interestRate: number;
    customTerms: string;
  }) => {
    if (!currentProject) return;

    const newInvestor: InvestorCommitment = {
      id: `ic_${Date.now()}`,
      investorName: data.name,
      investorEmail: data.email,
      pledgedAmount: data.pledgeAmount,
      loiStatus: 'Drafted',
      previousDealCount: 0,
      isReturning: false,
      invitedAt: new Date(),
    };

    const updated = [...investors, newInvestor];
    updateInvestorCommitments(currentProject.id, updated);
    setShowInviteDrawer(false);
    toast.success(`${data.name} added to investor syndicate`);
  };

  const handleSendLOI = (investorId: string) => {
    const investor = investors.find((i) => i.id === investorId);
    if (!investor) return;
    setLoiTargetInvestor(investor);
    setLoiWizardOpen(true);
  };

  const handleLOIDispatch = (data: {
    legalEntityName: string;
    investmentAmount: number;
    termLengthMonths: number;
    equitySplitPercent: number;
    interestRatePercent: number;
  }) => {
    if (!currentProject || !loiTargetInvestor) return;

    // Create the LOI document
    const newLOI: LOIDocument = {
      id: `loi_${Date.now()}`,
      investorId: loiTargetInvestor.id,
      legalEntityName: data.legalEntityName,
      investmentAmount: data.investmentAmount,
      termLengthMonths: data.termLengthMonths,
      equitySplitPercent: data.equitySplitPercent,
      interestRatePercent: data.interestRatePercent,
      status: 'Sent',
      createdAt: new Date(),
      sentAt: new Date(),
    };

    updateLOIDocuments(currentProject.id, [...loiDocs, newLOI]);

    // Update investor LOI status
    const updatedInvestors = investors.map((inv) =>
      inv.id === loiTargetInvestor.id
        ? { ...inv, loiStatus: 'Sent' as const, loiDocumentId: newLOI.id }
        : inv
    );
    updateInvestorCommitments(currentProject.id, updatedInvestors);

    toast.success(`LOI sent to ${loiTargetInvestor.investorName}`);
  };

  const handlePropertySelected = (data: {
    address: string;
    askingPrice: number;
    targetPrice: number;
    rehabBudget: number;
    sqft: number;
  }) => {
    if (!currentProject) return;
    updateProjectFinancials(currentProject.id, {
      purchasePrice: data.targetPrice,
      projectedRehabCost: data.rehabBudget,
      estimatedARV: data.askingPrice,
    });
    toast.success('Property data applied to deal');
  };

  // ── No Project Selected ───────────────────────────────
  if (!currentProject) {
    return (
      <section className="flex h-full w-full items-center justify-center" aria-label="Find & Fund panel">
        <div className="text-center">
          <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-none flex items-center justify-center mx-auto mb-4">
            <Search className="w-7 h-7 text-pw-accent" />
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-1">Acquisition</h2>
          <p className="text-sm text-text-secondary">Select a deal from the Pipeline to begin</p>
        </div>
      </section>
    );
  }

  // ── Panel Content ─────────────────────────────────────
  return (
    <section
      className="h-full w-full overflow-y-auto"
      aria-label="Find & Fund panel"
      style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 40%)' }}
    >
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Phase Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 text-pw-black text-[10px] font-bold uppercase tracking-widest rounded-none border border-pw-border">
                Phase 01
              </span>
            </div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Acquisition</h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {currentProject.propertyName || currentProject.address || 'Untitled Deal'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="ag-label">Deal Status</p>
              <p className="text-sm font-semibold text-text-primary">{currentProject.phaseStatus || currentProject.status}</p>
            </div>
          </div>
        </div>

        {/* Capital Stack Progress */}
        <div className="glass-card rounded-none p-6 border border-pw-border shadow-none">
          <CapitalStackProgress
            capitalNeeded={capitalNeeded}
            capitalPledged={capitalPledged}
            investorCount={investors.length}
          />
        </div>

        {/* Two-Column Layout: Property + Financials */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Property Discovery */}
          <div className="glass-card rounded-none p-6 border border-pw-border shadow-none">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="w-4 h-4 text-pw-accent" />
              <h2 className="text-sm font-semibold text-text-primary">Property Discovery</h2>
            </div>
            <PropertyDiscovery onPropertySelected={handlePropertySelected} />
          </div>

          {/* Quick Financials Summary */}
          <div className="glass-card rounded-none p-6 border border-pw-border shadow-none space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-pw-accent" />
              <h2 className="text-sm font-semibold text-text-primary">Deal Snapshot</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Purchase Price', value: currentProject.financials?.purchasePrice, prefix: '$' },
                { label: 'Estimated ARV', value: currentProject.financials?.estimatedARV, prefix: '$' },
                { label: 'Rehab Budget', value: currentProject.financials?.projectedRehabCost, prefix: '$' },
                { label: 'Total Capital', value: capitalNeeded, prefix: '$' },
              ].map((item) => (
                <div key={item.label} className="bg-white/5 border border-white/5 rounded-none px-4 py-3">
                  <p className="ag-label mb-1">{item.label}</p>
                  <p className="text-lg font-semibold text-text-primary">
                    {item.value ? `${item.prefix}${item.value.toLocaleString()}` : '—'}
                  </p>
                </div>
              ))}
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-4 pt-2 border-t border-pw-border">
              <div className="flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-pw-accent" />
                <span className="text-xs text-text-secondary">
                  {investors.filter(i => i.loiStatus === 'Signed').length} LOIs signed
                </span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-pw-accent" />
                <span className="text-xs text-text-secondary">
                  ${capitalPledged.toLocaleString()} committed
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Syndication Engine */}
        <div className="glass-card rounded-none p-6 border border-pw-border shadow-none">
          <SyndicationEngine
            investors={investors}
            onInviteClick={() => setShowInviteDrawer(true)}
            onSendLOI={handleSendLOI}
          />
        </div>

        {/* ── Deal Metrics Section ─────────────────────────── */}
        {currentProject.financials && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-pw-border pb-3">
              <BarChart2 className="w-4 h-4 text-pw-accent" />
              <h2 className="text-sm font-semibold text-text-primary">Deal Metrics</h2>
            </div>

            {/* ARV Spread Chart — full width */}
            {(currentProject.financials.purchasePrice || currentProject.financials.estimatedARV) ? (
              <ARVSpreadChart
                purchasePrice={currentProject.financials.purchasePrice ?? 0}
                projectedRehabCost={currentProject.financials.projectedRehabCost ?? 0}
                estimatedARV={currentProject.financials.estimatedARV ?? 0}
                fixedAcquisitionCosts={currentProject.financials.fixedAcquisitionCosts ?? 0}
              />
            ) : null}

            {/* LTV Gauge + Scorecard side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {(currentProject.financials.loanAmount || currentProject.financials.purchasePrice) ? (
                <LTVGauge
                  loanAmount={currentProject.financials.loanAmount ?? 0}
                  propertyValue={currentProject.financials.estimatedARV ?? currentProject.financials.purchasePrice ?? 0}
                />
              ) : null}

              <DealScorecardCard financials={currentProject.financials} />
            </div>
          </div>
        )}
      </div>

      {/* Modals & Drawers */}
      <InvestorInviteDrawer
        isOpen={showInviteDrawer}
        onClose={() => setShowInviteDrawer(false)}
        onInvite={handleInviteSubmit}
        dealName={currentProject.propertyName || currentProject.address || 'Untitled Deal'}
      />

      {loiTargetInvestor && (
        <LOIWizardModal
          isOpen={loiWizardOpen}
          onClose={() => { setLoiWizardOpen(false); setLoiTargetInvestor(null); }}
          investorName={loiTargetInvestor.investorName}
          investorEmail={loiTargetInvestor.investorEmail}
          dealName={currentProject.propertyName || 'Untitled Deal'}
          propertyAddress={currentProject.address || 'TBD'}
          onDispatch={handleLOIDispatch}
        />
      )}
    </section>
  );
}
