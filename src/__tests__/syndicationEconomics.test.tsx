/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SyndicationEconomicsCard } from '../components/project/SyndicationEconomicsCard';
import { calculateSyndicationDistribution } from '../lib/metrics/reiMetrics';
import type { Project } from '@/types/schema';

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

const mockProjectBase: Project = {
  id: 'proj_syndication_test_123',
  propertyName: 'Syndication Test Property',
  status: 'fund',
  financials: {
    purchasePrice: 279000,
    capitalPlan: 'raise interest',
    distributionStructure: {
      type: 'straight',
      splitRatioLP: 70,
      splitRatioGP: 30,
    }
  }
} as any;

describe('Syndication Economics & Waterfall Engine Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateSyndicationDistribution Engine', () => {
    it('FX-3: calculates straight split correctly', () => {
      const res = calculateSyndicationDistribution(900000, 0, 100000, {
        type: 'straight',
        splitRatioLP: 70,
        splitRatioGP: 30,
      });

      expect(res.lpTotal).toBe(70000);
      expect(res.gpTotal).toBe(30000);
      expect(res.shortfallAccrued).toBe(0);
    });

    it('FX-4: calculates 7% Preferred Return (Non-Cumulative) correctly', () => {
      const res = calculateSyndicationDistribution(900000, 0, 100000, {
        type: 'pref_return',
        splitRatioLP: 70,
        splitRatioGP: 30,
        preferredRate: 7,
        preferredType: 'non_cumulative',
      });

      expect(res.lpPreferred).toBe(63000);
      expect(res.lpTotal).toBe(88900);
      expect(res.gpTotal).toBe(11100);
      expect(res.shortfallAccrued).toBe(0);
    });

    it('FX-5: calculates 7% Cumulative Preferred Return over two periods correctly', () => {
      // Period 1 (Year 1)
      const p1 = calculateSyndicationDistribution(900000, 0, 50000, {
        type: 'pref_return',
        splitRatioLP: 70,
        splitRatioGP: 30,
        preferredRate: 7,
        preferredType: 'cumulative',
      });

      expect(p1.lpTotal).toBe(50000);
      expect(p1.gpTotal).toBe(0);
      expect(p1.shortfallAccrued).toBe(13000);

      // Period 2 (Year 2)
      const p2 = calculateSyndicationDistribution(900000, 0, 100000, {
        type: 'pref_return',
        splitRatioLP: 70,
        splitRatioGP: 30,
        preferredRate: 7,
        preferredType: 'cumulative',
      }, 13000);

      expect(p2.lpPreferred).toBe(76000);
      expect(p2.lpTotal).toBe(92800);
      expect(p2.gpTotal).toBe(7200);
      expect(p2.shortfallAccrued).toBe(0);
    });

    it('FX-6: calculates Three-Tier Waterfall correctly', () => {
      const standardWaterfallTiers = [
        { tierNumber: 1, thresholdPct: 7, splitRatioLP: 100, splitRatioGP: 0 },
        { tierNumber: 2, thresholdPct: 14, splitRatioLP: 70, splitRatioGP: 30 },
        { tierNumber: 3, thresholdPct: 999999, splitRatioLP: 50, splitRatioGP: 50 },
      ];

      const res = calculateSyndicationDistribution(900000, 0, 180000, {
        type: 'waterfall',
        splitRatioLP: 70,
        splitRatioGP: 30,
        waterfallTiers: standardWaterfallTiers,
      });

      expect(res.lpTotal).toBe(139500);
      expect(res.gpTotal).toBe(40500);
    });
  });

  describe('SyndicationEconomicsCard UI Component', () => {
    const mockOnSaveFinancials = jest.fn();
    const mockRefresh = jest.fn();

    it('renders Step 1 structure selection options, preview simulator, and verified statuses', () => {
      render(
        <SyndicationEconomicsCard
          project={mockProjectBase}
          onSaveFinancials={mockOnSaveFinancials}
          refresh={mockRefresh}
        />
      );

      expect(screen.getByText('Card F2.4 — Syndication Economics')).toBeDefined();
      expect(screen.getByText('Step 1: Choose Distribution Structure')).toBeDefined();
      expect(screen.getByText('Straight Split')).toBeDefined();
      expect(screen.getByText('Preferred Return')).toBeDefined();
      expect(screen.getByText('Waterfalls')).toBeDefined();

      // Preview labeled as "Preview — hypothetical distributable cash"
      expect(screen.getByText('Preview — hypothetical distributable cash')).toBeDefined();

      // Verify disclaimer text exists
      expect(screen.getByText(/illustrative modeling purposes only based on hypothetical parameters/)).toBeDefined();

      // Verify that all 5 fixture statuses are verified as correct in the diagnostic panel
      expect(screen.getAllByText('VERIFIED').length).toBe(5);
    });

    it('navigates through steps and saves configuration to financials', async () => {
      render(
        <SyndicationEconomicsCard
          project={mockProjectBase}
          onSaveFinancials={mockOnSaveFinancials}
          refresh={mockRefresh}
        />
      );

      // 1. Select Preferred Return in Step 1
      const prefBtn = screen.getByText('Preferred Return').closest('button')!;
      fireEvent.click(prefBtn);

      // 2. Click "Next" to go to Step 2
      const nextBtn = screen.getByText('Next: Configure Parameters →');
      fireEvent.click(nextBtn);

      // 3. Confirm we are on Step 2
      expect(screen.getByText('Step 2: Configure Parameters')).toBeDefined();
      expect(screen.getByText('Preferred Yield (%)')).toBeDefined();

      // 4. Click "Save Distribution Terms"
      const saveBtn = screen.getByText('Save Distribution Terms');
      await act(async () => {
        fireEvent.click(saveBtn);
      });

      expect(mockOnSaveFinancials).toHaveBeenCalledWith({
        distributionStructure: expect.objectContaining({
          type: 'pref_return',
          preferredRate: 7,
          preferredType: 'non_cumulative'
        }),
      });
    });

    it('allows editing parameters in Step 2 and updates preview', async () => {
      render(
        <SyndicationEconomicsCard
          project={mockProjectBase}
          onSaveFinancials={mockOnSaveFinancials}
          refresh={mockRefresh}
        />
      );

      // Go to Step 2
      const nextBtn = screen.getByText('Next: Configure Parameters →');
      fireEvent.click(nextBtn);

      // Change LP split input value
      const lpInput = screen.getByLabelText('LP Split Ratio (%)');
      fireEvent.change(lpInput, { target: { value: '80' } });

      // Simulator: LP committed $900k, Distributable Cash $100k
      // In straight split at 80/20 split -> LP gets $80,000, GP gets $20,000
      expect(screen.getAllByText('$80,000').length).toBeGreaterThan(0);
      expect(screen.getAllByText('$20,000').length).toBeGreaterThan(0);
    });

    it('allows editing waterfall tiers and propagates calculations', async () => {
      render(
        <SyndicationEconomicsCard
          project={mockProjectBase}
          onSaveFinancials={mockOnSaveFinancials}
          refresh={mockRefresh}
        />
      );

      // Select Waterfall in Step 1
      const waterfallBtn = screen.getByText('Waterfalls').closest('button')!;
      fireEvent.click(waterfallBtn);

      // Go to Step 2
      const nextBtn = screen.getByText('Next: Configure Parameters →');
      fireEvent.click(nextBtn);

      // Edit Tier 1 Split to 80% (from default 100%)
      const lpSplitInputs = screen.getAllByLabelText('LP Split Ratio (%)');
      fireEvent.change(lpSplitInputs[0], { target: { value: '80' } });

      // Since Simulator has $100,000 Distributable Cash and $900,000 LP Capital
      // Tier 1 threshold is 7% ($63k). Since LP Split is 80%, pool needed = $63k / 0.8 = $78.75k.
      // LP Preferred = $63k. GP share in Tier 1 = $78.75k - $63k = $15.75k.
      // Remainder pool = $100k - $78.75k = $21.25k.
      // Tier 2 LP Split is 70%. Cumulative threshold is 14% LP return (an additional $63k LP return).
      // LP Share in Tier 2 = min(additional LP needed ($63k), pool ($21.25k) * 0.7) = $14.875k.
      // GP Share in Tier 2 = $21.25k - $14.875k = $6.375k.
      // Total LP = $63,000 + $14,875 = $77,875.
      // Total GP = $15,750 + $6,375 = $22,125.
      expect(screen.getAllByText('$77,875').length).toBeGreaterThan(0);
      expect(screen.getAllByText('$22,125').length).toBeGreaterThan(0);
    });
  });
});
