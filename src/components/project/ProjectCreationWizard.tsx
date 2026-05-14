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
          ...(formData.leadSource && { leadSource: formData.leadSource }),
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
        <div className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ background: '#1A1A1A' }}>
          <Building2 className="w-5 h-5" style={{ color: '#FFFFFF' }} aria-hidden="true" />
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
                    background: active ? '#1A1A1A' : 'var(--bg-canvas)',
                    border: active ? '1px solid #1A1A1A' : '1px solid var(--border-ui)',
                    color: active ? '#FFFFFF' : 'var(--text-secondary)',
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
                className="text-[10px] font-bold uppercase tracking-[0.12em] underline underline-offset-2 mt-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                Enter address manually instead
              </button>
            </>
          )}

          {/* MLS listing confirmed card */}
          {formData.mlsListingKey && (
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-ui)' }}>
              <div className="flex items-center justify-between px-4 py-2" style={{ background: '#1A1A1A' }}>
                <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: '#FFFFFF' }}>MLS Listing Confirmed</span>
                <button
                  type="button"
                  onClick={clearMlsSelection}
                  className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] opacity-70 hover:opacity-100 transition-opacity"
                  style={{ color: '#FFFFFF' }}
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
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: '#1A1A1A' }} aria-hidden="true" />
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
                className="text-[10px] font-bold uppercase tracking-[0.12em] underline underline-offset-2 mt-1"
                style={{ color: 'var(--text-secondary)' }}
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
        <div className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ background: '#1A1A1A' }}>
          <DollarSign className="w-5 h-5" style={{ color: '#FFFFFF' }} aria-hidden="true" />
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
              <TrendingUp className="w-4 h-4" style={{ color: '#FFFFFF' }} aria-hidden="true" />
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
                  const rent = parseFloat(formData.monthlyGrossRent) || 0;
                  const gri = rent * 12;
                  const vac = gri * ((parseFloat(formData.vacancyRatePercent) || 7) / 100);
                  const taxes = (parseFloat(formData.monthlyTaxes) || 0) * 12;
                  const ins = (parseFloat(formData.monthlyInsurance) || 0) * 12;
                  const maint = (parseFloat(formData.monthlyMaintenance) || 0) * 12;
                  const mgmt = gri * ((parseFloat(formData.managementFeePercent) || 8) / 100);
                  const utils = (parseFloat(formData.monthlyUtilities) || 0) * 12;
                  const hoa = (parseFloat(formData.monthlyHOA) || 0) * 12;
                  return Math.round(gri - vac - taxes - ins - maint - mgmt - utils - hoa).toLocaleString();
                })()}
              </p>
            </div>
          )}

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
                  const rent = parseFloat(formData.monthlyGrossRent) || 0;
                  const gri = rent * 12;
                  const vac = gri * ((parseFloat(formData.vacancyRatePercent) || 7) / 100);
                  const taxes = (parseFloat(formData.monthlyTaxes) || 0) * 12;
                  const ins = (parseFloat(formData.monthlyInsurance) || 0) * 12;
                  const maint = (parseFloat(formData.monthlyMaintenance) || 0) * 12;
                  const mgmt = gri * ((parseFloat(formData.managementFeePercent) || 8) / 100);
                  const utils = (parseFloat(formData.monthlyUtilities) || 0) * 12;
                  const hoa = (parseFloat(formData.monthlyHOA) || 0) * 12;
                  const noi = gri - vac - taxes - ins - maint - mgmt - utils - hoa;

                  const loanAmt = parseFloat(formData.loanAmount) || 0;
                  const rate = parseFloat(formData.loanInterestRate) || 0;
                  const termMonths = (parseFloat(formData.loanTermYears) || 30) * 12;
                  let annualDebtService = 0;
                  if (loanAmt > 0 && rate > 0 && termMonths > 0) {
                    const r = rate / 100 / 12;
                    const pow = Math.pow(1 + r, termMonths);
                    const monthlyPayment = loanAmt * (r * pow) / (pow - 1);
                    annualDebtService = monthlyPayment * 12;
                  }
                  const annualCashFlow = noi - annualDebtService;
                  const monthlyCashFlow = annualCashFlow / 12;
                  const isPositive = annualCashFlow >= 0;

                  // CoC Return preview
                  const purchPrice = parseFloat(formData.purchasePrice) || 0;
                  const downPayment = Math.max(0, purchPrice - loanAmt);
                  const closCosts = parseFloat(formData.closingCosts) || 0;
                  const totalCashInvested = downPayment + closCosts;
                  const cocReturn = totalCashInvested > 0 ? (annualCashFlow / totalCashInvested) * 100 : 0;

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
                          <p className="text-xl font-bold tabular-nums" style={{ color: isPositive ? '#34D399' : '#F87171' }}>
                            {isPositive ? '+' : ''}${Math.round(monthlyCashFlow).toLocaleString()}/mo
                          </p>
                          <p className="text-[10px] font-bold tabular-nums" style={{ color: isPositive ? '#6EE7B7' : '#FCA5A5' }}>
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
                            <p className="text-xl font-bold tabular-nums" style={{ color: cocReturn >= 8 ? '#34D399' : cocReturn >= 4 ? '#FBBF24' : '#F87171' }}>
                              {cocReturn.toFixed(1)}%
                            </p>
                            <p className="text-[10px] font-bold" style={{ color: cocReturn >= 8 ? '#6EE7B7' : cocReturn >= 4 ? '#FCD34D' : '#FCA5A5' }}>
                              {cocReturn >= 12 ? 'Excellent' : cocReturn >= 8 ? 'Strong' : cocReturn >= 4 ? 'Moderate' : 'Below Target'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
           DUE DILIGENCE — Forensic acquisition analysis
           These fields feed the Flip Profitability Dashboard
           ══════════════════════════════════════════════════════════ */}
        <div className="mt-8 pt-8" style={{ borderTop: '2px dashed var(--border-ui)' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#7C3AED' }}>
              <ShieldAlert className="w-4 h-4" style={{ color: '#FFFFFF' }} aria-hidden="true" />
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
        <div className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ background: '#1A1A1A' }}>
          <Target className="w-5 h-5" style={{ color: '#FFFFFF' }} aria-hidden="true" />
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
        <div className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ background: '#1A1A1A' }}>
          <Users className="w-5 h-5" style={{ color: '#FFFFFF' }} aria-hidden="true" />
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
        <div className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ background: '#1A1A1A' }}>
          <FileText className="w-5 h-5" style={{ color: '#FFFFFF' }} aria-hidden="true" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>Phase 05</p>
          <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Review & Confirm</h2>
        </div>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-ui)' }}>
        <div className="px-5 py-3" style={{ background: '#1A1A1A' }}>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: '#FFFFFF' }}>Project Summary</h3>
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
        <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: '#1A1A1A' }} aria-hidden="true" />
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
            <span className="text-xs font-bold uppercase tracking-[0.12em] transition-colors" style={{ color: hasAcknowledgedWarning ? '#1A1A1A' : '#92400E' }}>
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
