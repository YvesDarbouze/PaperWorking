/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ESignAction from '../components/shared/ESignAction';
import { processDocument } from '../lib/ocr/documentAIProcessor';
import DataRoomPage from '../app/dashboard/data-room/page';
import toast from 'react-hot-toast';

// Mock jsPDF and jspdf-autotable
const mockSave = jest.fn();
const mockText = jest.fn();
const mockLine = jest.fn();
const mockSetFontSize = jest.fn();
const mockSetTextColor = jest.fn();
const mockSetDrawColor = jest.fn();
const mockSetLineWidth = jest.fn();

jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => {
    return {
      save: mockSave,
      text: mockText,
      line: mockLine,
      setFontSize: mockSetFontSize,
      setTextColor: mockSetTextColor,
      setDrawColor: mockSetDrawColor,
      setLineWidth: mockSetLineWidth,
    };
  });
});

jest.mock('jspdf-autotable', () => {
  return jest.fn();
});

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  loading: jest.fn(() => 'toast-id'),
  success: jest.fn(),
  error: jest.fn(),
}));

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

// Mock useAllDealsSync
jest.mock('@/hooks/useAllProjectsSync', () => ({
  useAllDealsSync: jest.fn(),
}));

// Mock useProjectStore with a default mock state
const mockProjects = [
  {
    id: 'project-1',
    propertyName: 'Miami Oasis',
    address: '123 Ocean Drive, Miami, FL 33139',
    strategyType: 'buy-and-hold',
    currentPhase: 'Closing',
    financials: {
      purchasePrice: 200000,
      loanAmount: 150000,
      estimatedARV: 250000,
      monthlyRent: 2000,
      operatingExpenseTaxes: 150,
      operatingExpenseInsurance: 100,
      operatingExpenseMaint: 200,
      operatingExpenseOther: 100,
      numberOfUnits: 1,
      occupiedUnits: 1,
    },
  },
];

jest.mock('@/store/projectStore', () => ({
  useProjectStore: (selector: any) => selector({
    projects: mockProjects,
  }),
}));

describe('Deferred Integrations and PDF Export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('E-Signatures (ESignAction)', () => {
    it('is honestly disabled and labeled as coming soon', () => {
      const onSigned = jest.fn();
      render(
        <ESignAction
          documentName="Test Doc"
          signeeRole="Lead Investor"
          onSigned={onSigned}
          isSigned={false}
        />
      );

      const button = screen.getByRole('button') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      expect(button.textContent).toContain('E-Sign Coming Soon');
      expect(button.getAttribute('title')).toBe('E-Signature integration (DocuSign/HelloSign) coming soon');
    });

    it('renders signed state if already signed', () => {
      const onSigned = jest.fn();
      render(
        <ESignAction
          documentName="Test Doc"
          signeeRole="Lead Investor"
          onSigned={onSigned}
          isSigned={true}
        />
      );

      expect(screen.queryByRole('button')).toBeNull();
      expect(screen.getByText('Signed (Lead Investor)')).toBeTruthy();
    });

    it('has no simulated timer or success feedback', () => {
      const onSigned = jest.fn();
      render(
        <ESignAction
          documentName="Test Doc"
          signeeRole="Lead Investor"
          onSigned={onSigned}
          isSigned={false}
        />
      );

      const button = screen.getByRole('button') as HTMLButtonElement;
      fireEvent.click(button);

      // Verify no toast success or state change occurred
      expect(toast.success).not.toHaveBeenCalled();
      expect(onSigned).not.toHaveBeenCalled();
    });
  });

  describe('Document AI / OCR', () => {
    it('returns an honest failure instead of faked mock data', async () => {
      const result = await processDocument('path/to/doc.pdf', 'closing_disclosure', 'application/pdf');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Google Document AI integration is coming soon.');
      expect(result.extractedFields).toEqual({});
      expect(result.overallConfidence).toBe(0);
    });
  });

  describe('Data Room PDF Export', () => {
    it('generates a real PDF report using jsPDF when clicked', async () => {
      render(<DataRoomPage />);

      const pdfButton = screen.getByText('Generate PDF Report') as HTMLButtonElement;
      expect(pdfButton).toBeTruthy();
      expect(pdfButton.disabled).toBeFalsy();

      fireEvent.click(pdfButton);

      // Verify it invoked jsPDF methods to build and save the PDF
      const jsPDFMock = require('jspdf');
      expect(jsPDFMock).toHaveBeenCalled();
      expect(mockSave).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('Generated PDF Report: data-room-'),
        expect.any(Object)
      );
    });
  });
});
