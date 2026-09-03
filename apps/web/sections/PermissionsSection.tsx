'use client';

import React from 'react';

interface RoleCard {
  title: string;
  description: string;
  icon: string;
  iconColor: string;
}

const ROLES: RoleCard[] = [
  {
    title: 'Lead Investor',
    description: 'Controls deal pipeline, phase assignments, and global financial permissions.',
    icon: 'admin_panel_settings',
    iconColor: '#FBBF24', // amber-400
  },
  {
    title: 'Partners & Teammates',
    description: 'Work assigned phases with full visibility into relevant deal milestones.',
    icon: 'group',
    iconColor: '#38BDF8', // sky-400
  },
  {
    title: 'CPAs & Advisors',
    description: 'View-only ledger access to audit financial data and pull tax exports without altering active records.',
    icon: 'menu_book',
    iconColor: '#A78BFA', // violet-400
  },
  {
    title: 'Vendors & Contractors',
    description: 'Restricted access limited strictly to assigned scope, draw requests, and invoice submissions.',
    icon: 'engineering',
    iconColor: '#FB923C', // orange-400
  },
];

export default function PermissionsSection() {
  return (
    <section className="relative overflow-hidden py-16 md:py-24 border-t border-white/5">
      <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="mb-2.5 font-[family-name:var(--font-jetbrains-mono)] text-[12px] font-semibold uppercase tracking-[0.12em] text-[#00DD94]">
            PERMISSIONS & GOVERNANCE
          </p>
          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Role-Based Security for Every Stakeholder
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map((role) => (
            <div
              key={role.title}
              className="glass-card flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-[12px] transition-all duration-300 hover:border-white/20"
            >
              <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-xl bg-white/[0.04] border border-white/5">
                <span
                  className="material-symbols-outlined text-[28px]"
                  style={{ color: role.iconColor, fontVariationSettings: "'FILL' 1" }}
                >
                  {role.icon}
                </span>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">{role.title}</h3>
              <p className="text-sm leading-relaxed text-white/60 flex-grow">
                {role.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
