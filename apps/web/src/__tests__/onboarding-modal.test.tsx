import React from 'react';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { renderToString } from 'react-dom/server';

const mockUseAuth = jest.fn();

jest.unstable_mockModule('@/context/AuthContext', () => ({
  useAuth: mockUseAuth,
}));

// Import dynamically after module mock
const { FirstLoginOnboardingModal } = await import(
  '../../components/onboarding/FirstLoginOnboardingModal.js'
);

describe('FirstLoginOnboardingModal', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it('renders modal content when forceOpen is true for individual investor', () => {
    mockUseAuth.mockReturnValue({
      authenticated: true,
      loading: false,
      profile: {
        accountType: 'investor',
        name: 'Jordan Principal',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&q=80',
        subscriptionPlan: 'Individual',
        subscriptionStatus: 'active',
      },
    });

    const html = renderToString(<FirstLoginOnboardingModal forceOpen={true} />);

    expect(html).toContain('data-testid="first-login-onboarding-modal"');
    expect(html).toContain('Welcome to PaperWorking');
    expect(html).toContain('What is your business name?');
    expect(html).toContain('Do you want to add your business logo?');
    expect(html).toContain('Save &amp; Enter Workspace');
    // Does not show Investment Team tier seat expansion for Individual plan
    expect(html).not.toContain('Investment Team Collaboration Seats');
  });

  it('renders team tier collaboration seat controls when user is on Investment Team tier', () => {
    mockUseAuth.mockReturnValue({
      authenticated: true,
      loading: false,
      profile: {
        accountType: 'team',
        name: 'Alex Operator',
        subscriptionPlan: 'Investment Team',
        subscriptionStatus: 'active',
      },
    });

    const html = renderToString(<FirstLoginOnboardingModal forceOpen={true} />);

    expect(html).toContain('data-testid="first-login-onboarding-modal"');
    expect(html).toContain('Investment Team Tier');
    expect(html).toContain('Investment Team Collaboration Seats');
    expect(html).toContain('Partner');
    expect(html).toContain('Acquisition Analyst');
    expect(html).toContain('data-testid="onboarding-team-invite-email"');
  });

  it('renders null when not forceOpen and not opened yet', () => {
    mockUseAuth.mockReturnValue({
      authenticated: true,
      loading: false,
      profile: null,
    });

    const html = renderToString(<FirstLoginOnboardingModal forceOpen={false} />);
    expect(html).toBe('');
  });
});
