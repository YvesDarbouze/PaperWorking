import React, { useState, useMemo, useEffect } from 'react';
import CurrencyInputModule from './CurrencyInputModule';
import { CostBasisLedger, CostBasisLineItem } from '@/types/schema';

interface ClosingCostsLedgerProps {
  initialLedger?: CostBasisLedger;
  onChange?: (ledger: CostBasisLedger, totalClosingCosts: number) => void;
  readOnly?: boolean;
}

export function ClosingCostsLedger({ initialLedger, onChange, readOnly = false }: ClosingCostsLedgerProps) {
  // Extract initial values if any
  const getInitialValue = (category: keyof CostBasisLedger, label: string) => {
    if (!initialLedger || !initialLedger[category]) return 0;
    const item = initialLedger[category].find(i => i.label === label);
    return item ? item.amount * 100 : 0; // convert to cents for input
  };

  const [attorneyFees, setAttorneyFees] = useState(() => getInitialValue('directAcquisition', 'Attorney Fees'));
  const [loanOriginationFees, setLoanOriginationFees] = useState(() => getInitialValue('financing', 'Loan Origination Fees'));
  const [titleInsurance, setTitleInsurance] = useState(() => getInitialValue('directAcquisition', 'Title Insurance'));

  // Aggregation Logic
  const totalClosingCostsCents = useMemo(() => {
    return attorneyFees + loanOriginationFees + titleInsurance;
  }, [attorneyFees, loanOriginationFees, titleInsurance]);

  const totalClosingCostsDollars = totalClosingCostsCents / 100;

  useEffect(() => {
    if (onChange) {
      // Build a basic ledger to pass up, preserving existing items where possible
      const existingAcquisition = initialLedger?.directAcquisition || [];
      const existingFinancing = initialLedger?.financing || [];

      const updateOrAddItem = (list: CostBasisLineItem[], id: string, label: string, amount: number): CostBasisLineItem => {
        const existing = list.find(i => i.label === label);
        return existing ? { ...existing, amount } : { id, label, amount, paid: false, notes: '' };
      };

      const ledger: CostBasisLedger = {
        directAcquisition: [
          ...existingAcquisition.filter(i => i.label !== 'Attorney Fees' && i.label !== 'Title Insurance'),
          updateOrAddItem(existingAcquisition, 'attorney-fees', 'Attorney Fees', attorneyFees / 100),
          updateOrAddItem(existingAcquisition, 'title-insurance', 'Title Insurance', titleInsurance / 100)
        ],
        financing: [
          ...existingFinancing.filter(i => i.label !== 'Loan Origination Fees'),
          updateOrAddItem(existingFinancing, 'loan-origination', 'Loan Origination Fees', loanOriginationFees / 100)
        ],
        preClosing: initialLedger?.preClosing || []
      };
      onChange(ledger, totalClosingCostsDollars);
    }
  }, [attorneyFees, loanOriginationFees, titleInsurance, onChange, totalClosingCostsDollars]);

  return (
    <div className="p-6 rounded-lg shadow-sm border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}>
      <div className="mb-6">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Closing Costs Ledger</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Track mandatory acquisition fees and closing costs.
        </p>
      </div>

      <div className="space-y-6">
        <CurrencyInputModule
          label="Attorney Fees"
          tooltipText="Legal fees associated with the real estate transaction and contract review."
          initialValue={attorneyFees}
          onChange={setAttorneyFees}
          readOnly={readOnly}
        />
        
        <CurrencyInputModule
          label="Loan Origination Fees"
          tooltipText="Upfront fees charged by the lender to process the new loan."
          initialValue={loanOriginationFees}
          onChange={setLoanOriginationFees}
          readOnly={readOnly}
        />
        
        <CurrencyInputModule
          label="Title Insurance"
          tooltipText="Insurance policy to protect against challenges to the ownership of the property."
          initialValue={titleInsurance}
          onChange={setTitleInsurance}
          readOnly={readOnly}
        />

        <div className="pt-6 mt-6 border-t flex justify-between items-center" style={{ borderColor: 'var(--border-ui)' }}>
          <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Total Closing Costs</span>
          <span className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            ${totalClosingCostsDollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}
