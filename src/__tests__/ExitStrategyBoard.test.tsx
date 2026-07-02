/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ExitStrategyBoard from '../components/exit/ExitStrategyBoard';
import { useProjectStore } from '@/store/projectStore';
import { projectsService } from '@/lib/firebase/projects';
import toast from 'react-hot-toast';

// Setup Mocks
var mockUser: any = { uid: 'user-123', getIdToken: jest.fn(() => Promise.resolve('mock-token')) };
var mockProfile: any = { displayName: 'Bob', email: 'bob@example.com', role: 'Lead Investor' };

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ profile: mockProfile, user: mockUser }),
}));

var mockUpdateProjectFinancials = jest.fn();
var mockSetDeals = jest.fn();
var mockProjects: any[] = [];

jest.mock('@/store/projectStore', () => ({
  useProjectStore: (selector: any) => selector({
    projects: mockProjects,
    updateProjectFinancials: mockUpdateProjectFinancials,
    setDeals: mockSetDeals,
  }),
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

jest.mock('@/components/exit/NetEngine', () => () => <div data-testid="net-engine" />);
jest.mock('../components/ui/PhaseBadge', () => () => <div data-testid="phase-badge" />);
jest.mock('../components/ui', () => ({
  Switch: ({ checked, onChange }: any) => (
    <input type="checkbox" checked={checked} onChange={onChange} data-testid="brrrr-switch" />
  ),
}));

describe('ExitStrategyBoard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProjects = [
      {
        id: 'project-1',
        propertyName: 'Sunset Heights',
        address: '456 Hill St, Los Angeles, CA 90012',
        status: 'Renovating',
        exitAssets: {
          stagingImages: [],
          mlsListingLink: '',
        },
        financials: {
          estimatedARV: 500000,
        },
      },
    ];
  });

  it('renders modal header and staging form correctly', async () => {
    await act(async () => {
      render(<ExitStrategyBoard projectId="project-1" onClose={jest.fn()} />);
    });

    expect(screen.getByText('The Exit Strategy Board')).toBeTruthy();
    expect(screen.getByText('Sunset Heights • 456 Hill St, Los Angeles, CA 90012')).toBeTruthy();
    expect(screen.getByText('Save Listing Updates')).toBeTruthy();
  });

  it('saves listing updates with pending_integration status and displays truthful toast', async () => {
    const mockUpdateProject = projectsService.updateProject as jest.Mock;

    await act(async () => {
      render(<ExitStrategyBoard projectId="project-1" onClose={jest.fn()} />);
    });

    const mlsInput = screen.getByPlaceholderText('https://zillow.com/homedetails/...');
    fireEvent.change(mlsInput, { target: { value: 'https://mls.com/sunset' } });

    const saveButton = screen.getByText('Save Listing Updates');
    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(mockUpdateProject).toHaveBeenCalledWith('project-1', expect.objectContaining({
        status: 'Listed',
        exitAssets: expect.objectContaining({
          mlsListingLink: 'https://mls.com/sunset',
          mlsListingStatus: 'pending_integration',
        }),
      }));
    });

    expect(mockSetDeals).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith(
      'Listing updates saved (Awaiting MLS connection)',
      expect.any(Object)
    );
  });

  it('displays Awaiting MLS Connection status banner in preview pane when status is pending_integration', async () => {
    mockProjects[0].status = 'Listed';
    mockProjects[0].exitAssets = {
      stagingImages: [],
      mlsListingLink: 'https://mls.com/sunset',
      mlsListingStatus: 'pending_integration',
    };

    await act(async () => {
      render(<ExitStrategyBoard projectId="project-1" onClose={jest.fn()} />);
    });

    expect(screen.getByText('Listing Saved (Awaiting MLS Connection)')).toBeTruthy();
    expect(screen.getByText(/Your changes have been saved. Listing updates will syndicate automatically/i)).toBeTruthy();
  });
});
