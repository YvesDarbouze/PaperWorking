import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import type { ProjectSummary } from '@/lib/projects/types';

const mockRouter = {
  replace: jest.fn(),
  push: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
};

jest.unstable_mockModule('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/projects',
}));

const { default: ProjectFolderCard } = await import('@/components/projects/ProjectFolderCard');
const { default: UnderwritingInputsForm } = await import('@/components/projects/UnderwritingInputsForm');

describe('UI ARV Honesty Component Tests (W2-02 / CATCH-13)', () => {
  describe('ProjectFolderCard', () => {
    it('renders "—" for Est. Exit when ARV/exit value is null (no fake 1.25x multiplier)', () => {
      const mockProject: ProjectSummary = {
        id: 'proj-no-arv',
        propertyName: '1247 Elm St No ARV Deal',
        address: '1247 Elm St, Austin, TX',
        city: 'Austin, TX',
        currentPhase: 'acquisition',
        status: 'active',
        dispositionType: 'SALE',
        purchasePrice: 500000,
        estimatedIrr: undefined,
        phaseCompletionPct: 10,
        ownershipPercentage: 100,
        estimatedExitValue: null,
        isIllustrativeExitValue: false,
      };

      const html = renderToString(<ProjectFolderCard project={mockProject} />);
      expect(html).toContain('Est. Exit');
      expect(html).toContain('—');
      expect(html).not.toContain('$625k');
      expect(html).not.toContain('$625,000');
      expect(html).not.toContain('ILLUSTRATIVE');
    });

    it('renders ILLUSTRATIVE badge when isIllustrativeExitValue is true', () => {
      const mockProject: ProjectSummary = {
        id: 'proj-illustrative-arv',
        propertyName: '1247 Elm St Illustrative Deal',
        address: '1247 Elm St, Austin, TX',
        city: 'Austin, TX',
        currentPhase: 'acquisition',
        status: 'active',
        dispositionType: 'SALE',
        purchasePrice: 500000,
        estimatedIrr: undefined,
        phaseCompletionPct: 10,
        ownershipPercentage: 100,
        estimatedExitValue: 610000,
        isIllustrativeExitValue: true,
      };

      const html = renderToString(<ProjectFolderCard project={mockProject} />);
      expect(html).toContain('Est. Exit');
      expect(html).toContain('ILLUSTRATIVE');
      expect(html).toContain('$610.0k');
    });

    it('renders explicit exit value without ILLUSTRATIVE badge when real ARV is present', () => {
      const mockProject: ProjectSummary = {
        id: 'proj-real-arv',
        propertyName: 'Real ARV Deal',
        address: '1247 Elm St, Austin, TX',
        city: 'Austin, TX',
        currentPhase: 'acquisition',
        status: 'active',
        dispositionType: 'SALE',
        purchasePrice: 500000,
        estimatedIrr: undefined,
        phaseCompletionPct: 10,
        ownershipPercentage: 100,
        estimatedExitValue: 700000,
        isIllustrativeExitValue: false,
      };

      const html = renderToString(<ProjectFolderCard project={mockProject} />);
      expect(html).toContain('Est. Exit');
      expect(html).toContain('$700.0k');
      expect(html).not.toContain('ILLUSTRATIVE');
    });
  });

  describe('UnderwritingInputsForm', () => {
    it('renders honest empty state warning "ARV not provided — enter ARV to compute equity/MAO." when ARV is absent', () => {
      const html = renderToString(
        <UnderwritingInputsForm
          basePurchasePrice={485000}
          initialValues={{
            acquisition: {
              purchasePrice: 485000,
              buyerClosingCosts: 9700,
              rehabBudget: 50000,
              estimatedARV: undefined,
            },
          }}
        />,
      );

      expect(html).toContain('Estimated After Repair Value (ARV)');
      expect(html).toContain('ARV not provided — enter ARV to compute equity/MAO.');
    });

    it('omits empty state warning when explicit ARV is provided', () => {
      const html = renderToString(
        <UnderwritingInputsForm
          basePurchasePrice={485000}
          initialValues={{
            acquisition: {
              purchasePrice: 485000,
              buyerClosingCosts: 9700,
              rehabBudget: 50000,
              estimatedARV: 650000,
            },
          }}
        />,
      );

      expect(html).toContain('Estimated After Repair Value (ARV)');
      expect(html).not.toContain('ARV not provided — enter ARV to compute equity/MAO.');
      expect(html).toContain('value="650000"');
    });
  });
});
