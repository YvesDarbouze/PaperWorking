import React, { useState } from 'react';
import { HoldingCostEntry, HoldingCostType } from '@/types/schema';
import { Plus, Calculator, Trash2, Droplet, Shield, Home, DollarSign, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

interface HoldingCostsTrackerProps {
  holdingCosts: HoldingCostEntry[];
  onChange: (costs: HoldingCostEntry[]) => void;
  daysHeld: number;
}

const CATEGORY_CONFIG: { type: HoldingCostType; label: string; icon: React.ElementType }[] = [
  { type: 'Loan Interest', label: 'Loan Interest', icon: DollarSign },
  { type: 'Utilities', label: 'Utilities', icon: Droplet },
  { type: 'Insurance', label: 'Insurance', icon: Shield },
  { type: 'Property Tax', label: 'Property Taxes', icon: Home },
  { type: 'HOA', label: 'HOA', icon: Home },
];

export function HoldingCostsTracker({ holdingCosts, onChange, daysHeld }: HoldingCostsTrackerProps) {
  const [addingToCategory, setAddingToCategory] = useState<HoldingCostType | null>(null);
  const [newCost, setNewCost] = useState<Partial<HoldingCostEntry>>({
    monthlyAmount: 0,
    monthsPaid: 0,
    totalMonths: 3,
    notes: '',
  });

  const handleAdd = (type: HoldingCostType) => {
    if (!newCost.monthlyAmount || newCost.totalMonths === undefined) {
      toast.error('Monthly amount and total months are required');
      return;
    }

    const cost: HoldingCostEntry = {
      id: crypto.randomUUID(),
      type,
      monthlyAmount: Number(newCost.monthlyAmount),
      monthsPaid: Number(newCost.monthsPaid) || 0,
      totalMonths: Number(newCost.totalMonths),
      notes: newCost.notes || '',
    };

    onChange([...holdingCosts, cost]);
    setAddingToCategory(null);
    setNewCost({ monthlyAmount: 0, monthsPaid: 0, totalMonths: 3, notes: '' });
    toast.success(`${type} added`);
  };

  const handleDelete = (id: string) => {
    onChange(holdingCosts.filter(c => c.id !== id));
    toast.success('Cost removed');
  };

  // Calculations
  const monthlyTotal = holdingCosts.reduce((sum, c) => sum + c.monthlyAmount, 0);
  const estimatedTotal = holdingCosts.reduce((sum, c) => sum + (c.monthlyAmount * c.totalMonths), 0);
  const accruedTotal = holdingCosts.reduce((sum, c) => sum + ((c.monthlyAmount / 30) * daysHeld), 0);

  // Identify any other costs that don't match the strict 4 (legacy data)
  const legacyCosts = holdingCosts.filter(c => !CATEGORY_CONFIG.some(config => config.type === c.type));

  return (
    <div className="p-6 rounded-lg shadow-sm border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}>
      <div className="flex items-center justify-between mb-8 pb-4 border-b" style={{ borderColor: 'var(--border-ui)' }}>
        <div className="flex items-center gap-3">
          <Calculator className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Recurring Capital Drain</h2>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-red-600 uppercase tracking-wide">Monthly Burn Rate</p>
          <h3 className="text-2xl font-bold font-mono text-red-700">${monthlyTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          <p className="text-xs text-gray-500 mt-1">Est. Total Liability: ${estimatedTotal.toLocaleString()}</p>
        </div>
      </div>

      <div className="space-y-8">
        {CATEGORY_CONFIG.map(({ type, label, icon: Icon }) => {
          const categoryCosts = holdingCosts.filter(c => c.type === type);
          const isAdding = addingToCategory === type;

          return (
            <div key={type} className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border-ui)' }}>
              <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-ui)' }}>
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-gray-500" />
                  <h3 className="font-semibold text-gray-800">{label}</h3>
                  <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">{categoryCosts.length} items</span>
                </div>
                {!isAdding && (
                  <button
                    onClick={() => {
                      setAddingToCategory(type);
                      setNewCost({ monthlyAmount: 0, monthsPaid: 0, totalMonths: 3, notes: '' });
                    }}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add {label}
                  </button>
                )}
              </div>

              <div className="p-4 bg-white space-y-4">
                {categoryCosts.length === 0 && !isAdding && (
                  <div className="text-center py-4 text-sm text-gray-400 italic">
                    No {label.toLowerCase()} tracked.
                  </div>
                )}

                {categoryCosts.map(cost => {
                  const accruedAmount = (cost.monthlyAmount / 30) * daysHeld;
                  const estimatedCostTotal = cost.monthlyAmount * cost.totalMonths;
                  const progressPercentage = estimatedCostTotal > 0 ? Math.min(100, (accruedAmount / estimatedCostTotal) * 100) : 0;
                  
                  return (
                    <div key={cost.id} className="p-4 rounded-md border flex flex-col gap-3 hover:border-blue-200 transition-colors bg-white shadow-sm" style={{ borderColor: 'var(--border-ui)' }}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-gray-900">${cost.monthlyAmount.toLocaleString()}<span className="text-sm font-normal text-gray-500">/mo</span></div>
                          {cost.notes && <p className="text-xs text-gray-500 mt-1">{cost.notes}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <button onClick={() => handleDelete(cost.id)} className="text-gray-400 hover:text-red-500 transition-colors" title="Remove">
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            ${(cost.monthlyAmount * cost.totalMonths).toLocaleString()} Total
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-3 mt-1 border-t flex items-center justify-between gap-4" style={{ borderColor: 'var(--border-ui)' }}>
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-medium text-gray-700">Accrued ({daysHeld} days)</span>
                            <span className="font-medium text-blue-600">Accrued: ${accruedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full transition-all duration-300" 
                              style={{ width: `${progressPercentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {isAdding && (
                  <div className="p-4 rounded-md border border-blue-200 bg-blue-50 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Plus className="w-4 h-4 text-blue-600" />
                      <h4 className="text-sm font-semibold text-blue-800">New {label} Entry</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium mb-1 text-gray-700">Monthly Amt ($)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={newCost.monthlyAmount || ''}
                          onChange={e => setNewCost({...newCost, monthlyAmount: Number(e.target.value)})}
                          className="w-full px-3 py-2 rounded-md border bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1 text-gray-700">Est. Total Months</label>
                        <input
                          type="number"
                          min="1"
                          value={newCost.totalMonths || ''}
                          onChange={e => setNewCost({...newCost, totalMonths: Number(e.target.value)})}
                          className="w-full px-3 py-2 rounded-md border bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-700">Notes (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g., Account #123456, Lender Name"
                        value={newCost.notes}
                        onChange={e => setNewCost({...newCost, notes: e.target.value})}
                        className="w-full px-3 py-2 rounded-md border bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                      />
                    </div>
                    
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        onClick={() => setAddingToCategory(null)}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleAdd(type)}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm"
                      >
                        Save Entry
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {legacyCosts.length > 0 && (
          <div className="border rounded-lg overflow-hidden border-orange-200">
            <div className="bg-orange-50 px-4 py-3 border-b border-orange-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-orange-600" />
              <h3 className="font-semibold text-orange-800">Legacy / Other Costs</h3>
              <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">{legacyCosts.length} items</span>
            </div>
            <div className="p-4 bg-white space-y-4">
              {legacyCosts.map(cost => (
                <div key={cost.id} className="p-4 rounded-md border flex flex-col gap-3 bg-white shadow-sm" style={{ borderColor: 'var(--border-ui)' }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-gray-900">{cost.type} - ${cost.monthlyAmount.toLocaleString()}<span className="text-sm font-normal text-gray-500">/mo</span></div>
                      {cost.notes && <p className="text-xs text-gray-500 mt-1">{cost.notes}</p>}
                    </div>
                    <button onClick={() => handleDelete(cost.id)} className="text-gray-400 hover:text-red-500 transition-colors" title="Remove">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {holdingCosts.length > 0 && (
         <div className="mt-8 pt-6 border-t flex justify-between items-center text-sm" style={{ borderColor: 'var(--border-ui)' }}>
           <div className="flex flex-col gap-1">
             <span className="text-gray-500 font-medium">Total Accrued to Date</span>
             <span className="text-xl font-bold text-gray-900">${accruedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
           </div>
           <div className="flex flex-col gap-1 text-right">
             <span className="text-gray-500 font-medium">Remaining Liability</span>
             <span className="text-xl font-bold text-red-600">${Math.max(0, estimatedTotal - accruedTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
           </div>
         </div>
      )}
    </div>
  );
}
