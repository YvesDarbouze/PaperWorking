/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CurrentValueTracker } from '../components/project/CurrentValueTracker';
import type { ValuationEntry } from '@/types/schema';

// Setup Mock callbacks
const mockAddValuation = jest.fn();
const mockDeleteValuation = jest.fn();

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

const mockValuations: ValuationEntry[] = [
  { id: 'val-1', date: '2026-07-01', value: 30000000, source: 'user_assumption' }, // $300k
  { id: 'val-2', date: '2026-07-15', value: 33000000, source: 'appraisal', documentUrl: 'url', documentName: 'Appraisal Report' } // $330k
];

describe('CurrentValueTracker in Phase 4', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders currentValue list and calculates appreciation metrics correctly', () => {
    render(
      <CurrentValueTracker
        projectId="proj-val-123"
        currentValue={mockValuations}
        onAddValuation={mockAddValuation}
        onDeleteValuation={mockDeleteValuation}
      />
    );

    // Verify Title & header
    expect(screen.getByText('Current Estimated Value')).toBeDefined();

    // Verify appreciation (earliest: $300k, latest: $330k. appreciation: +10%)
    expect(screen.getByText(/10\.0/i)).toBeDefined();

    // Verify listed items
    expect(screen.getByText('$300,000.00')).toBeDefined();
    expect(screen.getByText('$330,000.00')).toBeDefined();
    expect(screen.getAllByText('Appraisal Report')[0]).toBeDefined();
  });

  it('allows adding a valuation entry', async () => {
    render(
      <CurrentValueTracker
        projectId="proj-val-123"
        currentValue={mockValuations}
        onAddValuation={mockAddValuation}
        onDeleteValuation={mockDeleteValuation}
      />
    );

    const toggleBtn = screen.getByText('+ Add Valuation');
    fireEvent.click(toggleBtn);

    const amountInput = screen.getByPlaceholderText('e.g. 265,000.00');
    const sourceSelect = screen.getByRole('combobox');

    await act(async () => {
      fireEvent.change(amountInput, { target: { value: '350000' } });
      fireEvent.change(sourceSelect, { target: { value: 'user_assumption' } });
    });

    const submitBtn = screen.getByRole('button', { name: 'Add Valuation' });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(mockAddValuation).toHaveBeenCalledWith(
      expect.objectContaining({
        value: 35000000,
        source: 'user_assumption',
      })
    );
  });

  it('allows deleting a valuation entry', async () => {
    render(
      <CurrentValueTracker
        projectId="proj-val-123"
        currentValue={mockValuations}
        onAddValuation={mockAddValuation}
        onDeleteValuation={mockDeleteValuation}
      />
    );

    const deleteVal1Btn = screen.getAllByTitle('Delete Valuation')[0];
    await act(async () => {
      fireEvent.click(deleteVal1Btn);
    });
    // In sorted valuations, the first rendered one is val-2 (July 15, newest first)
    expect(mockDeleteValuation).toHaveBeenCalledWith('val-2');
  });

  it('maps avm to user_assumption with documentName AVM estimate', async () => {
    render(
      <CurrentValueTracker
        projectId="proj-val-123"
        currentValue={mockValuations}
        onAddValuation={mockAddValuation}
        onDeleteValuation={mockDeleteValuation}
      />
    );

    const toggleBtn = screen.getByText('+ Add Valuation');
    fireEvent.click(toggleBtn);

    const amountInput = screen.getByPlaceholderText('e.g. 265,000.00');
    const sourceSelect = screen.getByRole('combobox');

    await act(async () => {
      fireEvent.change(amountInput, { target: { value: '280000' } });
      fireEvent.change(sourceSelect, { target: { value: 'avm' } });
    });

    const submitBtn = screen.getByRole('button', { name: 'Add Valuation' });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(mockAddValuation).toHaveBeenCalledWith(
      expect.objectContaining({
        value: 28000000,
        source: 'user_assumption',
        documentName: 'AVM estimate',
      })
    );
  });

  it('maps appraisals and bpos to document source tag', async () => {
    render(
      <CurrentValueTracker
        projectId="proj-val-123"
        currentValue={mockValuations}
        onAddValuation={mockAddValuation}
        onDeleteValuation={mockDeleteValuation}
      />
    );

    const toggleBtn = screen.getByText('+ Add Valuation');
    fireEvent.click(toggleBtn);

    const amountInput = screen.getByPlaceholderText('e.g. 265,000.00');
    const sourceSelect = screen.getByRole('combobox');

    await act(async () => {
      fireEvent.change(amountInput, { target: { value: '310000' } });
      fireEvent.change(sourceSelect, { target: { value: 'appraisal' } });
    });

    const submitBtn = screen.getByRole('button', { name: 'Add Valuation' });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(mockAddValuation).toHaveBeenCalledWith(
      expect.objectContaining({
        value: 31000000,
        source: 'document',
        documentName: 'Appraisal Report',
      })
    );
  });
});
