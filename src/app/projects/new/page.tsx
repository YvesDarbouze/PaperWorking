'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Building2, MapPin, CheckCircle2, ArrowRight, ArrowLeft, Link as LinkIcon, Plus, Sparkles } from 'lucide-react';
import AddressSearch from '@/components/deals/AddressSearch';
interface SelectedDeal {
  id: string;
  slug?: string;
  address?: string;
  propertyName?: string;
  purchasePrice?: number;
  projectedRoi?: number;
  status?: string;
  committedAmount?: number;
  fundingTarget?: number;
}

export default function NewProjectWizardPage() {
  const router = useRouter();
  const _searchParams = useSearchParams();
  const { user } = useAuth();

  useEffect(() => {
    if (user === null) {
      router.push('/login?redirect=/projects/new');
    }
  }, [user, router]);

  // Wizard Step State (1: Basics, 2: Property Identification, 3: Confirm & Launch)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1 Form Data
  const [projectName, setProjectName] = useState('Austin Multifamily Venture');
  const [description, setDescription] = useState('8-unit value-add multifamily renovation project in central Austin tech corridor.');
  const [assetClass, setAssetClass] = useState('Multi-family');

  // Step 2 Property Identification State
  const [selectedAddress, setSelectedAddress] = useState('');
  const [selectedDeal, setSelectedDeal] = useState<SelectedDeal | null>(null);
  const [_dealAction, setDealAction] = useState<'linked_existing' | 'created_new' | null>(null);
  const [linkedDealId, setLinkedDealId] = useState<string | null>(null);
  const [_isCheckingDeal, setIsCheckingDeal] = useState(false);

  // Handle Address Selection in Step 2
  const handleAddressSelect = async (address: string) => {
    setSelectedAddress(address);
    setIsCheckingDeal(true);

    const slug = address.toLowerCase().replace(/[^a-z0-9]/g, '');

    try {
      const res = await fetch(`/api/deals/exists?slug=${encodeURIComponent(slug)}`);
      const data = await res.json();

      if (data.exists && data.deal && (data.deal.status === 'published' || data.deal.status === 'funding')) {
        setSelectedDeal({
          id: data.deal.id,
          slug: data.deal.slug,
          address: data.deal.address,
          propertyName: data.deal.name,
          purchasePrice: data.deal.price,
          projectedRoi: data.deal.roi,
          status: data.deal.status,
          committedAmount: data.deal.committed,
          fundingTarget: data.deal.target,
        });
      } else {
        setSelectedDeal(null);
      }
    } catch {
      setSelectedDeal(null);
    } finally {
      setIsCheckingDeal(false);
    }
  };

  const handleLinkExistingDeal = () => {
    if (selectedDeal) {
      setLinkedDealId(selectedDeal.id);
      setDealAction('linked_existing');
      setCurrentStep(3);
    }
  };

  const handleCreateNewDealForProject = () => {
    const newDealId = `deal_proj_${Date.now()}`;
    setLinkedDealId(newDealId);
    setDealAction('created_new');
    setCurrentStep(3);
  };

  const handleConfirmAndLaunch = () => {
    router.push('/dashboard/projects');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-100 py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="rounded-[14px] border border-white/10 p-6 bg-[#0a0a0f]/90 backdrop-blur-[14px] shadow-2xl space-y-2">
        <div className="flex items-center justify-between">
          <span className="px-2.5 py-1 rounded-[6px] text-[10px] font-extrabold uppercase tracking-wider bg-[#34d399]/20 text-[#34d399] border border-[#34d399]/30">
            Project Creation Wizard
          </span>
          <span className="text-xs font-mono text-slate-400">Step {currentStep} of 3</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Create New Real Estate Project</h1>
      </div>

      {/* Wizard Progress Indicator */}
      <div className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/5 rounded-[12px] text-xs font-bold font-mono">
        <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-[#34d399]' : 'text-slate-500'}`}>
          <span className="w-5 h-5 rounded-full bg-[#34d399]/20 flex items-center justify-center text-[10px]">1</span>
          <span>Basics</span>
        </div>
        <div className="w-8 h-px bg-white/10" />
        <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-[#34d399]' : 'text-slate-500'}`}>
          <span className="w-5 h-5 rounded-full bg-[#34d399]/20 flex items-center justify-center text-[10px]">2</span>
          <span>Property Identification</span>
        </div>
        <div className="w-8 h-px bg-white/10" />
        <div className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-[#34d399]' : 'text-slate-500'}`}>
          <span className="w-5 h-5 rounded-full bg-[#34d399]/20 flex items-center justify-center text-[10px]">3</span>
          <span>Confirm & Launch</span>
        </div>
      </div>

      {/* ── STEP 1: Project Basics ── */}
      {currentStep === 1 && (
        <div data-testid="project-step-1" className="rounded-[14px] border border-white/10 p-6 bg-[#0a0a0f]/90 backdrop-blur-[14px] shadow-2xl space-y-5">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#34d399]" />
            <span>Step 1: Project Details</span>
          </h2>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Project Name</label>
              <input
                type="text"
                data-testid="project-name-input"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full p-3 bg-white/[0.03] border border-white/10 rounded-[10px] text-xs text-white focus:outline-none focus:border-[#34d399]/40 min-h-[44px]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Asset Class</label>
              <select
                value={assetClass}
                onChange={(e) => setAssetClass(e.target.value)}
                className="w-full p-3 bg-white/[0.03] border border-white/10 rounded-[10px] text-xs text-white focus:outline-none focus:border-[#34d399]/40 appearance-none min-h-[44px]"
              >
                <option value="Multi-family">Multi-family</option>
                <option value="Residential">Residential</option>
                <option value="Commercial">Commercial</option>
                <option value="Land">Land</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 bg-white/[0.03] border border-white/10 rounded-[10px] text-xs text-white focus:outline-none focus:border-[#34d399]/40 resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end pt-3">
            <button
              type="button"
              data-testid="step-1-next-btn"
              onClick={() => setCurrentStep(2)}
              className="px-6 py-3 rounded-[10px] bg-[#34d399] hover:bg-[#34d399]/90 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl min-h-[44px] cursor-pointer"
            >
              <span>Next: Identify Property</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Property Identification (AddressSearch Reuse) ── */}
      {currentStep === 2 && (
        <div data-testid="project-step-2" className="rounded-[14px] border border-white/10 p-6 bg-[#0a0a0f]/90 backdrop-blur-[14px] shadow-2xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#34d399]" />
              <span>Step 2: Identify the Property</span>
            </h2>
            <p className="text-xs text-slate-400">
              Search the property address to link an existing marketplace deal or create a new deal for this project.
            </p>
          </div>

          <AddressSearch
            onSearchSubmit={handleAddressSelect}
            placeholder="Search address to identify deal for project..."
          />

          {/* Existing Deal Collision Preview Card */}
          {selectedDeal ? (
            <div data-testid="existing-deal-preview-card" className="p-5 rounded-[14px] border border-white/10 bg-white/[0.02] space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-[6px] text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Existing Deal Found
                </span>
                <span className="text-xs font-mono text-[#34d399] font-bold">{selectedDeal.projectedRoi}% Projected ROI</span>
              </div>

              <div className="space-y-1">
                <span className="text-sm font-bold text-white block">{selectedDeal.address}</span>
                <span className="text-xs text-slate-400">{selectedDeal.propertyName}</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  type="button"
                  data-testid="link-this-deal-btn"
                  onClick={handleLinkExistingDeal}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-[10px] bg-[#34d399] hover:bg-[#34d399]/90 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg min-h-[44px] cursor-pointer"
                >
                  <LinkIcon className="w-4 h-4 text-slate-950" />
                  <span>Link to this deal</span>
                </button>

                <button
                  type="button"
                  data-testid="create-new-deal-for-project-btn"
                  onClick={handleCreateNewDealForProject}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-[10px] bg-[#34d399]/[0.08] border border-[#34d399]/25 hover:bg-[#34d399]/15 text-[#34d399] text-xs font-bold transition-all min-h-[44px] cursor-pointer"
                >
                  Create new deal for this project
                </button>
              </div>
            </div>
          ) : selectedAddress ? (
            <div data-testid="no-existing-deal-card" className="p-5 rounded-[14px] border border-white/10 bg-white/[0.02] space-y-3 text-center">
              <p className="text-xs text-slate-300">
                No existing marketplace deal found for <strong className="text-white">{selectedAddress}</strong>.
              </p>
              <button
                type="button"
                data-testid="create-deal-for-project-btn"
                onClick={handleCreateNewDealForProject}
                className="px-6 py-3 rounded-[10px] bg-[#34d399] hover:bg-[#34d399]/90 text-slate-950 font-black text-xs uppercase tracking-wider inline-flex items-center gap-2 shadow-xl min-h-[44px] cursor-pointer"
              >
                <Plus className="w-4 h-4 text-slate-950" />
                <span>Create deal for this project</span>
              </button>
            </div>
          ) : null}

          <div className="flex items-center justify-between pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2.5 rounded-[10px] bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold flex items-center gap-1.5 min-h-[44px]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Basics</span>
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Confirm and Launch ── */}
      {currentStep === 3 && (
        <div data-testid="project-step-3" className="rounded-[14px] border border-white/10 p-6 bg-[#0a0a0f]/90 backdrop-blur-[14px] shadow-2xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#34d399]" />
              <span>Step 3: Confirm & Launch Project</span>
            </h2>
            <p className="text-xs text-slate-400">Review your project configuration before launching.</p>
          </div>

          <div className="p-4 rounded-[12px] bg-white/[0.03] border border-white/5 space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Project Name:</span>
              <strong className="text-white">{projectName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Asset Class:</span>
              <strong className="text-white">{assetClass}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Linked Property Address:</span>
              <strong className="text-[#34d399]">{selectedAddress || '123 Main St, Austin, TX 78701'}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Linked Deal ID:</span>
              <strong className="font-mono text-white">{linkedDealId}</strong>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
            <button
              type="button"
              data-testid="confirm-launch-project-btn"
              onClick={handleConfirmAndLaunch}
              className="px-6 py-3 rounded-[10px] bg-[#34d399] hover:bg-[#34d399]/90 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl min-h-[48px] cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>Confirm & Launch Project</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
