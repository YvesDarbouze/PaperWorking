'use client';

import { useMemo } from 'react';
import { WizardQuestion, getNestedField } from '@/lib/utils/projectWizardSchema';

export interface AddressFieldErrors {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export function useProjectFormValidation(formData: any, activeQuestion: WizardQuestion) {
  // Address field validation
  const addressErrors: AddressFieldErrors = useMemo(() => {
    const errors: AddressFieldErrors = {};
    const street = formData.street || '';
    const city = formData.city || '';
    const state = formData.state || '';
    const zip = formData.zip || '';

    if (!street.trim()) errors.street = 'Street is required';
    if (!city.trim())   errors.city   = 'City is required';
    if (!state.trim())  errors.state  = 'State is required';
    if (!zip.trim())    errors.zip    = 'ZIP is required';
    return errors;
  }, [formData.street, formData.city, formData.state, formData.zip]);

  const isAddressComplete = Object.keys(addressErrors).length === 0;

  // Acquisition Date validation
  const acquisitionDateError: string | null = useMemo(() => {
    const dateVal = formData.financials?.acquisitionDate || formData.acquisitionDate;
    if (!dateVal) return null;

    const selected = new Date(dateVal + 'T00:00:00');
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
  }, [formData.financials?.acquisitionDate, formData.acquisitionDate]);

  // General field validation for the active question
  const validationError: string | null = useMemo(() => {
    if (!activeQuestion) return null;

    const val = getNestedField(formData, activeQuestion.field);

    // Required check
    if (activeQuestion.required) {
      if (activeQuestion.id === 'address') {
        const addressValid = !!formData.mlsListingKey || isAddressComplete;
        if (!addressValid) return 'Please specify a valid property address.';
      } else if (val === undefined || val === null || val === '') {
        return `${activeQuestion.prompt} is required.`;
      }
    }

    // Type specific checks
    if (activeQuestion.type === 'currency' || activeQuestion.type === 'number') {
      if (val !== undefined && val !== null && val !== '') {
        const num = parseFloat(val);
        if (isNaN(num)) return 'Value must be a valid number.';
        if (num < 0) return 'Value cannot be negative.';
        if (activeQuestion.required && num <= 0) return 'Value must be greater than zero.';
      }
    }

    if (activeQuestion.id === 'acquisitionDate' && acquisitionDateError) {
      return acquisitionDateError;
    }

    if (activeQuestion.id === 'leadEmail' && val) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(val))) {
        return 'Please enter a valid email address.';
      }
    }

    return null;
  }, [activeQuestion, formData, isAddressComplete, acquisitionDateError]);

  const isValid = validationError === null;

  return {
    isValid,
    validationError,
    addressErrors,
    isAddressComplete,
    acquisitionDateError,
  };
}
