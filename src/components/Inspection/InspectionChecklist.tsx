'use client';

import React, { useState } from 'react';
import { ClipboardCheck, Plus, TrendingUp } from 'lucide-react';

interface CheckItem {
  id: string;
  category: string;
  estimatedCost: number;
  actualCost: number;
}

export default function InspectionChecklist() {
  const [items, setItems] = useState<CheckItem[]>([
    { id: '1', category: 'Roof Replacement', estimatedCost: 12000, actualCost: 11500 },
    { id: '2', category: 'HVAC Unit', estimatedCost: 6500, actualCost: 7200 },
  ]);

  const addRow = () => {
    setItems([...items, { id: Math.random().toString(), category: 'New Line Item', estimatedCost: 0, actualCost: 0 }]);
  };

  const totalEstimate = items.reduce((sum, item) => sum + item.estimatedCost, 0);
  const totalActual = items.reduce((sum, item) => sum + item.actualCost, 0);
  const variance = totalEstimate - totalActual; // positive means under budget

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
       <div className="flex justify-between items-center mb-6">
         <div className="flex items-center space-x-2">
           <ClipboardCheck className="w-5 h-5 text-gray-700" />
           <h3 className="text-lg font-medium tracking-tight text-gray-900">Virtual Walk-Through Inspection</h3>
         </div>
         <button onClick={addRow} className="p-1 px-3 bg-gray-100 text-gray-700 text-xs font-semibold rounded hover:bg-gray-200 flex items-center">
            <Plus className="w-3 h-3 mr-1" /> Add Estimate
         </button>
       </div>

       <div className="overflow-x-auto">
         <table className="min-w-full divide-y divide-gray-200">
           <thead>
             <tr>
               <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
               <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Estimated ($)</th>
               <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actual ($)</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-gray-100">
             {items.map(item => (
                <tr key={item.id} className="group">
                  <td className="py-3">
                    <input 
                      type="text" 
                      defaultValue={item.category}
                      className="text-sm text-gray-900 bg-transparent border-none focus:ring-0 p-0 w-full"
                    />
                  </td>
                  <td className="py-3 text-right">
                    <input 
                      type="number" 
                      defaultValue={item.estimatedCost}
                      className="text-sm text-gray-600 bg-transparent border-none focus:ring-0 p-0 text-right w-24"
                    />
                  </td>
                  <td className="py-3 text-right">
                    <input 
                      type="number" 
                      defaultValue={item.actualCost}
                      className="text-sm text-gray-900 bg-transparent border-none focus:ring-0 p-0 text-right w-24 font-medium"
                    />
                  </td>
                </tr>
             ))}
           </tbody>
           <tfoot className="border-t-2 border-gray-200">
             <tr>
               <td className="py-3 text-sm font-semibold text-gray-900">Total Projection</td>
               <td className="py-3 text-right text-sm font-medium text-gray-600">${totalEstimate.toLocaleString()}</td>
               <td className="py-3 text-right text-sm font-semibold text-gray-900">${totalActual.toLocaleString()}</td>
             </tr>
           </tfoot>
         </table>
       </div>

       {variance !== 0 && (
         <div className={`mt-4 p-3 rounded-lg flex items-center justify-between ${variance >= 0 ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
            <div className="flex items-center space-x-2">
               <TrendingUp className={`w-4 h-4 ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
               <span className={`text-sm font-medium ${variance >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                 {variance >= 0 ? 'Under Budget Variance' : 'Over Budget Variance'}
               </span>
            </div>
            <span className={`font-mono font-bold ${variance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {variance >= 0 ? '+' : '-'}${Math.abs(variance).toLocaleString()}
            </span>
         </div>
       )}
    </div>
  );
}
