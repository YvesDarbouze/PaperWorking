/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DocumentVault } from '../components/project/DocumentVault';
import type { RoleLinkedDocument } from '@/types/schema';

// Mock Auth and Firebase Services
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'user-123', displayName: 'Jane Doe', email: 'jane@example.com' } }),
}));

jest.mock('@/lib/firebase/config', () => ({
  storage: {},
  auth: {
    currentUser: {
      getIdToken: jest.fn().mockResolvedValue('token-123')
    }
  }
}));

jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytesResumable: jest.fn(() => ({
    on: jest.fn((state, onProgress, onError, onSuccess) => {
      // Simulate progress callback
      onProgress({ bytesTransferred: 50, totalBytes: 100 });
      onProgress({ bytesTransferred: 100, totalBytes: 100 });
      onSuccess();
    }),
    snapshot: {
      ref: {}
    }
  })),
  getDownloadURL: jest.fn().mockResolvedValue('http://mockurl.com/file.pdf'),
  deleteObject: jest.fn().mockResolvedValue(true)
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

const mockDocs: RoleLinkedDocument[] = [
  {
    id: 'doc-1',
    category: 'Deed',
    fileName: 'Deed_Final.pdf',
    fileUrl: 'http://mockurl.com/deed.pdf',
    linkedRole: 'Closing Agent',
    verified: false,
    notes: '',
    uploadedAt: new Date('2026-07-01')
  },
  {
    id: 'doc-2',
    category: 'Title Policy',
    fileName: 'Title_Policy.pdf',
    fileUrl: 'http://mockurl.com/title.pdf',
    linkedRole: 'Closing Agent',
    verified: false,
    notes: '',
    uploadedAt: new Date('2026-07-02')
  }
];

describe('PermanentRecordArchive Component via DocumentVault', () => {
  it('renders all canonical archiving categories correctly', () => {
    const categories: any[] = ['Deed', 'Title Policy', 'Closing Sets', 'Warranties', 'Tax Documents'];
    
    render(
      <DocumentVault
        projectId="proj-archive-123"
        documents={mockDocs}
        categories={categories}
        title="Permanent Record Archive"
        description="Store deed, title policy, closing sets, warranties, and tax documents for the project's permanent history."
      />
    );

    // Verify Title and Description
    expect(screen.getByText('Permanent Record Archive')).toBeDefined();
    expect(screen.getByText("Store deed, title policy, closing sets, warranties, and tax documents for the project's permanent history.")).toBeDefined();

    // Verify categories rendered
    expect(screen.getByText('Deed')).toBeDefined();
    expect(screen.getByText('Title Policy')).toBeDefined();
    expect(screen.getByText('Closing Sets')).toBeDefined();
    expect(screen.getByText('Warranties')).toBeDefined();
    expect(screen.getByText('Tax Documents')).toBeDefined();

    // Verify documents rendered inside their respective columns
    expect(screen.getByText('Deed_Final.pdf')).toBeDefined();
    expect(screen.getByText('Title_Policy.pdf')).toBeDefined();
  });

  it('triggers delete callback correctly', async () => {
    const categories: any[] = ['Deed', 'Title Policy'];
    const mockChange = jest.fn();

    render(
      <DocumentVault
        projectId="proj-archive-123"
        documents={mockDocs}
        categories={categories}
        onChange={mockChange}
      />
    );

    // Click delete on mock doc 1 (Deed_Final.pdf)
    // Find delete buttons. In our DOM list, delete button has aria-label="Delete" or SVG
    const deleteBtns = screen.getAllByLabelText('Delete');
    
    await act(async () => {
      fireEvent.click(deleteBtns[0]);
    });

    // Should call onChange filtering out mock doc 1
    expect(mockChange).toHaveBeenCalledWith([mockDocs[1]]);
  });
});
