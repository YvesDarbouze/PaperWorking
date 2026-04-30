import React from 'react';
import { ProjectFinancials } from '@/types/schema';
import { DollarSign, Save } from 'lucide-react';

interface DispositionLedgerProps {
  financials: ProjectFinancials;
  onChange: (updated: Partial<ProjectFinancials>) => void;
  onSave: () => void;
  isSaving: boolean;
  isLocked?: boolean;
}

export function DispositionLedger({ financials, onChange, onSave, isSaving, isLocked }: DispositionLedgerProps) {
  const grossFinalSalePrice = financials.actualSalePrice || 0;
  const stagingCosts = financials.stagingCosts || 0;
  const photographyAndMedia = financials.photographyAndMedia || 0;
  const mlsListingFees = financials.mlsListingFees || 0;
  const utilityUpkeep = financials.utilityUpkeep || 0;
  const landscapingMaintenance = financials.landscapingMaintenance || 0;

  const totalDispositionCosts = stagingCosts + photographyAndMedia + mlsListingFees + utilityUpkeep + landscapingMaintenance;

  const handleCurrencyChange = (field: keyof ProjectFinancials, value: string) => {
    if (isLocked) return;
    const numericValue = parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
    onChange({ [field]: numericValue });
  };

  return (
    <div className="rounded-xl border p-8 shadow-sm" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Final Expense Tracker
          </h2>
          <p className="text-sm font-medium mt-1" style={{ color: 'var(--text-secondary)' }}>
            Costs incurred after rehab is finished but before the sale closes.
          </p>
        </div>
        {!isLocked && (
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all shadow-sm hover:opacity-90"
            style={{ 
              backgroundColor: 'var(--text-primary)', 
              color: 'var(--bg-surface)',
              opacity: isSaving ? 0.7 : 1
            }}
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Ledger'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-secondary)' }}>
              Gross Final Sale Price
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                disabled={isLocked}
                value={grossFinalSalePrice ? grossFinalSalePrice.toLocaleString() : ''}
                onChange={(e) => handleCurrencyChange('actualSalePrice', e.target.value)}
                className="block w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-black focus:border-black sm:text-sm font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--bg-canvas)', borderColor: 'var(--border-ui)' }}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-secondary)' }}>
              Staging Costs
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                disabled={isLocked}
                value={stagingCosts ? stagingCosts.toLocaleString() : ''}
                onChange={(e) => handleCurrencyChange('stagingCosts', e.target.value)}
                className="block w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-black focus:border-black sm:text-sm font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--bg-canvas)', borderColor: 'var(--border-ui)' }}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-secondary)' }}>
              Photography & Media
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                disabled={isLocked}
                value={photographyAndMedia ? photographyAndMedia.toLocaleString() : ''}
                onChange={(e) => handleCurrencyChange('photographyAndMedia', e.target.value)}
                className="block w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-black focus:border-black sm:text-sm font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--bg-canvas)', borderColor: 'var(--border-ui)' }}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-secondary)' }}>
              MLS/Listing Fees
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                disabled={isLocked}
                value={mlsListingFees ? mlsListingFees.toLocaleString() : ''}
                onChange={(e) => handleCurrencyChange('mlsListingFees', e.target.value)}
                className="block w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-black focus:border-black sm:text-sm font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--bg-canvas)', borderColor: 'var(--border-ui)' }}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-secondary)' }}>
              Utility Upkeep
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                disabled={isLocked}
                value={utilityUpkeep ? utilityUpkeep.toLocaleString() : ''}
                onChange={(e) => handleCurrencyChange('utilityUpkeep', e.target.value)}
                className="block w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-black focus:border-black sm:text-sm font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--bg-canvas)', borderColor: 'var(--border-ui)' }}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-secondary)' }}>
              Landscaping Maintenance
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                disabled={isLocked}
                value={landscapingMaintenance ? landscapingMaintenance.toLocaleString() : ''}
                onChange={(e) => handleCurrencyChange('landscapingMaintenance', e.target.value)}
                className="block w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-black focus:border-black sm:text-sm font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--bg-canvas)', borderColor: 'var(--border-ui)' }}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <div className="p-8 rounded-xl border flex flex-col justify-center space-y-6 bg-gray-50/50" style={{ borderColor: 'var(--border-ui)' }}>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-gray-500 mb-1">Gross Sale Price</p>
            <p className="text-2xl font-bold text-gray-900">${grossFinalSalePrice.toLocaleString()}</p>
          </div>
          
          <div className="h-px bg-gray-200 w-full" />

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-red-500 mb-1">Total Final Expenses</p>
            <p className="text-2xl font-bold text-red-500">-${totalDispositionCosts.toLocaleString()}</p>
          </div>

          <div className="h-px bg-gray-200 w-full" />

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-1">Net Proceeds Before Payoffs</p>
            <p className="text-4xl font-black tracking-tight text-gray-900">${(grossFinalSalePrice - totalDispositionCosts).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
