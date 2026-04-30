import React, { useState } from 'react';
import { RehabExpense, RehabExpenseCategory } from '@/types/schema';
import { Plus, Receipt, Trash2, Check, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

interface RehabExpenseTrackerProps {
  expenses: RehabExpense[];
  onChange: (expenses: RehabExpense[]) => void;
  totalBudget?: number;
}

const CATEGORIES: RehabExpenseCategory[] = ['Demo', 'Systems', 'Interior', 'Exterior', 'Material', 'Professional Labor', 'Permits', 'Dumpster Rental', 'Other'];

export function RehabExpenseTracker({ expenses, onChange, totalBudget = 0 }: RehabExpenseTrackerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newExpense, setNewExpense] = useState<Partial<RehabExpense>>({
    category: 'Demo',
    description: '',
    amount: 0,
    vendor: '',
    paid: false,
  });

  const handleAdd = () => {
    if (!newExpense.description || !newExpense.amount) {
      toast.error('Description and amount are required');
      return;
    }

    const expense: RehabExpense = {
      id: crypto.randomUUID(),
      category: newExpense.category as RehabExpenseCategory,
      description: newExpense.description,
      amount: Number(newExpense.amount),
      vendor: newExpense.vendor || '',
      paid: newExpense.paid || false,
      paidAt: newExpense.paid ? new Date() : undefined,
      createdAt: new Date(),
    };

    onChange([...expenses, expense]);
    setIsAdding(false);
    setNewExpense({ category: 'Demo', description: '', amount: 0, vendor: '', paid: false });
    toast.success('Expense added');
  };

  const handleDelete = (id: string) => {
    onChange(expenses.filter(e => e.id !== id));
    toast.success('Expense removed');
  };

  const togglePaid = (id: string, currentPaid: boolean) => {
    onChange(expenses.map(e => 
      e.id === id ? { ...e, paid: !currentPaid, paidAt: !currentPaid ? new Date() : undefined } : e
    ));
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPaid = expenses.filter(e => e.paid).reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="p-6 rounded-lg shadow-sm border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Receipt className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Rehab Expenses</h2>
        </div>
        <div className="text-right">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total: <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>${totalExpenses.toLocaleString()}</span></p>
          <p className="text-xs text-green-600">Paid: ${totalPaid.toLocaleString()}</p>
          {totalBudget > 0 && (
            <p className="text-xs mt-1 font-medium text-orange-600">
              Contingency Buffer (15%): ${(totalBudget * 0.15).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {expenses.map(expense => (
          <div key={expense.id} className="p-4 rounded-md border flex items-center justify-between" style={{ borderColor: 'var(--border-ui)' }}>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => togglePaid(expense.id, expense.paid)}
                className={`p-2 rounded-full border flex-shrink-0 ${expense.paid ? 'bg-green-100 border-green-500 text-green-600' : 'bg-gray-50 border-gray-300 text-transparent hover:border-green-500'}`}
                title={expense.paid ? 'Mark unpaid' : 'Mark paid'}
              >
                <Check className="w-4 h-4" />
              </button>
              <div>
                <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>{expense.description}</h4>
                <div className="flex items-center gap-2 text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs border border-blue-200">
                    {expense.category}
                  </span>
                  {expense.vendor && <span>&middot; {expense.vendor}</span>}
                  {expense.paid && <span className="text-green-600">&middot; Paid</span>}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
                ${expense.amount.toLocaleString()}
              </div>
              <div className="flex items-center gap-2">
                {expense.receiptUrl && (
                  <a href={expense.receiptUrl} target="_blank" rel="noreferrer" className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="View Receipt">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                <button onClick={() => handleDelete(expense.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete Expense">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {expenses.length === 0 && !isAdding && (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>
            No rehab expenses recorded yet.
          </div>
        )}

        {isAdding && (
          <div className="p-4 rounded-md border border-blue-200 bg-blue-50 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700">Category</label>
                <select
                  value={newExpense.category}
                  onChange={e => setNewExpense({...newExpense, category: e.target.value as RehabExpenseCategory})}
                  className="w-full px-3 py-2 rounded-md border bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium mb-1 text-gray-700">Description</label>
                <input
                  type="text"
                  placeholder="e.g., Lowe's Framing Lumber"
                  value={newExpense.description}
                  onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                  className="w-full px-3 py-2 rounded-md border bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700">Amount ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newExpense.amount || ''}
                  onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})}
                  className="w-full px-3 py-2 rounded-md border bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700">Vendor (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Home Depot"
                  value={newExpense.vendor}
                  onChange={e => setNewExpense({...newExpense, vendor: e.target.value})}
                  className="w-full px-3 py-2 rounded-md border bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-700 pb-2">
                  <input
                    type="checkbox"
                    checked={newExpense.paid}
                    onChange={e => setNewExpense({...newExpense, paid: e.target.checked})}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Mark as Paid
                </label>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                Save Expense
              </button>
            </div>
          </div>
        )}

        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full py-3 rounded-md border-2 border-dashed flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
            style={{ borderColor: 'var(--border-ui)', color: 'var(--text-secondary)' }}
          >
            <Plus className="w-4 h-4" />
            <span className="font-medium text-sm">Add Expense</span>
          </button>
        )}
      </div>
    </div>
  );
}
