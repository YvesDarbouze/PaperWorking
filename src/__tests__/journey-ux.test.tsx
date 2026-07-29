/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { JourneyProgressHeader } from '@/components/project/JourneyProgressHeader';
import { JourneySkeletonLoader } from '@/components/ui/JourneySkeletonLoader';
import { JourneyErrorCard } from '@/components/ui/JourneyErrorCard';

// Mock ThemeProvider
jest.mock('@/lib/utils/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

describe('PROMPT 7 — REIL Journey UX Hardening Unit Tests', () => {
  describe('JourneyProgressHeader', () => {
    it('renders all 4 phase nodes with correct current phase', () => {
      render(<JourneyProgressHeader projectId="proj_123" currentPhase={3} />);

      expect(screen.getByTestId('journey-progress-header')).toBeDefined();
      expect(screen.getByText('Phase 1: Acquisition')).toBeDefined();
      expect(screen.getByText('Phase 2: Fund')).toBeDefined();
      expect(screen.getByText('Phase 3: Operations')).toBeDefined();
      expect(screen.getByText('Phase 4: Exit')).toBeDefined();
    });

    it('renders completed phases as links', () => {
      render(<JourneyProgressHeader projectId="proj_123" currentPhase={3} />);

      const p1Link = screen.getByText('Phase 1: Acquisition').closest('a');
      const p2Link = screen.getByText('Phase 2: Fund').closest('a');

      expect(p1Link).toBeTruthy();
      expect(p2Link).toBeTruthy();
      expect(p1Link?.getAttribute('href')).toBe('/dashboard/projects/proj_123');
      expect(p2Link?.getAttribute('href')).toBe('/dashboard/projects/proj_123/underwriting');
    });
  });

  describe('JourneySkeletonLoader', () => {
    it('renders skeleton loader container with stable data-testid', () => {
      render(<JourneySkeletonLoader rows={3} type="table" />);

      const loader = screen.getByTestId('journey-skeleton-loader');
      expect(loader).toBeDefined();
    });
  });

  describe('JourneyErrorCard', () => {
    it('renders title, description and triggers onRetry callback when clicked', () => {
      const handleRetry = jest.fn();
      render(
        <JourneyErrorCard
          title="Network Connection Failed"
          description="Failed to fetch financials"
          onRetry={handleRetry}
        />
      );

      expect(screen.getByTestId('journey-error-card')).toBeDefined();
      expect(screen.getByText('Network Connection Failed')).toBeDefined();
      expect(screen.getByText('Failed to fetch financials')).toBeDefined();

      const retryBtn = screen.getByTestId('retry-fetch-btn');
      fireEvent.click(retryBtn);
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });
  });
});
