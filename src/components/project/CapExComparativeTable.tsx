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
    <div className="p-6 rounded-lg shadow-sm border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Hammer className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>CapEx Comparative Budget</h2>
        </div>
        <div className="text-right flex items-center gap-6">
          <div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Estimated Total</p>
            <p className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>${totalEstimated.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Actual Total</p>
            <p className={`font-semibold text-lg flex items-center gap-1 ${isOverBudgetOverall ? 'text-red-600' : 'text-green-600'}`}>
              ${totalActual.toLocaleString()}
              {isOverBudgetOverall && <AlertTriangle className="w-4 h-4" />}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <th className="pb-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Line Item</th>
              <th className="pb-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Category</th>
              <th className="pb-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Status</th>
              <th className="pb-3 text-sm font-medium text-right" style={{ color: 'var(--text-secondary)' }}>Estimated Cost</th>
              <th className="pb-3 text-sm font-medium text-right" style={{ color: 'var(--text-secondary)' }}>Actual Cost</th>
              <th className="pb-3 text-sm font-medium text-right" style={{ color: 'var(--text-secondary)' }}>Variance</th>
              <th className="pb-3 text-sm font-medium text-right" style={{ color: 'var(--text-secondary)' }}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ divideColor: 'var(--border-subtle)' }}>
            {tasks.map(task => {
              const actual = task.actualCost || 0;
              const estimated = task.estimatedCost || 0;
              const variance = actual - estimated;
              const isOverBudget = variance > 0;

              return (
                <tr key={task.id} className={isOverBudget ? 'bg-red-50/50' : ''}>
                  <td className="py-4">
                    <input 
                      type="text" 
                      value={task.title}
                      onChange={(e) => updateTask(task.id, { title: e.target.value })}
                      className="bg-transparent border-none focus:ring-1 focus:ring-blue-500 rounded p-1 w-full text-sm font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    />
                  </td>
                  <td className="py-4">
                    <select 
                      value={task.category}
                      onChange={(e) => updateTask(task.id, { category: e.target.value as RehabTask['category'] })}
                      className="bg-transparent border-none focus:ring-1 focus:ring-blue-500 rounded p-1 text-sm text-gray-600"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className="py-4">
                    <select 
                      value={task.status}
                      onChange={(e) => updateTask(task.id, { status: e.target.value as RehabTask['status'] })}
                      className={`bg-transparent border-none focus:ring-1 focus:ring-blue-500 rounded p-1 text-sm font-medium ${
                        task.status === 'Complete' ? 'text-green-600' : task.status === 'In Progress' ? 'text-blue-600' : 'text-gray-500'
                      }`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Complete">Complete</option>
                    </select>
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-gray-500">$</span>
                      <input 
                        type="number" 
                        value={task.estimatedCost || ''}
                        onChange={(e) => updateTask(task.id, { estimatedCost: Number(e.target.value) })}
                        className="bg-transparent border border-transparent hover:border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded p-1 w-24 text-right text-sm"
                      />
                    </div>
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-gray-500">$</span>
                      <input 
                        type="number" 
                        value={task.actualCost || ''}
                        onChange={(e) => updateTask(task.id, { actualCost: Number(e.target.value) })}
                        className={`bg-transparent border border-transparent hover:border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded p-1 w-24 text-right text-sm font-semibold ${
                          isOverBudget ? 'text-red-600' : 'text-gray-900'
                        }`}
                      />
                    </div>
                  </td>
                  <td className="py-4 text-right">
                    <span className={`text-sm font-medium flex items-center justify-end gap-1 ${
                      isOverBudget ? 'text-red-600' : variance < 0 ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {variance > 0 ? '+' : ''}{variance.toLocaleString()}
                      {isOverBudget && <AlertTriangle className="w-3.5 h-3.5" />}
                      {variance < 0 && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </span>
                  </td>
                  <td className="py-4 text-right">
                    <button 
                      onClick={() => handleDelete(task.id)} 
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors" 
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
              <tr className="bg-blue-50/50">
                <td className="py-3 px-2">
                  <input
                    type="text"
                    placeholder="e.g., Roof Replacement"
                    value={newTask.title}
                    onChange={e => setNewTask({...newTask, title: e.target.value})}
                    className="w-full px-2 py-1.5 rounded border focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white"
                  />
                </td>
                <td className="py-3 px-2">
                  <select
                    value={newTask.category}
                    onChange={e => setNewTask({...newTask, category: e.target.value as RehabTask['category']})}
                    className="w-full px-2 py-1.5 rounded border focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                <td className="py-3 px-2">
                  <select
                    value={newTask.status}
                    onChange={e => setNewTask({...newTask, status: e.target.value as RehabTask['status']})}
                    className="w-full px-2 py-1.5 rounded border focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Complete">Complete</option>
                  </select>
                </td>
                <td className="py-3 px-2">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">$</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={newTask.estimatedCost || ''}
                      onChange={e => setNewTask({...newTask, estimatedCost: Number(e.target.value)})}
                      className="w-full px-2 py-1.5 rounded border focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm text-right bg-white"
                    />
                  </div>
                </td>
                <td className="py-3 px-2">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">$</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={newTask.actualCost || ''}
                      onChange={e => setNewTask({...newTask, actualCost: Number(e.target.value)})}
                      className="w-full px-2 py-1.5 rounded border focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm text-right bg-white"
                    />
                  </div>
                </td>
                <td colSpan={2} className="py-3 px-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setIsAdding(false)}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAdd}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
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
          className="mt-4 w-full py-3 rounded-md border-2 border-dashed flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
          style={{ borderColor: 'var(--border-ui)', color: 'var(--text-secondary)' }}
        >
          <Plus className="w-4 h-4" />
          <span className="font-medium text-sm">Add CapEx Line Item</span>
        </button>
      )}
    </div>
  );
}
