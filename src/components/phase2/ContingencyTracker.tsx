import React, { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { Contingency, ContingencyType } from '@/types/schema';

export const ContingencyTracker: React.FC = () => {
  const currentProject = useProjectStore((s) => s.currentProject);
  const updateContingencies = useProjectStore((s) => s.updateContingencies);

  const [isAdding, setIsAdding] = useState(false);
  const [newType, setNewType] = useState<ContingencyType>('Inspection');
  const [newDate, setNewDate] = useState('');
  const [newNotes, setNewNotes] = useState('');

  if (!currentProject) return null;

  const contingencies = currentProject.contingencies || [];

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate) return;

    const newContingency: Contingency = {
      id: crypto.randomUUID(),
      type: newType,
      deadlineDate: new Date(newDate),
      isWaived: false,
      isSatisfied: false,
      notes: newNotes
    };

    updateContingencies(currentProject.id, [...contingencies, newContingency]);
    setIsAdding(false);
    setNewDate('');
    setNewNotes('');
  };

  const handleToggleState = (id: string, field: 'isSatisfied' | 'isWaived') => {
    const updated = contingencies.map(c => {
      if (c.id === id) {
        return { ...c, [field]: !c[field] };
      }
      return c;
    });
    updateContingencies(currentProject.id, updated);
  };

  const getUrgencyData = (c: Contingency) => {
    if (c.isSatisfied || c.isWaived) return { color: 'bg-bg-primary text-text-secondary', bar: 'bg-gray-400', label: c.isWaived ? 'Waived' : 'Satisfied' };
    
    const now = new Date();
    const deadline = new Date(c.deadlineDate);
    const msLeft = deadline.getTime() - now.getTime();
    const hoursLeft = msLeft / (1000 * 60 * 60);

    if (hoursLeft < 0) return { color: 'bg-red-100 text-red-800', bar: 'bg-red-500', label: 'Overdue' };
    if (hoursLeft <= 48) return { color: 'bg-yellow-100 text-yellow-800', bar: 'bg-yellow-500', label: '< 48 Hours' };
    return { color: 'bg-emerald-100 text-emerald-800', bar: 'bg-emerald-500', label: 'Safe' };
  };

  return (
    <div className="p-6 bg-bg-surface rounded-xl shadow-sm border border-border-accent">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-text-primary">Contingencies</h2>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-3 py-1.5 bg-gray-900 text-white hover:bg-gray-800 rounded-md text-sm transition-colors font-medium cursor-pointer"
        >
          {isAdding ? 'Cancel' : '+ Add Contingency'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="mb-6 p-4 bg-bg-primary rounded-lg border border-border-accent">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as ContingencyType)}
                className="w-full px-3 py-2 border border-border-accent rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Inspection">Inspection</option>
                <option value="Financing">Financing</option>
                <option value="Appraisal">Appraisal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Deadline Date</label>
              <input
                type="date"
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3 py-2 border border-border-accent rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-text-primary mb-1">Notes (Optional)</label>
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Any specific conditions?"
              className="w-full px-3 py-2 border border-border-accent rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium cursor-pointer">
            Save Contingency
          </button>
        </form>
      )}

      <div className="space-y-4">
        {contingencies.length === 0 ? (
          <p className="text-sm text-text-secondary italic text-center py-4 bg-bg-primary rounded-lg border border-dashed border-border-accent">No contingencies active.</p>
        ) : (
          contingencies.map((c) => {
            const urgency = getUrgencyData(c);
            const isResolved = c.isSatisfied || c.isWaived;
            return (
              <div key={c.id} className={`p-4 rounded-lg border transition-opacity ${isResolved ? 'bg-bg-primary border-border-accent opacity-60' : 'bg-bg-surface border-border-accent'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-text-primary flex items-center gap-2">
                      {c.type}
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${urgency.color}`}>
                        {urgency.label}
                      </span>
                    </h3>
                    <p className="text-xs text-text-secondary mt-1">
                      Deadline: {new Date(c.deadlineDate).toLocaleDateString()}
                    </p>
                    {c.notes && <p className="text-xs text-text-secondary mt-1">Notes: {c.notes}</p>}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={c.isSatisfied}
                        onChange={() => handleToggleState(c.id, 'isSatisfied')}
                        disabled={c.isWaived}
                        className="rounded border-border-accent text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      Satisfied
                    </label>
                    <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={c.isWaived}
                        onChange={() => handleToggleState(c.id, 'isWaived')}
                        disabled={c.isSatisfied}
                        className="rounded border-border-accent text-text-secondary focus:ring-gray-500 cursor-pointer"
                      />
                      Waived
                    </label>
                  </div>
                </div>
                {!isResolved && (
                  <div className="w-full bg-bg-primary h-1.5 rounded-full overflow-hidden">
                    <div className={`h-full ${urgency.bar} w-full transition-all duration-1000`}></div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
