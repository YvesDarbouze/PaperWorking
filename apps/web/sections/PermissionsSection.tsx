'use client';

import React from 'react';
import { User, Users, FileText, Gear } from '@/components/icons/PhosphorIcons';

interface RoleCard {
  title: string;
  description: string;
  Icon: React.ComponentType<{ className?: string; size?: number | string }>;
}

const ROLES: RoleCard[] = [
  {
    title: 'Lead Investor',
    description: 'Controls deal pipeline, phase assignments, and global financial permissions.',
    Icon: User,
  },
  {
    title: 'Partners & Teammates',
    description: 'Work assigned phases with full visibility into relevant deal milestones.',
    Icon: Users,
  },
  {
    title: 'CPAs & Advisors',
    description: 'View-only ledger access to audit financial data and pull tax exports without altering active records.',
    Icon: FileText,
  },
  {
    title: 'Vendors & Contractors',
    description: 'Restricted access limited strictly to assigned scope, draw requests, and invoice submissions.',
    Icon: Gear,
  },
];

export default function PermissionsSection() {
  return (
    <section className="relative overflow-hidden py-12 md:py-16 border-t border-border">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 md:px-8">
        <div className="text-center mb-12">
          <p className="mb-2.5 text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">
            PERMISSIONS &amp; GOVERNANCE
          </p>
          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Role-Based Security for Every Stakeholder
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map((role) => (
            <div
              key={role.title}
              className="flex flex-col rounded-lg border border-border bg-card p-6 transition-colors hover:border-foreground/20"
            >
              <div className="mb-4 flex items-center justify-center size-10 rounded-md bg-muted text-foreground border border-border">
                <role.Icon size={20} className="text-foreground" />
              </div>
              <h3 className="mb-2 text-base font-semibold text-foreground">{role.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground flex-grow">
                {role.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
