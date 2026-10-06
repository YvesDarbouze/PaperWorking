/**
 * @jest-environment jsdom
 */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import DealCrowdfundModal from '@/components/marketplace/DealCrowdfundModal';
import BroadcastDealModal from '@/components/marketing/deal-calculator/BroadcastDealModal';

// Tell React that we are in an act-supported environment
// @ts-expect-error global flag for React 18/19
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Task 5: Fix False-Positive Error Swallowing in Modals', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    global.fetch = jest.fn() as any;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    jest.restoreAllMocks();
  });

  describe('DealCrowdfundModal error handling', () => {
    const mockDeal: any = {
      id: 'deal-1',
      slug: 'test-deal',
      propertyName: 'Test Deal',
      address: '123 Main St, Austin, TX',
      minInvestment: 25000,
    };

    it('displays error banner and does not call onCommitSuccess when API returns an error', async () => {
      const onCommitSuccess = jest.fn();
      const onClose = jest.fn();

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Database commitment allocation failed' }),
      });

      await act(async () => {
        root.render(
          <DealCrowdfundModal
            deal={mockDeal}
            isOpen={true}
            onClose={onClose}
            onCommitSuccess={onCommitSuccess}
          />,
        );
      });

      // Check checkboxes to satisfy canSubmit
      const checkboxes = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
      expect(checkboxes.length).toBe(2);
      await act(async () => {
        checkboxes.forEach((cb) => cb.click());
      });

      // Submit form
      const form = container.querySelector('form');
      expect(form).not.toBeNull();
      await act(async () => {
        form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });

      // Error banner must be visible
      const errorBanner = container.querySelector('[role="alert"]');
      expect(errorBanner).not.toBeNull();
      expect(errorBanner?.textContent).toContain('Database commitment allocation failed');

      // False-positive success MUST NOT be triggered
      expect(onCommitSuccess).not.toHaveBeenCalled();
      expect(container.textContent).not.toContain('Investment Commitment Recorded!');
    });

    it('displays error banner when network throws', async () => {
      const onCommitSuccess = jest.fn();

      (global.fetch as any).mockRejectedValueOnce(new Error('Network failure'));

      await act(async () => {
        root.render(
          <DealCrowdfundModal
            deal={mockDeal}
            isOpen={true}
            onClose={() => {}}
            onCommitSuccess={onCommitSuccess}
          />,
        );
      });

      const checkboxes = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
      await act(async () => {
        checkboxes.forEach((cb) => cb.click());
      });

      const form = container.querySelector('form');
      await act(async () => {
        form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });

      const errorBanner = container.querySelector('[role="alert"]');
      expect(errorBanner).not.toBeNull();
      expect(errorBanner?.textContent).toContain('Network failure');
      expect(onCommitSuccess).not.toHaveBeenCalled();
    });
  });

  describe('BroadcastDealModal error handling', () => {
    const defaultCalculations: any = {
      projectedIrrPct: 18.5,
      netOperatingIncome: 85000,
    };

    it('sets error and does not call onSuccess when API returns non-credential error', async () => {
      const onSuccess = jest.fn();
      const onClose = jest.fn();

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'SendGrid rate limit exceeded' }),
      });

      await act(async () => {
        root.render(
          <BroadcastDealModal
            isOpen={true}
            onClose={onClose}
            address="123 Main St, Austin, TX"
            purchasePrice={1000000}
            calculations={defaultCalculations}
            onSuccess={onSuccess}
          />,
        );
      });

      const form = container.querySelector('form');
      await act(async () => {
        form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });

      expect(container.textContent).toContain('SendGrid rate limit exceeded');
      expect(onSuccess).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('handles requiresCredentials honest notification', async () => {
      const onSuccess = jest.fn();
      const onClose = jest.fn();

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ requiresCredentials: true }),
      });

      await act(async () => {
        root.render(
          <BroadcastDealModal
            isOpen={true}
            onClose={onClose}
            address="123 Main St, Austin, TX"
            purchasePrice={1000000}
            calculations={defaultCalculations}
            onSuccess={onSuccess}
          />,
        );
      });

      const form = container.querySelector('form');
      await act(async () => {
        form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });

      expect(container.textContent).toContain('Email Broadcast Provider requires API credentials in production.');
      expect(onSuccess).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('handles network error in catch block and does not call onSuccess', async () => {
      const onSuccess = jest.fn();
      const onClose = jest.fn();

      (global.fetch as any).mockRejectedValueOnce(new Error('Connection timed out'));

      await act(async () => {
        root.render(
          <BroadcastDealModal
            isOpen={true}
            onClose={onClose}
            address="123 Main St, Austin, TX"
            purchasePrice={1000000}
            calculations={defaultCalculations}
            onSuccess={onSuccess}
          />,
        );
      });

      const form = container.querySelector('form');
      await act(async () => {
        form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });

      expect(container.textContent).toContain('Connection timed out');
      expect(onSuccess).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
