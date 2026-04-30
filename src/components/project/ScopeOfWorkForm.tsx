import React, { useState } from 'react';
import { ScopeOfWorkItem, RehabExpenseCategory } from '@/types/schema';
import { Plus, ClipboardList, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface ScopeOfWorkFormProps {
  items: ScopeOfWorkItem[];
  onChange: (items: ScopeOfWorkItem[]) => void;
}

const CATEGORIES: RehabExpenseCategory[] = ['Demo', 'Systems', 'Interior', 'Exterior', 'Material', 'Professional Labor', 'Permits', 'Dumpster Rental', 'Other'];

export function ScopeOfWorkForm({ items, onChange }: ScopeOfWorkFormProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState<Partial<ScopeOfWorkItem>>({
    category: 'Interior',
    description: '',
    estimatedCost: 0,
  });

  const handleAdd = () => {
    if (!newItem.description || !newItem.estimatedCost) {
      toast.error('Description and estimated cost are required');
      return;
    }

    const item: ScopeOfWorkItem = {
      id: crypto.randomUUID(),
      category: newItem.category as RehabExpenseCategory,
      description: newItem.description,
      estimatedCost: Number(newItem.estimatedCost),
    };

    onChange([...items, item]);
    setIsAdding(false);
    setNewItem({ category: 'Interior', description: '', estimatedCost: 0 });
    toast.success('SOW Item added');
  };

  const handleDelete = (id: string) => {
    onChange(items.filter(i => i.id !== id));
    toast.success('SOW Item removed');
  };

  const totalEstimatedCost = items.reduce((sum, i) => sum + i.estimatedCost, 0);

  return (
    <div className="p-6 rounded-lg shadow-sm border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Scope of Work (SOW)</h2>
        </div>
        <div className="text-right">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Base Budget: <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>${totalEstimatedCost.toLocaleString()}</span></p>
        </div>
      </div>

      <div className="space-y-4">
        {items.map(item => (
          <div key={item.id} className="p-4 rounded-md border flex items-center justify-between" style={{ borderColor: 'var(--border-ui)' }}>
            <div>
              <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>{item.description}</h4>
              <div className="flex items-center gap-2 text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs border border-blue-200">
                  {item.category}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
                ${item.estimatedCost.toLocaleString()}
              </div>
              <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete Item">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {items.length === 0 && !isAdding && (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>
            No scope of work items defined yet.
          </div>
        )}

        {isAdding && (
          <div className="p-4 rounded-md border border-blue-200 bg-blue-50 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700">Category</label>
                <select
                  value={newItem.category}
                  onChange={e => setNewItem({...newItem, category: e.target.value as RehabExpenseCategory})}
                  className="w-full px-3 py-2 rounded-md border bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium mb-1 text-gray-700">Description</label>
                <input
                  type="text"
                  placeholder="e.g., Replace kitchen cabinets"
                  value={newItem.description}
                  onChange={e => setNewItem({...newItem, description: e.target.value})}
                  className="w-full px-3 py-2 rounded-md border bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700">Estimated Cost ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newItem.estimatedCost || ''}
                  onChange={e => setNewItem({...newItem, estimatedCost: Number(e.target.value)})}
                  className="w-full px-3 py-2 rounded-md border bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                />
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
                Save SOW Item
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
            <span className="font-medium text-sm">Add SOW Item</span>
          </button>
        )}
      </div>
    </div>
  );
}
