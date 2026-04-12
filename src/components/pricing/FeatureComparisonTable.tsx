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
  lawyer: boolean | string;
}

/* ─── Top 5 Decision-Maker Features (always visible) ─── */
const decisionFeatures: Feature[] = [
  { name: 'Unlimited Property Tracking', individual: true, team: true, lawyer: false },
  { name: 'Full 4-Phase Lifecycle Kanban', individual: true, team: true, lawyer: false },
  {
    name: 'Role-based Access Control',
    tooltip: 'Granular permissions that restrict what each team member can see, edit, or approve — isolating sensitive financials from Contractors.',
    individual: false,
    team: true,
    lawyer: false,
  },
  { name: 'Localized Deal Request Pipeline', individual: false, team: false, lawyer: true },
  {
    name: 'Google Drive Provisioning',
    tooltip: 'Automatically creates a structured folder tree (Closing Docs, Receipts, Permits) in Google Drive for every new deal.',
    individual: false,
    team: true,
    lawyer: false,
  },
];

/* ─── Extended Features (collapsed by default) ─── */
const extendedFeatures: Feature[] = [
  { name: 'Engine Room Ledger', individual: true, team: true, lawyer: false },
  { name: 'Standard Financial Reports', individual: true, team: true, lawyer: false },
  { name: 'Holding Cost Clock', individual: true, team: true, lawyer: false },
  { name: 'Team Invites (Agents, GCs)', individual: false, team: true, lawyer: false },
  { name: 'Advanced Vendor Management', individual: false, team: true, lawyer: false },
  { name: 'Title Search & Verification', individual: false, team: false, lawyer: true },
  { name: 'Closing Room Document Access', individual: false, team: false, lawyer: true },
  {
    name: 'Escrow Integration & APIs',
    tooltip: 'Direct escrow API connection that streamlines fund disbursement and title verification within the deal lifecycle.',
    individual: false,
    team: true,
    lawyer: true,
  },
  {
    name: 'SSO / SAML Authentication',
    tooltip: 'Single Sign-On lets your team log in using your organization\'s identity provider (Okta, Azure AD, Google Workspace).',
    individual: false,
    team: true,
    lawyer: false,
  },
  { name: 'White-Glove Onboarding', individual: false, team: true, lawyer: false },
];

type TierKey = 'individual' | 'team' | 'lawyer';

const tierColumns: { key: TierKey; label: string; price: string; cta: string; planLabel: string }[] = [
  { key: 'individual', label: 'Individual', price: '$59/mo', cta: 'Start free trial', planLabel: 'Individual Monthly' },
  { key: 'team', label: 'Team', price: '$99/mo', cta: 'Deploy your team', planLabel: 'Team Monthly' },
  { key: 'lawyer', label: 'Lawyer', price: '$59/mo', cta: 'Join the network', planLabel: 'Lawyer Monthly' },
];

function FeatureRow({ feature }: { feature: Feature }) {
  return (
    <tr className="hover:bg-dashboard/50 transition-colors">
      <td className="py-4 px-4 sm:px-6 font-medium text-phase-4 text-sm">
        <span className="inline-flex items-center">
          {feature.name}
          {feature.tooltip && <FeatureTooltip text={feature.tooltip} />}
        </span>
      </td>
      {tierColumns.map(({ key }) => {
        const val = feature[key];
        return (
          <td key={key} className={`py-4 px-3 sm:px-6 text-center ${key === 'team' ? 'bg-dashboard/50' : ''}`}>
            {val === true ? (
              <Check className="w-4 h-4 sm:w-5 sm:h-5 mx-auto text-phase-4" />
            ) : typeof val === 'string' ? (
              <span className="text-xs font-medium text-phase-3">{val}</span>
            ) : (
              <Minus className="w-4 h-4 sm:w-5 sm:h-5 mx-auto text-phase-1" />
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
        <h2 className="text-3xl font-medium tracking-tight text-black">Compare all capabilities.</h2>
        <p className="text-sm text-phase-3 mt-2">Every plan is built for a specific role. Find yours.</p>
      </div>

      <div className="min-w-[580px] border border-phase-1 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-dashboard text-[10px] sm:text-xs uppercase tracking-widest text-phase-3 font-bold border-b border-phase-1">
              <th className="py-5 px-4 sm:px-6 font-semibold">Platform Feature</th>
              {tierColumns.map(({ key, label, price }) => (
                <th key={key} className={`py-5 px-3 sm:px-6 font-semibold text-center w-28 sm:w-36 ${key === 'team' ? 'bg-phase-1/30' : ''}`}>
                  {label}
                  <span className="block text-[10px] text-phase-2 font-medium mt-0.5 normal-case tracking-normal">{price}</span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-dashboard text-sm text-phase-4">
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
          className="w-full flex items-center justify-center py-4 text-sm font-semibold text-phase-3 hover:text-phase-4 hover:bg-dashboard transition-colors border-t border-dashboard group"
        >
          {expanded ? 'Show fewer features' : `See all features (${decisionFeatures.length + extendedFeatures.length})`}
          <ChevronDown
            className={`w-4 h-4 ml-2 transition-transform duration-200 ${expanded ? 'rotate-180' : ''} group-hover:text-phase-4`}
          />
        </button>
      </div>

      {/* ── Frictionless Action: Repeated CTAs ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 max-w-3xl mx-auto">
        {tierColumns.map(({ key, label, price, cta, planLabel }) => (
          <button
            key={key}
            onClick={() => onSelectPlan(planLabel)}
            className={`
              py-3.5 text-sm font-medium transition-all active:scale-[0.97]
              ${key === 'team'
                ? 'bg-black text-white hover:bg-phase-4 shadow-sm'
                : 'bg-dashboard text-phase-4 hover:bg-phase-1 border border-phase-1'
              }
            `}
          >
            {cta}
            <span className="block text-[10px] font-medium mt-0.5 opacity-60 normal-case">{label} · {price}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
