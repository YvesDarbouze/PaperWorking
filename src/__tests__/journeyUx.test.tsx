/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ApiErrorCard } from '@/components/ui/ApiErrorCard';
import { DocumentUploadCard } from '@/components/project/DocumentUploadCard';
import { JourneyProgressHeader } from '@/components/project/JourneyProgressHeader';
import toast from 'react-hot-toast';

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

describe('PROMPT 7 — REIL Journey UX Hardening Unit Suite', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Standardized ApiErrorCard & Retry Button', () => {
    it('renders inline error card with title, description, and retry button', () => {
      const handleRetry = jest.fn();
      render(
        <ApiErrorCard
          title="Network Connection Failed"
          message="Could not reach property API service."
          onRetry={handleRetry}
        />
      );

      const card = screen.getByTestId('api-error-card');
      expect(card).toBeDefined();
      expect(card.textContent).toContain('Network Connection Failed');
      expect(card.textContent).toContain('Could not reach property API service.');

      const retryBtn = screen.getByTestId('retry-btn');
      expect(retryBtn).toBeDefined();

      fireEvent.click(retryBtn);
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('2. Optimistic UI DocumentUploadCard & 500 Rollback', () => {
    it('shows optimistic file row instantly upon file selection and reconciles on success', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, docId: 'doc_123' }),
      } as Response);

      render(
        <DocumentUploadCard
          projectId="project_1"
          category="Inspection Disclosures"
          uploadUrl="/api/projects/project_1/documents"
        />
      );

      const fileInput = screen.getByTestId('file-upload-input');
      const testFile = new File(['test content'], 'inspection_report.pdf', { type: 'application/pdf' });

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [testFile] } });
      });

      // Instant optimistic file row
      const optimisticRow = screen.getByTestId('optimistic-file-row');
      expect(optimisticRow).toBeDefined();
      expect(optimisticRow.textContent).toContain('inspection_report.pdf');

      await waitFor(() => {
        expect(screen.getByTestId('upload-status').textContent).toContain('Complete');
      });

      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Uploaded inspection_report.pdf'));
    });

    it('rolls back optimistic file row and displays error toast on 500 failure', async () => {
      let rejectFetch: (val: Partial<Response>) => void = () => {};
      global.fetch = jest.fn().mockImplementationOnce(() => new Promise((resolve) => {
        rejectFetch = () => resolve({ ok: false, status: 500 });
      }));

      render(
        <DocumentUploadCard
          projectId="project_1"
          category="Title Search"
          uploadUrl="/api/projects/project_1/documents"
        />
      );

      const fileInput = screen.getByTestId('file-upload-input');
      const testFile = new File(['fail content'], 'corrupted_title.pdf', { type: 'application/pdf' });

      act(() => {
        fireEvent.change(fileInput, { target: { files: [testFile] } });
      });

      // Instantly present while fetch is pending
      expect(screen.getByTestId('optimistic-file-row')).toBeDefined();

      // Trigger failure
      await act(async () => {
        rejectFetch({ ok: false, status: 500 });
      });

      // Rollback after failure
      await waitFor(() => {
        expect(screen.queryByTestId('optimistic-file-row')).toBeNull();
      });

      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Failed to upload corrupted_title.pdf'));
    });
  });

  describe('3. JourneyProgressHeader Nodes & Skip-to-Exit Path', () => {
    it('renders 4 phase nodes, highlighting active phase and allowing completed node clicks', () => {
      render(<JourneyProgressHeader projectId="project_1" currentPhase={2} />);

      const header = screen.getByTestId('journey-progress-header');
      expect(header).toBeDefined();

      // Phase 1 should be completed (clickable link)
      const phase1Link = screen.getByRole('link', { name: /Phase 1: Acquisition/i });
      expect(phase1Link.getAttribute('href')).toBe('/dashboard/projects/project_1');

      // Phase 2 should be active current phase
      expect(header.textContent).toContain('Phase 2: Fund');
    });

    it('supports skip-to-exit path by highlighting Phase 4 when currentPhase is 4', () => {
      render(<JourneyProgressHeader projectId="project_1" currentPhase={4} />);

      const header = screen.getByTestId('journey-progress-header');
      expect(header).toBeDefined();
      expect(header.textContent).toContain('Phase 4: Exit');
    });
  });
});
