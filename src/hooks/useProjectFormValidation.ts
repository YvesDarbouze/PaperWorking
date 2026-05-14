/**
 * src/hooks/useProjectFormValidation.ts
 *
 * Extracted from ProjectCreationWizard to keep the component lean.
 * Returns per-step validity + per-field error messages for the
 * address manual-entry fallback.
 */

import { useMemo } from 'react';

export interface ProjectFormData {
  propertyName: string;
  reiStatus: string;
  address: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  lat: number | null;
  lng: number | null;
  assetClass: string;
  purchasePrice: string;
  estimatedARV: string;
  acquisitionDate: string;
  closeDate: string;
  dateOfSale?: string;
  leverage: string;
  strategy: string;
  vision: string;
  leadEmail: string;
  partnerEmails: string;
  // NOI Input fields — mandatory data points for operational performance
  monthlyGrossRent: string;
  vacancyRatePercent: string;
  monthlyTaxes: string;
  monthlyInsurance: string;
  monthlyMaintenance: string;
  managementFeePercent: string;
  monthlyUtilities: string;
  monthlyHOA: string;
  // Debt service fields — required for Cash Flow = NOI - Debt Service
  loanAmount: string;
  loanInterestRate: string;
  loanTermYears: string;
  // CoC Return — Total Cash Invested = Down Payment + Closing Costs + Rehab
  closingCosts: string;
  // Due Diligence — Acquisition forensics (schema fields that already exist)
  projectedRehabCost: string;
  estimatedTimelineDays: string;
  sellerMotivation: string;
  emdAmount: string;
  leadSource: string;
  // MLS fields — populated when user selects a listing from Bridge search
  mlsListingKey?: string;
  mlsListingId?: string;
  mlsListPrice?: number | null;
  mlsBeds?: number | null;
  mlsBaths?: number | null;
  mlsSqft?: number | null;
  mlsThumbnailUrl?: string | null;
  mlsStandardStatus?: string | null;
}

export interface AddressFieldErrors {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export function useProjectFormValidation(formData: ProjectFormData, stepIndex: number) {
  const addressErrors: AddressFieldErrors = useMemo(() => {
    const errors: AddressFieldErrors = {};
    if (!formData.street.trim()) errors.street = 'Street is required';
    if (!formData.city.trim())   errors.city   = 'City is required';
    if (!formData.state.trim())  errors.state  = 'State is required';
    if (!formData.zip.trim())    errors.zip    = 'ZIP is required';
    return errors;
  }, [formData.street, formData.city, formData.state, formData.zip]);

  const isAddressComplete = Object.keys(addressErrors).length === 0;

  /* ── Acquisition Date validation ─────────────────────
     Rule 1: Cannot be in the future.
     Rule 2: Cannot be older than exactly 1 calendar year. */
  const acquisitionDateError: string | null = useMemo(() => {
    if (!formData.acquisitionDate) return null; // empty = not yet filled, no error

    const selected = new Date(formData.acquisitionDate + 'T00:00:00');
    if (isNaN(selected.getTime())) return 'Invalid date format.';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selected > today) {
      return 'Project start date cannot be in the future.';
    }

    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    if (selected < oneYearAgo) {
      return 'Date cannot be older than 1 year from today.';
    }

    return null;
  }, [formData.acquisitionDate]);

  const isAcquisitionDateValid = !!formData.acquisitionDate && acquisitionDateError === null;

  const isStepValid = useMemo((): boolean => {
    switch (stepIndex) {
      case 0: {
        // Address is satisfied either by an MLS listing selection or manual entry
        const addressValid = !!formData.mlsListingKey || isAddressComplete;
        return !!(formData.propertyName.trim() && formData.reiStatus && addressValid);
      }
      case 1:
        // Monthly Gross Rent is required so NOI can be computed from day one
        return !!(formData.purchasePrice && formData.estimatedARV && formData.monthlyGrossRent && isAcquisitionDateValid);
      case 3:
        return !!formData.leadEmail.trim();
      default:
        return true;
    }
  }, [stepIndex, formData.propertyName, formData.reiStatus, formData.mlsListingKey, formData.purchasePrice, formData.estimatedARV, formData.monthlyGrossRent, formData.leadEmail, isAddressComplete, isAcquisitionDateValid]);

  return { isStepValid, addressErrors, isAddressComplete, acquisitionDateError, isAcquisitionDateValid };
}
