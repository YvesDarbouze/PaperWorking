import { FIELD_REGISTRY, Strategy, validateField, deriveFields } from './fieldRegistry';
import { getWizardStepsForStrategy } from './wizardStepMap';

export interface WizardDraftState {
  strategy: Strategy;
  currentStepIndex: number;
  formData: Record<string, any>;
  touchedFields: Record<string, boolean>;
  advancedDisclosures: Record<string, boolean>; // tracks progressive disclosure toggle states
  lastSavedAt: string;
}

export const STORAGE_KEY_PREFIX = 'pw_deal_analyzer_draft_';

export function getDraftStorageKey(strategy: Strategy): string {
  return `${STORAGE_KEY_PREFIX}${strategy}`;
}

/**
 * Saves in-progress wizard draft to LocalStorage.
 */
export function saveWizardDraft(draft: WizardDraftState): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getDraftStorageKey(draft.strategy);
    const payload = {
      ...draft,
      formData: deriveFields(draft.formData),
      lastSavedAt: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (err) {
    console.warn('[WizardState] Failed to save draft to localStorage:', err);
  }
}

/**
 * Loads in-progress wizard draft from LocalStorage for a given strategy.
 */
export function loadWizardDraft(strategy: Strategy): WizardDraftState | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = getDraftStorageKey(strategy);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as WizardDraftState;
  } catch {
    return null;
  }
}

/**
 * Clears in-progress wizard draft from LocalStorage.
 */
export function clearWizardDraft(strategy: Strategy): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(getDraftStorageKey(strategy));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Validates all required fields in the current step.
 * Returns map of field keys to error messages.
 */
export function validateStepFields(
  strategy: Strategy,
  stepIndex: number,
  formData: Record<string, any>
): Record<string, string> {
  const steps = getWizardStepsForStrategy(strategy, { needsRehab: !!formData.needsRehab });
  const currentStep = steps[stepIndex];
  if (!currentStep) return {};

  const errors: Record<string, string> = {};

  currentStep.fieldKeys.forEach((key) => {
    const fieldDef = FIELD_REGISTRY[key];
    if (fieldDef) {
      const val = formData[key] ?? fieldDef.defaultValue;
      const result = validateField(key, val);
      if (!result.valid && result.error) {
        errors[key] = result.error;
      }
    }
  });

  return errors;
}

/**
 * Checks if the current step has any blocking validation errors for required fields.
 */
export function canProceedToNextStep(
  strategy: Strategy,
  stepIndex: number,
  formData: Record<string, any>
): boolean {
  const errors = validateStepFields(strategy, stepIndex, formData);
  return Object.keys(errors).length === 0;
}
