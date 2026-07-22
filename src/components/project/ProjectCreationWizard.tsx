'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { projectsService } from '@/lib/firebase/projects';
import { createProjectViaApi, commitProjectViaApi } from '@/lib/api/projectWizardApi';
import { toast } from 'react-hot-toast';
import {
  ChevronLeft, ChevronRight, Check, X, AlertCircle, Target, Key, UploadCloud
} from 'lucide-react';
import {
  getActiveQuestions,
  setNestedField,
  getNestedField,
  WizardQuestion
} from '@/lib/utils/projectWizardSchema';
import { useProjectFormValidation } from '@/hooks/useProjectFormValidation';
import AddressAutocomplete, { type ParsedAddress } from '@/components/projects/AddressAutocomplete';
import PropertySearchInput from '@/components/shared/PropertySearchInput';
import { DealHealthPreview } from '@/components/project/DealHealthPreview';
import type { BridgeSearchResult } from '@/types/bridge';
import { ButtonGroup } from '@/components/ui/ButtonGroup';

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
  dispositionType: 'SALE',
  subStrategy: 'FLIP',
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
    // Granular NOI Fields (Rent/BRRRR)
    grossMonthlyRent: '',
    otherMonthlyIncome: '',
    vacancyRatePercent: '',
    holdingCostTaxes: '',
    holdingCostInsurance: '',
    holdingCostUtilities: '',
    propertyManagementFeePercent: '',
    monthlyMaintenanceReserve: '',
    monthlyHOA: '',
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

const strategyConfig: Record<string, { icon: string; label: string; description: string }> = {
  'SALE': {
    icon: 'payments',
    label: 'Sale',
    description: 'Acquire, renovate, and sell (Flip/Wholesale/Build-Sell).'
  },
  'RENT': {
    icon: 'home_work',
    label: 'Rent',
    description: 'Acquire, lease, and hold (Long Term/Short Term/BRRRR).'
  },
  'LEASE': {
    icon: 'business',
    label: 'Lease',
    description: 'Lease out the property (NNN/Ground/Lease Option).'
  },
  'FLIP': {
    icon: 'build',
    label: 'Fix & Flip',
    description: 'Acquire, renovate, and sell for profit.'
  },
  'WHOLESALE': {
    icon: 'assignment',
    label: 'Wholesale',
    description: 'Contract a property and assign to another buyer.'
  },
  'BUILD_SELL': {
    icon: 'foundation',
    label: 'Build & Sell',
    description: 'Construct a new building and sell upon completion.'
  },
  'LONG_TERM': {
    icon: 'calendar_today',
    label: 'Long Term',
    description: 'Lease to stable tenants on 12+ month terms.'
  },
  'SHORT_TERM': {
    icon: 'travel_explore',
    label: 'Short Term / Airbnb',
    description: 'Lease as vacation or short term rentals.'
  },
  'MID_TERM': {
    icon: 'domain',
    label: 'Mid Term',
    description: 'Corporate housing or 30+ day rentals.'
  },
  'BRRRR': {
    icon: 'autorenew',
    label: 'BRRRR',
    description: 'Buy, Rehab, Rent, Refinance, Repeat.'
  },
  'NNN': {
    icon: 'account_balance',
    label: 'Triple Net (NNN)',
    description: 'Tenant pays taxes, insurance, and maintenance.'
  },
  'GROUND': {
    icon: 'landscape',
    label: 'Ground Lease',
    description: 'Lease the land only; tenant builds improvements.'
  },
  'LEASE_OPTION': {
    icon: 'handshake',
    label: 'Lease Option',
    description: 'Lease with option to purchase at a later date.'
  }
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
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [showDismissConfirm, setShowDismissConfirm] = useState(false);
  const isDirtyRef = useRef(false);

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
  const { isValid, validationError, isAddressComplete } = useProjectFormValidation(
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
      isDirtyRef.current = true;
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeQuestion || !user) return;
    const toastId = `wizard-upload-${activeQuestion.field}`;
    toast.loading(`Uploading ${file.name}…`, { id: toastId });
    try {
      const { uploadFile } = await import('@/lib/storage/uploadService');
      // Use a user-scoped temp path; the download URL is permanent and
      // gets persisted into the project document when the wizard submits.
      const result = await uploadFile({
        projectId: `users/${user.uid}/wizard_uploads`,
        path: activeQuestion.field,
        file,
      });
      updateFormNested(activeQuestion.field, result.downloadUrl);
      toast.success(`"${file.name}" uploaded successfully.`, { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Upload failed. Please try again.', { id: toastId });
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
        dispositionType: formData.dispositionType,
        subStrategy: formData.subStrategy,
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
          // Granular NOI Fields (Rent/BRRRR)
          ...(formData.financials.grossMonthlyRent && {
            monthlyGrossRent: parseFloat(formData.financials.grossMonthlyRent),
          }),
          ...(formData.financials.otherMonthlyIncome && {
            otherMonthlyIncome: parseFloat(formData.financials.otherMonthlyIncome),
          }),
          ...(formData.financials.vacancyRatePercent && {
            vacancyRatePercent: parseFloat(formData.financials.vacancyRatePercent),
          }),
          ...(formData.financials.holdingCostTaxes && {
            holdingCostTaxes: parseFloat(formData.financials.holdingCostTaxes),
            operatingExpenseTaxes: parseFloat(formData.financials.holdingCostTaxes),
          }),
          ...(formData.financials.holdingCostInsurance && {
            holdingCostInsurance: parseFloat(formData.financials.holdingCostInsurance),
            operatingExpenseInsurance: parseFloat(formData.financials.holdingCostInsurance),
          }),
          ...(formData.financials.holdingCostUtilities && {
            holdingCostUtilities: parseFloat(formData.financials.holdingCostUtilities),
          }),
          ...(formData.financials.propertyManagementFeePercent && {
            propertyManagementFeePercent: parseFloat(formData.financials.propertyManagementFeePercent),
          }),
          ...(formData.financials.monthlyMaintenanceReserve && {
            monthlyMaintenanceReserve: parseFloat(formData.financials.monthlyMaintenanceReserve),
            maintenanceReserves: parseFloat(formData.financials.monthlyMaintenanceReserve),
          }),
          ...(formData.financials.monthlyHOA && {
            monthlyHOA: parseFloat(formData.financials.monthlyHOA),
          }),
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

      // Try server-side API first for validation, fall back to client-side service
      let projectId: string;
      try {
        const apiResult = await createProjectViaApi({
          ...dealData,
          organizationId,
        });
        if (apiResult.success && apiResult.projectId) {
          projectId = apiResult.projectId;
          // Commit the project to active status via API
          await commitProjectViaApi(projectId).catch(() => {
            // Non-fatal: project was created, commit can happen later
          });
        } else {
          // Server validation failed — fall back to client-side
          console.warn('[Wizard] API creation failed, falling back to client-side:', apiResult.error);
          projectId = await projectsService.createProject(dealData, organizationId);
        }
      } catch (apiErr) {
        // API route unavailable — fall back to client-side service
        console.warn('[Wizard] API unavailable, using client-side:', apiErr);
        projectId = await projectsService.createProject(dealData, organizationId);
      }

      toast.success('Project created and initialized successfully.');
      isDirtyRef.current = false;
      
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
    <div className="fixed inset-0 z-50 flex flex-col min-h-screen bg-[#0d0a0b] selection:bg-primary/30 overflow-hidden">
      {/* ── Ambient Background Layer ── */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -left-[5%] w-[30%] h-[30%] bg-[#7A9EAA]/5 blur-[100px] rounded-full" />
        {/* Obsidian dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />
      </div>

      {/* ── Top Navigation Bar (Stitch schema) ── */}
      <header className="fixed top-0 w-full z-50 bg-[#0d0a0b]/80 backdrop-blur-xl border-b border-white/10 h-16 flex items-center justify-between px-5 md:px-10">
        <button
          onClick={() => {
            if (isDirtyRef.current) {
              setShowDismissConfirm(true);
            } else {
              onClose();
            }
          }}
          className="text-[#9E9DA0] hover:text-[#454955] transition-colors active:scale-95 duration-200 flex items-center"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        <h1 className="text-[24px] leading-[32px] font-bold text-[#454955] tracking-tight">
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
                <span className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#9E9DA0] uppercase">
                  {isReviewStep
                    ? `Review — ${activeQuestions.length} questions complete`
                    : `Step ${activeIndex + 1} of ${activeQuestions.length}`}
                </span>
                {!isReviewStep && activeQuestion && (
                  <span className="text-[24px] leading-[32px] font-semibold text-[#9E9DA0]">
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
                  background: 'linear-gradient(90deg, #454955 0%, #454955 100%)',
                  boxShadow: '0 0 10px rgba(69, 73, 85, 0.5)',
                }}
              />
            </div>
          </div>

          {/* ── Form Content ── */}
          {isReviewStep ? (
            /* ═══ REVIEW STEP ═══ */
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="text-center max-w-2xl mx-auto">
                <h2 className="text-[32px] leading-[40px] font-bold tracking-tight text-[#9E9DA0] mb-4">
                  Review &amp; Confirm
                </h2>
                <p className="text-[16px] leading-[24px] text-[#9E9DA0]">
                  Verify the inputs before creating the Project folder.
                </p>
              </div>

              <div className="glass-card rounded-xl p-6 divide-y divide-white/10 text-[14px]">
                <ReviewRow label="Project Name" value={formData.propertyName} />
                <ReviewRow label="Address" value={formData.address || 'Manual Entry'} />
                <ReviewRow label="Strategy" value={formData.dispositionType === 'RENT'
                  ? (formData.subStrategy === 'BRRRR' ? 'Rent (BRRRR)' : 'Buy-and-hold Rental')
                  : (formData.subStrategy === 'WHOLESALE' ? 'Sale (Wholesale)' : 'Fix & Flip')} />
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

              {/* ═══ DEAL HEALTH PREVIEW ═══ */}
              <DealHealthPreview formData={formData} />
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
                    <p className="text-[16px] leading-[24px] text-[#9E9DA0]">
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
                        className="w-full h-[72px] px-6 rounded-xl text-[18px] leading-[28px] text-white placeholder:text-[#9E9DA0]/50 focus:outline-none transition-all duration-300"
                        style={{
                          background: 'rgba(30, 27, 32, 0.6)',
                          backdropFilter: 'blur(12px)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#454955';
                          e.currentTarget.style.boxShadow = '0 0 0 1px rgba(69, 73, 85, 0.2)';
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
                        className="w-full h-[72px] px-6 rounded-xl text-[18px] leading-[28px] text-white placeholder:text-[#9E9DA0]/50 focus:outline-none font-mono transition-all duration-300"
                        style={{
                          background: 'rgba(30, 27, 32, 0.6)',
                          backdropFilter: 'blur(12px)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#454955';
                          e.currentTarget.style.boxShadow = '0 0 0 1px rgba(69, 73, 85, 0.2)';
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
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[#9E9DA0] text-[18px] font-bold font-mono z-10">$</span>
                      <input
                        type="number"
                        value={getNestedField(formData, activeQuestion.field) || ''}
                        onChange={(e) => updateFormNested(activeQuestion.field, e.target.value)}
                        placeholder={activeQuestion.placeholder || '0.00'}
                        className="w-full h-[72px] pl-12 pr-6 rounded-xl text-[18px] leading-[28px] text-white placeholder:text-[#9E9DA0]/50 focus:outline-none font-mono transition-all duration-300"
                        style={{
                          background: 'rgba(30, 27, 32, 0.6)',
                          backdropFilter: 'blur(12px)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#454955';
                          e.currentTarget.style.boxShadow = '0 0 0 1px rgba(69, 73, 85, 0.2)';
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
                          background: 'rgba(30, 27, 32, 0.6)',
                          backdropFilter: 'blur(12px)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          colorScheme: 'dark',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#454955';
                          e.currentTarget.style.boxShadow = '0 0 0 1px rgba(69, 73, 85, 0.2)';
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
                        {
                          id: 1, type: 'acquisition', title: 'Acquisition',
                          desc: 'Find out if the deal is worth doing. Run the numbers before you spend a dollar.',
                          icon: 'analytics',
                          color: '#454955',
                        },
                        {
                          id: 2, type: 'purchase', title: 'Closing',
                          desc: 'You like the deal. Now fund it. Walk through closing, financing, and every cost before the keys change hands.',
                          icon: 'receipt_long',
                          color: '#7A9EAA',
                        },
                        {
                          id: 3, type: 'hold', title: 'Hold',
                          desc: 'You own it. Track every carrying cost and renovation dollar in real time — before they sink your return.',
                          icon: 'construction',
                          color: '#ffac5a',
                        },
                        {
                          id: 4, type: 'exit', title: 'Exit',
                          desc: 'Close it out or keep it producing income. This is where the whole lifecycle pays off.',
                          icon: 'trending_up',
                          color: 'var(--pw-success)',
                        },
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
                            className="w-full flex items-start gap-5 p-5 rounded-xl text-left focus:outline-none group transition-all duration-200"
                            style={{
                              background: isSelected
                                ? `${phase.color}08`
                                : 'linear-gradient(135deg, rgba(24,33,39,0.6) 0%, rgba(13,10,11,0.8) 100%)',
                              backdropFilter: 'blur(16px)',
                              border: `1px solid ${isSelected ? `${phase.color}45` : 'rgba(255,255,255,0.08)'}`,
                              boxShadow: isSelected ? `0 0 24px -8px ${phase.color}30` : '0 4px 16px rgba(0,0,0,0.2)',
                            }}
                          >
                            <div
                              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                              style={{ background: `${phase.color}14`, border: `1px solid ${phase.color}28` }}
                            >
                              <span
                                className="material-symbols-outlined text-[22px]"
                                style={{ color: phase.color, fontVariationSettings: "'FILL' 0" }}
                              >
                                {phase.icon}
                              </span>
                            </div>
                            <div className="flex-grow">
                              <div className="flex justify-between items-center mb-1.5">
                                <h3 className="text-[17px] font-semibold leading-snug" style={{ color: phase.color }}>
                                  {phase.title}
                                </h3>
                                <div
                                  className="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all"
                                  style={{
                                    borderColor: isSelected ? phase.color : 'rgba(133,148,144,0.5)',
                                  }}
                                >
                                  {isSelected && (
                                    <div className="w-2 h-2 rounded-full" style={{ background: phase.color }} />
                                  )}
                                </div>
                              </div>
                              <p className="text-sm leading-relaxed" style={{ color: 'rgba(186,202,197,0.75)' }}>
                                {phase.desc}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                      
                      {/* Retroactive Toggle */}
                      <div className={`transition-all duration-300 p-4 glass-card rounded-xl flex items-center justify-between border border-white/10
                        ${formData.startingPhase === 4 ? 'opacity-100 translate-y-0 mt-6' : 'opacity-0 translate-y-2 pointer-events-none mt-0 h-0 p-0 overflow-hidden border-0'}`}
                      >
                        <div className="flex flex-col">
                          <span className="text-[14px] leading-[16px] font-semibold text-[#9E9DA0] tracking-wide">Retroactive entry</span>
                          <span className="text-[12px] text-[#9E9DA0] mt-1">I'm entering a deal I've already completed</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={formData.isCompleted === true}
                            onChange={(e) => updateFormNested('isCompleted', e.target.checked)}
                          />
                          <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#454955]"></div>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* SINGLE SELECT — Glass strategy cards (Stitch schema) */}
                  {activeQuestion.type === 'single-select' && (
                    ['dispositionType', 'subStrategySale', 'subStrategyRent', 'subStrategyLease'].includes(activeQuestion.id) ? (
                      <div className="space-y-4 w-full animate-in fade-in duration-300" id="strategy-container">
                        {activeQuestion.options?.map((opt) => {
                          const valueStr = String(opt.value);
                          const config = strategyConfig[valueStr] || {
                            icon: 'help',
                            label: opt.label,
                            description: opt.description
                          };
                          const selected = getNestedField(formData, activeQuestion.field) === opt.value;
                          return (
                            <button
                              key={valueStr}
                              type="button"
                              onClick={() => updateFormNested(activeQuestion.field, opt.value)}
                              className={`w-full rounded-xl p-4 flex items-center cursor-pointer group transition-all duration-300 border text-left
                                ${selected ? 'border-[#454955] shadow-[0_0_20px_-10px_#454955]' : 'border-white/10 hover:border-[#454955]/40'}
                              `}
                              style={{
                                background: selected
                                  ? 'rgba(69, 73, 85, 0.05)'
                                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)',
                                backdropFilter: 'blur(20px)',
                              }}
                            >
                              <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center text-[#454955] mr-4 shrink-0 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
                                  {config.icon}
                                </span>
                              </div>
                              <div className="flex-grow">
                                <h3 className="text-[18px] leading-[24px] font-semibold text-[#9E9DA0]">{config.label}</h3>
                                <p className="text-[14px] leading-[20px] text-[#9E9DA0] opacity-80">{config.description}</p>
                              </div>
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${selected ? 'border-[#454955]' : 'border-[#859490]'}`}>
                                <div className={`w-3 h-3 rounded-full bg-[#454955] transition-all ${selected ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`} />
                              </div>
                            </button>
                          );
                        })}

                        {/* Explainer Section */}
                        <div className="mt-8 border-t border-white/5 pt-6 w-full">
                          <button
                            type="button"
                            className="flex items-center text-[#454955] hover:underline decoration-[#454955]/30 transition-all font-medium text-[14px]"
                            onClick={() => {
                              setExplainerOpen(prev => {
                                const next = !prev;
                                if (next) {
                                  setTimeout(() => {
                                    const main = document.querySelector('main');
                                    if (main) {
                                      main.scrollTo({ top: main.scrollHeight, behavior: 'smooth' });
                                    }
                                  }, 100);
                                }
                                return next;
                              });
                            }}
                          >
                            <span className="material-symbols-outlined mr-2">info</span>
                            What's the difference?
                            <span
                              className="material-symbols-outlined ml-1 transition-transform duration-200"
                              style={{ transform: explainerOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                            >
                              expand_more
                            </span>
                          </button>
                          {explainerOpen && (
                            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                              <div className="rounded-lg p-4 bg-white/5 border border-white/10" style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)', backdropFilter: 'blur(20px)' }}>
                                <div className="text-[#ffb875] font-semibold text-[12px] tracking-wide mb-2 uppercase">RENTAL</div>
                                <p className="text-[12px] leading-relaxed text-[#9E9DA0] opacity-80">Ideal for stable, passive income. We'll set up ongoing maintenance schedules and lease tracking.</p>
                              </div>
                              <div className="rounded-lg p-4 bg-white/5 border border-white/10" style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)', backdropFilter: 'blur(20px)' }}>
                                <div className="text-[#ffb875] font-semibold text-[12px] tracking-wide mb-2 uppercase">FLIP</div>
                                <p className="text-[12px] leading-relaxed text-[#9E9DA0] opacity-80">High-velocity projects. We'll focus on renovation budgets, contractor timelines, and resale math.</p>
                              </div>
                              <div className="rounded-lg p-4 bg-white/5 border border-white/10" style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)', backdropFilter: 'blur(20px)' }}>
                                <div className="text-[#ffb875] font-semibold text-[12px] tracking-wide mb-2 uppercase">BRRRR</div>
                                <p className="text-[12px] leading-relaxed text-[#9E9DA0] opacity-80">A multi-phase cycle. We track the conversion from short-term hard money to long-term refinance.</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
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
                                  ? 'border border-[#454955] shadow-[0_0_20px_-10px_rgba(69,73,85,0.5)]'
                                  : 'border border-white/[0.12] hover:border-[#454955]/30'
                                }`}
                              style={{
                                background: selected
                                  ? 'linear-gradient(135deg, rgba(69, 73, 85, 0.15) 0%, rgba(69, 73, 85, 0.05) 100%)'
                                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
                                backdropFilter: 'blur(24px)',
                              }}
                            >
                              <div className={`p-3 rounded-lg transition-transform group-hover:scale-110 ${selected ? 'bg-[#454955]/20 text-[#454955]' : 'bg-white/5 text-[#9E9DA0]'}`}>
                                {selected ? <Check className="w-5 h-5" /> : <Target className="w-5 h-5" />}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[14px] leading-[16px] font-semibold tracking-[0.02em] text-[#9E9DA0] mb-1">
                                  {opt.label}
                                </span>
                                {opt.description && (
                                  <span className="text-[14px] leading-[20px] text-[#9E9DA0]">
                                    {opt.description}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )
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
                            className="text-[12px] font-medium tracking-[0.05em] text-[#9E9DA0] hover:text-[#454955] transition-colors uppercase underline underline-offset-2"
                          >
                            Enter address manually instead
                          </button>
                        </>
                      ) : formData.mlsListingKey ? (
                        <div className="glass-card rounded-xl overflow-hidden">
                          <div className="flex items-center justify-between px-5 py-3 bg-[#454955]/10 border-b border-white/10">
                            <span className="text-[12px] font-medium tracking-[0.05em] text-[#454955] uppercase">
                              MLS Listing Selected
                            </span>
                            <button
                              type="button"
                              onClick={clearAddress}
                              className="text-[12px] font-medium tracking-[0.05em] text-[#9E9DA0] hover:text-[#454955] flex items-center gap-1 uppercase transition-colors"
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
                              <p className="text-[14px] font-semibold text-[#9E9DA0]">{formData.address}</p>
                              <div className="flex gap-3 text-[12px] text-[#9E9DA0] font-mono">
                                {formData.mlsListPrice && (
                                  <span className="font-bold text-[#454955]">
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
                              <span className="text-[#9E9DA0]">
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
                            className="text-[12px] font-medium tracking-[0.05em] text-[#9E9DA0] hover:text-[#454955] transition-colors uppercase underline underline-offset-2"
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
                                ? 'border border-[#454955] shadow-[0_0_20px_-10px_rgba(69,73,85,0.5)]'
                                : 'border border-white/[0.12] hover:border-[#454955]/30'
                              }`}
                            style={{
                              background: isSelected
                                ? 'linear-gradient(135deg, rgba(69, 73, 85, 0.15) 0%, rgba(69, 73, 85, 0.05) 100%)'
                                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
                              backdropFilter: 'blur(24px)',
                            }}
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${isSelected ? 'border-[#454955] bg-[#454955]' : 'border-[#9E9DA0]/50'}`}>
                              {isSelected && <Check className="w-3 h-3 text-[#0d0a0b]" />}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[14px] leading-[16px] font-semibold tracking-[0.02em] text-[#9E9DA0] mb-1">
                                {opt.label}
                              </span>
                              {opt.description && (
                                <span className="text-[14px] leading-[20px] text-[#9E9DA0]">
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
                      className="rounded-xl p-8 flex flex-col items-center justify-center text-center relative group transition-all duration-300 cursor-pointer hover:border-[#454955]/30"
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
                      <UploadCloud className="w-10 h-10 text-[#9E9DA0] mb-3 group-hover:text-[#454955] transition-colors" />
                      <span className="text-[14px] font-semibold text-[#9E9DA0] tracking-[0.02em] uppercase">
                        {getNestedField(formData, activeQuestion.field)
                          ? 'Replace file'
                          : 'Choose file or drag here'}
                      </span>
                      {getNestedField(formData, activeQuestion.field) && (
                        <span className="text-[12px] font-mono text-[#9E9DA0] mt-2 max-w-[280px] truncate">
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
              <div className="flex items-center gap-3 text-[#9E9DA0]">
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
      <nav className="fixed bottom-0 left-0 w-full z-50 bg-[#161318]/60 backdrop-blur-2xl border-t border-white/[0.12] rounded-t-xl">
        <div className="max-w-[640px] mx-auto px-8 py-5 flex justify-between items-center">
          {/* Back */}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-[#9E9DA0] text-[14px] leading-[16px] font-semibold tracking-[0.02em] hover:text-[#454955] transition-all active:scale-95 duration-150"
          >
            <ChevronLeft className="w-5 h-5" />
            {activeIndex === 0 ? 'Exit' : 'Back'}
          </button>

          <ButtonGroup variant="unrelated">
            {/* Skip (only for non-required) */}
            {!isReviewStep && activeQuestion && !activeQuestion.required && (
              <button
                onClick={handleSkip}
                className="hidden md:flex items-center gap-2 text-[#9E9DA0] text-[14px] leading-[16px] font-semibold tracking-[0.02em] hover:text-[#454955] transition-all active:scale-95 duration-150"
              >
                Skip
              </button>
            )}

            {/* Next / Submit */}
            {isReviewStep ? (
              <button
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-3 bg-[#454955] text-[#0d0a0b] rounded-xl px-10 py-4 text-[14px] leading-[16px] font-semibold tracking-[0.02em] luminous-glow transition-all hover:scale-[1.02] active:scale-95 duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating...' : 'Confirm & Create'}
                {!isSubmitting && <Check className="w-5 h-5" />}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!isValid}
                className="flex items-center gap-3 bg-[#454955] text-[#0d0a0b] rounded-xl px-10 py-4 text-[14px] leading-[16px] font-semibold tracking-[0.02em] luminous-glow transition-all hover:scale-[1.02] active:scale-95 duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </ButtonGroup>
        </div>
      </nav>
      {/* ── Dismiss Confirmation Modal ── */}
      {showDismissConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-md mx-4 rounded-2xl p-6 space-y-6 animate-in slide-in-from-bottom-4 duration-300"
            style={{
              background: 'rgba(22, 19, 24, 0.95)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6)',
            }}
          >
            <div className="text-center space-y-2">
              <AlertCircle className="w-10 h-10 text-[#ffb4ab] mx-auto" />
              <h3 className="text-[20px] font-bold text-[#9E9DA0]">Discard progress?</h3>
              <p className="text-[14px] text-[#9E9DA0]">
                You have unsaved data in the wizard. Closing now will discard all entries.
              </p>
            </div>
            <ButtonGroup variant="related" className="w-full">
              <button
                onClick={() => setShowDismissConfirm(false)}
                className="flex-1 rounded-xl px-5 py-3 text-[14px] font-semibold text-[#9E9DA0] border border-white/10 hover:border-white/20 transition-all active:scale-95 duration-150"
              >
                Keep Editing
              </button>
              <button
                onClick={() => {
                  setShowDismissConfirm(false);
                  isDirtyRef.current = false;
                  onClose();
                }}
                className="flex-1 rounded-xl px-5 py-3 text-[14px] font-semibold text-[#0d0a0b] bg-[#ffb4ab] hover:bg-[#ff897a] transition-all active:scale-95 duration-150"
              >
                Discard & Exit
              </button>
            </ButtonGroup>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Helper: Review row ── */
function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3 flex justify-between items-center">
      <span className="text-[12px] font-medium tracking-[0.05em] text-[#9E9DA0] uppercase">{label}</span>
      <span className="text-[14px] font-semibold text-[#9E9DA0] truncate max-w-[320px]">{value}</span>
    </div>
  );
}

/* ── Helper: Category label from question ID ── */
function getCategoryLabel(question: WizardQuestion): string {
  const map: Record<string, string> = {
    address: 'Property Address',
    propertyName: 'Project Name',
    assetClass: 'Asset Classification',
    dispositionType: 'Disposition Type',
    subStrategy: 'Sub-Strategy',
    financingIntent: 'Financing Plan',
    raisingOutsideCapital: 'Capital Structure',
    ownershipPercentage: 'Ownership',
    isBackdated: 'Entry Path',
    startingPhase: 'Starting Phase',
    grossMonthlyRent: 'Rental Income',
    otherMonthlyIncome: 'Other Income',
    vacancyRatePercent: 'Vacancy Rate',
    monthlyPropertyTaxes: 'Property Taxes',
    monthlyInsurance: 'Insurance',
    monthlyUtilities: 'Utilities',
    propertyManagementFeePercent: 'Property Management',
    monthlyMaintenance: 'Maintenance Reserve',
    monthlyHOA: 'HOA Dues',
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
