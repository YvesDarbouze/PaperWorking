'use client';

import React, { useState } from 'react';
import { Check, Minus, ChevronDown } from 'lucide-react';
import FeatureTooltip from './FeatureTooltip';

interface FeatureComparisonTableProps {
  onSelectPlan: (plan: string) => void;
}

interface Feature {
  name: string;
  tooltip?: string;
  individual: boolean | string;
  team: boolean | string;
  vendor: boolean | string;
}

/* ─── Top 5 Decision-Maker Features (always visible) ─── */
const decisionFeatures: Feature[] = [
  { name: 'Unlimited Property Tracking', individual: true, team: true, vendor: false },
  { name: 'Full 4-Phase Lifecycle Kanban', individual: true, team: true, vendor: false },
  {
    name: 'Role-based Access Control',
    tooltip: 'Granular permissions that restrict what each team member can see, edit, or approve — isolating sensitive financials from Contractors.',
    individual: false,
    team: true,
    vendor: false,
  },
  { name: 'Localized Deal Request Pipeline', individual: false, team: false, vendor: true },
  {
    name: 'Google Drive Provisioning',
    tooltip: 'Automatically creates a structured folder tree (Closing Docs, Receipts, Permits) in Google Drive for every new deal.',
    individual: false,
    team: true,
    vendor: false,
  },
];

/* ─── Extended Features (collapsed by default) ─── */
const extendedFeatures: Feature[] = [
  { name: 'Engine Room Ledger', individual: true, team: true, vendor: false },
  { name: 'Standard Financial Reports', individual: true, team: true, vendor: false },
  { name: 'Holding Cost Clock', individual: true, team: true, vendor: false },
  { name: 'Team Invites (Agents, GCs)', individual: false, team: true, vendor: false },
  { name: 'Advanced Vendor Management', individual: false, team: true, vendor: false },
  { name: 'Title Search & Verification', individual: false, team: false, vendor: true },
  { name: 'Closing Room Document Access', individual: false, team: false, vendor: true },
  {
    name: 'SSO / SAML Authentication',
    tooltip: 'Single Sign-On lets your team log in using your organization\'s identity provider (Okta, Azure AD, Google Workspace).',
    individual: false,
    team: true,
    vendor: false,
  },
  { name: 'White-Glove Onboarding', individual: false, team: true, vendor: false },
];

type TierKey = 'individual' | 'team' | 'vendor';

const tierColumns: { key: TierKey; label: string; price: string; cta: string; planLabel: string }[] = [
  { key: 'individual', label: 'Investor', price: '$59/mo', cta: 'Start free trial', planLabel: 'Investor Monthly' },
  { key: 'team', label: 'Investment Team', price: '$99/mo', cta: 'Deploy your team', planLabel: 'Investment Team Monthly' },
  { key: 'vendor', label: 'Vendor', price: '$39/mo', cta: 'Join the marketplace', planLabel: 'Vendor Marketplace Monthly' },
];

function FeatureRow({ feature }: { feature: Feature }) {
  return (
    <tr className="hover:bg-white/5 transition-colors duration-200 border-b border-pw-border last:border-b-0">
      <td className="py-4 px-4 sm:px-6 font-body-sm text-body-sm font-medium text-pw-black">
        <span className="inline-flex items-center">
          {feature.name}
          {feature.tooltip && <FeatureTooltip text={feature.tooltip} />}
        </span>
      </td>
      {tierColumns.map(({ key }) => {
        const val = feature[key];
        return (
          <td key={key} className={`py-4 px-3 sm:px-6 text-center ${key === 'team' ? 'bg-surface-container-low/20' : ''}`}>
            {val === true ? (
              <Check className="w-4 h-4 sm:w-5 sm:h-5 mx-auto text-pw-black" />
            ) : typeof val === 'string' ? (
              <span className="text-xs font-medium text-pw-muted">{val}</span>
            ) : (
              <Minus className="w-4 h-4 sm:w-5 sm:h-5 mx-auto text-pw-muted/40" />
            )}
          </td>
        );
      })}
    </tr>
  );
}

export default function FeatureComparisonTable({ onSelectPlan }: FeatureComparisonTableProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="w-full max-w-5xl mx-auto my-24 px-4 overflow-x-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-medium tracking-tight text-pw-black">Compare all capabilities.</h2>
        <p className="text-sm text-pw-muted mt-2">Every plan is built for a specific role. Find yours.</p>
      </div>

      <div className="border border-pw-border bg-pw-glass-bg shadow-none overflow-hidden" style={{ minWidth: '580px' }}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-pw-border bg-surface-container-highest/50 backdrop-blur-md">
              <th className="py-5 px-4 sm:px-6 font-label-md text-label-md uppercase tracking-wider text-outline">Platform Feature</th>
              {tierColumns.map(({ key, label, price }) => (
                <th key={key} className={`py-5 px-3 sm:px-6 font-label-md text-label-md uppercase tracking-wider text-outline text-center w-28 sm:w-36 ${key === 'team' ? 'bg-surface-container-high/40' : ''}`}>
                  {label}
                  <span className="block text-xs text-pw-muted font-normal mt-0.5 normal-case tracking-normal font-body-sm">{price}</span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-pw-border text-sm text-pw-black">
            {/* Top 5 always-visible rows */}
            {decisionFeatures.map((feature, idx) => (
              <FeatureRow key={`d-${idx}`} feature={feature} />
            ))}

            {/* Collapsible extended rows */}
            {expanded && extendedFeatures.map((feature, idx) => (
              <FeatureRow key={`e-${idx}`} feature={feature} />
            ))}
          </tbody>
        </table>

        {/* Accordion Toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center py-4 text-xs font-semibold uppercase tracking-wider text-pw-muted hover:text-pw-black hover:bg-white/5 transition-colors border-t border-pw-border group"
        >
          {expanded ? 'Show fewer features' : `See all features (${decisionFeatures.length + extendedFeatures.length})`}
          <ChevronDown
            className={`w-4 h-4 ml-2 transition-transform duration-200 ${expanded ? 'rotate-180' : ''} group-hover:text-pw-black`}
          />
        </button>
      </div>

      {/* ── Frictionless Action: Repeated CTAs ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 max-w-3xl mx-auto">
        {tierColumns.map(({ key, label, price, cta, planLabel }) => (
          <button
            key={key}
            onClick={() => onSelectPlan(planLabel)}
            className={`pw-interactive pw-btn w-full flex flex-col items-center justify-center py-3 px-4 text-xs font-semibold uppercase tracking-wider ${
              key === 'team' ? 'pw-btn--primary' : 'pw-btn--secondary'
            }`}
          >
            <span>{cta}</span>
            <span className="block text-[10px] font-normal mt-0.5 opacity-85 normal-case tracking-normal">{label} · {price}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
