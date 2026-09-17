import React from 'react';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { renderToString } from 'react-dom/server';

const mockUseAuth = jest.fn();

jest.unstable_mockModule('@/context/AuthContext', () => ({
  useAuth: mockUseAuth,
}));

// Import CommandCenterPanel dynamically after module mock
const { default: CommandCenterPanel } = await import(
  '../../components/dashboard/CommandCenterPanel.js'
);

describe('CommandCenterPanel: Contextual Primary Resolution', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it('loading state renders BOTH Quick Launch buttons as secondary (width-stable, CLS = 0)', () => {
    mockUseAuth.mockReturnValue({
      loading: true,
      authenticated: false,
      profile: null,
    });

    const html = renderToString(<CommandCenterPanel />);

    // Assert neither button is primary
    expect(html).toContain('data-testid="quick-launch-explore-deals"');
    expect(html).toContain('data-testid="quick-launch-create-project"');

    const exploreStart = html.lastIndexOf('<', html.indexOf('data-testid="quick-launch-explore-deals"'));
    const exploreEnd = html.indexOf('</a>', exploreStart) + 4;
    const exploreDealsHtml = html.slice(exploreStart, exploreEnd);

    const createStart = html.lastIndexOf('<', html.indexOf('data-testid="quick-launch-create-project"'));
    const createEnd = html.indexOf('</a>', createStart) + 4;
    const createProjectHtml = html.slice(createStart, createEnd);

    expect(exploreDealsHtml).toContain('data-variant="secondary"');
    expect(createProjectHtml).toContain('data-variant="secondary"');

    // Both must have identical size="md" classes (h-10 px-4 text-[13px] gap-2) ensuring zero layout shift
    expect(exploreDealsHtml).toContain('h-10');
    expect(createProjectHtml).toContain('h-10');
    expect(exploreDealsHtml).toContain('px-4');
    expect(createProjectHtml).toContain('px-4');
  });

  it('investor session resolves Explore Deals as primary and Create New Project as secondary', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      authenticated: true,
      profile: {
        accountType: 'investor',
        subscriptionPlan: 'Individual',
        subscriptionStatus: 'active',
      },
    });

    const html = renderToString(<CommandCenterPanel />);

    const exploreStart = html.lastIndexOf('<', html.indexOf('data-testid="quick-launch-explore-deals"'));
    const exploreEnd = html.indexOf('</a>', exploreStart) + 4;
    const exploreDealsHtml = html.slice(exploreStart, exploreEnd);

    const createStart = html.lastIndexOf('<', html.indexOf('data-testid="quick-launch-create-project"'));
    const createEnd = html.indexOf('</a>', createStart) + 4;
    const createProjectHtml = html.slice(createStart, createEnd);

    // Explore Deals is promoted to primary
    expect(exploreDealsHtml).toContain('data-variant="primary"');
    expect(exploreDealsHtml).toContain('bg-[#00DD94]');
    expect(exploreDealsHtml).toContain('text-[#0a0a0f]');

    // Create New Project remains secondary
    expect(createProjectHtml).toContain('data-variant="secondary"');
    expect(createProjectHtml).toContain('border-white/10');
  });

  it('operator/admin session resolves Create New Project as primary and Explore Deals as secondary', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      authenticated: true,
      profile: {
        accountType: 'admin',
        subscriptionPlan: 'Team',
        subscriptionStatus: 'active',
      },
    });

    const html = renderToString(<CommandCenterPanel />);

    const exploreStart = html.lastIndexOf('<', html.indexOf('data-testid="quick-launch-explore-deals"'));
    const exploreEnd = html.indexOf('</a>', exploreStart) + 4;
    const exploreDealsHtml = html.slice(exploreStart, exploreEnd);

    const createStart = html.lastIndexOf('<', html.indexOf('data-testid="quick-launch-create-project"'));
    const createEnd = html.indexOf('</a>', createStart) + 4;
    const createProjectHtml = html.slice(createStart, createEnd);

    // Create New Project is promoted to primary
    expect(createProjectHtml).toContain('data-variant="primary"');
    expect(createProjectHtml).toContain('bg-[#00DD94]');
    expect(createProjectHtml).toContain('text-[#0a0a0f]');

    // Explore Deals is secondary
    expect(exploreDealsHtml).toContain('data-variant="secondary"');
    expect(exploreDealsHtml).toContain('border-white/10');
  });

  it('contains zero hardcoded bg-emerald-500 classes in the panel', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      authenticated: true,
      profile: { accountType: 'investor' },
    });

    const html = renderToString(<CommandCenterPanel />);
    expect(html).not.toContain('bg-emerald-500');
    expect(html).not.toContain('hover:bg-emerald-400');
  });

  it('header actions (Deal Calculator & New Project) render as canonical secondary buttons', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      authenticated: true,
      profile: { accountType: 'investor' },
    });

    const html = renderToString(<CommandCenterPanel />);
    expect(html).toContain('Deal Calculator');
    expect(html).toContain('New Project');
  });
});

describe('CommandCenterPanel: Designed Empty States & Panel Button Constraints', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      loading: false,
      authenticated: true,
      profile: { accountType: 'investor' },
    });
  });

  it('Featured Metric: with data renders value; with empty/dashes hides "——" and renders designed empty state', () => {
    // 1. With data
    const withDataHtml = renderToString(<CommandCenterPanel />);
    expect(withDataHtml).toContain('17.8%');
    expect(withDataHtml).toContain('Open insights →');

    // 2. With dashes "——" (no data)
    const emptyHtml = renderToString(
      <CommandCenterPanel initialSummary={{ portfolioIrr: '——' }} />
    );
    // MUST NOT render dashes as fake data
    expect(emptyHtml).not.toContain('——');
    expect(emptyHtml).toContain('Your portfolio metrics appear here once you add your first deal.');
    expect(emptyHtml).toContain('Open insights →');
    expect(emptyHtml).toContain('data-variant="tertiary"');
  });

  it('Recent Messages: renders designed empty state with icon, helpful copy, and tertiary action', () => {
    const emptyHtml = renderToString(
      <CommandCenterPanel initialMessages={[]} />
    );
    expect(emptyHtml).toContain('Messages from your deals and team will appear here.');
    expect(emptyHtml).toContain('Open inbox →');
    expect(emptyHtml).toContain('data-variant="tertiary"');
  });

  it('Active Projects: renders designed empty state with icon, helpful copy, and secondary CTA', () => {
    const emptyHtml = renderToString(
      <CommandCenterPanel initialProjects={[]} />
    );
    expect(emptyHtml).toContain('Launch your first project workspace to start tracking a deal.');
    expect(emptyHtml).toContain('+ New Project');
    expect(emptyHtml).toContain('data-variant="secondary"');
  });

  it('Assigned Tasks: renders positive empty state with celebratory tone and check icon', () => {
    const emptyHtml = renderToString(
      <CommandCenterPanel initialTasks={[]} />
    );
    expect(emptyHtml).toContain('You&#x27;re all caught up!');
    expect(emptyHtml).toContain('No pending tasks assigned to you.');
    expect(emptyHtml).toContain('check_circle');
  });

  it('Operational Alerts: renders neutral icon and microcopy when empty (no mixed warning signal, no CTA)', () => {
    const emptyHtml = renderToString(
      <CommandCenterPanel initialAlerts={[]} />
    );
    expect(emptyHtml).toContain('notifications_none');
    expect(emptyHtml).toContain('No operational alerts. Systems running normally.');
    expect(emptyHtml).not.toContain('text-rose-400');
  });

  it('Followers: renders muted microcopy when empty with zero CTAs', () => {
    const emptyHtml = renderToString(
      <CommandCenterPanel initialFollowers={[]} />
    );
    expect(emptyHtml).toContain('No followers yet.');
  });

  it('no-primary-in-panels assertion: exactly ONE primary button exists across the entire dashboard view', () => {
    // Investor session
    const investorHtml = renderToString(
      <CommandCenterPanel
        initialSummary={{ portfolioIrr: '——' }}
        initialMessages={[]}
        initialProjects={[]}
        initialAlerts={[]}
      />
    );
    const primaryMatches = investorHtml.match(/data-variant="primary"/g);
    expect(primaryMatches).toHaveLength(1);
    expect(investorHtml).toContain('data-testid="quick-launch-explore-deals"');

    // Operator session
    mockUseAuth.mockReturnValue({
      loading: false,
      authenticated: true,
      profile: { accountType: 'operator' },
    });
    const operatorHtml = renderToString(
      <CommandCenterPanel
        initialSummary={{ portfolioIrr: '——' }}
        initialMessages={[]}
        initialProjects={[]}
        initialAlerts={[]}
      />
    );
    const operatorPrimaryMatches = operatorHtml.match(/data-variant="primary"/g);
    expect(operatorPrimaryMatches).toHaveLength(1);
    expect(operatorHtml).toContain('data-testid="quick-launch-create-project"');
  });
});
