import React, { useState } from 'react';
import { RehabTask } from '@/types/schema';
import { Plus, Trash2, AlertTriangle, CheckCircle2, Hammer } from 'lucide-react';
import toast from 'react-hot-toast';

interface CapExComparativeTableProps {
  tasks: RehabTask[];
  onChange: (tasks: RehabTask[]) => void;
}

const CATEGORIES: RehabTask['category'][] = ['Plumbing', 'Electrical', 'Framing', 'HVAC', 'Foundation', 'Other'];

export function CapExComparativeTable({ tasks, onChange }: CapExComparativeTableProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState<Partial<RehabTask>>({
    title: '',
    category: 'Other',
    status: 'Pending',
    estimatedCost: 0,
    actualCost: 0
  });

  const handleAdd = () => {
    if (!newTask.title || newTask.estimatedCost === undefined) {
      toast.error('Title and estimated cost are required');
      return;
    }

    const task: RehabTask = {
      id: crypto.randomUUID(),
      title: newTask.title,
      category: newTask.category as RehabTask['category'],
      status: newTask.status as RehabTask['status'],
      estimatedCost: Number(newTask.estimatedCost),
      actualCost: Number(newTask.actualCost || 0)
    };

    onChange([...tasks, task]);
    setIsAdding(false);
    setNewTask({ title: '', category: 'Other', status: 'Pending', estimatedCost: 0, actualCost: 0 });
    toast.success('Line item added');
  };

  const handleDelete = (id: string) => {
    onChange(tasks.filter(t => t.id !== id));
    toast.success('Line item removed');
  };

  const updateTask = (id: string, updates: Partial<RehabTask>) => {
    onChange(tasks.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const totalEstimated = tasks.reduce((sum, t) => sum + (t.estimatedCost || 0), 0);
  const totalActual = tasks.reduce((sum, t) => sum + (t.actualCost || 0), 0);
  const isOverBudgetOverall = totalActual > totalEstimated;

  return (
    <div className="p-6 border border-pw-border bg-pw-glass-bg shadow-none">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Hammer className="w-5 h-5 text-pw-muted" />
          <h2 className="text-lg font-medium text-pw-black">CapEx Comparative Budget</h2>
        </div>
        <div className="text-right flex items-center gap-6">
          <div>
            <p className="text-sm text-pw-muted">Estimated Total</p>
            <p className="font-semibold text-lg text-pw-black">${totalEstimated.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-pw-muted">Actual Total</p>
            <p className={`font-semibold text-lg flex items-center gap-1 ${isOverBudgetOverall ? 'text-error' : 'text-green-600'}`}>
              ${totalActual.toLocaleString()}
              {isOverBudgetOverall && <AlertTriangle className="w-4 h-4" />}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-pw-border bg-surface-container-highest/50 backdrop-blur-md">
              <th className="px-6 py-4 font-label-md text-label-md uppercase tracking-wider text-outline">Line Item</th>
              <th className="px-6 py-4 font-label-md text-label-md uppercase tracking-wider text-outline">Category</th>
              <th className="px-6 py-4 font-label-md text-label-md uppercase tracking-wider text-outline">Status</th>
              <th className="px-6 py-4 font-label-md text-label-md uppercase tracking-wider text-outline text-right">Estimated Cost</th>
              <th className="px-6 py-4 font-label-md text-label-md uppercase tracking-wider text-outline text-right">Actual Cost</th>
              <th className="px-6 py-4 font-label-md text-label-md uppercase tracking-wider text-outline text-right">Variance</th>
              <th className="px-6 py-4 font-label-md text-label-md uppercase tracking-wider text-outline text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {tasks.map(task => {
              const actual = task.actualCost || 0;
              const estimated = task.estimatedCost || 0;
              const variance = actual - estimated;
              const isOverBudget = variance > 0;

              return (
                <tr 
                  key={task.id} 
                  className={`border-b border-pw-border last:border-b-0 transition-colors duration-200 ${
                    isOverBudget 
                      ? 'bg-error/10 hover:bg-error/15' 
                      : 'hover:bg-white/5'
                  }`}
                >
                  <td className="px-6 py-4">
                    <input 
                      type="text" 
                      value={task.title}
                      onChange={(e) => updateTask(task.id, { title: e.target.value })}
                      className="bg-transparent border-none focus:ring-1 focus:ring-pw-accent/50 rounded-sm p-1 w-full text-sm font-medium text-pw-black focus:outline-none"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <select 
                      value={task.category}
                      onChange={(e) => updateTask(task.id, { category: e.target.value as RehabTask['category'] })}
                      className="bg-transparent border-none focus:ring-1 focus:ring-pw-accent/50 rounded-sm p-1 text-sm text-pw-muted focus:outline-none"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c} className="bg-surface-container text-pw-black">{c}</option>)}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <select 
                      value={task.status}
                      onChange={(e) => updateTask(task.id, { status: e.target.value as RehabTask['status'] })}
                      className={`bg-transparent border-none focus:ring-1 focus:ring-pw-accent/50 rounded-sm p-1 text-sm font-medium focus:outline-none ${
                        task.status === 'Complete' ? 'text-green-600' : task.status === 'In Progress' ? 'text-pw-accent' : 'text-pw-muted'
                      }`}
                    >
                      <option value="Pending" className="bg-surface-container text-pw-muted">Pending</option>
                      <option value="In Progress" className="bg-surface-container text-pw-accent">In Progress</option>
                      <option value="Complete" className="bg-surface-container text-green-600">Complete</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-pw-muted">$</span>
                      <input 
                        type="number" 
                        value={task.estimatedCost || ''}
                        onChange={(e) => updateTask(task.id, { estimatedCost: Number(e.target.value) })}
                        className="bg-transparent border border-transparent hover:border-pw-border focus:bg-white/5 focus:border-pw-accent/50 focus:ring-1 focus:ring-pw-accent/50 rounded-sm p-1 w-24 text-right text-sm text-pw-black focus:outline-none"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-pw-muted">$</span>
                      <input 
                        type="number" 
                        value={task.actualCost || ''}
                        onChange={(e) => updateTask(task.id, { actualCost: Number(e.target.value) })}
                        className={`bg-transparent border border-transparent hover:border-pw-border focus:bg-white/5 focus:border-pw-accent/50 focus:ring-1 focus:ring-pw-accent/50 rounded-sm p-1 w-24 text-right text-sm font-semibold focus:outline-none ${
                          isOverBudget ? 'text-error' : 'text-pw-black'
                        }`}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`text-sm font-medium flex items-center justify-end gap-1 ${
                      isOverBudget ? 'text-error' : variance < 0 ? 'text-green-600' : 'text-pw-muted'
                    }`}>
                      {variance > 0 ? '+' : ''}{variance.toLocaleString()}
                      {isOverBudget && <AlertTriangle className="w-3.5 h-3.5" />}
                      {variance < 0 && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleDelete(task.id)} 
                      className="p-1.5 text-error hover:bg-white/5 rounded-sm transition-colors" 
                      title="Delete Line Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}

            {tasks.length === 0 && !isAdding && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                  No CapEx line items added yet.
                </td>
              </tr>
            )}
            
            {isAdding && (
              <tr className="bg-pw-accent/5 border-b border-pw-border">
                <td className="py-3 px-6">
                  <input
                    type="text"
                    placeholder="e.g., Roof Replacement"
                    value={newTask.title}
                    onChange={e => setNewTask({...newTask, title: e.target.value})}
                    className="w-full px-3 py-1.5 rounded-sm border border-pw-border focus:ring-1 focus:ring-pw-accent/50 focus:outline-none text-sm bg-white/5 text-pw-black"
                  />
                </td>
                <td className="py-3 px-6">
                  <select
                    value={newTask.category}
                    onChange={e => setNewTask({...newTask, category: e.target.value as RehabTask['category']})}
                    className="w-full px-3 py-1.5 rounded-sm border border-pw-border focus:ring-1 focus:ring-pw-accent/50 focus:outline-none text-sm bg-white/5 text-pw-black"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c} className="bg-surface-container text-pw-black">{c}</option>)}
                  </select>
                </td>
                <td className="py-3 px-6">
                  <select
                    value={newTask.status}
                    onChange={e => setNewTask({...newTask, status: e.target.value as RehabTask['status']})}
                    className="w-full px-3 py-1.5 rounded-sm border border-pw-border focus:ring-1 focus:ring-pw-accent/50 focus:outline-none text-sm bg-white/5 text-pw-black"
                  >
                    <option value="Pending" className="bg-surface-container">Pending</option>
                    <option value="In Progress" className="bg-surface-container">In Progress</option>
                    <option value="Complete" className="bg-surface-container">Complete</option>
                  </select>
                </td>
                <td className="py-3 px-6">
                  <div className="flex items-center gap-1 justify-end">
                    <span className="text-pw-muted">$</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={newTask.estimatedCost || ''}
                      onChange={e => setNewTask({...newTask, estimatedCost: Number(e.target.value)})}
                      className="w-24 px-3 py-1.5 rounded-sm border border-pw-border focus:ring-1 focus:ring-pw-accent/50 focus:outline-none text-sm text-right bg-white/5 text-pw-black"
                    />
                  </div>
                </td>
                <td className="py-3 px-6">
                  <div className="flex items-center gap-1 justify-end">
                    <span className="text-pw-muted">$</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={newTask.actualCost || ''}
                      onChange={e => setNewTask({...newTask, actualCost: Number(e.target.value)})}
                      className="w-24 px-3 py-1.5 rounded-sm border border-pw-border focus:ring-1 focus:ring-pw-accent/50 focus:outline-none text-sm text-right bg-white/5 text-pw-black"
                    />
                  </div>
                </td>
                <td colSpan={2} className="py-3 px-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setIsAdding(false)}
                      className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-pw-muted hover:text-pw-black transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAdd}
                      className="pw-interactive pw-btn pw-btn--primary pw-btn--sm py-1.5 px-3 text-xs font-semibold uppercase tracking-wider"
                    >
                      Save
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!isAdding && (
        <button
          onClick={() => setIsAdding(true)}
          className="mt-4 w-full py-3 border border-dashed border-pw-border flex items-center justify-center gap-2 hover:bg-white/5 transition-colors text-pw-muted hover:text-pw-black"
        >
          <Plus className="w-4 h-4" />
          <span className="font-semibold text-xs uppercase tracking-wider">Add CapEx Line Item</span>
        </button>
      )}
    </div>
  );
}
