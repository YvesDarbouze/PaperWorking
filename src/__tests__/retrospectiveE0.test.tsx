/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RetrospectiveWorkspace } from '../components/project/RetrospectiveWorkspace';
import { projectsService } from '@/lib/firebase/projects';
import type { Project } from '@/types/schema';

// Setup Mocks
const mockRouter = {
  push: jest.fn(),
  refresh: jest.fn(),
};

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

jest.mock('@/lib/firebase/projects', () => ({
  projectsService: {
    updateProject: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

const mockProject: Project = {
  id: 'proj-retro-123',
  address: '456 Oak Ave',
  currentPhase: 4,
  status: 'exit',
  phaseStatus: 'Phase 4: Exit',
  dispositionType: 'RENT',
  entryStage: 'Exit',
  retrospective: true,
  createdAt: new Date().toISOString(),
  financials: {
    purchasePrice: 200000,
    acquisitionDate: '2026-07-10T00:00:00.000Z',
    financingType: 'All Cash',
    projectedRehabCost: 15000,
    gross_rent_per_unit: 2500,
    tax: 150,
    insurance: 80,
    security: 30,
    maintenance: 120,
    utilities: 100,
    management_pct: 8,
    HOA: 50,
    capex: 100,
    other_income: 10
  }
} as any;

describe('E0 Retrospective entry mode wizard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    ) as any;
  });

  it('renders step 1 purchase details initially', () => {
    render(<RetrospectiveWorkspace project={mockProject} refresh={jest.fn()} />);

    expect(screen.getByText('1. Purchase Price & Date')).toBeDefined();
    const addressInput = screen.getByPlaceholderText('e.g. 123 Main St, New York, NY') as HTMLInputElement;
    const priceInput = screen.getByPlaceholderText('e.g. 250000') as HTMLInputElement;
    expect(addressInput.value).toBe('456 Oak Ave');
    expect(priceInput.value).toBe('200000');
  });

  it('navigates through step 2 and step 3 correctly', () => {
    render(<RetrospectiveWorkspace project={mockProject} refresh={jest.fn()} />);

    // Step 1 -> Step 2
    fireEvent.click(screen.getByText('Confirm & Next'));
    expect(screen.getByText('2. Renovation Costs')).toBeDefined();
    const rehabInput = screen.getByPlaceholderText('e.g. 35000 (Enter 0 if none)') as HTMLInputElement;
    expect(rehabInput.value).toBe('15000');

    // Step 2 -> Step 3
    fireEvent.click(screen.getByText('Confirm & Next'));
    expect(screen.getByText('3. Financing Facts')).toBeDefined();
  });

  it('calculates derived metrics on sidebar dynamically', () => {
    render(<RetrospectiveWorkspace project={mockProject} refresh={jest.fn()} />);

    // Check NOI and Cash-on-Cash in sidebar
    expect(screen.getByText('Net Operating Income')).toBeDefined();
    expect(screen.getByText('Cash-on-Cash Return')).toBeDefined();
  });

  it('finalizes retrospective mode with retrospectiveCompleted: true on save', async () => {
    render(<RetrospectiveWorkspace project={mockProject} refresh={jest.fn()} />);

    // Step 1 -> Step 2
    fireEvent.click(screen.getByText('Confirm & Next'));
    // Step 2 -> Step 3
    fireEvent.click(screen.getByText('Confirm & Next'));
    // Step 3 -> Step 4
    fireEvent.click(screen.getByText('Confirm & Next'));
    // Step 4 -> Step 5
    fireEvent.click(screen.getByText('Confirm & Next'));

    // Step 5: Save
    const saveBtn = screen.getByText('Complete Retrospective Entry');
    fireEvent.click(saveBtn);

    expect(projectsService.updateProject).toHaveBeenCalledWith(
      'proj-retro-123',
      expect.objectContaining({
        financials: expect.objectContaining({
          retrospectiveCompleted: true,
        }),
      })
    );
  });
});
