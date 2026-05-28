'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { projectsService } from '@/lib/firebase/projects';
import { toast } from 'react-hot-toast';
import {
  ChevronLeft, ChevronRight, Check, X, AlertCircle, Building2,
  DollarSign, Target, Users, Key, Wrench, HardHat, Home, Tag, FileSignature, FileText, UploadCloud
} from 'lucide-react';
import {
  PROJECT_WIZARD_QUESTIONS,
  getActiveQuestions,
  setNestedField,
  getNestedField,
  WizardQuestion
} from '@/lib/utils/projectWizardSchema';
import { useProjectFormValidation } from '@/hooks/useProjectFormValidation';
import AddressAutocomplete, { type ParsedAddress } from '@/components/projects/AddressAutocomplete';
import PropertySearchInput from '@/components/shared/PropertySearchInput';
import type { BridgeSearchResult } from '@/types/bridge';

/* ═══════════════════════════════════════════════════════════════
   ProjectCreationWizard — Stitch Schema Reskin
   
   Applies the "Luminous Glass" dark wizard design from Stitch
   screens 475af5c5, dc455216, 3468c351, 0ee3119c.
   
   ALL logic, branching, validation, and submit handlers are
   100% preserved from the original implementation.
   ═══════════════════════════════════════════════════════════════ */

interface ProjectCreationWizardProps {
  organizationId: string;
  onClose: () => void;
  onSuccess?: (projectId: string) => void;
}

const INITIAL_FORM = {
  propertyName: '',
  address: '',
  street: '',
  city: '',
  state: '',
  zip: '',
  lat: null,
  lng: null,
  assetClass: 'Residential',
  strategyType: 'Fix & Flip',
  financingIntent: 'financing',
  raisingOutsideCapital: 'no',
  isBackdated: 'no',
  isCompleted: false,
  startingPhase: null, // change to null instead of 1 to ensure user actually selects it
  leadEmail: '',
  partnerEmails: '',
  vision: '',
  financials: {
    purchasePrice: '',
    estimatedARV: '',
    estimatedCloseDate: '',
    acquisitionDate: '',
    soldDate: '',
    actualSalePrice: '',
    loanAmount: '',
    loanInterestRate: '',
    loanTermYears: '',
    purchaseContractDoc: '',
    rehabActual: '',
    requiredContingencies: [],
    capitalRaiseTarget: '',
    equitySplit: '',
    costs: [],
    // P1 Acquisition Projected Fields
    targetPrice: '',
    projectedRent: '',
    projectedSalePrice: '',
    projectedOpex: '',
    investorInvites: '',
    marketplaceListing: 'no',
    offerStatus: 'No',
    offerAmount: '',
    offerDate: '',
  },
};

export default function ProjectCreationWizard({
  organizationId,
  onClose,
  onSuccess,
}: ProjectCreationWizardProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<any>(INITIAL_FORM);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useManualAddress, setUseManualAddress] = useState(false);

  // Pre-populate lead email once user is loaded
  useEffect(() => {
    if (user?.email) {
      setFormData((prev: any) => ({
        ...prev,
        leadEmail: prev.leadEmail || user.email,
      }));
    }
  }, [user]);

  // Compute active questions based on current answers
  const activeQuestions = useMemo(() => {
    return getActiveQuestions(formData);
  }, [formData]);

  const activeQuestion = useMemo(() => {
    return activeQuestions[activeIndex] || null;
  }, [activeQuestions, activeIndex]);

  // Validation
  const { isValid, validationError, addressErrors, isAddressComplete } = useProjectFormValidation(
    formData,
    activeQuestion
  );

  const updateFormNested = useCallback((path: string, value: any) => {
    setFormData((prev: any) => {
      const copy = JSON.parse(JSON.stringify(prev));
      setNestedField(copy, path, value);
      // Auto-set project name from street address if propertyName is empty
      if (path === 'address' && !copy.propertyName && copy.street) {
        copy.propertyName = `The ${copy.street} Project`;
      }
      return copy;
    });
  }, []);

  const handlePropertySelect = useCallback((property: BridgeSearchResult) => {
    const street = property.address.split(',')[0]?.trim() ?? property.address;
    const city = property.address.split(',')[1]?.trim() ?? '';
    const state = property.address.split(',')[2]?.trim()?.split(' ')[0] ?? '';
    const zip = property.address.split(',')[2]?.trim()?.split(' ')[1] ?? '';

    setFormData((prev: any) => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy.address = property.address;
      copy.street = street;
      copy.city = city;
      copy.state = state;
      copy.zip = zip;
      copy.lat = null;
      copy.lng = null;
      copy.mlsListingKey = property.listingKey;
      copy.mlsListingId = property.listingId;
      copy.mlsListPrice = property.listPrice;
      copy.mlsBeds = property.beds;
      copy.mlsBaths = property.baths;
      copy.mlsSqft = property.sqft;
      copy.mlsThumbnailUrl = property.thumbnailUrl;
      copy.mlsStandardStatus = property.standardStatus;

      if (!copy.propertyName) {
        copy.propertyName = `The ${street} Project`;
      }
      return copy;
    });
  }, []);

  const handleManualAddressSelect = useCallback((parsed: ParsedAddress) => {
    setFormData((prev: any) => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy.address = parsed.formattedAddress;
      copy.street = parsed.street;
      copy.city = parsed.city;
      copy.state = parsed.state;
      copy.zip = parsed.zip;
      copy.lat = parsed.lat;
      copy.lng = parsed.lng;

      if (!copy.propertyName) {
        copy.propertyName = `The ${parsed.street} Project`;
      }
      return copy;
    });
  }, []);

  const clearAddress = useCallback(() => {
    setFormData((prev: any) => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy.address = '';
      copy.street = '';
      copy.city = '';
      copy.state = '';
      copy.zip = '';
      copy.lat = null;
      copy.lng = null;
      copy.mlsListingKey = undefined;
      copy.mlsListingId = undefined;
      copy.mlsListPrice = null;
      copy.mlsBeds = null;
      copy.mlsBaths = null;
      copy.mlsSqft = null;
      copy.mlsThumbnailUrl = null;
      copy.mlsStandardStatus = null;
      return copy;
    });
  }, []);

  const handleNext = () => {
    if (!isValid) return;
    if (activeIndex < activeQuestions.length) {
      setActiveIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (activeIndex > 0) {
      setActiveIndex((prev) => prev - 1);
    } else {
      onClose();
    }
  };

  const handleSkip = () => {
    if (activeQuestion && !activeQuestion.required) {
      setActiveIndex((prev) => prev + 1);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeQuestion) {
      // Simulate file upload and store file name/mock url
      updateFormNested(activeQuestion.field, `/files/mock_${Date.now()}_${file.name}`);
      toast.success(`File "${file.name}" uploaded successfully.`);
    }
  };

  const handleFinalSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      // Map starting phase to correct initial REI statuses
      let reiStatus = 'Target';
      let status = 'Lead';
      const phase = Number(formData.startingPhase);

      if (phase === 2) {
        reiStatus = 'In Contract';
        status = 'Under Contract';
      } else if (phase === 3) {
        reiStatus = 'Rehabbing';
        status = 'Renovating';
      } else if (phase === 4) {
        reiStatus = 'For Sale';
        status = 'Listed';
      }

      // Construct payload
      const dealData: any = {
        propertyName: formData.propertyName,
        address: formData.address,
        street: formData.street || '',
        city: formData.city || '',
        state: formData.state || '',
        zip: formData.zip || '',
        lat: formData.lat,
        lng: formData.lng,
        reiStatus,
        status,
        strategyType: formData.strategyType,
        ownerUid: user.uid,
        assetClass: formData.assetClass,
        leadEmail: formData.leadEmail,
        partnerEmails: formData.partnerEmails,
        vision: formData.vision,
        mlsListingKey: formData.mlsListingKey || null,
        mlsListingId: formData.mlsListingId || null,
        mlsListPrice: formData.mlsListPrice || null,
        mlsBeds: formData.mlsBeds || null,
        mlsBaths: formData.mlsBaths || null,
        mlsSqft: formData.mlsSqft || null,
        mlsThumbnailUrl: formData.mlsThumbnailUrl || null,
        mlsStandardStatus: formData.mlsStandardStatus || null,
        financingIntent: formData.financingIntent,
        financials: {
          purchasePrice: parseFloat(formData.financials.purchasePrice) * 100,
          estimatedARV: formData.financials.estimatedARV ? parseFloat(formData.financials.estimatedARV) * 100 : 0,
          costs: [],
          raisingOutsideCapital: formData.raisingOutsideCapital === 'yes',
          isBackdated: formData.isBackdated === 'yes',
          // R0 — Ownership & Entry Path
          ownershipPercentage: (() => {
            const rawPct = parseFloat(formData.financials.ownershipPercentage);
            // If raising outside capital with equitySplit, auto-compute ownership
            if (formData.raisingOutsideCapital === 'yes' && formData.financials.equitySplit) {
              return Math.max(0, Math.min(100, 100 - parseFloat(formData.financials.equitySplit)));
            }
            return isNaN(rawPct) ? 100 : Math.max(0, Math.min(100, rawPct));
          })(),
          entryPath: formData.isBackdated === 'yes'
            ? (phase >= 3 ? 'already_owned' : 'backdated')
            : 'new_acquisition',
          ...(formData.financials.acquisitionDate && {
            acquisitionDate: new Date(formData.financials.acquisitionDate + 'T00:00:00'),
          }),
          ...(formData.financials.estimatedCloseDate && {
            estimatedCloseDate: new Date(formData.financials.estimatedCloseDate + 'T00:00:00'),
          }),
          ...(formData.financials.soldDate && {
            soldDate: new Date(formData.financials.soldDate + 'T00:00:00'),
          }),
          ...(formData.financials.actualSalePrice && {
            actualSalePrice: parseFloat(formData.financials.actualSalePrice) * 100,
          }),
          ...(formData.financials.loanAmount && {
            loanAmount: parseFloat(formData.financials.loanAmount),
          }),
          ...(formData.financials.loanInterestRate && {
            loanInterestRate: parseFloat(formData.financials.loanInterestRate),
          }),
          ...(formData.financials.loanTermYears && {
            loanTermYears: parseFloat(formData.financials.loanTermYears),
          }),
          ...(formData.financials.rehabActual && {
            rehabActual: parseFloat(formData.financials.rehabActual) * 100,
          }),
          ...(formData.financials.capitalRaiseTarget && {
            capitalRaiseTarget: parseFloat(formData.financials.capitalRaiseTarget) * 100,
          }),
          ...(formData.financials.equitySplit && {
            equitySplit: parseFloat(formData.financials.equitySplit),
          }),
          requiredContingencies: formData.financials.requiredContingencies || [],
          purchaseContractDoc: formData.financials.purchaseContractDoc || '',
          // P1 Acquisition Projected Fields
          ...(formData.financials.targetPrice && {
            targetPrice: parseFloat(formData.financials.targetPrice) * 100,
          }),
          ...(formData.financials.projectedRent && {
            projectedRent: parseFloat(formData.financials.projectedRent) * 100,
          }),
          ...(formData.financials.projectedSalePrice && {
            projectedSalePrice: parseFloat(formData.financials.projectedSalePrice) * 100,
          }),
          ...(formData.financials.projectedOpex && {
            projectedOpex: parseFloat(formData.financials.projectedOpex) * 100,
          }),
          ...(formData.financials.investorInvites && {
            investorInvites: formData.financials.investorInvites
              .split(',')
              .map((e: string) => e.trim())
              .filter(Boolean),
          }),
          marketplaceListing: formData.financials.marketplaceListing === 'yes',
          ...(formData.financials.offerStatus && formData.financials.offerStatus !== 'No' && {
            offerStatus: formData.financials.offerStatus,
          }),
          ...(formData.financials.offerAmount && {
            offerAmount: parseFloat(formData.financials.offerAmount) * 100,
          }),
          ...(formData.financials.offerDate && {
            offerDate: new Date(formData.financials.offerDate + 'T00:00:00'),
          }),
        },
      };

      const projectId = await projectsService.createProject(dealData, organizationId);
      toast.success('Project created and initialized successfully.');
      
      try {
        const { useUIStore } = await import('@/store/uiStore');
        useUIStore.getState().triggerSuccessfulAction('project_created');
      } catch (err) {
        console.error('Failed to trigger project_created successful action:', err);
      }

      onSuccess?.(projectId);
    } catch (err) {
      console.error(err);
      toast.error('Failed to create Project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReviewStep = activeIndex === activeQuestions.length;
  const progressPercent = ((isReviewStep ? activeQuestions.length : activeIndex) / activeQuestions.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex flex-col min-h-screen bg-[#0b141a] selection:bg-primary/30 overflow-hidden">
      {/* ── Ambient Background Layer ── */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -left-[5%] w-[30%] h-[30%] bg-[#0566d9]/5 blur-[100px] rounded-full" />
        {/* Obsidian dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />
      </div>

      {/* ── Top Navigation Bar (Stitch schema) ── */}
      <header className="fixed top-0 w-full z-50 bg-[#0b141a]/80 backdrop-blur-xl border-b border-white/10 h-16 flex items-center justify-between px-5 md:px-10">
        <button
          onClick={onClose}
          className="text-[#bacac5] hover:text-[#57f1db] transition-colors active:scale-95 duration-200 flex items-center"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        <h1 className="text-[24px] leading-[32px] font-bold text-[#57f1db] tracking-tight">
          New Project
        </h1>
        <div className="w-10" /> {/* Spacer for centering */}
      </header>

      {/* ── Main Content Canvas ── */}
      <main className="flex-grow flex flex-col items-center justify-center pt-24 pb-32 px-5 overflow-y-auto">
        <div className="w-full max-w-xl space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* ── Progress Indicator (Stitch schema) ── */}
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div className="flex flex-col gap-1">
                <span className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#bacac5] uppercase">
                  {isReviewStep
                    ? `Review — ${activeQuestions.length} questions complete`
                    : `Step ${activeIndex + 1} of ${activeQuestions.length}`}
                </span>
                {!isReviewStep && activeQuestion && (
                  <span className="text-[24px] leading-[32px] font-semibold text-[#dae4ec]">
                    {getCategoryLabel(activeQuestion)}
                  </span>
                )}
              </div>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${progressPercent}%`,
                  background: 'linear-gradient(90deg, #3cddc7 0%, #57f1db 100%)',
                  boxShadow: '0 0 10px rgba(87, 241, 219, 0.5)',
                }}
              />
            </div>
          </div>

          {/* ── Form Content ── */}
          {isReviewStep ? (
            /* ═══ REVIEW STEP ═══ */
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="text-center max-w-2xl mx-auto">
                <h2 className="text-[32px] leading-[40px] font-bold tracking-tight text-[#dae4ec] mb-4">
                  Review &amp; Confirm
                </h2>
                <p className="text-[16px] leading-[24px] text-[#bacac5]">
                  Verify the inputs before creating the Project folder.
                </p>
              </div>

              <div className="glass-card rounded-xl p-6 divide-y divide-white/10 text-[14px]">
                <ReviewRow label="Project Name" value={formData.propertyName} />
                <ReviewRow label="Address" value={formData.address || 'Manual Entry'} />
                <ReviewRow label="Strategy" value={formData.strategyType} />
                <ReviewRow label="Phase" value={formData.isCompleted ? `Phase ${formData.startingPhase} (Completed)` : `Phase ${formData.startingPhase}`} />
                <ReviewRow label="Financing" value={formData.financingIntent} />
                <ReviewRow label="Purchase Price" value={`$${Number(formData.financials.purchasePrice || formData.financials.targetPrice).toLocaleString()}`} />
                {formData.financials.estimatedARV && (
                  <ReviewRow label="Estimated ARV" value={`$${Number(formData.financials.estimatedARV).toLocaleString()}`} />
                )}
                {formData.financials.projectedRent && (
                  <ReviewRow label="Monthly Rent" value={`$${Number(formData.financials.projectedRent).toLocaleString()}/mo`} />
                )}
                {formData.financials.projectedSalePrice && (
                  <ReviewRow label="Projected Sale" value={`$${Number(formData.financials.projectedSalePrice).toLocaleString()}`} />
                )}
                {formData.financials.loanAmount && (
                  <ReviewRow label="Loan Amount" value={`$${Number(formData.financials.loanAmount).toLocaleString()}`} />
                )}
                {formData.financials.offerStatus && formData.financials.offerStatus !== 'No' && (
                  <ReviewRow label="Offer Status" value={formData.financials.offerStatus} />
                )}
              </div>
            </div>
          ) : (
            /* ═══ ONE QUESTION STEP ═══ */
            activeQuestion && (
              <div key={activeQuestion.id} className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Conversational Header (Stitch schema) */}
                <div className="text-center max-w-2xl mx-auto">
                  <h2 className="text-[28px] leading-[36px] md:text-[32px] md:leading-[40px] font-bold text-white tracking-tight mb-4">
                    {activeQuestion.prompt}
                  </h2>
                  {activeQuestion.subtext && (
                    <p className="text-[16px] leading-[24px] text-[#bacac5]">
                      {activeQuestion.subtext}
                    </p>
                  )}
                </div>

                {/* ── Input Renderers ── */}
                <div className="pt-2">
                  {/* TEXT */}
                  {activeQuestion.type === 'text' && (
                    <div className="relative group">
                      <input
                        type="text"
                        value={getNestedField(formData, activeQuestion.field) || ''}
                        onChange={(e) => updateFormNested(activeQuestion.field, e.target.value)}
                        placeholder={activeQuestion.placeholder}
                        className="w-full h-[72px] px-6 rounded-xl text-[18px] leading-[28px] text-white placeholder:text-[#bacac5]/50 focus:outline-none transition-all duration-300"
                        style={{
                          background: 'rgba(24, 33, 39, 0.6)',
                          backdropFilter: 'blur(12px)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#57f1db';
                          e.currentTarget.style.boxShadow = '0 0 0 1px rgba(87, 241, 219, 0.2)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                  )}

                  {/* NUMBER */}
                  {activeQuestion.type === 'number' && (
                    <div className="relative group">
                      <input
                        type="number"
                        value={getNestedField(formData, activeQuestion.field) || ''}
                        onChange={(e) => updateFormNested(activeQuestion.field, e.target.value)}
                        placeholder={activeQuestion.placeholder}
                        className="w-full h-[72px] px-6 rounded-xl text-[18px] leading-[28px] text-white placeholder:text-[#bacac5]/50 focus:outline-none font-mono transition-all duration-300"
                        style={{
                          background: 'rgba(24, 33, 39, 0.6)',
                          backdropFilter: 'blur(12px)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#57f1db';
                          e.currentTarget.style.boxShadow = '0 0 0 1px rgba(87, 241, 219, 0.2)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                  )}

                  {/* CURRENCY */}
                  {activeQuestion.type === 'currency' && (
                    <div className="relative group">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[#bacac5] text-[18px] font-bold font-mono z-10">$</span>
                      <input
                        type="number"
                        value={getNestedField(formData, activeQuestion.field) || ''}
                        onChange={(e) => updateFormNested(activeQuestion.field, e.target.value)}
                        placeholder={activeQuestion.placeholder || '0.00'}
                        className="w-full h-[72px] pl-12 pr-6 rounded-xl text-[18px] leading-[28px] text-white placeholder:text-[#bacac5]/50 focus:outline-none font-mono transition-all duration-300"
                        style={{
                          background: 'rgba(24, 33, 39, 0.6)',
                          backdropFilter: 'blur(12px)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#57f1db';
                          e.currentTarget.style.boxShadow = '0 0 0 1px rgba(87, 241, 219, 0.2)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                  )}

                  {/* DATE */}
                  {activeQuestion.type === 'date' && (
                    <div className="relative group">
                      <input
                        type="date"
                        value={getNestedField(formData, activeQuestion.field) || ''}
                        onChange={(e) => updateFormNested(activeQuestion.field, e.target.value)}
                        className="w-full h-[72px] px-6 rounded-xl text-[18px] leading-[28px] text-white focus:outline-none font-mono transition-all duration-300"
                        style={{
                          background: 'rgba(24, 33, 39, 0.6)',
                          backdropFilter: 'blur(12px)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          colorScheme: 'dark',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#57f1db';
                          e.currentTarget.style.boxShadow = '0 0 0 1px rgba(87, 241, 219, 0.2)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                  )}

                  {/* PHASE SELECTION (Stitch step 2) */}
                  {activeQuestion.type === 'phase-selection' && (
                    <div className="space-y-4">
                      {[
                        { id: 1, type: 'acquisition', title: 'Acquisition', desc: 'Evaluating or under contract.', icon: 'analytics', colorClass: 'text-[#57f1db]', borderClass: 'border-[#57f1db]', bgClass: 'bg-[#57f1db]', hoverBorderClass: 'group-hover:border-[#57f1db]' },
                        { id: 2, type: 'purchase', title: 'Purchase', desc: 'Closing the transaction.', icon: 'shopping_cart', colorClass: 'text-[#adc6ff]', borderClass: 'border-[#adc6ff]', bgClass: 'bg-[#adc6ff]', hoverBorderClass: 'group-hover:border-[#adc6ff]' },
                        { id: 3, type: 'hold', title: 'Hold', desc: 'Operating or renovating.', icon: 'warehouse', colorClass: 'text-[#ffac5a]', borderClass: 'border-[#ffac5a]', bgClass: 'bg-[#ffac5a]', hoverBorderClass: 'group-hover:border-[#ffac5a]' },
                        { id: 4, type: 'exit', title: 'Exit', desc: 'Selling or refinancing.', icon: 'logout', colorClass: 'text-[#bacac5]', borderClass: 'border-[#bacac5]', bgClass: 'bg-[#bacac5]', hoverBorderClass: 'group-hover:border-[#bacac5]' },
                      ].map((phase) => {
                        const isSelected = formData.startingPhase === phase.id;
                        return (
                          <button
                            key={phase.id}
                            type="button"
                            onClick={() => {
                              updateFormNested('startingPhase', phase.id);
                              // Auto-set isBackdated correctly depending on phase
                              if (phase.id !== 4) {
                                updateFormNested('isBackdated', phase.id >= 3 ? 'yes' : 'no');
                                updateFormNested('isCompleted', false);
                              } else {
                                updateFormNested('isBackdated', 'yes'); // Always own it if selling
                              }
                            }}
                            className={`w-full flex items-start gap-5 p-6 rounded-xl text-left focus:outline-none group transition-all duration-200
                              ${isSelected ? `border border-white/20 bg-white/5 shadow-inner phase-selected` : `border border-white/10 glass-card hover:border-white/20 hover:bg-white/[0.02]`}
                            `}
                            style={isSelected ? { borderColor: 'rgba(87, 241, 219, 0.4)', background: 'rgba(87, 241, 219, 0.04)', boxShadow: 'inset 0 0 20px rgba(87, 241, 219, 0.05)' } : {}}
                          >
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 border ${phase.colorClass.replace('text-', 'bg-')}/10 ${phase.colorClass.replace('text-', 'border-')}/20`} style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                              <span className={`material-symbols-outlined ${phase.colorClass}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                                {phase.icon}
                              </span>
                            </div>
                            <div className="flex-grow">
                              <div className="flex justify-between items-center mb-1">
                                <h3 className={`font-headline-md text-headline-md ${phase.colorClass}`}>
                                  {phase.title}
                                </h3>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? phase.borderClass : `border-[#859490] ${phase.hoverBorderClass}`}`}>
                                  {isSelected && <div className={`w-2.5 h-2.5 rounded-full ${phase.bgClass}`}></div>}
                                </div>
                              </div>
                              <p className="font-body-md text-body-md text-[#bacac5] opacity-80">{phase.desc}</p>
                            </div>
                          </button>
                        );
                      })}
                      
                      {/* Retroactive Toggle */}
                      <div className={`transition-all duration-300 p-4 glass-card rounded-xl flex items-center justify-between border border-white/10
                        ${formData.startingPhase === 4 ? 'opacity-100 translate-y-0 mt-6' : 'opacity-0 translate-y-2 pointer-events-none mt-0 h-0 p-0 overflow-hidden border-0'}`}
                      >
                        <div className="flex flex-col">
                          <span className="text-[14px] leading-[16px] font-semibold text-[#dae4ec] tracking-wide">Retroactive entry</span>
                          <span className="text-[12px] text-[#bacac5] mt-1">I'm entering a deal I've already completed</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={formData.isCompleted === true}
                            onChange={(e) => updateFormNested('isCompleted', e.target.checked)}
                          />
                          <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#57f1db]"></div>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* SINGLE SELECT — Glass strategy cards (Stitch schema) */}
                  {activeQuestion.type === 'single-select' && (
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                      {activeQuestion.options?.map((opt) => {
                        const selected = getNestedField(formData, activeQuestion.field) === opt.value;
                        return (
                          <button
                            key={String(opt.value)}
                            type="button"
                            onClick={() => updateFormNested(activeQuestion.field, opt.value)}
                            className={`p-5 rounded-xl cursor-pointer transition-all duration-300 group flex items-start gap-4 text-left
                              ${selected
                                ? 'border border-[#57f1db] shadow-[0_0_20px_-10px_rgba(87,241,219,0.5)]'
                                : 'border border-white/[0.12] hover:border-[#57f1db]/30'
                              }`}
                            style={{
                              background: selected
                                ? 'linear-gradient(135deg, rgba(87, 241, 219, 0.15) 0%, rgba(87, 241, 219, 0.05) 100%)'
                                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
                              backdropFilter: 'blur(24px)',
                            }}
                          >
                            <div className={`p-3 rounded-lg transition-transform group-hover:scale-110 ${selected ? 'bg-[#57f1db]/20 text-[#57f1db]' : 'bg-white/5 text-[#bacac5]'}`}>
                              {selected ? <Check className="w-5 h-5" /> : <Target className="w-5 h-5" />}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[14px] leading-[16px] font-semibold tracking-[0.02em] text-[#dae4ec] mb-1">
                                {opt.label}
                              </span>
                              {opt.description && (
                                <span className="text-[14px] leading-[20px] text-[#bacac5]">
                                  {opt.description}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* ADDRESS — Preserve existing MLS + manual logic */}
                  {activeQuestion.type === 'address' && (
                    <div className="space-y-4">
                      {!useManualAddress && !formData.mlsListingKey ? (
                        <>
                          <div className="relative group">
                            <PropertySearchInput
                              value={formData.address}
                              onSelect={handlePropertySelect}
                              onManualChange={(raw) => updateFormNested('address', raw)}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setUseManualAddress(true)}
                            className="text-[12px] font-medium tracking-[0.05em] text-[#bacac5] hover:text-[#57f1db] transition-colors uppercase underline underline-offset-2"
                          >
                            Enter address manually instead
                          </button>
                        </>
                      ) : formData.mlsListingKey ? (
                        <div className="glass-card rounded-xl overflow-hidden">
                          <div className="flex items-center justify-between px-5 py-3 bg-[#57f1db]/10 border-b border-white/10">
                            <span className="text-[12px] font-medium tracking-[0.05em] text-[#57f1db] uppercase">
                              MLS Listing Selected
                            </span>
                            <button
                              type="button"
                              onClick={clearAddress}
                              className="text-[12px] font-medium tracking-[0.05em] text-[#bacac5] hover:text-[#57f1db] flex items-center gap-1 uppercase transition-colors"
                            >
                              <X className="w-3 h-3" /> Clear
                            </button>
                          </div>
                          <div className="flex gap-4 p-5">
                            {formData.mlsThumbnailUrl && (
                              <img
                                src={formData.mlsThumbnailUrl}
                                alt="Property thumbnail"
                                className="w-24 h-16 object-cover rounded-lg"
                              />
                            )}
                            <div className="space-y-1">
                              <p className="text-[14px] font-semibold text-[#dae4ec]">{formData.address}</p>
                              <div className="flex gap-3 text-[12px] text-[#bacac5] font-mono">
                                {formData.mlsListPrice && (
                                  <span className="font-bold text-[#57f1db]">
                                    ${formData.mlsListPrice.toLocaleString()}
                                  </span>
                                )}
                                <span>{formData.mlsBeds} beds</span>
                                <span>{formData.mlsBaths} baths</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Manual fields
                        <div className="space-y-3">
                          <AddressAutocomplete
                            value={formData.address}
                            variant="dashboard"
                            structuredValue={{
                              street: formData.street,
                              city: formData.city,
                              state: formData.state,
                              zip: formData.zip,
                            }}
                            onInputChange={(raw) => updateFormNested('address', raw)}
                            onSelect={handleManualAddressSelect}
                          />
                          {isAddressComplete ? (
                            <div className="glass-card rounded-xl p-4 text-[12px] font-mono flex items-center justify-between">
                              <span className="text-[#dae4ec]">
                                {formData.street}, {formData.city}, {formData.state} {formData.zip}
                              </span>
                              <button
                                type="button"
                                onClick={clearAddress}
                                className="text-[#ffb4ab] font-bold hover:underline"
                              >
                                Clear
                              </button>
                            </div>
                          ) : (
                            <div className="rounded-xl p-4 text-[12px] text-[#ffb875] font-mono border border-[#ffac5a]/30 bg-[#ffac5a]/5">
                              ⚠️ Address details incomplete. Please fill all fields via autocomplete.
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setUseManualAddress(false)}
                            className="text-[12px] font-medium tracking-[0.05em] text-[#bacac5] hover:text-[#57f1db] transition-colors uppercase underline underline-offset-2"
                          >
                            Search MLS instead
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* MULTI-SELECT — Glass cards with checkmarks */}
                  {activeQuestion.type === 'multi-select' && (
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                      {activeQuestion.options?.map((opt) => {
                        const currentValues = getNestedField(formData, activeQuestion.field) || [];
                        const isSelected = currentValues.includes(opt.value);
                        return (
                          <button
                            key={String(opt.value)}
                            type="button"
                            onClick={() => {
                              const nextValues = isSelected
                                ? currentValues.filter((v: any) => v !== opt.value)
                                : [...currentValues, opt.value];
                              updateFormNested(activeQuestion.field, nextValues);
                            }}
                            className={`p-5 rounded-xl cursor-pointer transition-all duration-300 group flex items-start gap-4 text-left
                              ${isSelected
                                ? 'border border-[#57f1db] shadow-[0_0_20px_-10px_rgba(87,241,219,0.5)]'
                                : 'border border-white/[0.12] hover:border-[#57f1db]/30'
                              }`}
                            style={{
                              background: isSelected
                                ? 'linear-gradient(135deg, rgba(87, 241, 219, 0.15) 0%, rgba(87, 241, 219, 0.05) 100%)'
                                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
                              backdropFilter: 'blur(24px)',
                            }}
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${isSelected ? 'border-[#57f1db] bg-[#57f1db]' : 'border-[#bacac5]/50'}`}>
                              {isSelected && <Check className="w-3 h-3 text-[#003731]" />}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[14px] leading-[16px] font-semibold tracking-[0.02em] text-[#dae4ec] mb-1">
                                {opt.label}
                              </span>
                              {opt.description && (
                                <span className="text-[14px] leading-[20px] text-[#bacac5]">
                                  {opt.description}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* FILE UPLOAD — Glass dropzone */}
                  {activeQuestion.type === 'file-upload' && (
                    <div
                      className="rounded-xl p-8 flex flex-col items-center justify-center text-center relative group transition-all duration-300 cursor-pointer hover:border-[#57f1db]/30"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
                        backdropFilter: 'blur(24px)',
                        border: '2px dashed rgba(255, 255, 255, 0.12)',
                      }}
                    >
                      <input
                        type="file"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <UploadCloud className="w-10 h-10 text-[#bacac5] mb-3 group-hover:text-[#57f1db] transition-colors" />
                      <span className="text-[14px] font-semibold text-[#dae4ec] tracking-[0.02em] uppercase">
                        {getNestedField(formData, activeQuestion.field)
                          ? 'Replace file'
                          : 'Choose file or drag here'}
                      </span>
                      {getNestedField(formData, activeQuestion.field) && (
                        <span className="text-[12px] font-mono text-[#bacac5] mt-2 max-w-[280px] truncate">
                          Uploaded: {getNestedField(formData, activeQuestion.field)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Validation Error Message (Stitch error palette) */}
                {validationError && (
                  <div className="rounded-xl p-4 text-[14px] text-[#ffb4ab] flex items-center gap-3 font-mono border border-[#93000a]/40 bg-[#93000a]/10">
                    <AlertCircle className="w-4 h-4 text-[#ffb4ab] shrink-0" />
                    <span>{validationError}</span>
                  </div>
                )}
              </div>
            )
          )}

          {/* Subtle security indicator (Stitch schema) */}
          {!isReviewStep && (
            <div className="pt-4 opacity-20 pointer-events-none select-none hidden md:block">
              <div className="flex items-center gap-3 text-[#bacac5]">
                <Key className="w-4 h-4" />
                <span className="text-[12px] font-medium tracking-[0.2em] uppercase">
                  Secure Data Synchronization Active
                </span>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Bottom Navigation Bar (Stitch schema) ── */}
      <nav className="fixed bottom-0 left-0 w-full z-50 bg-[#141d23]/60 backdrop-blur-2xl border-t border-white/[0.12] rounded-t-xl">
        <div className="max-w-[640px] mx-auto px-8 py-5 flex justify-between items-center">
          {/* Back */}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-[#bacac5] text-[14px] leading-[16px] font-semibold tracking-[0.02em] hover:text-[#57f1db] transition-all active:scale-95 duration-150"
          >
            <ChevronLeft className="w-5 h-5" />
            {activeIndex === 0 ? 'Exit' : 'Back'}
          </button>

          <div className="flex items-center gap-4">
            {/* Skip (only for non-required) */}
            {!isReviewStep && activeQuestion && !activeQuestion.required && (
              <button
                onClick={handleSkip}
                className="hidden md:flex items-center gap-2 text-[#bacac5] text-[14px] leading-[16px] font-semibold tracking-[0.02em] hover:text-[#57f1db] transition-all active:scale-95 duration-150"
              >
                Skip
              </button>
            )}

            {/* Next / Submit */}
            {isReviewStep ? (
              <button
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-3 bg-[#57f1db] text-[#003731] rounded-xl px-10 py-4 text-[14px] leading-[16px] font-semibold tracking-[0.02em] luminous-glow transition-all hover:scale-[1.02] active:scale-95 duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating...' : 'Confirm & Create'}
                {!isSubmitting && <Check className="w-5 h-5" />}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!isValid}
                className="flex items-center gap-3 bg-[#57f1db] text-[#003731] rounded-xl px-10 py-4 text-[14px] leading-[16px] font-semibold tracking-[0.02em] luminous-glow transition-all hover:scale-[1.02] active:scale-95 duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}

/* ── Helper: Review row ── */
function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3 flex justify-between items-center">
      <span className="text-[12px] font-medium tracking-[0.05em] text-[#bacac5] uppercase">{label}</span>
      <span className="text-[14px] font-semibold text-[#dae4ec] truncate max-w-[320px]">{value}</span>
    </div>
  );
}

/* ── Helper: Category label from question ID ── */
function getCategoryLabel(question: WizardQuestion): string {
  const map: Record<string, string> = {
    address: 'Property Address',
    propertyName: 'Project Name',
    assetClass: 'Asset Classification',
    strategyType: 'Investment Strategy',
    financingIntent: 'Financing Plan',
    raisingOutsideCapital: 'Capital Structure',
    ownershipPercentage: 'Ownership',
    isBackdated: 'Entry Path',
    startingPhase: 'Starting Phase',
    acquisitionDate: 'Acquisition Details',
    rehabActual: 'Rehab Costs',
    dateOfSale: 'Sale Details',
    actualSalePrice: 'Sale Price',
    purchasePrice: 'Purchase Price',
    targetPrice: 'Target Pricing',
    projectedRent: 'Rental Projections',
    projectedSalePrice: 'Sale Projections',
    projectedOpex: 'Operating Expenses',
    estimatedARV: 'After-Repair Value',
    closeDate: 'Closing Timeline',
    loanAmount: 'Loan Details',
    loanInterestRate: 'Interest Rate',
    loanTermYears: 'Loan Term',
    requiredContingencies: 'Contingencies',
    capitalRaiseTarget: 'Capital Raising',
    equitySplit: 'Equity Split',
    investorInvites: 'Investor Outreach',
    marketplaceListing: 'Marketplace',
    offerStatus: 'Offer Tracking',
    offerAmount: 'Offer Amount',
    offerDate: 'Offer Date',
    purchaseContractDoc: 'Documents',
    leadEmail: 'Lead Contact',
    partnerEmails: 'Partners',
    vision: 'Project Vision',
  };
  return map[question.id] ?? 'Setup';
}
