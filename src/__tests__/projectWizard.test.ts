/**
 * @jest-environment jsdom
 */

import { renderHook } from '@testing-library/react';
import {
  PROJECT_WIZARD_QUESTIONS,
  getActiveQuestions,
  setNestedField,
  getNestedField,
  WizardQuestion
} from '@/lib/utils/projectWizardSchema';
import { useProjectFormValidation } from '@/hooks/useProjectFormValidation';

describe('Project Creation Wizard Schema & Branching', () => {
  describe('setNestedField & getNestedField', () => {
    it('handles flat assignments', () => {
      const obj: any = {};
      setNestedField(obj, 'propertyName', 'Test Project');
      expect(obj.propertyName).toBe('Test Project');
      expect(getNestedField(obj, 'propertyName')).toBe('Test Project');
    });

    it('handles nested dotted paths', () => {
      const obj: any = {};
      setNestedField(obj, 'financials.purchasePrice', 500000);
      expect(obj.financials).toBeDefined();
      expect(obj.financials.purchasePrice).toBe(500000);
      expect(getNestedField(obj, 'financials.purchasePrice')).toBe(500000);
    });

    it('returns undefined for non-existent path', () => {
      const obj = { financials: { price: 100 } };
      expect(getNestedField(obj, 'financials.nonExistent')).toBeUndefined();
      expect(getNestedField(obj, 'other.nested.field')).toBeUndefined();
    });
  });

  describe('getActiveQuestions - Branching Conditions', () => {
    it('includes basic questions by default', () => {
      const answers = {
        isBackdated: 'no',
        startingPhase: 1,
        financingIntent: 'financed',
      };
      const active = getActiveQuestions(answers);
      const activeIds = active.map(q => q.id);

      expect(activeIds).toContain('address');
      expect(activeIds).toContain('propertyName');
      expect(activeIds).toContain('strategyType');
      expect(activeIds).toContain('financingIntent');
    });

    it('excludes financing questions for all-cash projects', () => {
      const answers = {
        isBackdated: 'no',
        startingPhase: 1,
        financingIntent: 'all-cash',
      };
      const active = getActiveQuestions(answers);
      const activeIds = active.map(q => q.id);

      expect(activeIds).not.toContain('loanAmount');
      expect(activeIds).not.toContain('loanInterestRate');
      expect(activeIds).not.toContain('loanTermYears');
    });

    it('includes financing questions for financed projects', () => {
      const answers = {
        isBackdated: 'no',
        startingPhase: 1,
        financingIntent: 'financed',
      };
      const active = getActiveQuestions(answers);
      const activeIds = active.map(q => q.id);

      expect(activeIds).toContain('loanAmount');
      expect(activeIds).toContain('loanInterestRate');
      expect(activeIds).toContain('loanTermYears');
    });

    it('excludes sale/exit questions for backdated projects that are not entering at Phase 4', () => {
      const answers = {
        isBackdated: 'yes',
        startingPhase: 3, // Rehab & Hold
        financingIntent: 'all-cash',
      };
      const active = getActiveQuestions(answers);
      const activeIds = active.map(q => q.id);

      expect(activeIds).not.toContain('dateOfSale');
      expect(activeIds).not.toContain('actualSalePrice');
      expect(activeIds).toContain('acquisitionDate');
    });

    it('includes sale/exit questions for backdated projects entering at Phase 4', () => {
      const answers = {
        isBackdated: 'yes',
        startingPhase: 4, // Closing & Exit
        financingIntent: 'all-cash',
      };
      const active = getActiveQuestions(answers);
      const activeIds = active.map(q => q.id);

      expect(activeIds).toContain('dateOfSale');
      expect(activeIds).toContain('actualSalePrice');
      expect(activeIds).toContain('acquisitionDate');
    });

    it('excludes closeDate when the project is backdated', () => {
      const answers = {
        isBackdated: 'yes',
        startingPhase: 3,
        financingIntent: 'all-cash',
      };
      const active = getActiveQuestions(answers);
      const activeIds = active.map(q => q.id);

      expect(activeIds).not.toContain('closeDate');
    });

    it('includes closeDate when the project is not backdated', () => {
      const answers = {
        isBackdated: 'no',
        startingPhase: 1,
        financingIntent: 'all-cash',
      };
      const active = getActiveQuestions(answers);
      const activeIds = active.map(q => q.id);

      expect(activeIds).toContain('closeDate');
    });
  });

  describe('useProjectFormValidation Hook', () => {
    const defaultQuestion: WizardQuestion = {
      id: 'propertyName',
      prompt: 'What should we call this Project?',
      type: 'text',
      field: 'propertyName',
      required: true,
    };

    it('validates required text fields', () => {
      const { result: r1 } = renderHook(() =>
        useProjectFormValidation({ propertyName: '' }, defaultQuestion)
      );
      expect(r1.current.isValid).toBe(false);
      expect(r1.current.validationError).toContain('required');

      const { result: r2 } = renderHook(() =>
        useProjectFormValidation({ propertyName: 'My Flip' }, defaultQuestion)
      );
      expect(r2.current.isValid).toBe(true);
      expect(r2.current.validationError).toBeNull();
    });

    it('validates email structure for leadEmail', () => {
      const question: WizardQuestion = {
        id: 'leadEmail',
        prompt: 'What is the lead email?',
        type: 'text',
        field: 'leadEmail',
        required: true,
      };

      const { result: r1 } = renderHook(() =>
        useProjectFormValidation({ leadEmail: 'bademail' }, question)
      );
      expect(r1.current.isValid).toBe(false);
      expect(r1.current.validationError).toContain('valid email');

      const { result: r2 } = renderHook(() =>
        useProjectFormValidation({ leadEmail: 'test@example.com' }, question)
      );
      expect(r2.current.isValid).toBe(true);
      expect(r2.current.validationError).toBeNull();
    });

    it('validates numeric / currency constraints', () => {
      const question: WizardQuestion = {
        id: 'purchasePrice',
        prompt: 'What is the purchase price?',
        type: 'currency',
        field: 'financials.purchasePrice',
        required: true,
      };

      const { result: r1 } = renderHook(() =>
        useProjectFormValidation({ financials: { purchasePrice: 'abc' } }, question)
      );
      expect(r1.current.isValid).toBe(false);
      expect(r1.current.validationError).toContain('must be a valid number');

      const { result: r2 } = renderHook(() =>
        useProjectFormValidation({ financials: { purchasePrice: '-500' } }, question)
      );
      expect(r2.current.isValid).toBe(false);
      expect(r2.current.validationError).toContain('cannot be negative');

      const { result: r3 } = renderHook(() =>
        useProjectFormValidation({ financials: { purchasePrice: '0' } }, question)
      );
      expect(r3.current.isValid).toBe(false);
      expect(r3.current.validationError).toContain('must be greater than zero');

      const { result: r4 } = renderHook(() =>
        useProjectFormValidation({ financials: { purchasePrice: '250000' } }, question)
      );
      expect(r4.current.isValid).toBe(true);
      expect(r4.current.validationError).toBeNull();
    });

    it('validates acquisition date limits', () => {
      const question: WizardQuestion = {
        id: 'acquisitionDate',
        prompt: 'Acquisition Date',
        type: 'date',
        field: 'financials.acquisitionDate',
        required: true,
      };

      const getLocalDateStr = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Today
      const todayStr = getLocalDateStr(new Date());
      const { result: r1 } = renderHook(() =>
        useProjectFormValidation({ financials: { acquisitionDate: todayStr } }, question)
      );
      expect(r1.current.isValid).toBe(true);

      // Future date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = getLocalDateStr(tomorrow);
      const { result: r2 } = renderHook(() =>
        useProjectFormValidation({ financials: { acquisitionDate: tomorrowStr } }, question)
      );
      expect(r2.current.isValid).toBe(false);
      expect(r2.current.validationError).toContain('cannot be in the future');

      // More than 1 year ago
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      const twoYearsAgoStr = getLocalDateStr(twoYearsAgo);
      const { result: r3 } = renderHook(() =>
        useProjectFormValidation({ financials: { acquisitionDate: twoYearsAgoStr } }, question)
      );
      expect(r3.current.isValid).toBe(false);
      expect(r3.current.validationError).toContain('cannot be older than 1 year');
    });

    it('validates address completeness for address type questions', () => {
      const question: WizardQuestion = {
        id: 'address',
        prompt: 'Where is the property?',
        type: 'address',
        field: 'address',
        required: true,
      };

      // Incomplete manual address
      const { result: r1 } = renderHook(() =>
        useProjectFormValidation({ street: '123 Main St', city: 'Miami' }, question)
      );
      expect(r1.current.isValid).toBe(false);
      expect(r1.current.validationError).toContain('valid property address');

      // Complete manual address
      const { result: r2 } = renderHook(() =>
        useProjectFormValidation({ street: '123 Main St', city: 'Miami', state: 'FL', zip: '33101' }, question)
      );
      expect(r2.current.isValid).toBe(true);

      // MLS listing provided
      const { result: r3 } = renderHook(() =>
        useProjectFormValidation({ address: '123 Main St, Miami, FL 33101', mlsListingKey: 'mls-123' }, question)
      );
      expect(r3.current.isValid).toBe(true);
    });
  });
});
