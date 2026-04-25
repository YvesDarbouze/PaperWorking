'use client';

import React from 'react';
import { Shield, Lock, Globe } from 'lucide-react';

/**
 * SecurityBadges
 *
 * Trust-building footer bar with SSL, SOC 2, and GDPR compliance badges.
 * Builds the 'Consistency & Security' trust required by Guideline 10.
 * Strict PaperWorking monochrome palette.
 */

const badges = [
  {
    icon: Lock,
    label: 'SSL Encrypted',
    detail: '256-bit TLS encryption on all data in transit',
  },
  {
    icon: Shield,
    label: 'SOC 2 Type II',
    detail: 'Audited security controls for data protection',
  },
  {
    icon: Globe,
    label: 'GDPR Compliant',
    detail: 'Full European data privacy regulation adherence',
  },
];

export default function SecurityBadges() {
  return (
    <section className="bg-bg-surface border-t border-phase-1" aria-label="Security certifications">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-8">
        {/* Title */}
        <p className="text-center text-xs font-bold uppercase tracking-[0.25em] text-phase-2 mb-6">
          Enterprise-Grade Security
        </p>

        {/* Badge grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-phase-1">
          {badges.map((badge, i) => {
            const Icon = badge.icon;
            return (
              <div
                key={badge.label}
                className={`flex items-center space-x-4 px-6 py-5 ${
                  i < badges.length - 1 ? 'border-b md:border-b-0 md:border-r border-phase-1' : ''
                }`}
              >
                <div className="w-10 h-10 bg-dashboard flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-phase-4" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-bold text-text-primary">{badge.label}</p>
                  <p className="text-xs text-phase-3 mt-0.5">{badge.detail}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Fine print */}
        <p className="text-center text-xs text-phase-2 mt-4">
          All data encrypted at rest (AES-256) and in transit (TLS 1.3). Annual SOC 2 Type II audit by independent third party.
        </p>
      </div>
    </section>
  );
}
