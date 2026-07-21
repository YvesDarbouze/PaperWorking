/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import SaleOperationsCard from '../components/project/SaleOperationsCard';
import type { Project } from '@/types/schema';

// Setup Mocks
const mockUpdateProjectFinancials = jest.fn();
const mockUpdateProject = jest.fn();

if (typeof crypto === 'undefined' || !crypto.randomUUID) {
  Object.defineProperty(global, 'crypto', {
    value: {
      randomUUID: () => 'mocked-uuid-' + Math.random().toString(36).substring(2, 9),
    },
    writable: true,
  });
}

jest.mock('@/store/projectStore', () => ({
  useProjectStore: (selector: any) => selector({
    updateProjectFinancials: mockUpdateProjectFinancials,
  }),
}));

jest.mock('@/lib/firebase/deals', () => ({
  projectsService: {
    updateProject: (...args: any[]) => mockUpdateProject(...args),
  },
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
  loading: jest.fn(() => 'toast-id'),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'user_123', email: 'investor@paperworking.com', displayName: 'Lead Investor' },
  }),
}));

const mockProjectListed: Project = {
  id: 'proj-sell-123',
  address: '123 Seller Ave',
  currentPhase: 4,
  status: 'exit',
  phaseStatus: 'Phase 4: Exit',
  dispositionType: 'SALE',
  createdAt: new Date().toISOString(),
  financials: {
    sale_under_contract: false,
  },
  roleLinkedDocuments: [],
} as any;

const mockProjectUnderContract: Project = {
  id: 'proj-sell-123',
  address: '123 Seller Ave',
  currentPhase: 4,
  status: 'exit',
  phaseStatus: 'Phase 4: Exit',
  dispositionType: 'SALE',
  createdAt: new Date().toISOString(),
  financials: {
    sale_under_contract: true,
    sale_contract_price: 350000,
    sale_buyer_contingencies: [
      {
        id: 'c1',
        type: 'Inspection',
        deadlineDate: '2026-07-29',
        isSatisfied: false,
        isWaived: false,
        party: 'Buyer',
      },
      {
        id: 'c2',
        type: 'Financing',
        deadlineDate: '2026-08-05',
        isSatisfied: false,
        isWaived: false,
        party: 'Buyer',
      }
    ],
  },
  roleLinkedDocuments: [],
} as any;

describe('SaleOperationsCard component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders "Listed" status and allows marking under contract', async () => {
    render(<SaleOperationsCard project={mockProjectListed} refresh={jest.fn()} />);

    expect(screen.getByText('Listed')).toBeDefined();
    expect(screen.getByText('Mark Under Contract')).toBeDefined();

    const markBtn = screen.getByText('Mark Under Contract');
    await act(async () => {
      fireEvent.click(markBtn);
    });

    expect(screen.getByText('Contract Price ($)')).toBeDefined();

    const priceInput = screen.getByPlaceholderText('e.g. 450000');
    await act(async () => {
      fireEvent.change(priceInput, { target: { value: '350000' } });
    });

    const confirmBtn = screen.getByText('Confirm Contract');
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    expect(mockUpdateProjectFinancials).toHaveBeenCalledWith(
      'proj-sell-123',
      expect.objectContaining({
        sale_under_contract: true,
        sale_contract_price: 350000,
        sale_buyer_contingencies: expect.any(Array),
      })
    );
  });

  it('renders "Under Contract" details and lists contingencies', async () => {
    render(<SaleOperationsCard project={mockProjectUnderContract} refresh={jest.fn()} />);

    expect(screen.getByText('Under Contract')).toBeDefined();
    expect(screen.getByText('$350,000')).toBeDefined();
    expect(screen.getByText('Inspection Contingency')).toBeDefined();
    expect(screen.getByText('Financing Contingency')).toBeDefined();
  });

  it('allows adding a custom contingency and checking/unchecking contingencies', async () => {
    render(<SaleOperationsCard project={mockProjectUnderContract} refresh={jest.fn()} />);

    // satisfy contingency
    const checkBoxes = screen.getAllByRole('checkbox');
    await act(async () => {
      fireEvent.click(checkBoxes[0]);
    });

    expect(mockUpdateProjectFinancials).toHaveBeenCalledWith(
      'proj-sell-123',
      expect.objectContaining({
        sale_buyer_contingencies: expect.arrayContaining([
          expect.objectContaining({
            id: 'c1',
            isSatisfied: true,
          })
        ])
      })
    );

    // add custom contingency
    const addCustomBtn = screen.getByText('Add Custom');
    await act(async () => {
      fireEvent.click(addCustomBtn);
    });

    expect(screen.getByText('Days Until Deadline')).toBeDefined();
    const addBtn = screen.getByText('Add');
    await act(async () => {
      fireEvent.click(addBtn);
    });

    expect(mockUpdateProjectFinancials).toHaveBeenCalledWith(
      'proj-sell-123',
      expect.objectContaining({
        sale_buyer_contingencies: expect.arrayContaining([
          expect.objectContaining({
            type: 'Inspection',
            isSatisfied: false,
          })
        ])
      })
    );
  });

  it('blocks closing the sale if required closing documents are missing', async () => {
    const mockToastError = jest.spyOn(require('react-hot-toast'), 'error');

    const { container } = render(<SaleOperationsCard project={mockProjectUnderContract} refresh={jest.fn()} />);

    const closeSaleBtn = screen.getByText('Close Sale');
    await act(async () => {
      fireEvent.click(closeSaleBtn);
    });

    expect(screen.getByText('Log Transaction Closing Terms')).toBeDefined();

    const finalPriceInput = screen.getByPlaceholderText('e.g. 450000');
    const finalClosingDate = container.querySelector('input[type="date"]');

    await act(async () => {
      fireEvent.change(finalPriceInput, { target: { value: '350000' } });
      if (finalClosingDate) {
        fireEvent.change(finalClosingDate, { target: { value: '2026-07-19' } });
      }
    });

    const confirmCloseBtn = screen.getByText('Confirm Close');
    await act(async () => {
      fireEvent.click(confirmCloseBtn);
    });

    expect(mockToastError).toHaveBeenCalledWith(
      'Please upload all required closing documents: Sale Contract, Settlement Statement, and Deed Out'
    );
  });

  it('successfully closes the transaction when all inputs and documents are present', async () => {
    const mockProjectWithDocs: Project = {
      ...mockProjectUnderContract,
      roleLinkedDocuments: [
        {
          id: 'doc-1',
          category: 'Buyer Agreements',
          fileName: 'contract.pdf',
          fileUrl: '/mock/contract.pdf',
          verified: true,
          notes: '',
        },
        {
          id: 'doc-2',
          category: 'Final Settlement Statement',
          fileName: 'hud1.pdf',
          fileUrl: '/mock/hud1.pdf',
          verified: true,
          notes: '',
        },
        {
          id: 'doc-3',
          category: 'Deed',
          fileName: 'deed.pdf',
          fileUrl: '/mock/deed.pdf',
          verified: true,
          notes: '',
        }
      ]
    } as any;

    const { container } = render(<SaleOperationsCard project={mockProjectWithDocs} refresh={jest.fn()} />);

    const closeSaleBtn = screen.getByText('Close Sale');
    await act(async () => {
      fireEvent.click(closeSaleBtn);
    });

    const finalPriceInput = screen.getByPlaceholderText('e.g. 450000');
    const finalCostsInput = screen.getByPlaceholderText('e.g. 24000');
    const finalClosingDate = container.querySelector('input[type="date"]');

    await act(async () => {
      fireEvent.change(finalPriceInput, { target: { value: '360000' } });
      fireEvent.change(finalCostsInput, { target: { value: '22000' } });
      if (finalClosingDate) {
        fireEvent.change(finalClosingDate, { target: { value: '2026-07-19' } });
      }
    });

    const confirmCloseBtn = screen.getByText('Confirm Close');
    await act(async () => {
      fireEvent.click(confirmCloseBtn);
    });

    // Expect financials to be updated
    expect(mockUpdateProjectFinancials).toHaveBeenCalledWith(
      'proj-sell-123',
      expect.objectContaining({
        sale_price: 360000,
        selling_costs: 22000,
        sale_closed_date: '2026-07-19',
        actualSalePrice: 360000,
        sellingCosts: 22000,
        soldDate: '2026-07-19',
      })
    );

    // Expect project status to be updated to exit
    expect(mockUpdateProject).toHaveBeenCalledWith(
      'proj-sell-123',
      expect.objectContaining({
        status: 'exit',
        phaseStatus: 'Phase 4: Exit',
      })
    );
  });
});
