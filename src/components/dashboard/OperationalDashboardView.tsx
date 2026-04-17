'use client';

import React from 'react';
import { ClipboardList, AlertCircle, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { useDealStore } from '@/store/dealStore';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/context/AuthContext';

export default function OperationalDashboardView() {
  const { user } = useAuth();
  const { role } = usePermissions();
  const deals = useDealStore(state => state.deals);
  const ledgerItems = useDealStore(state => state.ledgerItems);

  // Extract real actionable tasks from sub-collections across all deals
  const realTasks = deals.flatMap(deal => {
    const items = ledgerItems[deal.id] || [];
    return items
      .filter(item => item.status === 'Pending' || item.status === 'Flagged')
      .map(item => ({
        dealId: deal.id,
        propertyName: deal.propertyName,
        type: item.category || 'Maintenance',
        desc: item.description,
        urgent: item.status === 'Flagged' || item.amount > 5000,
        amount: item.amount
      }));
  });

  // Limit to top actionable items
  const activeTasks = realTasks.slice(0, 8);

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
       
       <div className="mb-8">
          <h1 className="text-4xl font-light text-gray-900 tracking-tight">Field Operations</h1>
          <p className="text-gray-500 text-sm mt-1">Operational pipeline for <strong className="text-gray-900">{role}</strong> personnel.</p>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Action Items */}
          <div className="lg:col-span-2 space-y-6">
             <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                   <h2 className="text-lg font-medium text-gray-900 flex items-center">
                     <ClipboardList className="w-5 h-5 mr-2 text-indigo-500" /> Active Triage
                   </h2>
                   <span className="bg-indigo-50 text-indigo-600 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-widest">
                     {activeTasks.length} Assignments
                   </span>
                </div>

                <div className="space-y-4">
                   {activeTasks.map((task, idx) => (
                      <div key={idx} className={`p-4 rounded-xl border ${task.urgent ? 'border-orange-100 bg-orange-50/30' : 'border-gray-100 bg-gray-50'}`}>
                         <div className="flex justify-between items-start">
                            <div className="flex items-start">
                               {task.urgent ? <AlertCircle className="w-5 h-5 text-orange-500 mr-3 mt-0.5" /> : <Clock className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />}
                               <div>
                                  <h4 className="text-sm font-semibold text-gray-900">{task.propertyName} • <span className="text-gray-500 font-normal">{task.type}</span></h4>
                                  <p className="text-sm text-gray-600 mt-1">{task.desc}</p>
                                  {task.amount > 0 && <p className="text-xs font-mono text-gray-400 mt-1 uppercase tracking-tighter">Value: ${task.amount.toLocaleString()}</p>}
                               </div>
                            </div>
                            <button className="text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors flex items-center shrink-0 ml-4">
                               View <ArrowRight className="w-3 h-3 ml-1" />
                            </button>
                         </div>
                      </div>
                   ))}
                   
                   {activeTasks.length === 0 && (
                      <div className="text-center py-12 text-gray-400 flex flex-col items-center">
                         <CheckCircle2 className="w-12 h-12 mb-3 text-emerald-100" />
                         <p className="text-sm font-medium">Ops Complete. No pending assignments found.</p>
                         <p className="text-xs mt-1">Enjoy the quiet while it lasts.</p>
                      </div>
                   )}
                </div>
             </div>
          </div>

          {/* Side Module */}
          <div className="space-y-6">
            <div className="bg-pw-black rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -z-10 mix-blend-screen"></div>
               <h3 className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-4">Field Submission</h3>
               <div className="text-3xl font-light mb-2">{activeTasks.filter(t => t.urgent).length}</div>
               <p className="text-sm text-gray-400 font-medium whitespace-nowrap">High-Priority Blockages</p>
               
               <button className="w-full bg-white text-black font-medium text-sm py-3 rounded-lg mt-6 hover:bg-gray-200 transition">
                 Submit Project Draw
               </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
               <h3 className="text-sm font-semibold text-gray-900 mb-4">Member Context</h3>
               <div className="flex items-center space-x-3 mb-6">
                 <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                    {user?.displayName?.charAt(0) || 'U'}
                 </div>
                 <div>
                    <p className="text-sm font-medium text-gray-900">{user?.displayName || 'Active User'}</p>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{role}</p>
                 </div>
               </div>
               <ul className="space-y-3 text-sm text-gray-600">
                 <li><a href="#" className="hover:text-indigo-600 transition flex items-center justify-between">Standard W9 Form <span>&rarr;</span></a></li>
                 <li><a href="#" className="hover:text-indigo-600 transition flex items-center justify-between">Safety Procedures <span>&rarr;</span></a></li>
                 <li><a href="#" className="hover:text-indigo-600 transition flex items-center justify-between">Support Request <span>&rarr;</span></a></li>
               </ul>
            </div>
          </div>

       </div>
    </div>
  );
}
