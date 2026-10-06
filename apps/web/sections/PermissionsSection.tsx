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
          <p className="mb-3 text-[11px] font-[family-name:var(--font-jetbrains-mono)] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
            PERMISSIONS &amp; GOVERNANCE
          </p>
          <h2 className="mx-auto max-w-2xl text-2xl sm:text-3xl md:text-4xl font-semibold tracking-[-0.025em] text-foreground text-balance">
            Role-Based Security for Every Stakeholder
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map((role) => (
            <div
              key={role.title}
              className="flex flex-col rounded-none border border-border bg-card p-6 shadow-sm ring-1 ring-foreground/10 text-card-foreground transition-colors hover:border-foreground/20"
            >
              <div className="mb-4 flex items-center justify-center size-10 rounded-none bg-muted/40 text-foreground border border-border">
                <role.Icon size={20} className="text-foreground" />
              </div>
              <h3 className="mb-2 text-base sm:text-[17px] font-semibold tracking-tight text-foreground">{role.title}</h3>
              <p className="text-sm leading-[1.65] text-muted-foreground flex-grow">
                {role.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
