import React from 'react';
import { ProjectFinancials } from '@/types/schema';
import { DollarSign, Save } from 'lucide-react';

interface SettlementLedgerProps {
  financials: ProjectFinancials;
  onChange: (updated: Partial<ProjectFinancials>) => void;
  onSave: () => void;
  isSaving: boolean;
  isLocked?: boolean;
}

export function SettlementLedger({ financials, onChange, onSave, isSaving, isLocked }: SettlementLedgerProps) {
  const grossFinalSalePrice = financials.actualSalePrice || 0;
  const hardMoneyPrincipalPayoff = financials.hardMoneyPrincipalPayoff || 0;
  const privateLenderPayoff = financials.privateLenderPayoff || 0;
  const agentCommissionsFixed = financials.agentCommissionsFixed || 0;
  const sellerConcessionsFixed = financials.sellerConcessionsFixed || 0;
  const finalClosingAttorneyFees = financials.finalClosingAttorneyFees || 0;
  const loanOriginationFeesSettlement = financials.loanOriginationFeesSettlement || 0;
  const titleInsuranceSettlement = financials.titleInsuranceSettlement || 0;

  const totalDebtAndClosingPayouts = 
    hardMoneyPrincipalPayoff + 
    privateLenderPayoff + 
    agentCommissionsFixed + 
    sellerConcessionsFixed + 
    finalClosingAttorneyFees +
    loanOriginationFeesSettlement +
    titleInsuranceSettlement;

  const handleCurrencyChange = (field: keyof ProjectFinancials, value: string) => {
    if (isLocked) return;
    const numericValue = parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
    onChange({ [field]: numericValue });
  };

  return (
    <section className="rounded-[8px] border overflow-hidden mt-8" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}>
      {/* ── Header ── */}
      <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-ui)' }}>
        <div>
          <h3 className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Settlement Ledger
          </h3>
          <p className="text-[10px] uppercase tracking-[0.15em] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            Lender Payoffs & Closing Payouts
          </p>
        </div>
        {!isLocked && (
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all hover:shadow-sm"
            style={{ 
              backgroundColor: 'var(--bg-canvas)', 
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-ui)'
            }}
          >
            {isSaving ? (
              <div className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--text-primary)', borderTopColor: 'transparent' }} />
            ) : (
              <Save className="w-3 h-3" />
            )}
            {isSaving ? 'Settling' : 'Save Settlement'}
          </button>
        )}
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* ── Left Side: Inputs ── */}
        <div className="lg:col-span-3 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
              <DollarSign className="w-3 h-3" /> Gross Final Sale Price
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-xs font-medium text-[#A5A5A5]">$</span>
              </div>
              <input
                type="text"
                disabled={isLocked}
                value={grossFinalSalePrice ? grossFinalSalePrice.toLocaleString() : ''}
                onChange={(e) => handleCurrencyChange('actualSalePrice', e.target.value)}
                className="w-full bg-transparent text-sm pl-7 pr-4 py-2.5 rounded-[8px] focus:outline-none transition-all font-bold disabled:opacity-50"
                style={{ border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#7F7F7F]">Hard Money Principal Payoff</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-xs font-medium text-[#A5A5A5]">$</span>
                </div>
                <input
                  type="text"
                  disabled={isLocked}
                  value={hardMoneyPrincipalPayoff ? hardMoneyPrincipalPayoff.toLocaleString() : ''}
                  onChange={(e) => handleCurrencyChange('hardMoneyPrincipalPayoff', e.target.value)}
                  className="w-full bg-transparent text-sm pl-7 pr-4 py-2.5 rounded-[8px] focus:outline-none transition-all disabled:opacity-50"
                  style={{ border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#7F7F7F]">Private Lender Payoff</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-xs font-medium text-[#A5A5A5]">$</span>
                </div>
                <input
                  type="text"
                  disabled={isLocked}
                  value={privateLenderPayoff ? privateLenderPayoff.toLocaleString() : ''}
                  onChange={(e) => handleCurrencyChange('privateLenderPayoff', e.target.value)}
                  className="w-full bg-transparent text-sm pl-7 pr-4 py-2.5 rounded-[8px] focus:outline-none transition-all disabled:opacity-50"
                  style={{ border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#7F7F7F]">Agent Commissions</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-xs font-medium text-[#A5A5A5]">$</span>
                </div>
                <input
                  type="text"
                  disabled={isLocked}
                  value={agentCommissionsFixed ? agentCommissionsFixed.toLocaleString() : ''}
                  onChange={(e) => handleCurrencyChange('agentCommissionsFixed', e.target.value)}
                  className="w-full bg-transparent text-sm pl-7 pr-4 py-2.5 rounded-[8px] focus:outline-none transition-all disabled:opacity-50"
                  style={{ border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#7F7F7F]">Seller Concessions</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-xs font-medium text-[#A5A5A5]">$</span>
                </div>
                <input
                  type="text"
                  disabled={isLocked}
                  value={sellerConcessionsFixed ? sellerConcessionsFixed.toLocaleString() : ''}
                  onChange={(e) => handleCurrencyChange('sellerConcessionsFixed', e.target.value)}
                  className="w-full bg-transparent text-sm pl-7 pr-4 py-2.5 rounded-[8px] focus:outline-none transition-all disabled:opacity-50"
                  style={{ border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#7F7F7F]">Final Attorney Fees</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-xs font-medium text-[#A5A5A5]">$</span>
                </div>
                <input
                  type="text"
                  disabled={isLocked}
                  value={finalClosingAttorneyFees ? finalClosingAttorneyFees.toLocaleString() : ''}
                  onChange={(e) => handleCurrencyChange('finalClosingAttorneyFees', e.target.value)}
                  className="w-full bg-transparent text-sm pl-7 pr-4 py-2.5 rounded-[8px] focus:outline-none transition-all disabled:opacity-50"
                  style={{ border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#7F7F7F]">Other Closing Fees</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-xs font-medium text-[#A5A5A5]">$</span>
                </div>
                <input
                  type="text"
                  disabled={isLocked}
                  value={(loanOriginationFeesSettlement + titleInsuranceSettlement) ? (loanOriginationFeesSettlement + titleInsuranceSettlement).toLocaleString() : ''}
                  onChange={(e) => handleCurrencyChange('titleInsuranceSettlement', e.target.value)}
                  className="w-full bg-transparent text-sm pl-7 pr-4 py-2.5 rounded-[8px] focus:outline-none transition-all disabled:opacity-50"
                  style={{ border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Side: Analytics ── */}
        <div className="lg:col-span-2 p-8 rounded-[8px] border flex flex-col justify-center space-y-8" 
             style={{ backgroundColor: '#F9F9F9', borderColor: 'var(--border-ui)' }}>
          
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#7F7F7F] mb-1">Gross Sale Price</p>
            <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
              ${grossFinalSalePrice.toLocaleString()}
            </p>
          </div>
          
          <div className="h-px bg-[#E5E5E5] w-full" />

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#B91C1C] mb-2">Total Debt & Closing Payouts</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black tracking-tight text-[#B91C1C]">
                -${totalDebtAndClosingPayouts.toLocaleString()}
              </span>
            </div>
            <p className="text-[10px] mt-4 font-medium leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              Total obligations including hard money principal, private lender returns, and transactional closing fees.
            </p>
          </div>

          <div className="pt-6 border-t" style={{ borderColor: '#E5E5E5' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#7F7F7F] mb-1">Net Proceeds Forecast</p>
            <p className="text-2xl font-black" style={{ color: '#15803D' }}>
              ${(grossFinalSalePrice - totalDebtAndClosingPayouts).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

