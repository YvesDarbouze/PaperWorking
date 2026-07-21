/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import SyndicationCapTable from '../components/project/SyndicationCapTable';
import type { Project, EquityParty } from '@/types/schema';

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
  loading: jest.fn(),
}));

// Mock Firebase Config
jest.mock('@/lib/firebase/config', () => ({
  db: {}
}));

// Mock Firestore onSnapshot
let onSnapshotCallback: any = null;
let mockCommitments: any[] = [];

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn((queryObj, onSuccess, onError) => {
    onSnapshotCallback = onSuccess;
    // Invoke immediately with the initial commitments
    onSuccess({
      docs: mockCommitments.map(c => ({
        id: c.id,
        data: () => c
      }))
    });
    return jest.fn(); // Return unsubscribe function
  })
}));

const mockProjectBase = {
  id: 'proj_syndication_test',
  propertyName: 'Syndication Straight Split (FX-3)',
  address: '789 Syndicate St, Springfield, IL',
  financials: {
    purchasePrice: 1200000,
    capitalStack: [
      {
        id: 'source_lp',
        category: 'Syndication Equity',
        amount: 900000,
        status: 'Exploring',
        type: 'syndication_equity'
      },
      {
        id: 'source_gp',
        category: 'GP Co-investment',
        amount: 100000,
        status: 'Funded',
        type: 'syndication_equity'
      }
    ]
  }
} as Project;

const mockParties: EquityParty[] = [
  {
    id: 'party_gp_lead',
    projectId: 'proj_syndication_test',
    role: 'GP',
    name: 'Lead GP Investor',
    email: 'gp_lead@paperworking.io',
    entityType: 'Individual',
    ownershipPct: 30,
  },
  {
    id: 'party_lp_1',
    projectId: 'proj_syndication_test',
    role: 'LP',
    name: 'Alice LP',
    email: 'alice@paperworking.io',
    entityType: 'Individual',
    ownershipPct: 40,
  },
  {
    id: 'party_lp_2',
    projectId: 'proj_syndication_test',
    role: 'LP',
    name: 'Bob LP',
    email: 'bob@paperworking.io',
    entityType: 'LLC',
    ownershipPct: 30,
  }
];

describe('Syndication Cap Table Component & Reconciliation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCommitments = [];
    onSnapshotCallback = null;
  });

  it('renders stakeholders and displays targets from the capital stack', () => {
    mockCommitments = [];

    render(
      <SyndicationCapTable
        projectId="proj_syndication_test"
        project={mockProjectBase}
        parties={mockParties}
      />
    );

    // Stakeholders rendered
    expect(screen.getByText('Lead GP Investor')).toBeDefined();
    expect(screen.getByText('Alice LP')).toBeDefined();
    expect(screen.getByText('Bob LP')).toBeDefined();

    // Roles rendered
    expect(screen.getByText('General Partner')).toBeDefined();
    expect(screen.getAllByText('Limited Partner').length).toBe(2);

    // Target totals rendered
    expect(screen.getAllByText('$900,000').length).toBeGreaterThan(0); // LP target
    expect(screen.getAllByText('$100,000').length).toBeGreaterThan(0); // GP target
    expect(screen.getAllByText('$1,000,000').length).toBeGreaterThan(0); // Total required equity
  });

  it('shows gap state when under-committed and LP commitments do not meet target', () => {
    // LP Alice committed $400k (of $900k target)
    mockCommitments = [
      {
        id: 'commit_alice',
        name: 'Alice LP',
        email: 'alice@paperworking.io',
        amountCents: 400000 * 100,
        status: 'signed',
        partyType: 'Investor'
      }
    ];

    render(
      <SyndicationCapTable
        projectId="proj_syndication_test"
        project={mockProjectBase}
        parties={mockParties}
      />
    );

    // Total actual equity = $400k LP + $100k GP = $500k. Gap = $500k.
    expect(screen.getByText(/Funding Gap Detected/)).toBeDefined();
    expect(screen.getByText(/There is an equity shortage of/)).toBeDefined();
    expect(screen.getAllByText(/\$500,000/).length).toBeGreaterThan(0); // Gap amount
  });

  it('shows fully reconciled state when commitments meet target', () => {
    // LP Alice committed $500k, LP Bob committed $400k ($900k target met)
    mockCommitments = [
      {
        id: 'commit_alice',
        name: 'Alice LP',
        email: 'alice@paperworking.io',
        amountCents: 500000 * 100,
        status: 'funds-confirmed',
        partyType: 'Investor'
      },
      {
        id: 'commit_bob',
        name: 'Bob LP',
        email: 'bob@paperworking.io',
        amountCents: 400000 * 100,
        status: 'signed',
        partyType: 'Investor'
      }
    ];

    render(
      <SyndicationCapTable
        projectId="proj_syndication_test"
        project={mockProjectBase}
        parties={mockParties}
      />
    );

    expect(screen.getByText(/Fully Reconciled/)).toBeDefined();
    expect(screen.getByText(/The cap table matches or exceeds the required capital stack target of/)).toBeDefined();
    expect(screen.getAllByText('$900,000').length).toBeGreaterThan(0);
  });

  it('renders GP guidance co-investment chip with correct percentage', () => {
    mockCommitments = [];

    render(
      <SyndicationCapTable
        projectId="proj_syndication_test"
        project={mockProjectBase}
        parties={mockParties}
      />
    );

    // Target = $1,000,000. GP Co-invest = $100,000 (10.0%).
    expect(screen.getByText('GP Co-investment Guidance')).toBeDefined();
    expect(screen.getByText(/10.0%/)).toBeDefined();
  });
});
