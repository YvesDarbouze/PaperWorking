import {
  getWizardStepsForStrategy,
  RENTAL_WIZARD_STEPS,
  FLIP_WIZARD_STEPS,
  BRRRR_WIZARD_STEPS,
} from '@/lib/deal-analyzer/wizardStepMap';
import {
  saveWizardDraft,
  loadWizardDraft,
  clearWizardDraft,
  validateStepFields,
  canProceedToNextStep,
} from '@/lib/deal-analyzer/wizardState';
import { Strategy } from '@/lib/deal-analyzer/fieldRegistry';

describe('Prompt 3 — Wizard Shell, Conditional Step Maps & State Contract', () => {
  let mockStore: Record<string, string> = {};

  beforeAll(() => {
    const localStorageMock = {
      getItem: (key: string) => mockStore[key] || null,
      setItem: (key: string, value: string) => {
        mockStore[key] = value.toString();
      },
      removeItem: (key: string) => {
        delete mockStore[key];
      },
      clear: () => {
        mockStore = {};
      },
    };
    Object.defineProperty(global, 'window', {
      value: { localStorage: localStorageMock },
      writable: true,
    });
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  beforeEach(() => {
    mockStore = {};
  });

  describe('Conditional Step Map Routing', () => {
    it('excludes Step 4 (Rehab) for rental strategy when needsRehab is false/omitted', () => {
      const defaultRentalSteps = getWizardStepsForStrategy('rental', { needsRehab: false });
      expect(defaultRentalSteps).toHaveLength(4);
      expect(defaultRentalSteps.map((s) => s.id)).not.toContain('rehab');
    });

    it('includes Step 4 (Rehab) for rental strategy when needsRehab is true', () => {
      const rehabRentalSteps = getWizardStepsForStrategy('rental', { needsRehab: true });
      expect(rehabRentalSteps).toHaveLength(5);
      expect(rehabRentalSteps.map((s) => s.id)).toContain('rehab');
    });

    it('returns exact step count for Flip (5 steps) and BRRRR (6 steps)', () => {
      const flipSteps = getWizardStepsForStrategy('flip');
      const brrrrSteps = getWizardStepsForStrategy('brrrr');

      expect(flipSteps).toHaveLength(5);
      expect(brrrrSteps).toHaveLength(6);
    });

    it('enforces WCAG 2.2 SC 3.3.7: zero redundant fields across steps in any strategy', () => {
      (['rental', 'flip', 'brrrr'] as Strategy[]).forEach((strat) => {
        const steps = getWizardStepsForStrategy(strat, { needsRehab: true });
        const seenKeys = new Set<string>();
        steps.forEach((step) => {
          step.fieldKeys.forEach((key) => {
            expect(seenKeys.has(key)).toBe(false);
            seenKeys.add(key);
          });
        });
      });
    });
  });

  describe('Draft Storage & Autosave Persist/Resume Contract', () => {
    it('saves, loads, and clears in-progress wizard draft', () => {
      const draft = {
        strategy: 'rental' as Strategy,
        currentStepIndex: 2,
        formData: { purchasePrice: 350000, monthlyRent: 2500 },
        touchedFields: { purchasePrice: true },
        advancedDisclosures: {},
        lastSavedAt: new Date().toISOString(),
      };

      saveWizardDraft(draft);

      const loaded = loadWizardDraft('rental');
      expect(loaded).not.toBeNull();
      expect(loaded?.currentStepIndex).toBe(2);
      expect(loaded?.formData.purchasePrice).toBe(350000);
      expect(loaded?.formData.monthlyRent).toBe(2500);

      clearWizardDraft('rental');
      expect(loadWizardDraft('rental')).toBeNull();
    });
  });

  describe('Step Validation & Progression Contract', () => {
    it('blocks progression when required fields are missing or invalid', () => {
      const emptyData = { purchasePrice: 0, monthlyRent: 0 };
      const isValid = canProceedToNextStep('rental', 0, emptyData);
      expect(isValid).toBe(false);

      const errors = validateStepFields('rental', 0, emptyData);
      expect(errors.purchasePrice).toBeDefined();
      expect(errors.monthlyRent).toBeDefined();
    });

    it('allows progression when required fields are valid', () => {
      const validData = { purchasePrice: 300000, monthlyRent: 2500 };
      const isValid = canProceedToNextStep('rental', 0, validData);
      expect(isValid).toBe(true);
    });
  });
});
