/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LockedTermsSummary } from '../components/project/LockedTermsSummary';
import { Project, LoanRecord } from '@/types/schema';
import { projectsService } from '@/lib/firebase/deals';

// Mock AuthContext
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'user-123', email: 'sponsor@test.com', displayName: 'Test Sponsor' }
  })
}));

// Mock projectsService
const mockUpdateProject = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/firebase/deals', () => ({
  projectsService: {
    updateProject: (...args: any[]) => mockUpdateProject(...args)
  }
}));

// Mock Firestore configuration
jest.mock('../lib/firebase/config', () => ({
  db: {}
}));

describe('LockedTermsSummary Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockProject = {
    id: 'proj-123',
    propertyName: 'Palm Garden Villas',
    address: '456 Palms Ave, Miami FL',
    termsLocked: false,
    financials: {
      purchasePrice: 500000,
      estimatedCurrentValue: 520000
    }
  } as unknown as Project;

  const mockActiveLoan: LoanRecord = {
    id: 'loan-active-123',
    projectId: 'proj-123',
    lender: 'Chase Bank',
    amount: 350000,
    rate: 6.5,
    termYears: 30,
    points: 1,
    status: 'application_submitted',
    archived: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  it('renders standard fallback when activeLoan is missing', () => {
    render(
      <LockedTermsSummary
        projectId="proj-123"
        project={mockProject}
        activeLoan={undefined}
        dscr={0}
      />
    );

    expect(screen.getByText('Locked Terms Summary')).toBeDefined();
    expect(screen.getByText(/Choose an estimate terms candidate/i)).toBeDefined();
  });

  it('renders parameters as read-only values when activeLoan is present', () => {
    render(
      <LockedTermsSummary
        projectId="proj-123"
        project={mockProject}
        activeLoan={mockActiveLoan}
        dscr={1.35}
      />
    );

    expect(screen.getByText('Card F3.5 — Locked Financing Terms')).toBeDefined();
    expect(screen.getByText('$350,000')).toBeDefined();
    expect(screen.getByText('6.50%')).toBeDefined();
    expect(screen.getByText('30 years')).toBeDefined();
    expect(screen.getByText('1%')).toBeDefined();
    expect(screen.queryByText(/Lender Guideline Alert/i)).toBeNull();
  });

  it('displays a prominent warning if DSCR falls below the 1.25x lender minimum', () => {
    render(
      <LockedTermsSummary
        projectId="proj-123"
        project={mockProject}
        activeLoan={mockActiveLoan}
        dscr={1.15}
      />
    );

    expect(screen.getByText('Lender Guideline Alert: Low DSCR')).toBeDefined();
    expect(screen.getByText(/falls below the standard lender underwriting guideline/i)).toBeDefined();
  });

  it('handles Confirm & Lock Terms action correctly', async () => {
    render(
      <LockedTermsSummary
        projectId="proj-123"
        project={mockProject}
        activeLoan={mockActiveLoan}
        dscr={1.35}
      />
    );

    const lockBtn = screen.getByRole('button', { name: /confirm & lock terms/i });
    fireEvent.click(lockBtn);

    await waitFor(() => {
      expect(mockUpdateProject).toHaveBeenCalledWith(
        'proj-123',
        expect.objectContaining({
          termsLocked: true,
          financials: expect.objectContaining({
            loanAmount: 350000,
            loanInterestRate: 6.5,
            loanTermYears: 30,
            loanOriginationPoints: 1
          })
        })
      );
    });
  });

  it('handles Unlock Projections action correctly', async () => {
    const lockedProject = {
      ...mockProject,
      termsLocked: true
    } as unknown as Project;

    render(
      <LockedTermsSummary
        projectId="proj-123"
        project={lockedProject}
        activeLoan={mockActiveLoan}
        dscr={1.35}
      />
    );

    const unlockBtn = screen.getByRole('button', { name: /unlock projections/i });
    fireEvent.click(unlockBtn);

    await waitFor(() => {
      expect(mockUpdateProject).toHaveBeenCalledWith(
        'proj-123',
        expect.objectContaining({
          termsLocked: false
        })
      );
    });
  });
});
