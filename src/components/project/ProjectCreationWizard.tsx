'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { projectsService } from '@/lib/firebase/projects';
import { toast } from 'react-hot-toast';
import { trackEvent } from '@/lib/analytics';
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
  startingPhase: 1,
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
      trackEvent('project_created', { projectId });
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

  return (
    <div className="dashboard-context fixed inset-0 z-50 flex items-center justify-center bg-bg-primary overflow-y-auto p-4 md:p-8">
      <div className="w-full max-w-2xl bg-bg-surface border border-border-ui shadow-2xl flex flex-col min-h-[460px] relative animate-in fade-in zoom-in-95 duration-500 rounded-none">
        
        {/* Header progress info */}
        <div className="px-8 pt-6 pb-4 border-b border-border-ui flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-pw-black" />
            <span className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">
              New Project Guided Interview
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-pw-black transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-bg-canvas relative">
          <div
            className="h-full bg-pw-black transition-all duration-500"
            style={{
              width: `${((isReviewStep ? activeQuestions.length : activeIndex) / activeQuestions.length) * 100}%`,
            }}
          />
        </div>

        {/* Form content area */}
        <div className="flex-1 px-8 py-10 flex flex-col justify-center">
          {isReviewStep ? (
            // REVIEW STEP
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-pw-black uppercase">
                  Review & Confirm Project
                </h2>
                <p className="text-[10px] text-text-secondary uppercase tracking-widest mt-1">
                  Verify the inputs before creating the Project folder.
                </p>
              </div>

              <div className="border border-border-ui bg-bg-primary p-5 divide-y divide-border-ui text-xs font-mono">
                <div className="py-2 flex justify-between">
                  <span className="text-text-secondary uppercase">Project Name</span>
                  <span className="font-bold text-pw-black">{formData.propertyName}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-text-secondary uppercase">Address</span>
                  <span className="font-bold text-pw-black truncate max-w-[320px]">
                    {formData.address || 'Manual Entry'}
                  </span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-text-secondary uppercase">Strategy Type</span>
                  <span className="font-bold text-pw-black">{formData.strategyType}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-text-secondary uppercase">Starting Phase</span>
                  <span className="font-bold text-pw-black">Phase {formData.startingPhase}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-text-secondary uppercase">Financing</span>
                  <span className="font-bold text-pw-black uppercase">{formData.financingIntent}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-text-secondary uppercase">Purchase Price</span>
                  <span className="font-bold text-pw-black">
                    ${Number(formData.financials.purchasePrice).toLocaleString()}
                  </span>
                </div>
                {formData.financials.estimatedARV && (
                  <div className="py-2 flex justify-between">
                    <span className="text-text-secondary uppercase">Estimated ARV</span>
                    <span className="font-bold text-pw-black">
                      ${Number(formData.financials.estimatedARV).toLocaleString()}
                    </span>
                  </div>
                )}
                {formData.financials.targetPrice && (
                  <div className="py-2 flex justify-between">
                    <span className="text-text-secondary uppercase">Target Price (Projected)</span>
                    <span className="font-bold text-pw-black">
                      ${Number(formData.financials.targetPrice).toLocaleString()}
                    </span>
                  </div>
                )}
                {formData.financials.projectedRent && (
                  <div className="py-2 flex justify-between">
                    <span className="text-text-secondary uppercase">Monthly Rent (Projected)</span>
                    <span className="font-bold text-pw-black">
                      ${Number(formData.financials.projectedRent).toLocaleString()}/mo
                    </span>
                  </div>
                )}
                {formData.financials.projectedSalePrice && (
                  <div className="py-2 flex justify-between">
                    <span className="text-text-secondary uppercase">Sale Price / ARV (Projected)</span>
                    <span className="font-bold text-pw-black">
                      ${Number(formData.financials.projectedSalePrice).toLocaleString()}
                    </span>
                  </div>
                )}
                {formData.financials.offerStatus && formData.financials.offerStatus !== 'No' && (
                  <div className="py-2 flex justify-between">
                    <span className="text-text-secondary uppercase">Offer Status</span>
                    <span className="font-bold text-pw-black">{formData.financials.offerStatus}</span>
                  </div>
                )}
                {formData.financials.loanAmount && (
                  <div className="py-2 flex justify-between">
                    <span className="text-text-secondary uppercase">Loan Amount</span>
                    <span className="font-bold text-pw-black">
                      ${Number(formData.financials.loanAmount).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // ONE QUESTION STEP
            activeQuestion && (
              <div key={activeQuestion.id} className="space-y-6 animate-in fade-in duration-300">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-text-secondary uppercase tracking-[0.25em]">
                    Question {activeIndex + 1} of {activeQuestions.length}
                  </span>
                  <h2 className="text-2xl font-light text-pw-black tracking-tight leading-snug">
                    {activeQuestion.prompt}
                  </h2>
                  {activeQuestion.subtext && (
                    <p className="text-[10px] text-text-secondary uppercase tracking-wider font-medium">
                      {activeQuestion.subtext}
                    </p>
                  )}
                </div>

                {/* Input components based on question type */}
                <div className="pt-2">
                  {activeQuestion.type === 'text' && (
                    <input
                      type="text"
                      value={getNestedField(formData, activeQuestion.field) || ''}
                      onChange={(e) => updateFormNested(activeQuestion.field, e.target.value)}
                      placeholder={activeQuestion.placeholder}
                      className="pw-input text-sm p-3.5 focus:border-pw-black transition-all"
                    />
                  )}

                  {activeQuestion.type === 'number' && (
                    <input
                      type="number"
                      value={getNestedField(formData, activeQuestion.field) || ''}
                      onChange={(e) => updateFormNested(activeQuestion.field, e.target.value)}
                      placeholder={activeQuestion.placeholder}
                      className="pw-input text-sm p-3.5 focus:border-pw-black transition-all font-mono"
                    />
                  )}

                  {activeQuestion.type === 'currency' && (
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-text-secondary text-sm font-bold font-mono">$</span>
                      <input
                        type="number"
                        value={getNestedField(formData, activeQuestion.field) || ''}
                        onChange={(e) => updateFormNested(activeQuestion.field, e.target.value)}
                        placeholder={activeQuestion.placeholder || '0.00'}
                        className="pw-input text-sm pl-8 pr-4 py-3.5 focus:border-pw-black transition-all font-mono"
                      />
                    </div>
                  )}

                  {activeQuestion.type === 'date' && (
                    <input
                      type="date"
                      value={getNestedField(formData, activeQuestion.field) || ''}
                      onChange={(e) => updateFormNested(activeQuestion.field, e.target.value)}
                      className="pw-input text-sm p-3.5 focus:border-pw-black transition-all font-mono"
                    />
                  )}

                  {activeQuestion.type === 'single-select' && (
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                      {activeQuestion.options?.map((opt) => {
                        const selected = getNestedField(formData, activeQuestion.field) === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => updateFormNested(activeQuestion.field, opt.value)}
                            className="p-4 border text-left flex flex-col justify-between transition-all"
                            style={{
                              borderColor: selected ? 'var(--pw-black)' : 'var(--border-ui)',
                              background: selected ? 'var(--pw-black)' : 'var(--bg-surface)',
                              color: selected ? '#ffffff' : 'var(--text-primary)',
                            }}
                          >
                            <span className="text-xs font-bold uppercase tracking-wider">{opt.label}</span>
                            {opt.description && (
                              <span
                                className={`text-[10px] mt-1.5 leading-normal ${
                                  selected ? 'opacity-85' : 'text-text-secondary'
                                }`}
                              >
                                {opt.description}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {activeQuestion.type === 'address' && (
                    <div className="space-y-4">
                      {!useManualAddress && !formData.mlsListingKey ? (
                        <>
                          <PropertySearchInput
                            value={formData.address}
                            onSelect={handlePropertySelect}
                            onManualChange={(raw) => updateFormNested('address', raw)}
                          />
                          <button
                            type="button"
                            onClick={() => setUseManualAddress(true)}
                            className="text-[10px] font-bold uppercase tracking-widest underline mt-2 hover:text-pw-black text-text-secondary transition-colors"
                          >
                            Enter address manually instead
                          </button>
                        </>
                      ) : formData.mlsListingKey ? (
                        <div className="border border-border-ui bg-bg-surface overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-2 bg-pw-black text-white">
                            <span className="text-[9px] font-bold uppercase tracking-widest">
                              MLS Listing Selected
                            </span>
                            <button
                              type="button"
                              onClick={clearAddress}
                              className="text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 opacity-80 hover:opacity-100"
                            >
                              <X className="w-3 h-3" /> Clear
                            </button>
                          </div>
                          <div className="flex gap-4 p-4">
                            {formData.mlsThumbnailUrl && (
                              <img
                                src={formData.mlsThumbnailUrl}
                                alt="Property thumbnail"
                                className="w-24 h-16 object-cover"
                              />
                            )}
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-pw-black">{formData.address}</p>
                              <div className="flex gap-3 text-[10px] text-text-secondary font-mono">
                                {formData.mlsListPrice && (
                                  <span className="font-bold text-pw-black">
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
                            <div className="p-3 border border-border-ui bg-bg-primary text-[10px] font-mono flex items-center justify-between">
                              <span>
                                {formData.street}, {formData.city}, {formData.state} {formData.zip}
                              </span>
                              <button
                                type="button"
                                onClick={clearAddress}
                                className="text-rose-600 font-bold hover:underline"
                              >
                                Clear
                              </button>
                            </div>
                          ) : (
                            <div className="p-3 border border-amber-200 bg-amber-50/50 text-[10px] text-amber-800 font-mono">
                              ⚠️ Address details incomplete. Please fill all fields via autocomplete.
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setUseManualAddress(false)}
                            className="text-[10px] font-bold uppercase tracking-widest underline mt-2 hover:text-pw-black text-text-secondary transition-colors"
                          >
                            Search MLS instead
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {activeQuestion.type === 'multi-select' && (
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                      {activeQuestion.options?.map((opt) => {
                        const currentValues = getNestedField(formData, activeQuestion.field) || [];
                        const isSelected = currentValues.includes(opt.value);
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              const nextValues = isSelected
                                ? currentValues.filter((v: any) => v !== opt.value)
                                : [...currentValues, opt.value];
                              updateFormNested(activeQuestion.field, nextValues);
                            }}
                            className="p-4 border text-left flex flex-col justify-between transition-all"
                            style={{
                              borderColor: isSelected ? 'var(--pw-black)' : 'var(--border-ui)',
                              background: isSelected ? 'var(--pw-black)' : 'var(--bg-surface)',
                              color: isSelected ? '#ffffff' : 'var(--text-primary)',
                            }}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="text-xs font-bold uppercase tracking-wider">{opt.label}</span>
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                            </div>
                            {opt.description && (
                              <span
                                className={`text-[10px] mt-1.5 leading-normal ${
                                  isSelected ? 'opacity-85' : 'text-text-secondary'
                                }`}
                              >
                                {opt.description}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {activeQuestion.type === 'file-upload' && (
                    <div className="border border-dashed border-border-ui bg-bg-primary p-8 flex flex-col items-center justify-center text-center relative group hover:border-pw-black transition-colors">
                      <input
                        type="file"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <UploadCloud className="w-8 h-8 text-text-secondary mb-2 group-hover:text-pw-black transition-colors" />
                      <span className="text-xs font-bold text-pw-black uppercase tracking-wider">
                        {getNestedField(formData, activeQuestion.field)
                          ? 'Replace file'
                          : 'Choose file or drag here'}
                      </span>
                      {getNestedField(formData, activeQuestion.field) && (
                        <span className="text-[10px] font-mono text-text-secondary mt-1 max-w-[280px] truncate">
                          Uploaded: {getNestedField(formData, activeQuestion.field)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Validation Error Message */}
                {validationError && (
                  <div className="border border-rose-200 bg-rose-50/50 p-3.5 text-[10px] text-rose-800 flex items-center gap-2 font-mono">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                    <span>{validationError}</span>
                  </div>
                )}
              </div>
            )
          )}
        </div>

        {/* Footer controls */}
        <div className="px-8 py-5 border-t border-border-ui bg-bg-primary flex items-center justify-between">
          <button
            onClick={handleBack}
            className="pw-btn pw-btn--secondary pw-btn--sm uppercase tracking-widest font-bold flex items-center gap-1.5"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>{activeIndex === 0 ? 'Exit' : 'Back'}</span>
          </button>

          <div className="flex gap-2">
            {!isReviewStep && activeQuestion && !activeQuestion.required && (
              <button
                onClick={handleSkip}
                className="px-5 py-2.5 text-text-secondary hover:text-pw-black text-[10px] font-bold uppercase tracking-widest"
              >
                Skip
              </button>
            )}

            {isReviewStep ? (
              <button
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="pw-btn pw-btn--primary pw-btn--sm uppercase tracking-widest font-bold flex items-center gap-1.5"
              >
                {isSubmitting ? 'Creating Project...' : 'Confirm & Create'}
                {!isSubmitting && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!isValid}
                className="pw-btn pw-btn--primary pw-btn--sm uppercase tracking-widest font-bold flex items-center gap-1.5"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
