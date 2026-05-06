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
} from 'lucide-react';
import AddressAutocomplete, { type ParsedAddress } from '@/components/projects/AddressAutocomplete';
import PropertySearchInput from '@/components/shared/PropertySearchInput';
import type { BridgeSearchResult } from '@/types/bridge';
import { useDealFormValidation, type DealFormData } from '@/hooks/useDealFormValidation';

/* ═══════════════════════════════════════════════════════════════
   DealCreationWizard — REI Project Initialization Flow

   Steps:
     1. Property Identity  — Name, REI status, MLS search / address
     2. Acquisition Metrics — Price, ARV, close date, leverage
     3. Strategy & Vision   — Investment profile + objectives
     4. Stakeholder Setup   — Lead operator + partner emails
     5. Document Review     — Summary + final commit
   ═══════════════════════════════════════════════════════════════ */

interface DealCreationWizardProps {
  organizationId: string;
  onClose: () => void;
  onSuccess?: (projectId: string) => void;
}

const STEPS: StepDescriptor[] = [
  { id: 'identity', label: 'Property Identity' },
  { id: 'metrics',  label: 'Acquisition Metrics' },
  { id: 'strategy', label: 'Strategy & Vision' },
  { id: 'team',     label: 'Stakeholder Setup' },
  { id: 'review',   label: 'Document Review' },
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

const INITIAL_FORM: DealFormData = {
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
  purchasePrice: '',
  estimatedARV: '',
  closeDate: '',
  leverage: '75',
  strategy: 'Fix & Flip',
  vision: '',
  leadEmail: '',
  partnerEmails: '',
  mlsListingKey: undefined,
  mlsListingId: undefined,
  mlsListPrice: null,
  mlsBeds: null,
  mlsBaths: null,
  mlsSqft: null,
  mlsThumbnailUrl: null,
  mlsStandardStatus: null,
};

export default function DealCreationWizard({ organizationId, onClose, onSuccess }: DealCreationWizardProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visibleStep, setVisibleStep] = useState(0);
  const [hasAcknowledgedWarning, setHasAcknowledgedWarning] = useState(false);
  const [useManualAddress, setUseManualAddress] = useState(false);

  const [formData, setFormData] = useState<DealFormData>({
    ...INITIAL_FORM,
    leadEmail: '',
  });

  const updateForm = (updates: Partial<DealFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const structuredAddress = useMemo(() => ({
    street: formData.street,
    city: formData.city,
    state: formData.state,
    zip: formData.zip,
  }), [formData.street, formData.city, formData.state, formData.zip]);

  const { isStepValid, addressErrors, isAddressComplete, acquisitionDateError } = useDealFormValidation(formData, visibleStep);

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
      const projectId = await projectsService.createDeal({
        propertyName: formData.propertyName,
        address: formData.address,
        ...(formData.street && { street: formData.street }),
        ...(formData.city && { city: formData.city }),
        ...(formData.state && { state: formData.state }),
        ...(formData.zip && { zip: formData.zip }),
        ...(formData.lat != null && { lat: formData.lat }),
        ...(formData.lng != null && { lng: formData.lng }),
        ...(formData.acquisitionDate && { acquisitionDate: formData.acquisitionDate }),
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
          <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Property Identity</h2>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Project Name */}
        <div className="space-y-2">
          <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>Project Name / Nickname</label>
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
          <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>Current Stage</label>
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
            {useManualAddress ? 'Property Address' : 'Search MLS Listings'}
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
          <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>Asset Classification</label>
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
          <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Acquisition Metrics</h2>
        </div>
      </div>

      {/* ── Project Start / Acquisition Date ── */}
      <div className="space-y-2 mb-2">
        <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>Project Start / Acquisition Date</label>
        <p className="text-[11px] font-normal leading-relaxed -mt-0.5" style={{ color: 'var(--text-secondary)', opacity: 0.65 }}>
          When was this project initiated or the property acquired?
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
          <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>Purchase Price ($)</label>
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
          <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>Estimated ARV ($)</label>
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
          <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>Target Close Date</label>
          <input
            type="date"
            value={formData.closeDate}
            onChange={(e) => updateForm({ closeDate: e.target.value })}
            className="w-full rounded-lg px-4 py-3 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>Target Leverage (%)</label>
          <input
            type="number"
            value={formData.leverage}
            onChange={(e) => updateForm({ leverage: e.target.value })}
            className="w-full rounded-lg px-4 py-3 text-sm font-medium tabular-nums transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
            placeholder="75"
          />
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
          <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Strategy & Vision</h2>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="space-y-2">
          <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>Investment Profile</label>
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
          <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>Operational Objectives</label>
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
          <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Stakeholder Setup</h2>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="space-y-2">
          <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>Lead Operator Email</label>
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
          <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>Partner Emails (comma-separated)</label>
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
            { label: 'Purchase Price', value: formData.purchasePrice ? `$${Number(formData.purchasePrice).toLocaleString()}` : '—' },
            { label: 'Estimated ARV',  value: formData.estimatedARV ? `$${Number(formData.estimatedARV).toLocaleString()}` : '—' },
            { label: 'Leverage',       value: `${formData.leverage}%` },
            { label: 'Strategy',       value: formData.strategy },
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
