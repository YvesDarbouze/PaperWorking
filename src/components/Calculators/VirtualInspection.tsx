'use client';

import React, { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { ClipboardCheck, Plus, Trash2 } from 'lucide-react';

export default function VirtualInspection() {
  const currentProject = useProjectStore((state) => state.currentProject);
  const updateProjectFinancials = useProjectStore((state) => state.updateProjectFinancials);

  const [category, setCategory] = useState('');
  const [estimated, setEstimated] = useState('');
  const [actual, setActual] = useState('');

  if (!currentProject?.financials) return null;

  const inspections = currentProject.financials.inspections || [];

  const handleAdd = () => {
    if (!category.trim()) return;

    const newItem: any = {
      id: crypto.randomUUID(),
      category: category.trim(),
      estimatedCost: parseFloat(estimated) || 0,
      actualCost: parseFloat(actual) || 0,
      loggedBy: 'current-uid', // Mock
      status: 'Pending',
      notes: ''
    };

    updateProjectFinancials(currentProject.id, {
      inspections: [...inspections, newItem]
    });

    setCategory('');
    setEstimated('');
    setActual('');
  };

  const handleRemove = (id: string) => {
    updateProjectFinancials(currentProject.id, {
      inspections: inspections.filter((i) => i.id !== id)
    });
  };

  const totalEst = inspections.reduce((acc, curr) => acc + (curr.estimatedCost || 0), 0);
  const totalAct = inspections.reduce((acc, curr) => acc + (curr.actualCost || 0), 0);
  const variance = totalAct - totalEst; // positive means over-budget

  return (
    <div className="bg-bg-surface border border-border-accent rounded-xl p-6 shadow-sm">
      <div className="flex items-center space-x-2 border-b pb-4 mb-4 text-text-primary">
         <ClipboardCheck className="w-5 h-5 text-indigo-600" />
         <h3 className="text-lg font-semibold">Virtual Inspection Log</h3>
      </div>
      
      {/* Tracker Overview */}
      <div className="grid grid-cols-3 gap-4 mb-6 text-sm text-center">
         <div className="bg-bg-primary p-3 rounded-lg border border-border-accent">
            <span className="block text-text-secondary uppercase tracking-widest text-xs mb-1">Total Estimated</span>
            <span className="font-semibold text-text-primary">${totalEst.toLocaleString()}</span>
         </div>
         <div className="bg-bg-primary p-3 rounded-lg border border-border-accent">
            <span className="block text-text-secondary uppercase tracking-widest text-xs mb-1">Total Actual</span>
            <span className="font-semibold text-text-primary">${totalAct.toLocaleString()}</span>
         </div>
         <div className={`p-3 rounded-lg border ${variance > 0 ? 'bg-red-50 border-red-100 text-red-700' : 'bg-green-50 border-green-100 text-green-700'}`}>
            <span className="block uppercase tracking-widest text-xs mb-1 opacity-70">Variance</span>
            <span className="font-semibold">${Math.abs(variance).toLocaleString()} {variance > 0 ? 'Over' : 'Under'}</span>
         </div>
      </div>

      {/* Item List */}
      <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2">
         {inspections.length === 0 ? (
            <p className="text-sm text-text-secondary italic text-center py-4">No inspection items logged.</p>
         ) : (
            inspections.map(item => (
               <div key={item.id} className="flex justify-between items-center text-sm p-3 bg-bg-surface border border-border-accent rounded-lg group">
                  <span className="font-medium text-text-primary w-1/3 truncate">{item.category}</span>
                  <div className="flex items-center space-x-4 w-2/3 justify-end">
                     <div className="text-right">
                        <span className="block text-xs uppercase text-text-secondary">Est</span>
                        <span className="text-text-secondary">${(item.estimatedCost || 0).toLocaleString()}</span>
                     </div>
                     <div className="text-right">
                        <span className="block text-xs uppercase text-text-secondary">Act</span>
                        <span className="text-text-primary font-medium">${(item.actualCost || 0).toLocaleString()}</span>
                     </div>
                     <button onClick={() => handleRemove(item.id)} className="text-gray-300 hover:text-red-500 transition-colors ml-2">
                        <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
               </div>
            ))
         )}
      </div>

      {/* Add new Item */}
      <div className="flex space-x-2 items-end border-t pt-4">
         <div className="flex-1">
            <label className="block text-xs font-medium text-text-primary mb-1">Category</label>
            <input 
               type="text" 
               placeholder="e.g. Roof" 
               className="w-full text-sm border-border-accent rounded-md focus:border-indigo-500 focus:ring-indigo-500 border p-2 h-9"
               value={category}
               onChange={e => setCategory(e.target.value)}
            />
         </div>
         <div className="w-24">
            <label className="block text-xs font-medium text-text-primary mb-1">Est ($)</label>
            <input 
               type="number" 
               className="w-full text-sm border-border-accent rounded-md focus:border-indigo-500 focus:ring-indigo-500 border p-2 h-9"
               value={estimated}
               onChange={e => setEstimated(e.target.value)}
            />
         </div>
         <div className="w-24">
            <label className="block text-xs font-medium text-text-primary mb-1">Act ($)</label>
            <input 
               type="number" 
               className="w-full text-sm border-border-accent rounded-md focus:border-indigo-500 focus:ring-indigo-500 border p-2 h-9"
               value={actual}
               onChange={e => setActual(e.target.value)}
            />
         </div>
         <button 
            onClick={handleAdd}
            className="h-9 px-3 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors flex items-center justify-center flex-shrink-0"
         >
            <Plus className="w-4 h-4" />
         </button>
      </div>
    </div>
  );
}
