'use client';

import React, { useState, useMemo, useCallback } from 'react';
import ConversationalFormWrapper from '@/components/dashboard/ConversationalFormWrapper';
import type { StepDescriptor } from '@/components/dashboard/ConversationalFormWrapper';
import { projectsService } from '@/lib/firebase/projects';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import {
  DollarSign, Target, Users, Building2, FileText, CheckCircle2, X,
  AlertCircle, ShieldAlert, Wrench, Home, Tag, Key, FileSignature, HardHat,
  TrendingUp,
} from 'lucide-react';
import {
  computeNOIComponents,
  computeAnnualDebtService,
  computeCashFlow,
  computeCoCReturn,
  computeTotalCashInvested,
  computeGRM,
  computeCapRate,
  computeDSCR,
  computeIRR,
  buildIRRCashFlows,
} from '@/lib/metrics/reiMetrics';
import AddressAutocomplete, { type ParsedAddress } from '@/components/projects/AddressAutocomplete';
import PropertySearchInput from '@/components/shared/PropertySearchInput';
import type { BridgeSearchResult } from '@/types/bridge';
import { useProjectFormValidation, type ProjectFormData } from '@/hooks/useProjectFormValidation';

/* ═══════════════════════════════════════════════════════════════
   ProjectCreationWizard — REI Project Initialization Flow

   Steps:
     1. Property Identity  — Name, REI status, MLS search / address
     2. Acquisition Metrics — Price, ARV, close date, leverage
     3. Strategy & Vision   — Investment profile + objectives
     4. Stakeholder Setup   — Lead operator + partner emails
     5. Document Review     — Summary + final commit
   ═══════════════════════════════════════════════════════════════ */

interface ProjectCreationWizardProps {
  organizationId: string;
  onClose: () => void;
  onSuccess?: (projectId: string) => void;
}

const STEPS: StepDescriptor[] = [
  { id: 'identity', label: 'What property are we working on?' },
  { id: 'metrics',  label: 'Tell us about the numbers & dates' },
  { id: 'strategy', label: 'What is the plan?' },
  { id: 'team',     label: 'Who is on your team?' },
  { id: 'review',   label: 'Review & Confirm' },
];

const REI_STATUSES: { value: string; label: string; icon: React.ReactNode }[] = [
  { value: 'Target',             label: 'Target',              icon: <Target className="w-4 h-4" /> },
  { value: 'In Contract',        label: 'In Contract',         icon: <FileSignature className="w-4 h-4" /> },
  { value: 'Acquired',           label: 'Acquired',            icon: <Key className="w-4 h-4" /> },
  { value: 'Rehabbing',          label: 'Rehabbing',           icon: <Wrench className="w-4 h-4" /> },
  { value: 'Under Construction', label: 'Under Construction',  icon: <HardHat className="w-4 h-4" /> },
  { value: 'Renting',            label: 'Renting',             icon: <Home className="w-4 h-4" /> },
  { value: 'For Sale',           label: 'For Sale',            icon: <Tag className="w-4 h-4" /> },
];

const INITIAL_FORM: ProjectFormData = {
  propertyName: '',
  purchasePrice: '',
  estimatedARV: '',
  reiStatus: '',
  address: '',
  street: '',
  city: '',
  state: '',
  zip: '',
  lat: null,
  lng: null,
  assetClass: 'Residential',
  acquisitionDate: '',
  closeDate: '',
  dateOfSale: '',
  leverage: '75',
  strategy: 'Fix & Flip',
  vision: '',
  leadEmail: '',
  partnerEmails: '',
  // NOI defaults — vacancy 7% and mgmt 8% per NARPM convention
  monthlyGrossRent: '',
  otherMonthlyIncome: '',
  vacancyRatePercent: '7',
  monthlyTaxes: '',
  monthlyInsurance: '',
  monthlyMaintenance: '',
  managementFeePercent: '8',
  monthlyUtilities: '',
  monthlyHOA: '',
  // Debt service defaults — 30yr conventional
  loanAmount: '',
  loanInterestRate: '',
  loanTermYears: '30',
  closingCosts: '',
  // Due Diligence — Acquisition forensics
  projectedRehabCost: '',
  estimatedTimelineDays: '',
  sellerMotivation: '',
  emdAmount: '',
  leadSource: '',
  // IRR Forecasting — hold period and appreciation defaults
  annualAppreciationPercent: '3',
  projectedHoldYears: '5',
  mlsListingKey: undefined,
  mlsListingId: undefined,
  mlsListPrice: null,
  mlsBeds: null,
  mlsBaths: null,
  mlsSqft: null,
  mlsThumbnailUrl: null,
  mlsStandardStatus: null,
};

export default function ProjectCreationWizard({ organizationId, onClose, onSuccess }: ProjectCreationWizardProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visibleStep, setVisibleStep] = useState(0);
  const [hasAcknowledgedWarning, setHasAcknowledgedWarning] = useState(false);
  const [useManualAddress, setUseManualAddress] = useState(false);

  const [formData, setFormData] = useState<ProjectFormData>({
    ...INITIAL_FORM,
    leadEmail: '',
  });

  const updateForm = (updates: Partial<ProjectFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const structuredAddress = useMemo(() => ({
    street: formData.street,
    city: formData.city,
    state: formData.state,
    zip: formData.zip,
  }), [formData.street, formData.city, formData.state, formData.zip]);

  const { isStepValid, addressErrors, isAddressComplete, acquisitionDateError } = useProjectFormValidation(formData, visibleStep);

  const [addressTouched, setAddressTouched] = useState(false);

  const handleAddressSelect = (parsed: ParsedAddress) => {
    setAddressTouched(true);
    updateForm({
      address: parsed.formattedAddress,
      street: parsed.street,
      city: parsed.city,
      state: parsed.state,
      zip: parsed.zip,
      lat: parsed.lat,
      lng: parsed.lng,
    });
  };

  const handlePropertySelect = useCallback((property: BridgeSearchResult) => {
    updateForm({
      address: property.address,
      street: property.address.split(',')[0]?.trim() ?? property.address,
      city: property.address.split(',')[1]?.trim() ?? '',
      state: property.address.split(',')[2]?.trim()?.split(' ')[0] ?? '',
      zip: property.address.split(',')[2]?.trim()?.split(' ')[1] ?? '',
      lat: null,
      lng: null,
      mlsListingKey: property.listingKey,
      mlsListingId: property.listingId,
      mlsListPrice: property.listPrice,
      mlsBeds: property.beds,
      mlsBaths: property.baths,
      mlsSqft: property.sqft,
      mlsThumbnailUrl: property.thumbnailUrl,
      mlsStandardStatus: property.standardStatus,
    });
  }, []);

  const clearMlsSelection = () => {
    updateForm({
      mlsListingKey: undefined,
      mlsListingId: undefined,
      mlsListPrice: null,
      mlsBeds: null,
      mlsBaths: null,
      mlsSqft: null,
      mlsThumbnailUrl: null,
      mlsStandardStatus: null,
      address: '',
      street: '',
      city: '',
      state: '',
      zip: '',
    });
  };

  const handleFinalCommit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const projectId = await projectsService.createProject({
        propertyName: formData.propertyName,
        address: formData.address,
        ...(formData.street && { street: formData.street }),
        ...(formData.city && { city: formData.city }),
        ...(formData.state && { state: formData.state }),
        ...(formData.zip && { zip: formData.zip }),
        ...(formData.lat != null && { lat: formData.lat }),
        ...(formData.lng != null && { lng: formData.lng }),
        ...(formData.reiStatus && { reiStatus: formData.reiStatus }),
        ...(formData.mlsListingKey && { mlsListingKey: formData.mlsListingKey }),
        ...(formData.mlsListingId && { mlsListingId: formData.mlsListingId }),
        ...(formData.mlsListPrice != null && { mlsListPrice: formData.mlsListPrice }),
        ...(formData.mlsBeds != null && { mlsBeds: formData.mlsBeds }),
        ...(formData.mlsBaths != null && { mlsBaths: formData.mlsBaths }),
        ...(formData.mlsSqft != null && { mlsSqft: formData.mlsSqft }),
        ...(formData.mlsThumbnailUrl && { mlsThumbnailUrl: formData.mlsThumbnailUrl }),
        ...(formData.mlsStandardStatus && { mlsStandardStatus: formData.mlsStandardStatus }),
        ownerUid: user.uid,
        financials: {
          purchasePrice: parseFloat(formData.purchasePrice) * 100,
          estimatedARV: parseFloat(formData.estimatedARV) * 100,
          costs: [],
          ...(formData.acquisitionDate && { acquisitionDate: new Date(formData.acquisitionDate + 'T00:00:00') }),
          ...(formData.closeDate && { estimatedCloseDate: new Date(formData.closeDate + 'T00:00:00') }),
          ...(formData.dateOfSale && { soldDate: new Date(formData.dateOfSale + 'T00:00:00') }),
          // NOI inputs — written at project creation so NOI is computable from Phase 1
          ...(formData.monthlyGrossRent && { monthlyGrossRent: parseFloat(formData.monthlyGrossRent) }),
          ...(formData.otherMonthlyIncome && { otherMonthlyIncome: parseFloat(formData.otherMonthlyIncome) }),
          ...(formData.vacancyRatePercent && { vacancyRatePercent: parseFloat(formData.vacancyRatePercent) }),
          ...(formData.monthlyTaxes && { holdingCostTaxes: parseFloat(formData.monthlyTaxes) }),
          ...(formData.monthlyInsurance && { holdingCostInsurance: parseFloat(formData.monthlyInsurance) }),
          ...(formData.monthlyMaintenance && { monthlyMaintenanceReserve: parseFloat(formData.monthlyMaintenance) }),
          ...(formData.managementFeePercent && { propertyManagementFeePercent: parseFloat(formData.managementFeePercent) }),
          ...(formData.monthlyUtilities && { holdingCostUtilities: parseFloat(formData.monthlyUtilities) }),
          ...(formData.monthlyHOA && { monthlyHOA: parseFloat(formData.monthlyHOA) }),
          // Debt service — Cash Flow = NOI − Debt Service
          ...(formData.loanAmount && { loanAmount: parseFloat(formData.loanAmount) }),
          ...(formData.loanInterestRate && { loanInterestRate: parseFloat(formData.loanInterestRate) }),
          ...(formData.loanTermYears && { loanTermYears: parseFloat(formData.loanTermYears) }),
          // Closing costs — maps to fixedAcquisitionCosts for CoC Return
          ...(formData.closingCosts && { fixedAcquisitionCosts: parseFloat(formData.closingCosts) }),
          // Due Diligence — Acquisition forensics
          ...(formData.projectedRehabCost && { projectedRehabCost: parseFloat(formData.projectedRehabCost) }),
          ...(formData.estimatedTimelineDays && { estimatedTimelineDays: parseInt(formData.estimatedTimelineDays) }),
          ...(formData.sellerMotivation && { sellerMotivation: formData.sellerMotivation }),
          ...(formData.emdAmount && { emdAmount: parseFloat(formData.emdAmount) }),
          ...(formData.leadSource && { leadSource: formData.leadSource as any }),
          // IRR Forecasting — hold period and appreciation for lifecycle projections
          ...(formData.annualAppreciationPercent && { annualAppreciationPercent: parseFloat(formData.annualAppreciationPercent) }),
          ...(formData.projectedHoldYears && { projectedHoldTimeMonths: Math.round(parseFloat(formData.projectedHoldYears) * 12) }),
        },
      }, organizationId);

      toast.success('Project created and indexed successfully.');
      onSuccess?.(projectId);
    } catch {
      toast.error('Failed to create project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepViews = [
    /* Step 1: Property Identity */
    <div key="identity" className="space-y-8">
      <div className="flex items-center gap-4 mb-2">
        <div className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ background: 'var(--pw-black)' }}>
          <Building2 className="w-5 h-5" style={{ color: 'var(--pw-white)' }} aria-hidden="true" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>Phase 01</p>
          <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>What property are we working on?</h2>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Project Name */}
        <div className="space-y-2">
          <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>What should we call this project?</label>
          <input
            type="text"
            value={formData.propertyName}
            onChange={(e) => updateForm({ propertyName: e.target.value })}
            className="w-full rounded-lg px-4 py-3 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
            placeholder="e.g. The Miami Flip"
          />
        </div>

        {/* REI Status Picker */}
        <div className="space-y-3">
          <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>What stage is this project currently in?</label>
          <div className="grid grid-cols-4 gap-2">
            {REI_STATUSES.map(({ value, label, icon }) => {
              const active = formData.reiStatus === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateForm({ reiStatus: value })}
                  className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-lg text-[10px] font-bold uppercase tracking-[0.1em] transition-all"
                  style={{
                    background: active ? 'var(--pw-black)' : 'var(--bg-canvas)',
                    border: active ? '1px solid #1A1A1A' : '1px solid var(--border-ui)',
                    color: active ? 'var(--pw-white)' : 'var(--text-secondary)',
                  }}
                >
                  {icon}
                  <span className="text-center leading-tight">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* MLS Property Search */}
        <div className="space-y-2">
          <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>
            {useManualAddress ? 'Where is this property located?' : 'Search MLS Listings for the property'}
          </label>

          {!useManualAddress && !formData.mlsListingKey && (
            <>
              <PropertySearchInput
                value={formData.address}
                onSelect={handlePropertySelect}
                onManualChange={(raw) => updateForm({ address: raw })}
              />
              <button
                type="button"
                onClick={() => setUseManualAddress(true)}
                className="text-[10px] font-bold uppercase tracking-[0.12em] underline underline-offset-2 mt-1 hover:opacity-70 transition-opacity"
                style={{ color: 'var(--pw-black)' }}
              >
                Enter address manually instead
              </button>
            </>
          )}

          {/* MLS listing confirmed card */}
          {formData.mlsListingKey && (
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-ui)' }}>
              <div className="flex items-center justify-between px-4 py-2" style={{ background: 'var(--pw-black)' }}>
                <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--pw-white)' }}>MLS Listing Confirmed</span>
                <button
                  type="button"
                  onClick={clearMlsSelection}
                  className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] opacity-70 hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--pw-white)' }}
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              </div>
              <div className="flex gap-3 p-3" style={{ background: 'var(--bg-canvas)' }}>
                {formData.mlsThumbnailUrl && (
                  <img
                    src={formData.mlsThumbnailUrl}
                    alt="Property thumbnail"
                    className="w-20 h-16 object-cover rounded-md shrink-0"
                  />
                )}
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>{formData.address}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    {formData.mlsListPrice != null && (
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        ${formData.mlsListPrice.toLocaleString()}
                      </span>
                    )}
                    {formData.mlsBeds != null && <span>{formData.mlsBeds} bd</span>}
                    {formData.mlsBaths != null && <span>{formData.mlsBaths} ba</span>}
                    {formData.mlsSqft != null && <span>{formData.mlsSqft.toLocaleString()} sqft</span>}
                  </div>
                  <div className="flex gap-2 text-[10px]">
                    {formData.mlsStandardStatus && (
                      <span className="px-2 py-0.5 rounded-full font-bold uppercase tracking-[0.1em]"
                        style={{ background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0' }}>
                        {formData.mlsStandardStatus}
                      </span>
                    )}
                    {formData.mlsListingId && (
                      <span style={{ color: 'var(--text-secondary)' }}>MLS# {formData.mlsListingId}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Manual address fallback */}
          {useManualAddress && !formData.mlsListingKey && (
            <>
              <AddressAutocomplete
                value={formData.address}
                variant="dashboard"
                structuredValue={structuredAddress}
                onInputChange={(raw) => updateForm({ address: raw })}
                onSelect={handleAddressSelect}
              />

              {isAddressComplete && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)' }}>
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--pw-black)' }} aria-hidden="true" />
                  <span style={{ color: 'var(--text-primary)' }}>{formData.street}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>· {formData.city}, {formData.state} {formData.zip}</span>
                </div>
              )}

              {addressTouched && !isAddressComplete && (
                <div className="flex flex-col gap-1 px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" style={{ color: '#B45309' }} aria-hidden="true" />
                    <span className="font-bold uppercase tracking-[0.12em] text-[10px]" style={{ color: '#B45309' }}>Missing required fields</span>
                  </div>
                  {Object.values(addressErrors).map((err) => (
                    <span key={err} style={{ color: 'var(--text-secondary)' }}>· {err}</span>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setUseManualAddress(false)}
                className="text-[10px] font-bold uppercase tracking-[0.12em] underline underline-offset-2 mt-1 hover:opacity-70 transition-opacity"
                style={{ color: 'var(--pw-black)' }}
              >
                Search MLS instead
              </button>
            </>
          )}
        </div>

        {/* Asset Class */}
        <div className="space-y-2">
          <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>What type of asset is this?</label>
          <select
            value={formData.assetClass}
            onChange={(e) => updateForm({ assetClass: e.target.value })}
            className="w-full rounded-lg px-4 py-3 text-sm font-medium appearance-none cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
          >
            <option value="Residential">Residential</option>
            <option value="Multi-Family">Multi-Family</option>
            <option value="Commercial">Commercial</option>
            <option value="Land">Undeveloped Land</option>
          </select>
        </div>
      </div>
    </div>,

    /* Step 2: Acquisition Metrics */
    <div key="metrics" className="space-y-8">
      <div className="flex items-center gap-4 mb-2">
        <div className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ background: 'var(--pw-black)' }}>
          <DollarSign className="w-5 h-5" style={{ color: 'var(--pw-white)' }} aria-hidden="true" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>Phase 02</p>
          <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Tell us about the numbers & dates</h2>
        </div>
      </div>

      {/* ── Project Start / Acquisition Date ── */}
      <div className="space-y-2 mb-2">
        <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>When did you acquire this property?</label>
        <p className="text-[11px] font-normal leading-relaxed -mt-0.5" style={{ color: 'var(--text-secondary)', opacity: 0.65 }}>
          If it hasn't been acquired yet, you can leave this blank or provide an estimate.
        </p>
        <input
          type="date"
          value={formData.acquisitionDate}
          onChange={(e) => updateForm({ acquisitionDate: e.target.value })}
          aria-label="Project start or acquisition date"
          aria-invalid={!!acquisitionDateError}
          aria-describedby={acquisitionDateError ? 'acquisition-date-error' : undefined}
          className="w-full rounded-lg px-4 py-3 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
          style={{
            background: 'var(--bg-canvas)',
            border: acquisitionDateError ? '1px solid #B45309' : '1px solid var(--border-ui)',
            color: 'var(--text-primary)',
          }}
        />

        {acquisitionDateError && (
          <div
            id="acquisition-date-error"
            role="alert"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs mt-1.5"
            style={{ background: '#FEF3C7', border: '1px solid #F59E0B' }}
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" style={{ color: '#B45309' }} aria-hidden="true" />
            <span className="font-medium" style={{ color: '#92400E' }}>
              {acquisitionDateError}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>What was the purchase price? ($)</label>
          <input
            type="number"
            value={formData.purchasePrice}
            onChange={(e) => updateForm({ purchasePrice: e.target.value })}
            className="w-full rounded-lg px-4 py-3 text-sm font-medium tabular-nums transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>What is the estimated ARV? ($)</label>
          <input
            type="number"
            value={formData.estimatedARV}
            onChange={(e) => updateForm({ estimatedARV: e.target.value })}
            className="w-full rounded-lg px-4 py-3 text-sm font-medium tabular-nums transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>When do you expect to close?</label>
          <input
            type="date"
            value={formData.closeDate}
            onChange={(e) => updateForm({ closeDate: e.target.value })}
            className="w-full rounded-lg px-4 py-3 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>If sold, what was the date of sale?</label>
          <input
            type="date"
            value={formData.dateOfSale}
            onChange={(e) => updateForm({ dateOfSale: e.target.value })}
            className="w-full rounded-lg px-4 py-3 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>What's the target leverage? (%)</label>
          <input
            type="number"
            value={formData.leverage}
            onChange={(e) => updateForm({ leverage: e.target.value })}
            className="w-full rounded-lg px-4 py-3 text-sm font-medium tabular-nums transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
            placeholder="75"
          />
        </div>

        {/* ── Income & Operating Costs — NOI Inputs ── */}
        <div className="mt-8 pt-8" style={{ borderTop: '1px solid var(--border-ui)' }}>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#059669' }}>
              <TrendingUp className="w-4 h-4" style={{ color: 'var(--pw-white)' }} aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Income & Operating Costs</h3>
              <p className="text-[11px] font-normal" style={{ color: 'var(--text-secondary)', opacity: 0.65 }}>
                These numbers power your NOI. Even estimates help — you can refine them later.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Monthly Gross Rent — required */}
            <div className="space-y-2 col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>
                What's the expected monthly rent? ($) <span style={{ color: '#B45309' }}>*</span>
              </label>
              <input
                type="number"
                value={formData.monthlyGrossRent}
                onChange={(e) => updateForm({ monthlyGrossRent: e.target.value })}
                className="w-full rounded-lg px-4 py-3 text-sm font-medium tabular-nums transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
                placeholder="e.g. 1950"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>Other monthly income ($) <span style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>optional</span></label>
              <input
                type="number"
                value={formData.otherMonthlyIncome}
                onChange={(e) => updateForm({ otherMonthlyIncome: e.target.value })}
                className="w-full rounded-lg px-4 py-3 text-sm font-medium tabular-nums transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
                placeholder="Parking, laundry, storage — e.g. 75"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>Vacancy rate (%)</label>
              <input
                type="number"
                value={formData.vacancyRatePercent}
                onChange={(e) => updateForm({ vacancyRatePercent: e.target.value })}
                className="w-full rounded-lg px-4 py-3 text-sm font-medium tabular-nums transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
                placeholder="7"
                step="0.5"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>Management fee (%)</label>
              <input
                type="number"
                value={formData.managementFeePercent}
                onChange={(e) => updateForm({ managementFeePercent: e.target.value })}
                className="w-full rounded-lg px-4 py-3 text-sm font-medium tabular-nums transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
                placeholder="8"
                step="0.5"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>Monthly property taxes ($)</label>
              <input
                type="number"
                value={formData.monthlyTaxes}
                onChange={(e) => updateForm({ monthlyTaxes: e.target.value })}
                className="w-full rounded-lg px-4 py-3 text-sm font-medium tabular-nums transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
                placeholder="200"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>Monthly insurance ($)</label>
              <input
                type="number"
                value={formData.monthlyInsurance}
                onChange={(e) => updateForm({ monthlyInsurance: e.target.value })}
                className="w-full rounded-lg px-4 py-3 text-sm font-medium tabular-nums transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
                placeholder="58"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>Monthly maintenance ($)</label>
              <input
                type="number"
                value={formData.monthlyMaintenance}
                onChange={(e) => updateForm({ monthlyMaintenance: e.target.value })}
                className="w-full rounded-lg px-4 py-3 text-sm font-medium tabular-nums transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
                placeholder="195"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>Monthly utilities ($)</label>
              <input
                type="number"
                value={formData.monthlyUtilities}
                onChange={(e) => updateForm({ monthlyUtilities: e.target.value })}
                className="w-full rounded-lg px-4 py-3 text-sm font-medium tabular-nums transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
                placeholder="125"
              />
            </div>

            <div className="space-y-2 col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>Monthly HOA fees ($)</label>
              <input
                type="number"
                value={formData.monthlyHOA}
                onChange={(e) => updateForm({ monthlyHOA: e.target.value })}
                className="w-full rounded-lg px-4 py-3 text-sm font-medium tabular-nums transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
                placeholder="0"
              />
            </div>
          </div>

           {formData.monthlyGrossRent && (
            <div className="mt-6 rounded-lg p-4 flex items-center justify-between" style={{ background: '#064E3B', border: '1px solid #059669' }}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: '#6EE7B7' }}>Estimated Annual NOI</p>
                <p className="text-xs mt-1" style={{ color: '#A7F3D0' }}>Based on your inputs — refine anytime in the Hold phase calculator.</p>
              </div>
              <p className="text-xl font-bold tabular-nums" style={{ color: '#ECFDF5' }}>
                ${(() => {
                  const fin = {
                    monthlyGrossRent: parseFloat(formData.monthlyGrossRent) || 0,
                    otherMonthlyIncome: parseFloat(formData.otherMonthlyIncome) || 0,
                    vacancyRatePercent: parseFloat(formData.vacancyRatePercent) || 7,
                    holdingCostTaxes: parseFloat(formData.monthlyTaxes) || 0,
                    holdingCostInsurance: parseFloat(formData.monthlyInsurance) || 0,
                    monthlyMaintenanceReserve: parseFloat(formData.monthlyMaintenance) || 0,
                    propertyManagementFeePercent: parseFloat(formData.managementFeePercent) || 8,
                    holdingCostUtilities: parseFloat(formData.monthlyUtilities) || 0,
                    monthlyHOA: parseFloat(formData.monthlyHOA) || 0,
                  };
                  return Math.round(computeNOIComponents(fin as any).noi).toLocaleString();
                })()}
              </p>
            </div>
          )}

          {/* ── GRM + Cap Rate Quick Screen ── */}
          {formData.purchasePrice && formData.monthlyGrossRent && (() => {
            const purchasePrice = parseFloat(formData.purchasePrice) || 0;
            const monthlyRent = parseFloat(formData.monthlyGrossRent) || 0;
            const annualRent = monthlyRent * 12;
            const grm = computeGRM(purchasePrice, annualRent);

            // Cap Rate uses NOI if we have expense data
            const fin = {
              monthlyGrossRent: monthlyRent,
              otherMonthlyIncome: parseFloat(formData.otherMonthlyIncome) || 0,
              vacancyRatePercent: parseFloat(formData.vacancyRatePercent) || 7,
              holdingCostTaxes: parseFloat(formData.monthlyTaxes) || 0,
              holdingCostInsurance: parseFloat(formData.monthlyInsurance) || 0,
              monthlyMaintenanceReserve: parseFloat(formData.monthlyMaintenance) || 0,
              propertyManagementFeePercent: parseFloat(formData.managementFeePercent) || 8,
              holdingCostUtilities: parseFloat(formData.monthlyUtilities) || 0,
              monthlyHOA: parseFloat(formData.monthlyHOA) || 0,
            };
            const noiComponents = computeNOIComponents(fin as any);
            const noi = noiComponents.noi;
            const totalExpenses = noiComponents.totalOperatingExpenses;
            const capRate = computeCapRate(noi, purchasePrice);

            // GRM classification
            const grmColor = grm <= 8 ? '#595959' : grm <= 12 ? '#7F7F7F' : grm <= 15 ? '#A5A5A5' : '#EF4444';
            const grmLabel = grm <= 8 ? 'Excellent' : grm <= 12 ? 'Typical' : grm <= 15 ? 'Review' : 'Caution';
            const grmVerdict = grm <= 12 ? 'Pass' : grm <= 15 ? 'Review' : 'Caution';

            // Cap Rate classification
            const capColor = capRate >= 8 ? '#595959' : capRate >= 5 ? '#7F7F7F' : capRate >= 3 ? '#A5A5A5' : '#EF4444';
            const capLabel = capRate >= 8 ? 'Strong' : capRate >= 5 ? 'Good' : capRate >= 3 ? 'Fair' : 'Low';

            // Occupancy Rate
            const occupancyRate = 100 - (parseFloat(formData.vacancyRatePercent) || 7);
            const occColor = occupancyRate >= 93 ? '#595959' : occupancyRate >= 88 ? '#7F7F7F' : occupancyRate >= 80 ? '#A5A5A5' : '#EF4444';
            const occLabel = occupancyRate >= 93 ? 'Healthy' : occupancyRate >= 88 ? 'Below Avg' : occupancyRate >= 80 ? 'High Risk' : 'Critical';

            // Expense Ratio
            const expRatio = annualRent > 0 ? (totalExpenses / annualRent) * 100 : 0;
            const expColor = expRatio <= 35 ? '#595959' : expRatio <= 45 ? '#7F7F7F' : expRatio <= 60 ? '#A5A5A5' : '#EF4444';
            const expLabel = expRatio <= 35 ? 'Lean' : expRatio <= 45 ? 'Typical' : expRatio <= 60 ? 'High' : 'Critical';

            // Appreciation
            const appreciationRate = parseFloat(formData.annualAppreciationPercent) || 3;
            let appColor = '#DC2626';
            let appLabel = 'Declining';
            if (appreciationRate >= 7) { appColor = '#595959'; appLabel = 'Exceptional'; }
            else if (appreciationRate >= 5) { appColor = '#7F7F7F'; appLabel = 'Strong'; }
            else if (appreciationRate >= 3) { appColor = '#A5A5A5'; appLabel = 'Moderate'; }
            else if (appreciationRate >= 1) { appColor = '#EF4444'; appLabel = 'Below Avg'; }

            return (
              <div className="mt-4 rounded-lg p-4" style={{ background: 'rgba(89,89,89,0.06)', border: '1px solid rgba(89,89,89,0.15)' }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3" style={{ color: 'var(--text-secondary)' }}>
                  Quick Screen — Screening Metrics
                </p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {/* GRM */}
                  <div className="flex flex-col">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: '#94A3B8' }}>Gross Rent Multiplier</p>
                      <p className="text-[9px] mt-0.5" style={{ color: '#64748B' }}>
                        ${purchasePrice.toLocaleString()} ÷ ${annualRent.toLocaleString()}/yr
                      </p>
                    </div>
                    <div className="mt-2">
                      <p className="text-lg font-bold tabular-nums" style={{ color: grmColor }}>
                        {grm.toFixed(1)}×
                      </p>
                      <p className="text-[9px] font-bold" style={{ color: grmColor }}>{grmLabel} — {grmVerdict}</p>
                    </div>
                  </div>
                  {/* Cap Rate */}
                  <div className="flex flex-col">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: '#94A3B8' }}>Cap Rate</p>
                      <p className="text-[9px] mt-0.5" style={{ color: '#64748B' }}>
                        NOI ${Math.round(noi).toLocaleString()} ÷ ${purchasePrice.toLocaleString()}
                      </p>
                    </div>
                    <div className="mt-2">
                      <p className="text-lg font-bold tabular-nums" style={{ color: capColor }}>
                        {capRate.toFixed(1)}%
                      </p>
                      <p className="text-[9px] font-bold" style={{ color: capColor }}>{capLabel}</p>
                    </div>
                  </div>
                  {/* Occupancy Rate */}
                  <div className="flex flex-col">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: '#94A3B8' }}>Occupancy Rate</p>
                      <p className="text-[9px] mt-0.5" style={{ color: '#64748B' }}>
                        Based on {formData.vacancyRatePercent || 7}% Vacancy
                      </p>
                    </div>
                    <div className="mt-2">
                      <p className="text-lg font-bold tabular-nums" style={{ color: occColor }}>
                        {occupancyRate.toFixed(1)}%
                      </p>
                      <p className="text-[9px] font-bold" style={{ color: occColor }}>{occLabel}</p>
                    </div>
                  </div>
                  {/* Expense Ratio */}
                  <div className="flex flex-col">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: '#94A3B8' }}>Expense Ratio</p>
                      <p className="text-[9px] mt-0.5" style={{ color: '#64748B' }}>
                        Ops ${Math.round(totalExpenses).toLocaleString()} ÷ Rent ${annualRent.toLocaleString()}
                      </p>
                    </div>
                    <div className="mt-2">
                      <p className="text-lg font-bold tabular-nums" style={{ color: expColor }}>
                        {expRatio.toFixed(1)}%
                      </p>
                      <p className="text-[9px] font-bold" style={{ color: expColor }}>{expLabel}</p>
                    </div>
                  </div>
                  {/* Appreciation */}
                  <div className="flex flex-col">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: '#94A3B8' }}>Appreciation</p>
                      <p className="text-[9px] mt-0.5" style={{ color: '#64748B' }}>
                        Growth Potential
                      </p>
                    </div>
                    <div className="mt-2">
                      <p className="text-lg font-bold tabular-nums" style={{ color: appColor }}>
                        {appreciationRate.toFixed(1)}%
                      </p>
                      <p className="text-[9px] font-bold" style={{ color: appColor }}>{appLabel}</p>
                    </div>
                  </div>
                </div>
                <p className="text-[8px] mt-2 italic" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>
                  GRM is a surface-level screen. Cap Rate strips financing. Expense Ratio measures operational efficiency. Appreciation builds long-term wealth.
                </p>
              </div>
            );
          })()}

          {/* ══════════════════════════════════════════════════════════
             FINANCING & DEBT SERVICE
             Cash Flow = NOI − Debt Service (Mortgage Payments)
             ══════════════════════════════════════════════════════════ */}
          <div className="mt-8 pt-8" style={{ borderTop: '2px dashed var(--border-ui)' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#1E3A5F' }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M2 17a5 5 0 0 0 10 0c0-2.76-2.5-5-5-3l-2-2"/><path d="M12 17a5 5 0 0 0 10 0c0-2.76-2.5-5-5-3l-2-2"/><path d="M7 7h10"/><path d="M12 2v5"/></svg>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--text-primary)' }}>Financing & Debt Service</p>
                <p className="text-[10px]" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>Cash Flow = NOI − Mortgage Payments</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>Loan amount ($)</label>
                <input
                  type="number"
                  value={formData.loanAmount}
                  onChange={(e) => updateForm({ loanAmount: e.target.value })}
                  className="w-full rounded-lg px-4 py-3 text-sm font-medium tabular-nums transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                  style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
                  placeholder="223200"
                />
                <p className="text-[9px]" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>80% of $279K = $223,200</p>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>Interest rate (%)</label>
                <input
                  type="number"
                  step="0.125"
                  value={formData.loanInterestRate}
                  onChange={(e) => updateForm({ loanInterestRate: e.target.value })}
                  className="w-full rounded-lg px-4 py-3 text-sm font-medium tabular-nums transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                  style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
                  placeholder="7"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>Loan term (years)</label>
                <select
                  value={formData.loanTermYears}
                  onChange={(e) => updateForm({ loanTermYears: e.target.value })}
                  className="w-full rounded-lg px-4 py-3 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                  style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
                >
                  <option value="15">15-Year</option>
                  <option value="20">20-Year</option>
                  <option value="25">25-Year</option>
                  <option value="30">30-Year</option>
                </select>
              </div>
            </div>

            {/* Closing costs — used for CoC Return */}
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>Closing costs ($)</label>
                <input
                  type="number"
                  value={formData.closingCosts}
                  onChange={(e) => updateForm({ closingCosts: e.target.value })}
                  className="w-full rounded-lg px-4 py-3 text-sm font-medium tabular-nums transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                  style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
                  placeholder="4500"
                />
                <p className="text-[9px]" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>Title, escrow, lender fees, inspections, etc.</p>
              </div>
              {/* Down Payment — auto-calculated, shown for reference */}
              {formData.purchasePrice && formData.loanAmount && (
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>Down payment (auto-calculated)</label>
                  <div
                    className="w-full rounded-lg px-4 py-3 text-sm font-medium tabular-nums"
                    style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-ui)', color: 'var(--text-secondary)' }}
                  >
                    ${Math.max(0, (parseFloat(formData.purchasePrice) || 0) - (parseFloat(formData.loanAmount) || 0)).toLocaleString()}
                  </div>
                  <p className="text-[9px]" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>Purchase Price − Loan Amount</p>
                </div>
              )}
            </div>

            {/* ── Live Cash Flow preview ── */}
            {formData.monthlyGrossRent && formData.loanAmount && formData.loanInterestRate && (
              <div className="mt-6 rounded-lg p-4" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                {(() => {
                  // Build a minimal financials object for the canonical engine
                  const fin = {
                    monthlyGrossRent: parseFloat(formData.monthlyGrossRent) || 0,
                    otherMonthlyIncome: parseFloat(formData.otherMonthlyIncome) || 0,
                    vacancyRatePercent: parseFloat(formData.vacancyRatePercent) || 7,
                    holdingCostTaxes: parseFloat(formData.monthlyTaxes) || 0,
                    holdingCostInsurance: parseFloat(formData.monthlyInsurance) || 0,
                    monthlyMaintenanceReserve: parseFloat(formData.monthlyMaintenance) || 0,
                    propertyManagementFeePercent: parseFloat(formData.managementFeePercent) || 8,
                    holdingCostUtilities: parseFloat(formData.monthlyUtilities) || 0,
                    monthlyHOA: parseFloat(formData.monthlyHOA) || 0,
                    purchasePrice: (parseFloat(formData.purchasePrice) || 0) * 100, // cents
                    loanAmount: parseFloat(formData.loanAmount) || 0,
                    loanInterestRate: parseFloat(formData.loanInterestRate) || 0,
                    loanTermYears: parseFloat(formData.loanTermYears) || 30,
                    fixedAcquisitionCosts: parseFloat(formData.closingCosts) || 0,
                    projectedRehabCost: parseFloat(formData.projectedRehabCost) || 0,
                  };

                  const noi = computeNOIComponents(fin as any).noi;
                  const loanTermMonths = fin.loanTermYears * 12;
                  const annualDebtService = computeAnnualDebtService(
                    fin.loanAmount, fin.loanInterestRate, loanTermMonths
                  );
                  const { annual: annualCashFlow, monthly: monthlyCashFlow } =
                    computeCashFlow(noi, annualDebtService);
                  const isPositive = annualCashFlow >= 0;

                  const downPayment = Math.max(0, (fin.purchasePrice / 100) - fin.loanAmount);
                  const totalCashInvested = downPayment + fin.fixedAcquisitionCosts;
                  const cocReturn = computeCoCReturn(annualCashFlow, totalCashInvested);

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: '#94A3B8' }}>Estimated Cash Flow</p>
                          <p className="text-xs mt-1" style={{ color: '#64748B' }}>
                            NOI ${Math.round(noi).toLocaleString()} − Debt Service ${Math.round(annualDebtService).toLocaleString()}/yr
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold tabular-nums" style={{ color: isPositive ? '#595959' : '#F87171' }}>
                            {isPositive ? '+' : ''}${Math.round(monthlyCashFlow).toLocaleString()}/mo
                          </p>
                          <p className="text-[10px] font-bold tabular-nums" style={{ color: isPositive ? '#7F7F7F' : '#FCA5A5' }}>
                            {isPositive ? '+' : ''}${Math.round(annualCashFlow).toLocaleString()}/yr
                          </p>
                        </div>
                      </div>
                      {/* CoC Return row */}
                      {totalCashInvested > 0 && (
                        <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid #334155' }}>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: '#94A3B8' }}>Cash-on-Cash Return</p>
                            <p className="text-xs mt-1" style={{ color: '#64748B' }}>
                              Cash Flow ${Math.round(annualCashFlow).toLocaleString()} ÷ Invested ${Math.round(totalCashInvested).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold tabular-nums" style={{ color: cocReturn >= 8 ? '#595959' : cocReturn >= 4 ? '#A5A5A5' : '#F87171' }}>
                              {cocReturn.toFixed(1)}%
                            </p>
                            <p className="text-[10px] font-bold" style={{ color: cocReturn >= 8 ? '#7F7F7F' : cocReturn >= 4 ? '#CCCCCC' : '#FCA5A5' }}>
                              {cocReturn >= 12 ? 'Excellent' : cocReturn >= 8 ? 'Strong' : cocReturn >= 4 ? 'Moderate' : 'Below Target'}
                            </p>
                          </div>
                        </div>
                      )}
                      {/* DSCR row */}
                      {annualDebtService > 0 && (() => {
                        const dscr = computeDSCR(noi, annualDebtService);
                        const dscrColor = dscr >= 1.5 ? '#595959' : dscr >= 1.25 ? '#7F7F7F' : dscr >= 1.0 ? '#A5A5A5' : '#F87171';
                        const dscrLabelColor = dscr >= 1.5 ? '#7F7F7F' : dscr >= 1.25 ? '#A5A5A5' : dscr >= 1.0 ? '#CCCCCC' : '#FCA5A5';
                        const dscrLabel = dscr >= 1.5 ? 'Preferred' : dscr >= 1.25 ? 'Qualifies' : dscr >= 1.0 ? 'Marginal' : 'Rejected';
                        return (
                          <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid #334155' }}>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: '#94A3B8' }}>Debt Service Coverage (DSCR)</p>
                              <p className="text-xs mt-1" style={{ color: '#64748B' }}>
                                NOI ${Math.round(noi).toLocaleString()} ÷ Debt ${Math.round(annualDebtService).toLocaleString()}/yr
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold tabular-nums" style={{ color: dscrColor }}>
                                {dscr === Infinity ? '∞' : dscr.toFixed(2)}×
                              </p>
                              <p className="text-[10px] font-bold" style={{ color: dscrLabelColor }}>
                                {dscrLabel} {dscr < 1.25 && dscr >= 1.0 ? '— Lenders want ≥1.25' : dscr < 1.0 ? '— Property bleeds money' : ''}
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
           IRR PROJECTION — Lifecycle Return
           IRR = Discount rate where NPV of all cash flows = 0
           ══════════════════════════════════════════════════════════ */}
        <div className="mt-8 pt-8" style={{ borderTop: '2px dashed var(--border-ui)' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#6366F1' }}>
              <TrendingUp className="w-4 h-4" style={{ color: 'var(--pw-white)' }} aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--text-primary)' }}>IRR Projection</p>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>Total annualized return over the entire hold period — accounts for the time value of money.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Projected Hold Period */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: 'var(--text-secondary)' }}>
                Projected Hold Period (Years)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                step="1"
                value={formData.projectedHoldYears}
                onChange={(e) => updateForm({ projectedHoldYears: e.target.value })}
                className="w-full rounded-lg px-4 py-3 text-sm font-medium tabular-nums"
                style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
                placeholder="5"
              />
              <p className="text-[9px] mt-1" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>How long do you plan to hold before selling?</p>
            </div>

            {/* Annual Appreciation Rate */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: 'var(--text-secondary)' }}>
                Annual Appreciation Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="15"
                step="0.5"
                value={formData.annualAppreciationPercent}
                onChange={(e) => updateForm({ annualAppreciationPercent: e.target.value })}
                className="w-full rounded-lg px-4 py-3 text-sm font-medium tabular-nums"
                style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
                placeholder="3"
              />
              <p className="text-[9px] mt-1" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>National avg: 3–4%/yr. Hot markets may be higher.</p>
            </div>
          </div>

          {/* ── Live IRR Preview ── */}
          {formData.purchasePrice && formData.monthlyGrossRent && formData.loanAmount && formData.loanInterestRate && (() => {
            const purchasePrice = parseFloat(formData.purchasePrice) || 0;
            const monthlyRent = parseFloat(formData.monthlyGrossRent) || 0;
            const holdYears = Math.max(1, parseInt(formData.projectedHoldYears) || 5);
            const appreciationRate = parseFloat(formData.annualAppreciationPercent) || 3;
            const loanAmount = parseFloat(formData.loanAmount) || 0;
            const loanRate = parseFloat(formData.loanInterestRate) || 0;
            const loanTerm = parseFloat(formData.loanTermYears) || 30;

            // Build financials for NOI
            const fin = {
              monthlyGrossRent: monthlyRent,
              otherMonthlyIncome: parseFloat(formData.otherMonthlyIncome) || 0,
              vacancyRatePercent: parseFloat(formData.vacancyRatePercent) || 7,
              holdingCostTaxes: parseFloat(formData.monthlyTaxes) || 0,
              holdingCostInsurance: parseFloat(formData.monthlyInsurance) || 0,
              monthlyMaintenanceReserve: parseFloat(formData.monthlyMaintenance) || 0,
              propertyManagementFeePercent: parseFloat(formData.managementFeePercent) || 8,
              holdingCostUtilities: parseFloat(formData.monthlyUtilities) || 0,
              monthlyHOA: parseFloat(formData.monthlyHOA) || 0,
            };
            const noi = computeNOIComponents(fin as any).noi;
            const annualDebtService = computeAnnualDebtService(loanAmount, loanRate, loanTerm * 12);
            const annualCashFlow = noi - annualDebtService;

            const downPayment = Math.max(0, purchasePrice - loanAmount);
            const closingCosts = parseFloat(formData.closingCosts) || 0;
            const rehabCost = parseFloat(formData.projectedRehabCost) || 0;
            const totalCashInvested = downPayment + closingCosts + rehabCost;

            if (totalCashInvested <= 0 || purchasePrice <= 0) return null;

            const cashFlows = buildIRRCashFlows(
              totalCashInvested, annualCashFlow, holdYears,
              purchasePrice, appreciationRate, loanAmount, loanRate, loanTerm
            );
            const irr = computeIRR(cashFlows);
            const irrPct = irr !== null ? irr * 100 : null;

            // Future property value
            const futureValue = purchasePrice * Math.pow(1 + appreciationRate / 100, holdYears);

            // Classification
            const irrColor = irrPct === null ? '#A5A5A5' : irrPct >= 20 ? '#595959' : irrPct >= 12 ? '#7F7F7F' : irrPct >= 6 ? '#A5A5A5' : irrPct >= 0 ? '#F87171' : '#DC2626';
            const irrLabelColor = irrPct === null ? '#CCCCCC' : irrPct >= 20 ? '#7F7F7F' : irrPct >= 12 ? '#A5A5A5' : irrPct >= 6 ? '#CCCCCC' : '#FCA5A5';
            const irrLabel = irrPct === null ? 'Insufficient Data' : irrPct >= 20 ? 'Exceptional' : irrPct >= 12 ? 'Strong' : irrPct >= 6 ? 'Moderate' : irrPct >= 0 ? 'Low' : 'Negative Return';
            const beatsSP = irrPct !== null && irrPct > 10;

            return (
              <div className="mt-4 rounded-lg p-4" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                <div className="space-y-3">
                  {/* IRR headline */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: '#94A3B8' }}>Projected IRR</p>
                      <p className="text-xs mt-1" style={{ color: '#64748B' }}>
                        {holdYears}-year hold · {appreciationRate}% appreciation
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold tabular-nums" style={{ color: irrColor }}>
                        {irrPct !== null ? `${irrPct.toFixed(1)}%` : 'N/A'}
                      </p>
                      <p className="text-[10px] font-bold" style={{ color: irrLabelColor }}>
                        {irrLabel}
                      </p>
                    </div>
                  </div>

                  {/* Lifecycle breakdown */}
                  <div className="grid grid-cols-3 gap-3 pt-2" style={{ borderTop: '1px solid #334155' }}>
                    <div>
                      <p className="text-[9px] font-bold uppercase" style={{ color: '#64748B' }}>Cash Invested</p>
                      <p className="text-sm font-bold tabular-nums" style={{ color: '#F87171' }}>-${Math.round(totalCashInvested).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase" style={{ color: '#64748B' }}>Annual Cash Flow</p>
                      <p className="text-sm font-bold tabular-nums" style={{ color: annualCashFlow >= 0 ? '#595959' : '#F87171' }}>
                        {annualCashFlow >= 0 ? '+' : ''}${Math.round(annualCashFlow).toLocaleString()}/yr
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase" style={{ color: '#64748B' }}>Exit Value (Yr {holdYears})</p>
                      <p className="text-sm font-bold tabular-nums" style={{ color: '#7F7F7F' }}>${Math.round(futureValue).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* vs S&P 500 */}
                  <div className="flex items-center gap-2 pt-2" style={{ borderTop: '1px solid #334155' }}>
                    <span className="text-[9px] font-bold" style={{ color: beatsSP ? '#595959' : '#F87171' }}>
                      {beatsSP ? '✓ Beats' : '✗ Below'} S&P 500 avg (~10%/yr)
                    </span>
                    {irrPct !== null && (
                      <span className="text-[9px] font-bold tabular-nums" style={{ color: beatsSP ? '#7F7F7F' : '#FCA5A5' }}>
                        ({beatsSP ? '+' : ''}{(irrPct - 10).toFixed(1)}%)
                      </span>
                    )}
                  </div>

                  <p className="text-[8px] italic" style={{ color: '#475569' }}>
                    IRR captures initial outlay, {holdYears} years of cash flow, appreciation ({appreciationRate}%/yr), mortgage paydown, and exit proceeds after 8% selling costs.
                  </p>
                </div>
              </div>
            );
          })()}
        </div>

        {/* ══════════════════════════════════════════════════════════
           DUE DILIGENCE — Forensic acquisition analysis
           These fields feed the Flip Profitability Dashboard
           ══════════════════════════════════════════════════════════ */}
        <div className="mt-8 pt-8" style={{ borderTop: '2px dashed var(--border-ui)' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#7C3AED' }}>
              <ShieldAlert className="w-4 h-4" style={{ color: 'var(--pw-white)' }} aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--text-primary)' }}>Due Diligence</p>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>This is where you make your money. Get these numbers right before the first hammer swings.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>Estimated rehab budget ($)</label>
              <input
                type="number"
                value={formData.projectedRehabCost}
                onChange={(e) => updateForm({ projectedRehabCost: e.target.value })}
                className="w-full rounded-lg px-4 py-3 text-sm font-medium tabular-nums transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
                placeholder="45000"
              />
              <p className="text-[9px]" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>Total renovation budget — drives MAO and flip ROI calculations</p>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>Estimated rehab timeline (days)</label>
              <input
                type="number"
                value={formData.estimatedTimelineDays}
                onChange={(e) => updateForm({ estimatedTimelineDays: e.target.value })}
                className="w-full rounded-lg px-4 py-3 text-sm font-medium tabular-nums transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
                placeholder="90"
              />
              <p className="text-[9px]" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>Used for holding cost projections and schedule variance tracking</p>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>How did you find this deal?</label>
              <select
                value={formData.leadSource}
                onChange={(e) => updateForm({ leadSource: e.target.value })}
                className="w-full rounded-lg px-4 py-3 text-sm font-medium appearance-none cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
              >
                <option value="">Select source…</option>
                <option value="MLS">MLS Listing</option>
                <option value="Wholesale">Wholesaler</option>
                <option value="Direct Mail">Direct Mail</option>
                <option value="Driving for Dollars">Driving for Dollars</option>
                <option value="Auction">Auction / Foreclosure</option>
                <option value="Referral">Referral / Network</option>
                <option value="Off-Market">Off-Market / FSBO</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>What is the seller&apos;s motivation?</label>
              <select
                value={formData.sellerMotivation}
                onChange={(e) => updateForm({ sellerMotivation: e.target.value })}
                className="w-full rounded-lg px-4 py-3 text-sm font-medium appearance-none cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
              >
                <option value="">Select motivation…</option>
                <option value="Foreclosure">Pre-Foreclosure / Distress</option>
                <option value="Estate">Estate / Probate</option>
                <option value="Relocation">Relocation</option>
                <option value="Divorce">Divorce Settlement</option>
                <option value="Downsizing">Downsizing</option>
                <option value="Tired Landlord">Tired Landlord</option>
                <option value="Tax Lien">Tax Lien / Delinquent</option>
                <option value="Unknown">Unknown / Not Disclosed</option>
              </select>
            </div>

            <div className="space-y-2 col-span-full md:col-span-1">
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>Earnest money deposit ($)</label>
              <input
                type="number"
                value={formData.emdAmount}
                onChange={(e) => updateForm({ emdAmount: e.target.value })}
                className="w-full rounded-lg px-4 py-3 text-sm font-medium tabular-nums transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
                placeholder="5000"
              />
              <p className="text-[9px]" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>Good-faith deposit — typically 1-3% of purchase price</p>
            </div>
          </div>

          {/* MAO Preview — shows if ARV + rehab are entered */}
          {formData.estimatedARV && formData.projectedRehabCost && (
            <div className="mt-6 rounded-lg p-4 flex items-center justify-between" style={{ background: '#312E81', border: '1px solid #6366F1' }}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: '#A5B4FC' }}>Maximum Allowable Offer (70% Rule)</p>
                <p className="text-xs mt-1" style={{ color: '#C7D2FE' }}>ARV × 70% − Rehab − Closing = your walk-away price</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold tabular-nums" style={{ color: '#E0E7FF' }}>
                  ${(() => {
                    const arv = parseFloat(formData.estimatedARV) || 0;
                    const rehab = parseFloat(formData.projectedRehabCost) || 0;
                    const closing = parseFloat(formData.closingCosts) || 0;
                    const mao = Math.round((arv * 0.70) - rehab - closing);
                    return mao.toLocaleString();
                  })()}
                </p>
                {formData.purchasePrice && (() => {
                  const arv = parseFloat(formData.estimatedARV) || 0;
                  const rehab = parseFloat(formData.projectedRehabCost) || 0;
                  const closing = parseFloat(formData.closingCosts) || 0;
                  const mao = Math.round((arv * 0.70) - rehab - closing);
                  const pp = parseFloat(formData.purchasePrice) || 0;
                  const diff = mao - pp;
                  return (
                    <p className="text-[10px] font-bold" style={{ color: diff >= 0 ? '#6EE7B7' : '#FCA5A5' }}>
                      {diff >= 0 ? `✅ $${diff.toLocaleString()} under MAO` : `⚠️ $${Math.abs(diff).toLocaleString()} over MAO`}
                    </p>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>,

    /* Step 3: Strategy & Vision */
    <div key="strategy" className="space-y-8">
      <div className="flex items-center gap-4 mb-2">
        <div className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ background: 'var(--pw-black)' }}>
          <Target className="w-5 h-5" style={{ color: 'var(--pw-white)' }} aria-hidden="true" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>Phase 03</p>
          <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>What is the plan?</h2>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="space-y-2">
          <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>What is your investment strategy?</label>
          <select
            value={formData.strategy}
            onChange={(e) => updateForm({ strategy: e.target.value })}
            className="w-full rounded-lg px-4 py-3 text-sm font-medium appearance-none cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
          >
            <option value="Fix & Flip">Fix & Flip</option>
            <option value="BRRRR">BRRRR (Cash-Out Refi)</option>
            <option value="Buy & Hold">Buy & Hold</option>
            <option value="Wholesale">Wholesale</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>Can you describe your operational objectives?</label>
          <textarea
            value={formData.vision}
            onChange={(e) => updateForm({ vision: e.target.value })}
            className="w-full rounded-lg px-4 py-3 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20 min-h-[120px] resize-none"
            style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
            placeholder="Describe your rehab plan, exit strategy, or investment thesis…"
          />
        </div>
      </div>
    </div>,

    /* Step 4: Stakeholder Setup */
    <div key="team" className="space-y-8">
      <div className="flex items-center gap-4 mb-2">
        <div className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ background: 'var(--pw-black)' }}>
          <Users className="w-5 h-5" style={{ color: 'var(--pw-white)' }} aria-hidden="true" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>Phase 04</p>
          <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Who is on your team?</h2>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="space-y-2">
          <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>Who is the lead operator for this project? (Email)</label>
          <input
            type="email"
            value={formData.leadEmail}
            onChange={(e) => updateForm({ leadEmail: e.target.value })}
            className="w-full rounded-lg px-4 py-3 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
            placeholder="lead@operations.io"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>Are there any partner emails we should include? (comma-separated)</label>
          <input
            type="text"
            value={formData.partnerEmails}
            onChange={(e) => updateForm({ partnerEmails: e.target.value })}
            className="w-full rounded-lg px-4 py-3 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
            placeholder="partner@llc.co, analyst@bank.ly"
          />
        </div>
      </div>
    </div>,

    /* Step 5: Document Review */
    <div key="review" className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <div className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ background: 'var(--pw-black)' }}>
          <FileText className="w-5 h-5" style={{ color: 'var(--pw-white)' }} aria-hidden="true" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>Phase 05</p>
          <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Review & Confirm</h2>
        </div>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-ui)' }}>
        <div className="px-5 py-3" style={{ background: 'var(--pw-black)' }}>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--pw-white)' }}>Project Summary</h3>
        </div>
        <div>
          {[
            { label: 'Property',       value: formData.propertyName },
            { label: 'REI Stage',      value: formData.reiStatus || '—' },
            { label: 'Street',         value: formData.street || formData.address },
            { label: 'City / State',   value: [formData.city, formData.state].filter(Boolean).join(', ') || '—' },
            { label: 'ZIP',            value: formData.zip || '—' },
            ...(formData.mlsListingId ? [{ label: 'MLS #',  value: formData.mlsListingId }] : []),
            ...(formData.mlsListPrice != null ? [{ label: 'List Price', value: `$${formData.mlsListPrice.toLocaleString()}` }] : []),
            { label: 'Asset Class',    value: formData.assetClass },
            { label: 'Acquired',       value: formData.acquisitionDate ? new Date(formData.acquisitionDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
            { label: 'Close Date',     value: formData.closeDate ? new Date(formData.closeDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
            { label: 'Date of Sale',   value: formData.dateOfSale ? new Date(formData.dateOfSale + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
            { label: 'Purchase Price', value: formData.purchasePrice ? `$${Number(formData.purchasePrice).toLocaleString()}` : '—' },
            { label: 'Estimated ARV',  value: formData.estimatedARV ? `$${Number(formData.estimatedARV).toLocaleString()}` : '—' },
            { label: 'Leverage',       value: `${formData.leverage}%` },
            { label: 'Strategy',       value: formData.strategy },
            // NOI data points
            { label: 'Monthly Rent',   value: formData.monthlyGrossRent ? `$${Number(formData.monthlyGrossRent).toLocaleString()}` : '—' },
            { label: 'Vacancy Rate',   value: `${formData.vacancyRatePercent || '7'}%` },
            { label: 'Mgmt Fee',       value: `${formData.managementFeePercent || '8'}%` },
            { label: 'Monthly Taxes',  value: formData.monthlyTaxes ? `$${Number(formData.monthlyTaxes).toLocaleString()}` : '—' },
            { label: 'Monthly Insurance', value: formData.monthlyInsurance ? `$${Number(formData.monthlyInsurance).toLocaleString()}` : '—' },
            { label: 'Maintenance Reserve', value: formData.monthlyMaintenance ? `$${Number(formData.monthlyMaintenance).toLocaleString()}` : '—' },
            { label: 'Monthly Utilities', value: formData.monthlyUtilities ? `$${Number(formData.monthlyUtilities).toLocaleString()}` : '—' },
            { label: 'Monthly HOA', value: formData.monthlyHOA ? `$${Number(formData.monthlyHOA).toLocaleString()}` : '—' },
            // Debt service data points
            { label: 'Loan Amount', value: formData.loanAmount ? `$${Number(formData.loanAmount).toLocaleString()}` : '—' },
            { label: 'Interest Rate', value: formData.loanInterestRate ? `${formData.loanInterestRate}%` : '—' },
            { label: 'Loan Term', value: `${formData.loanTermYears || '30'} years` },
            { label: 'Closing Costs', value: formData.closingCosts ? `$${Number(formData.closingCosts).toLocaleString()}` : '—' },
            // Due Diligence data points
            { label: 'Rehab Budget', value: formData.projectedRehabCost ? `$${Number(formData.projectedRehabCost).toLocaleString()}` : '—' },
            { label: 'Rehab Timeline', value: formData.estimatedTimelineDays ? `${formData.estimatedTimelineDays} days` : '—' },
            { label: 'Lead Source', value: formData.leadSource || '—' },
            { label: 'Seller Motivation', value: formData.sellerMotivation || '—' },
            { label: 'Earnest Money', value: formData.emdAmount ? `$${Number(formData.emdAmount).toLocaleString()}` : '—' },
          ].map((item, idx, arr) => (
            <div
              key={item.label}
              className="grid grid-cols-2 px-5 py-3 text-xs"
              style={{ borderBottom: idx < arr.length - 1 ? '1px solid var(--border-ui)' : undefined }}
            >
              <span className="font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
              <span className="font-medium text-right tabular-nums" style={{ color: 'var(--text-primary)' }}>{item.value || '—'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)' }}>
        <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--pw-black)' }} aria-hidden="true" />
        <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
          Data validated and ready for ledger write.
        </p>
      </div>

      {/* ── Onboarding Warning — mandatory acknowledgment ── */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ border: '1px solid #D97706', background: '#FFFBEB' }}
      >
        <div className="flex items-center gap-3 px-5 py-3" style={{ background: '#FEF3C7', borderBottom: '1px solid #F59E0B' }}>
          <ShieldAlert className="w-4 h-4 shrink-0" style={{ color: '#B45309' }} aria-hidden="true" />
          <h3 className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: '#92400E' }}>
            Data Accuracy Notice
          </h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          <p className="text-sm font-medium leading-relaxed" style={{ color: '#78350F' }}>
            PaperWorking is a data-driven tool. Your insights are only as accurate as your inputs.
          </p>
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={hasAcknowledgedWarning}
              onChange={(e) => setHasAcknowledgedWarning(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-2 cursor-pointer accent-black"
              style={{ borderColor: '#D97706' }}
              aria-label="I understand that data accuracy depends on my inputs"
            />
            <span className="text-xs font-bold uppercase tracking-[0.12em] transition-colors" style={{ color: hasAcknowledgedWarning ? 'var(--pw-black)' : '#92400E' }}>
              I Understand
            </span>
          </label>
        </div>
      </div>
    </div>,
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'var(--bg-canvas)' }}>
      <button
        type="button"
        onClick={onClose}
        className="absolute top-6 right-6 z-10 flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-[0.12em] transition-all duration-200 hover:shadow-sm"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)', color: 'var(--text-secondary)' }}
      >
        Exit
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="w-full max-w-2xl mx-auto px-6">
        <ConversationalFormWrapper
          steps={STEPS}
          isStepValid={visibleStep === 4 ? (isStepValid && hasAcknowledgedWarning) : isStepValid}
          onComplete={handleFinalCommit}
          onExit={onClose}
          onStepChange={(idx) => setVisibleStep(idx)}
          submitLabel={isSubmitting ? 'Creating…' : 'Create Project'}
          isSubmitting={isSubmitting}
        >
          {stepViews}
        </ConversationalFormWrapper>
      </div>
    </div>
  );
}
