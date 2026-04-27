'use client';

import { useState, useCallback } from 'react';
import { projectsService } from '@/lib/firebase/projects';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════
   useProjectWizardMachine — Conversational Form State Machine

   Formal state machine for the project initialization flow.
   States: IDLE → IDENTITY → METRICS → STRATEGY → TEAM → REVIEW → SUBMITTING → COMPLETE | ERROR

   Validation gates enforce data integrity at each transition.
   The DealCreationWizard consumes this hook and renders
   the UI for each state.
   ═══════════════════════════════════════════════════════ */

export type WizardState =
  | 'IDLE'
  | 'IDENTITY'
  | 'METRICS'
  | 'STRATEGY'
  | 'TEAM'
  | 'REVIEW'
  | 'SUBMITTING'
  | 'COMPLETE'
  | 'ERROR';

const STATE_ORDER: WizardState[] = [
  'IDENTITY',
  'METRICS',
  'STRATEGY',
  'TEAM',
  'REVIEW',
];

export interface WizardFormData {
  propertyName: string;
  address: string;
  assetClass: string;
  purchasePrice: string;
  estimatedARV: string;
  closeDate: string;
  leverage: string;
  strategy: string;
  vision: string;
  leadEmail: string;
  partnerEmails: string;
}

const INITIAL_FORM_DATA: WizardFormData = {
  propertyName: '',
  address: '',
  assetClass: 'Residential',
  purchasePrice: '',
  estimatedARV: '',
  closeDate: '',
  leverage: '75',
  strategy: 'Fix & Flip',
  vision: '',
  leadEmail: '',
  partnerEmails: '',
};

interface ValidationResult {
  valid: boolean;
  message?: string;
}

function validateState(state: WizardState, data: WizardFormData): ValidationResult {
  switch (state) {
    case 'IDENTITY':
      if (!data.propertyName.trim()) return { valid: false, message: 'Property name is required.' };
      if (!data.address.trim()) return { valid: false, message: 'Address is required.' };
      return { valid: true };

    case 'METRICS':
      if (!data.purchasePrice || parseFloat(data.purchasePrice) <= 0)
        return { valid: false, message: 'Purchase price must be greater than zero.' };
      if (!data.estimatedARV || parseFloat(data.estimatedARV) <= 0)
        return { valid: false, message: 'Estimated ARV must be greater than zero.' };
      return { valid: true };

    case 'STRATEGY':
      return { valid: true }; // Strategy has defaults, always valid

    case 'TEAM':
      if (!data.leadEmail.trim()) return { valid: false, message: 'Lead operator email is required.' };
      return { valid: true };

    case 'REVIEW':
      return { valid: true }; // Review is always valid — user confirmed

    default:
      return { valid: true };
  }
}

export interface UseProjectWizardMachineOptions {
  organizationId: string;
  onSuccess?: (projectId: string) => void;
  onClose?: () => void;
}

export function useProjectWizardMachine({ organizationId, onSuccess, onClose }: UseProjectWizardMachineOptions) {
  const { user } = useAuth();
  const [state, setState] = useState<WizardState>('IDENTITY');
  const [formData, setFormData] = useState<WizardFormData>({
    ...INITIAL_FORM_DATA,
    leadEmail: user?.email || '',
  });
  const [error, setError] = useState<string | null>(null);

  const currentStepIndex = STATE_ORDER.indexOf(state);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STATE_ORDER.length - 1;

  const updateForm = useCallback((updates: Partial<WizardFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    setError(null);
  }, []);

  const canAdvance = useCallback((): boolean => {
    return validateState(state, formData).valid;
  }, [state, formData]);

  const next = useCallback(() => {
    const validation = validateState(state, formData);
    if (!validation.valid) {
      setError(validation.message || 'Validation failed.');
      return;
    }

    if (isLastStep) {
      // Transition to SUBMITTING handled by submit()
      return;
    }

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STATE_ORDER.length) {
      setState(STATE_ORDER[nextIndex]);
      setError(null);
    }
  }, [state, formData, isLastStep, currentStepIndex]);

  const back = useCallback(() => {
    if (isFirstStep) {
      onClose?.();
      return;
    }
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setState(STATE_ORDER[prevIndex]);
      setError(null);
    }
  }, [isFirstStep, currentStepIndex, onClose]);

  const submit = useCallback(async () => {
    if (!user) {
      setError('Authentication required.');
      setState('ERROR');
      return;
    }

    setState('SUBMITTING');
    try {
      const projectId = await projectsService.createDeal(
        {
          propertyName: formData.propertyName,
          address: formData.address,
          status: 'Lead',
          ownerUid: user.uid,
          financials: {
            purchasePrice: parseFloat(formData.purchasePrice) * 100,
            estimatedARV: parseFloat(formData.estimatedARV) * 100,
            costs: [],
          },
        },
        organizationId,
      );

      setState('COMPLETE');
      toast.success('Project created and indexed successfully.');
      onSuccess?.(projectId);
    } catch (err) {
      console.error('[WizardMachine] Submission failed:', err);
      setState('ERROR');
      setError('Failed to create project. Please try again.');
      toast.error('Failed to create project. Please try again.');
    }
  }, [user, formData, organizationId, onSuccess]);

  const reset = useCallback(() => {
    setState('IDENTITY');
    setFormData({
      ...INITIAL_FORM_DATA,
      leadEmail: user?.email || '',
    });
    setError(null);
  }, [user?.email]);

  return {
    state,
    formData,
    error,
    currentStepIndex,
    isFirstStep,
    isLastStep,
    isSubmitting: state === 'SUBMITTING',
    isComplete: state === 'COMPLETE',
    isError: state === 'ERROR',
    canAdvance: canAdvance(),
    updateForm,
    next,
    back,
    submit,
    reset,
  };
}
