/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { IndicationAggregate } from '@/components/project/IndicationAggregate';
import type { DealInvitation } from '@/types/dealInvitation';
import fs from 'fs';
import path from 'path';

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Coins: () => <div data-testid="coins-icon" />,
}));

describe('DM-35: Indication Aggregation Display', () => {
  const mockInvitations: DealInvitation[] = [
    {
      id: 'inv-1',
      projectId: 'proj-123',
      listingId: 'list-123',
      inviterUid: 'leadInvestor-1',
      inviteeEmail: 'lp1@test.com',
      visibilityMode: 'PRIVATE',
      version: 1,
      status: 'interested',
      createdAt: new Date().toISOString(),
      indication: {
        type: 'amount',
        value: 100000,
        currency: 'USD',
        updatedAt: new Date().toISOString(),
      },
    },
    {
      id: 'inv-2',
      projectId: 'proj-123',
      listingId: 'list-123',
      inviterUid: 'leadInvestor-1',
      inviteeEmail: 'lp2@test.com',
      visibilityMode: 'PRIVATE',
      version: 1,
      status: 'interested',
      createdAt: new Date().toISOString(),
      indication: {
        type: 'amount',
        value: 50000,
        currency: 'EUR',
        updatedAt: new Date().toISOString(),
      },
    },
    {
      id: 'inv-3',
      projectId: 'proj-123',
      listingId: 'list-123',
      inviterUid: 'leadInvestor-1',
      inviteeEmail: 'lp3@test.com',
      visibilityMode: 'PRIVATE',
      version: 1,
      status: 'interested',
      createdAt: new Date().toISOString(),
      indication: {
        type: 'percentage',
        value: 5,
        currency: null,
        updatedAt: new Date().toISOString(),
      },
    },
    {
      id: 'inv-4',
      projectId: 'proj-123',
      listingId: 'list-123',
      inviterUid: 'leadInvestor-1',
      inviteeEmail: 'lp4@test.com',
      visibilityMode: 'PRIVATE',
      version: 1,
      status: 'sent',
      createdAt: new Date().toISOString(),
      indication: null,
    },
  ];

  it('renders total response count, percentage shares, and distinct currencies separately', () => {
    render(<IndicationAggregate invitations={mockInvitations} />);

    // Response count: 3 invitations have indications
    expect(screen.getByText('3')).toBeDefined();

    // Distinct sums
    expect(screen.getByText('USD 100,000')).toBeDefined();
    expect(screen.getByText('EUR 50,000')).toBeDefined();
    expect(screen.getByText('5%')).toBeDefined();

    // Labeled non-binding
    expect(screen.getByText(/non-binding expressions of interest/i)).toBeDefined();
  });

  it('never renders a progress bar or compares against a target', () => {
    const { container } = render(<IndicationAggregate invitations={mockInvitations} />);

    // No html elements representing progress bars
    expect(container.querySelector('.w-full.h-2\\.5')).toBeNull();
    expect(container.querySelector('[role="progressbar"]')).toBeNull();
    expect(screen.queryByText(/target/i)).toBeNull();
    expect(screen.queryByText(/of \$/i)).toBeNull();
  });

  it('guarantees no banned user-facing words are present in the aggregate display codebase', () => {
    const compPath = path.join(process.cwd(), 'src/components/project/IndicationAggregate.tsx');
    const content = fs.readFileSync(compPath, 'utf-8');

    const bannedWords = [
      'funded',
      'raised',
      'committed',
      'closed',
      'subscribed',
      'allocated',
      'remaining',
    ];

    // Find and analyze all text content to verify absolute absence in code logic/text
    for (const word of bannedWords) {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      expect(content).not.toMatch(regex);
    }
  });
});
