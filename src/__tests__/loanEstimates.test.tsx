/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoanEstimatesComparison } from '../components/project/LoanEstimatesComparison';
import { LoanEstimateCandidate, Project } from '@/types/schema';
import { projectsService } from '@/lib/firebase/deals';
import { addDoc } from 'firebase/firestore';

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

// Mock Firestore functions
const mockAddDoc = jest.fn().mockResolvedValue({ id: 'doc-123' });
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: (...args: any[]) => mockAddDoc(...args),
  serverTimestamp: () => 'mock-server-timestamp'
}));

describe('LoanEstimatesComparison Component', () => {
  const mockProject = {
    id: 'proj-123',
    propertyName: 'Palm Garden Villas',
    address: '456 Palms Ave, Miami FL',
    loans: [],
    financials: {
      purchasePrice: 500000
    }
  } as unknown as Project;

  const mockEstimates: LoanEstimateCandidate[] = [
    {
      id: 'est-1',
      lender: 'Chase Bank',
      amount: 350000,
      rate: 6.5,
      termYears: 30,
      points: 1,
      estimatedCosts: 4500,
      fileName: 'chase_estimate.pdf',
      fileUrl: 'http://test.com/chase.pdf',
      uploadedAt: '2026-07-19T00:00:00Z',
      isChosen: false
    },
    {
      id: 'est-2',
      lender: 'Neo Lending',
      amount: 360000,
      rate: 7.25,
      termYears: 30,
      points: 0.5,
      estimatedCosts: 3800,
      fileName: 'neo_estimate.pdf',
      fileUrl: 'http://test.com/neo.pdf',
      uploadedAt: '2026-07-19T00:00:00Z',
      isChosen: false
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the initial state with file upload dropzone', () => {
    render(
      <LoanEstimatesComparison
        projectId="proj-123"
        project={mockProject}
        estimates={[]}
      />
    );

    expect(screen.getByText('Upload Loan Estimate Sheet')).toBeTruthy();
    expect(screen.queryByText('Candidate Estimates Comparison')).toBeNull();
  });

  it('renders the candidate estimates list when candidates are provided', () => {
    render(
      <LoanEstimatesComparison
        projectId="proj-123"
        project={mockProject}
        estimates={mockEstimates}
      />
    );

    expect(screen.getByText('Chase Bank')).toBeTruthy();
    expect(screen.getByText('Neo Lending')).toBeTruthy();
    expect(screen.getAllByText('Choose This Loan').length).toBe(2);
  });

  it('handles choosing a loan and updates active loan record and project financials', async () => {
    render(
      <LoanEstimatesComparison
        projectId="proj-123"
        project={mockProject}
        estimates={mockEstimates}
      />
    );

    const chooseButtons = screen.getAllByText('Choose This Loan');
    // Click Chase Bank "Choose This Loan" button (which is the first one)
    fireEvent.click(chooseButtons[0]);

    await waitFor(() => {
      expect(mockUpdateProject).toHaveBeenCalledTimes(1);
    });

    const updateCall = mockUpdateProject.mock.calls[0];
    expect(updateCall[0]).toBe('proj-123');

    // Updates should contain:
    // 1. Updated loanEstimates (Chase Bank is chosen)
    expect(updateCall[1].loanEstimates[0].isChosen).toBe(true);
    expect(updateCall[1].loanEstimates[1].isChosen).toBe(false);

    // 2. Loans list with new active loan and any old ones archived
    expect(updateCall[1].loans.length).toBe(1);
    expect(updateCall[1].loans[0].lender).toBe('Chase Bank');
    expect(updateCall[1].loans[0].archived).toBe(false);

    // 3. Project financials properties aligned with chosen estimate
    expect(updateCall[1].financials).toEqual({
      purchasePrice: 500000,
      loanAmount: 350000,
      loanInterestRate: 6.5,
      loanTermYears: 30,
      loanOriginationPoints: 1
    });
  });

  it('handles deleting an estimate candidate', async () => {
    render(
      <LoanEstimatesComparison
        projectId="proj-123"
        project={mockProject}
        estimates={mockEstimates}
      />
    );

    const deleteButtons = screen.getAllByTitle('Delete Estimate candidate');
    // Delete Chase Bank candidate
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockUpdateProject).toHaveBeenCalledTimes(1);
    });

    const updateCall = mockUpdateProject.mock.calls[0];
    expect(updateCall[1].loanEstimates.length).toBe(1);
    expect(updateCall[1].loanEstimates[0].lender).toBe('Neo Lending');
  });
});
