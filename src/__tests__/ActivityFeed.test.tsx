/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import ActivityFeed from '../components/dashboard/home/ActivityFeed';

// Mock hooks
let mockActiveTenantId: string | null = 'org-123';
jest.mock('@/context/TenantContext', () => ({
  useTenant: () => ({ activeTenantId: mockActiveTenantId }),
}));

const mockProfile = { displayName: 'Bob', email: 'bob@example.com' };
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ profile: mockProfile, user: { uid: 'user-123' } }),
}));

let mockTheme = 'dark';
jest.mock('@/lib/utils/ThemeProvider', () => ({
  useTheme: () => ({ theme: mockTheme }),
}));

// Mock Firestore onSnapshot
let mockEvents: any[] = [];
let snapshotCallback: any = null;

jest.mock('firebase/firestore', () => {
  const original = jest.requireActual('firebase/firestore');
  return {
    ...original,
    collection: jest.fn(),
    query: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    onSnapshot: jest.fn((queryObj, onSuccess, onError) => {
      snapshotCallback = onSuccess;
      // Immediately call with mockEvents
      onSuccess({
        docs: mockEvents.map((e) => ({
          id: e.id,
          data: () => ({
            type: e.type,
            actorName: e.actorName,
            actorUid: e.actorUid,
            description: e.description,
            projectName: e.projectName,
            projectId: e.projectId,
            createdAt: original.Timestamp.fromDate(e.createdAt),
          }),
        })),
      });
      return jest.fn(); // Unsubscribe mock
    }),
  };
});

describe('ActivityFeed Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEvents = [];
    mockTheme = 'dark';
    mockActiveTenantId = 'org-123';
  });

  it('renders loading state by default', () => {
    // Modify onSnapshot to not trigger immediately
    const { onSnapshot } = require('firebase/firestore');
    onSnapshot.mockImplementationOnce(() => jest.fn());

    render(<ActivityFeed />);
    expect(screen.getByText('Terminal Audit')).toBeTruthy();
  });

  it('renders empty state when there are no events', () => {
    mockEvents = [];
    render(<ActivityFeed />);
    expect(screen.getByText('No activity yet')).toBeTruthy();
    expect(screen.getByText('What generates activity?')).toBeTruthy();
    expect(screen.getByText('Document Uploads')).toBeTruthy();
    expect(screen.getByText('Status & Phase Changes')).toBeTruthy();
    expect(screen.getByText('Deal Intake')).toBeTruthy();
    // Ensure no terminal log elements
    expect(screen.queryByText('[ONLINE]')).toBeNull();
  });

  it('renders events list when events are present', () => {
    mockEvents = [
      {
        id: 'evt-1',
        type: 'deal_created',
        actorName: 'Alice',
        actorUid: 'user-abc',
        description: 'created a new deal',
        projectName: 'Nexus Plaza',
        createdAt: new Date(2026, 5, 11, 12, 0, 0),
      },
    ];

    render(<ActivityFeed />);
    expect(screen.getByText('ALICE:')).toBeTruthy();
    expect(screen.getByText(/created a new deal/i)).toBeTruthy();
    expect(screen.getByText(/for/i)).toBeTruthy();
    expect(screen.getByText('Nexus Plaza')).toBeTruthy();
    expect(screen.getByText('[ONLINE]')).toBeTruthy();
  });
});
