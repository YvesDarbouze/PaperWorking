'use client';

import React from 'react';
import { ProjectFinancials } from '@/types/schema';
import { Building2, DollarSign, Mail, Phone, User } from 'lucide-react';

interface RentalSetupFormProps {
  financials?: ProjectFinancials;
  onChange: (updates: Partial<ProjectFinancials>) => void;
}

export function RentalSetupForm({ financials, onChange }: RentalSetupFormProps) {
  return (
    <div className="bg-[var(--bg-surface)] p-8 rounded-xl border border-[var(--border-subtle)] shadow-sm space-y-8 mt-8">
      <div className="border-b border-[var(--border-subtle)] pb-4">
        <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Building2 className="w-6 h-6 text-[var(--text-secondary)]" />
          Rental Strategy Setup
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Configure property management details and target leasing financials for the hold period.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Management Contact Details */}
        <div className="space-y-6">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Property Management</h4>
          
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Company / Manager Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-[var(--text-tertiary)]" />
              </div>
              <input
                type="text"
                value={financials?.propertyManagerName || ''}
                onChange={(e) => onChange({ propertyManagerName: e.target.value })}
                className="block w-full pl-10 pr-3 py-2 border border-[var(--border-strong)] rounded-md focus:ring-black focus:border-black bg-[var(--bg-canvas)]"
                placeholder="e.g. Apex Management"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Phone Number</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-4 w-4 text-[var(--text-tertiary)]" />
              </div>
              <input
                type="tel"
                value={financials?.propertyManagerPhone || ''}
                onChange={(e) => onChange({ propertyManagerPhone: e.target.value })}
                className="block w-full pl-10 pr-3 py-2 border border-[var(--border-strong)] rounded-md focus:ring-black focus:border-black bg-[var(--bg-canvas)]"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-[var(--text-tertiary)]" />
              </div>
              <input
                type="email"
                value={financials?.propertyManagerEmail || ''}
                onChange={(e) => onChange({ propertyManagerEmail: e.target.value })}
                className="block w-full pl-10 pr-3 py-2 border border-[var(--border-strong)] rounded-md focus:ring-black focus:border-black bg-[var(--bg-canvas)]"
                placeholder="contact@apexmanagement.com"
              />
            </div>
          </div>
        </div>

        {/* Financial Targets */}
        <div className="space-y-6">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Leasing Financials</h4>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Target Monthly Rent</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-4 w-4 text-[var(--text-tertiary)]" />
              </div>
              <input
                type="number"
                value={financials?.projectedMonthlyRent || ''}
                onChange={(e) => onChange({ projectedMonthlyRent: parseFloat(e.target.value) || undefined })}
                className="block w-full pl-10 pr-3 py-2 border border-[var(--border-strong)] rounded-md focus:ring-black focus:border-black bg-[var(--bg-canvas)]"
                placeholder="2500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Leasing Fee (Tenant Placement)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-4 w-4 text-[var(--text-tertiary)]" />
              </div>
              <input
                type="number"
                value={financials?.leasingFee || ''}
                onChange={(e) => onChange({ leasingFee: parseFloat(e.target.value) || undefined })}
                className="block w-full pl-10 pr-3 py-2 border border-[var(--border-strong)] rounded-md focus:ring-black focus:border-black bg-[var(--bg-canvas)]"
                placeholder="1250"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Ongoing Mgmt Fee (%)</label>
            <div className="relative">
              <input
                type="number"
                value={financials?.propertyManagementFeePercent || ''}
                onChange={(e) => onChange({ propertyManagementFeePercent: parseFloat(e.target.value) || undefined })}
                className="block w-full pl-3 pr-8 py-2 border border-[var(--border-strong)] rounded-md focus:ring-black focus:border-black bg-[var(--bg-canvas)]"
                placeholder="8"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-[var(--text-tertiary)]">%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
