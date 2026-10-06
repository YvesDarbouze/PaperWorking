'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/marketing/Logo';

interface TabDefinition {
  id: string;
  name: string;
  route: string;
  badge: string;
  description: string;
  keyFeatures: string[];
}

const DASHBOARD_TABS: TabDefinition[] = [
  {
    id: 'portfolio',
    name: 'Portfolio',
    route: '/dashboard',
    badge: 'Core Overview',
    description: 'Executive command center with real-time portfolio KPIs, capital deployment, active assets, and institutional terminal.',
    keyFeatures: [
      'Portfolio KPI summary metrics ($4.8M total deployed, $1.2M equity, 18.2% avg IRR)',
      'Active Investments cards with lifecycle progress bars',
      'Quick action buttons: "Launch Calculator", "Add Expense", "New Project"',
      'Interactive Institutional Command Terminal with live model evaluation',
      'REIL phase breakdown (Acquisition, Funding, Holding, Exit)',
    ],
  },
  {
    id: 'projects',
    name: 'Projects',
    route: '/projects',
    badge: 'Lifecycle Hub',
    description: 'Central projects workspace where serious investors manage deals across all 4 REIL stages.',
    keyFeatures: [
      'REIL stage filters: All Projects, Acquisition, Funding, Holding, and Exit',
      'Search projects by title, address, or asset class',
      'Create New Project dialog with initial purchase price and target IRR',
      'Project cards with phase badges, budget status, and closing dates',
      'Direct transition into the project workspace (/projects/[id])',
    ],
  },
  {
    id: 'marketplace',
    name: 'Vendor Directory',
    route: '/dashboard/marketplace',
    badge: 'Network',
    description: 'Institutional vendor directory connecting operators with vetted contractors, lenders, attorneys, and inspectors.',
    keyFeatures: [
      'Specialty filters: General Contractors, Lenders, Title/Escrow, CPAs, Inspectors',
      'Location and service search bar',
      'Vendor detail cards with ratings, verified badges, and verified past deals',
      'Interactive "Contact Vendor" action and profile modal',
      'Save/favorite vendor functionality for active project scopes',
    ],
  },
  {
    id: 'deals',
    name: 'Deals Marketplace',
    route: '/dashboard/deals',
    badge: 'Syndication',
    description: 'Curated deal flow exchange for serious investors: evaluate syndicated opportunities or crowdfund deals.',
    keyFeatures: [
      'Deal cards showing Purchase Price, Projected ROI, Cap Rate, and Funding Progress',
      'Interactive search and asset class filters (Multifamily, Mixed-Use, SFR, Commercial)',
      'Deal Details modal with full financial pro-forma preview',
      'Crowdfund Participation modal with investment allocation inputs',
      'Share Deal modal for sending teaser sheets to investment partners',
    ],
  },
  {
    id: 'insights',
    name: 'Insights',
    route: '/dashboard/insights',
    badge: 'Analytics',
    description: 'Deep performance analytics and 33 institutional KPIs across all lifecycle phases.',
    keyFeatures: [
      'Interactive IRR vs. Cash-on-Cash Return distribution matrices',
      'Asset Allocation breakdown by market and property type',
      'Holding cost velocity and budget-vs-actual variance tracking',
      'Trend Detail modal with interactive timeline charts',
      'Date range picker and performance metric comparisons',
    ],
  },
  {
    id: 'reports',
    name: 'Reports',
    route: '/dashboard/reports',
    badge: 'Tax & Compliance',
    description: 'CPA-ready fiscal oversight, estimated tax schedules, balance sheets, and audit packages.',
    keyFeatures: [
      'Fiscal year and quarter selection tabs',
      'Balance Sheet, Profit & Loss, and Holding Cost variance statements',
      'Depreciation schedule and 1031 Exchange timeline trackers',
      'Export triggers: CPA Tax Package (PDF) and Raw Ledger (CSV)',
      'Auditor note attachments and compliance ledger view',
    ],
  },
  {
    id: 'inbox',
    name: 'Inbox',
    route: '/dashboard/inbox',
    badge: 'Communications',
    description: 'Unified notification and communications center for critical closing dates, tasks, and team updates.',
    keyFeatures: [
      'Filter tabs: All Notifications, Unread, Action Required, System Alerts',
      'Hard contingency countdowns (earnest money, inspection deadlines)',
      'Support ticket status updates and replies from Pepper PaperWorking',
      'Mark as read / archive action triggers',
      'Direct link from notification to associated deal or project milestone',
    ],
  },
  {
    id: 'team',
    name: 'Team',
    route: '/dashboard/team',
    badge: 'Collaboration',
    description: 'Manage investment organization roster, permission tiers, and seat allocation.',
    keyFeatures: [
      'Team member roster showing Role, Department, and Active Projects',
      'Role scopes: Owner, Underwriter, Asset Manager, and Read-Only Viewer',
      '"Invite Team Member" modal with email and role selection',
      'Seat utilization counter and subscription tier indicator',
      'Remove member or modify permission level controls',
    ],
  },
  {
    id: 'profile',
    name: 'Profile',
    route: '/dashboard/profile',
    badge: 'Public Identity',
    description: 'Investor operator credentials, track record provenance, and accreditation status.',
    keyFeatures: [
      'Operator biography, title, and investment focus areas',
      'Track record summary ($ volume closed, lifetime units, average hold time)',
      'Accredited investor certification badge and counterparty verification',
      'Contact preferences and social/corporate link configuration',
      'Interactive "Save Profile" action with validation feedback',
    ],
  },
  {
    id: 'settings',
    name: 'Settings',
    route: '/dashboard/settings',
    badge: 'Configuration',
    description: 'Private workspace configuration: billing, security, notification preferences, and data privacy.',
    keyFeatures: [
      'Section router: General, Security, Billing, and Data Privacy',
      'Billing management: plan details (Individual / Team), renewal dates, payment method',
      'Password update and security session audit',
      'Email notification toggles (Deal alerts, contingency reminders, marketing updates)',
      'Data export and global GDPR/CCPA privacy controls',
    ],
  },
];

export default function DashboardTestHubPage() {
  const [selectedTab, setSelectedTab] = useState<TabDefinition>(DASHBOARD_TABS[0]);
  const [viewportMode, setViewportMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [iframeKey, setIframeKey] = useState(0);

  const getDevLoginUrl = (targetRoute: string) =>
    `/api/dev/login?next=${encodeURIComponent(targetRoute)}&email=investor@paperworking.test&role=investor`;

  const getViewportWidth = () => {
    switch (viewportMode) {
      case 'mobile':
        return '390px';
      case 'tablet':
        return '820px';
      default:
        return '100%';
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] font-sans antialiased">
      {/* Top Test Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#121215]/95 backdrop-blur-md px-4 py-3 sm:px-6">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo href="/dashboard" tone="dashboard" theme="dark" size={20} variant="full" />
            <span className="hidden sm:inline-block text-xs uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              Live Test Hub
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs text-white/60 hidden lg:flex items-center gap-1.5 mr-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Authenticated: <strong className="text-white">investor@paperworking.test</strong> (Individual Plan)
            </div>

            <a
              href={getDevLoginUrl(selectedTab.route)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center text-xs font-semibold px-3 py-2 rounded bg-white text-black hover:bg-white/90 transition-colors shadow-sm min-h-[38px]"
            >
              Open &ldquo;{selectedTab.name}&rdquo; in Full Window &rarr;
            </a>

            <a
              href={getDevLoginUrl('/dashboard')}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center text-xs font-medium px-3 py-2 rounded bg-white/10 hover:bg-white/15 text-white transition-colors border border-white/10 min-h-[38px]"
            >
              Open Dashboard Home
            </a>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Tab Selection Grid */}
        <section className="bg-[#121215] border border-white/10 rounded-xl p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-white/10 gap-2">
            <div>
              <h1 className="text-base font-semibold text-white">Dashboard Tabs (10 Screens)</h1>
              <p className="text-xs text-white/60">
                Click any tab below to inspect its features and load its live interactive screen.
              </p>
            </div>
            <div className="text-xs text-amber-400/90 font-mono">
              Active: {selectedTab.name} ({selectedTab.route})
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {DASHBOARD_TABS.map((tab) => {
              const isSelected = selectedTab.id === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setSelectedTab(tab);
                    setIframeKey((prev) => prev + 1);
                  }}
                  className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all min-h-[58px] ${
                    isSelected
                      ? 'bg-white/10 border-white/30 text-white shadow-sm ring-1 ring-white/20'
                      : 'bg-white/4 border-white/8 text-white/70 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-semibold truncate">{tab.name}</span>
                    <span className="text-[10px] font-mono opacity-60 text-white/50">{tab.route}</span>
                  </div>
                  <span className="text-[10px] text-white/50 truncate w-full mt-1">
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Tab Detail & Testing Checklist */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-[#121215] border border-white/10 rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {selectedTab.badge}
                </span>
                <h2 className="text-xl font-bold text-white mt-1.5">{selectedTab.name}</h2>
                <div className="font-mono text-xs text-white/50">{selectedTab.route}</div>
              </div>
              <a
                href={getDevLoginUrl(selectedTab.route)}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline shrink-0 mt-1"
              >
                Launch Tab &nearr;
              </a>
            </div>

            <p className="text-sm text-white/70 leading-relaxed">
              {selectedTab.description}
            </p>

            <div className="space-y-2 pt-2 border-t border-white/10">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Interactive Elements to Test
              </h3>
              <ul className="space-y-2">
                {selectedTab.keyFeatures.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-white/80 leading-relaxed">
                    <span className="inline-block w-4 h-4 rounded-full bg-white/10 text-white/70 flex-shrink-0 text-center text-[10px] font-bold mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-2">
              <div className="text-[11px] text-white/50">
                Direct URL: <code className="text-white/80 bg-white/5 px-1.5 py-0.5 rounded">http://localhost:3000{selectedTab.route}</code>
              </div>
              <a
                href={getDevLoginUrl(selectedTab.route)}
                target="_blank"
                rel="noreferrer"
                className="block text-center text-xs font-semibold py-2.5 px-4 rounded bg-white text-black hover:bg-white/90 transition-colors"
              >
                Open This Tab in Separate Browser Window &rarr;
              </a>
            </div>
          </div>

          {/* Interactive Live Screen Preview Container */}
          <div className="lg:col-span-2 bg-[#121215] border border-white/10 rounded-xl p-4 flex flex-col">
            {/* Viewport Control Bar */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white/70">Device Frame:</span>
                <div className="flex items-center bg-white/5 rounded p-0.5 border border-white/10">
                  <button
                    onClick={() => setViewportMode('desktop')}
                    className={`text-xs px-2.5 py-1 rounded transition-colors ${
                      viewportMode === 'desktop' ? 'bg-white/20 text-white font-semibold' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Desktop (100%)
                  </button>
                  <button
                    onClick={() => setViewportMode('tablet')}
                    className={`text-xs px-2.5 py-1 rounded transition-colors ${
                      viewportMode === 'tablet' ? 'bg-white/20 text-white font-semibold' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Tablet (820px)
                  </button>
                  <button
                    onClick={() => setViewportMode('mobile')}
                    className={`text-xs px-2.5 py-1 rounded transition-colors ${
                      viewportMode === 'mobile' ? 'bg-white/20 text-white font-semibold' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Mobile (390px)
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIframeKey((prev) => prev + 1)}
                  className="text-xs font-medium px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 transition-colors"
                  title="Reload Live Preview"
                >
                  &#x21bb; Reload
                </button>
                <a
                  href={getDevLoginUrl(selectedTab.route)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 transition-colors"
                >
                  Full Tab &nearr;
                </a>
              </div>
            </div>

            {/* Embedded Live Interactive Frame */}
            <div className="flex-1 min-h-[750px] w-full flex justify-center bg-[#09090b] rounded-lg overflow-hidden border border-white/10 relative">
              <iframe
                key={`${selectedTab.id}-${iframeKey}`}
                src={getDevLoginUrl(selectedTab.route)}
                title={`Live Preview of ${selectedTab.name}`}
                style={{ width: getViewportWidth(), height: '750px' }}
                className="border-0 shadow-2xl transition-all duration-200"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
