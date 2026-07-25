/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ClosingRoomModal from '../components/closing/ClosingRoomModal';
import { useProjectStore } from '@/store/projectStore';
import { useAuth } from '@/context/AuthContext';
import { projectsService } from '@/lib/firebase/deals';
import { uploadFile } from '@/lib/storage/uploadService';
import toast from 'react-hot-toast';

// Setup Mocks
var mockUser: any = { uid: 'user-123', getIdToken: jest.fn(() => Promise.resolve('mock-token')) };
var mockProfile: any = { displayName: 'Bob', email: 'bob@example.com', role: 'Lead Investor' };

jest.mock('@/lib/firebase/config', () => ({
  db: {},
}));

jest.mock('@/lib/firebase/folders', () => ({
  foldersService: {
    addFile: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(() => {
    const docs = [
      { id: 'folder-1', data: () => ({ name: 'Closing' }) }
    ];
    return Promise.resolve({
      empty: false,
      docs,
      forEach: (callback: any) => docs.forEach(callback)
    });
  }),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ profile: mockProfile, user: mockUser }),
}));

var mockUpdateClosingRoom = jest.fn();
var mockProjects: any[] = [];
var mockSetDeals = jest.fn();
var mockSetDeal = jest.fn();

jest.mock('@/store/projectStore', () => {
  const storeInstance: any = (selector: any) => selector({
    projects: mockProjects,
    updateClosingRoom: mockUpdateClosingRoom,
    setDeals: mockSetDeals,
    setDeal: mockSetDeal,
  });
  storeInstance.getState = () => ({
    projects: mockProjects,
    setDeals: mockSetDeals,
    setDeal: mockSetDeal,
  });
  return {
    useProjectStore: storeInstance,
  };
});

jest.mock('@/lib/firebase/deals', () => ({
  projectsService: {
    updateProject: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('@/lib/storage/uploadService', () => ({
  uploadFile: jest.fn(() => Promise.resolve({
    downloadUrl: 'https://firebasestorage.googleapis.com/v0/b/mock/o/doc.pdf',
    storagePath: 'projects/project-1/closing_docs/doc.pdf',
    contentType: 'application/pdf',
    size: 1024,
  })),
}));

jest.mock('react-hot-toast', () => ({
  loading: jest.fn(() => 'toast-id'),
  success: jest.fn(),
  error: jest.fn(),
}));

jest.mock('@/components/shared/DealProgressTracker', () => () => <div data-testid="progress-tracker" />);
jest.mock('@/components/shared/ESignAction', () => () => <div data-testid="esign-action" />);

const mockFetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ lawyers: [{ uid: 'lawyer-1', displayName: 'Attorney John' }] }),
  } as any)
);
global.fetch = mockFetch;

describe('ClosingRoomModal Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { uid: 'user-123', getIdToken: jest.fn(() => Promise.resolve('mock-token')) };
    mockProfile = { displayName: 'Bob', email: 'bob@example.com', role: 'Lead Investor' };
    mockProjects = [
      {
        id: 'project-1',
        propertyName: 'Miami Oasis',
        address: '123 Ocean Drive, Miami, FL 33139',
        members: {
          'user-123': { role: 'Lead Investor', addedAt: new Date() }
        },
        closingRoom: {
          titleInsuranceUrl: null,
          closingDisclosureUrl: null,
          wiringInstructionsUrl: null,
          assignedLawyerUid: null,
          lawyerVerified: false,
          blockchainTxHash: null,
          chainOfTitleStatus: 'pending'
        }
      }
    ];
  });

  it('renders modal normally for a project member', async () => {
    await act(async () => {
      render(<ClosingRoomModal projectId="project-1" onClose={jest.fn()} />);
    });

    // Wait for async state updates to complete
    await waitFor(() => {
      expect(screen.getByText('Attorney John')).toBeTruthy();
    });

    expect(screen.getByText('The Closing Room')).toBeTruthy();
    expect(screen.getByText('Miami Oasis • 123 Ocean Drive, Miami, FL 33139')).toBeTruthy();
    expect(screen.queryByText('Access Denied')).toBeNull();
  });

  it('renders Access Denied view for a non-member', async () => {
    mockUser = { uid: 'other-user', getIdToken: jest.fn(() => Promise.resolve('mock-token')) };
    mockProfile = { displayName: 'Stranger', email: 'stranger@example.com', role: 'Guest' };

    await act(async () => {
      render(<ClosingRoomModal projectId="project-1" onClose={jest.fn()} />);
    });

    // In this view, fetch doesn't run because of the early return.
    expect(screen.getByText('Access Denied')).toBeTruthy();
    expect(screen.getByText('You must be a member of this project to access the Closing Room.')).toBeTruthy();
    expect(screen.queryByText('The Closing Room')).toBeNull();
  });

  it('handles file upload successfully and persists to Firestore', async () => {
    const mockUpdateProject = projectsService.updateProject as jest.Mock;
    const mockUploadFile = uploadFile as jest.Mock;

    let container: any;
    await act(async () => {
      const rendered = render(<ClosingRoomModal projectId="project-1" onClose={jest.fn()} />);
      container = rendered.container;
    });

    // Wait for async state updates to complete
    await waitFor(() => {
      expect(screen.getByText('Attorney John')).toBeTruthy();
    });

    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).toBeTruthy();

    const file = new File(['dummy content'], 'title_insurance.pdf', { type: 'application/pdf' });
    
    await act(async () => {
      fireEvent.change(fileInput!, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(mockUploadFile).toHaveBeenCalledWith(expect.objectContaining({
        file,
        path: 'closing_docs',
        projectId: 'project-1',
      }));
    });

    await waitFor(() => {
      expect(mockUpdateProject).toHaveBeenCalledWith('project-1', expect.objectContaining({
        closingRoom: expect.objectContaining({
          titleInsuranceUrl: 'https://firebasestorage.googleapis.com/v0/b/mock/o/doc.pdf',
        })
      }));
    });

    expect(mockUpdateClosingRoom).toHaveBeenCalledWith('project-1', {
      titleInsuranceUrl: 'https://firebasestorage.googleapis.com/v0/b/mock/o/doc.pdf',
    });

    expect(toast.success).toHaveBeenCalledWith('Document uploaded successfully!', expect.any(Object));
  });

  it('does not display success toast if Firestore persistence fails', async () => {
    const mockUpdateProject = projectsService.updateProject as jest.Mock;
    mockUpdateProject.mockRejectedValueOnce(new Error('Firestore write failed'));

    // Suppress console.error in this specific test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    let container: any;
    await act(async () => {
      const rendered = render(<ClosingRoomModal projectId="project-1" onClose={jest.fn()} />);
      container = rendered.container;
    });

    // Wait for async state updates to complete
    await waitFor(() => {
      expect(screen.getByText('Attorney John')).toBeTruthy();
    });

    const fileInput = container.querySelector('input[type="file"]');
    const file = new File(['dummy content'], 'title_insurance.pdf', { type: 'application/pdf' });
    
    await act(async () => {
      fireEvent.change(fileInput!, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Firestore write failed'), expect.any(Object));
    });

    expect(toast.success).not.toHaveBeenCalled();
    expect(mockUpdateClosingRoom).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('handles document review attestation successfully and persists reviewer metadata', async () => {
    const mockUpdateProject = projectsService.updateProject as jest.Mock;

    // Set all documents to be completed in closingRoom
    mockProjects[0].closingRoom = {
      titleInsuranceUrl: 'https://example.com/title.pdf',
      closingDisclosureUrl: 'https://example.com/disclosure.pdf',
      wiringInstructionsUrl: 'https://example.com/wiring.pdf',
      assignedLawyerUid: 'lawyer-1',
      lawyerVerified: false,
      blockchainTxHash: null,
      chainOfTitleStatus: 'pending'
    };

    await act(async () => {
      render(<ClosingRoomModal projectId="project-1" onClose={jest.fn()} />);
    });

    // Wait for attorneys list to load and verify the button is there
    await waitFor(() => {
      expect(screen.getByText('Attest Document Review')).toBeTruthy();
    });

    const attestButton = screen.getByText('Attest Document Review');
    await act(async () => {
      fireEvent.click(attestButton);
    });

    await waitFor(() => {
      expect(mockUpdateProject).toHaveBeenCalledWith('project-1', expect.objectContaining({
        closingRoom: expect.objectContaining({
          lawyerVerified: true,
          verifiedByUid: 'user-123',
          verifiedByName: 'Bob',
          verifiedRole: 'Lead Investor',
          verifiedAt: expect.any(String)
        })
      }));
    });

    expect(mockUpdateClosingRoom).toHaveBeenCalledWith('project-1', expect.objectContaining({
      lawyerVerified: true,
      verifiedByUid: 'user-123',
      verifiedByName: 'Bob',
      verifiedRole: 'Lead Investor',
      verifiedAt: expect.any(String)
    }));

    expect(toast.success).toHaveBeenCalledWith('Document review successfully attested!', expect.any(Object));
  });

  it('completes closing successfully and archives documents, then marks F5 cards complete', async () => {
    const mockUpdateProject = projectsService.updateProject as jest.Mock;

    mockProjects[0] = {
      id: 'project-1',
      propertyName: 'Miami Oasis',
      address: '123 Ocean Drive, Miami, FL 33139',
      organizationId: 'org-123',
      completedFundCards: ['F1.1'],
      members: {
        'user-123': { role: 'Lead Investor', addedAt: new Date() }
      },
      financials: {
        purchasePrice: 250000,
        finalClosingCosts: 5000,
        finalPrepaidsReserves: 1500,
        totalCashInvested: 25000,
        emdAmount: 500000,
        capitalStack: [
          { id: '1', category: 'Private Money', amount: 251500, status: 'Approved' }
        ]
      },
      closingRoom: {
        titleInsuranceUrl: 'https://example.com/title.pdf',
        closingDisclosureUrl: 'https://example.com/disclosure.pdf',
        wiringInstructionsUrl: 'https://example.com/wiring.pdf',
        assignedLawyerUid: 'lawyer-1',
        lawyerVerified: true,
        blockchainTxHash: null,
        chainOfTitleStatus: 'verified',
        closingStatus: 'signed',
        actualClosingDate: '2026-07-19',
        executedDocs: {
          deedUrl: 'https://example.com/executed-deed.pdf',
          deedSigned: true,
          noteUrl: null,
          noteSigned: false,
          settlementStatementUrl: 'https://example.com/executed-settlement.pdf',
          settlementStatementSigned: true,
          titlePolicyUrl: 'https://example.com/executed-title-policy.pdf',
          titlePolicySigned: true,
          entityDocsUrl: 'https://example.com/executed-entity.pdf',
          entityDocsSigned: true,
        },
        disbursementRecorded: true,
        disbursementStatementUrl: 'https://example.com/disbursement.pdf',
        deedRecordingCounty: 'Orange County',
        deedRecordingDate: '2026-07-19',
        deedRecordingInstrumentNumber: 'Book 123 Page 45'
      }
    };

    await act(async () => {
      render(<ClosingRoomModal projectId="project-1" onClose={jest.fn()} />);
    });

    // Wait for the complete closing button to render
    await waitFor(() => {
      expect(screen.getByText('Archive Package & Complete Closing')).toBeTruthy();
    });

    const completeButton = screen.getByText('Archive Package & Complete Closing');
    await act(async () => {
      fireEvent.click(completeButton);
    });

    // Verify projectsService.updateProject is called with completedFundCards including F5.1 through F5.6
    await waitFor(() => {
      expect(mockUpdateProject).toHaveBeenCalledWith('project-1', expect.objectContaining({
        completedFundCards: expect.arrayContaining([
          'F1.1', 'F5.1', 'F5.2', 'F5.3', 'F5.4', 'F5.5', 'F5.6'
        ])
      }));
    });

    expect(toast.success).toHaveBeenCalledWith('Closing execution completed and archived to Project Files!', expect.any(Object));
  });
});
