import React from 'react';
import { ClipboardList, AlertCircle, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { useDealStore } from '@/store/dealStore';

export default function OperationalDashboardView() {
  const deals = useDealStore(state => state.deals);

  // In a real SME view, we'd filter deals down to ONLY those the SME is assigned to.
  // For now, we'll extract relevant "tasks" or simulate operational blockages across active deals.
  
  const activeTasks = deals.flatMap(deal => 
     deal.financials.costs?.filter(c => !c.approved).map(c => ({
        dealId: deal.id,
        propertyName: deal.propertyName,
        type: 'Draw Request',
        desc: `Pending approval for ${c.description} ($${c.amount.toLocaleString()})`,
        urgent: true
     })) || []
  );

  // Mock static operational tasks
  const simulatedTasks = [
     { dealId: 'mock1', propertyName: '104 Main St', type: 'Inspection', desc: 'Plumbing rough-in inspection failed. Requires rework before drywall.', urgent: true },
     { dealId: 'mock2', propertyName: '221B Baker', type: 'Title', desc: 'Lien clearance required from county prior to closing.', urgent: false },
     ...activeTasks
  ].slice(0, 5); // Limit to top 5

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
       
       <div className="mb-8">
          <h1 className="text-4xl font-light text-gray-900 tracking-tight">Command Center</h1>
          <p className="text-gray-500 text-sm mt-1">Operational pipeline and immediate action items.</p>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Priority Action Items */}
          <div className="lg:col-span-2 space-y-6">
             <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                   <h2 className="text-lg font-medium text-gray-900 flex items-center">
                     <ClipboardList className="w-5 h-5 mr-2 text-indigo-500" /> Action Required
                   </h2>
                   <span className="bg-red-50 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-widest">
                     {simulatedTasks.filter(t => t.urgent).length} Urgent
                   </span>
                </div>

                <div className="space-y-4">
                   {simulatedTasks.map((task, idx) => (
                      <div key={idx} className={`p-4 rounded-xl border ${task.urgent ? 'border-red-100 bg-red-50/30' : 'border-gray-100 bg-gray-50'}`}>
                         <div className="flex justify-between items-start">
                            <div className="flex items-start">
                               {task.urgent ? <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5" /> : <Clock className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />}
                               <div>
                                  <h4 className="text-sm font-semibold text-gray-900">{task.propertyName} • <span className="text-gray-500 font-normal">{task.type}</span></h4>
                                  <p className="text-sm text-gray-600 mt-1">{task.desc}</p>
                               </div>
                            </div>
                            <button className="text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors flex items-center shrink-0 ml-4">
                               Resolve <ArrowRight className="w-3 h-3 ml-1" />
                            </button>
                         </div>
                      </div>
                   ))}
                   
                   {simulatedTasks.length === 0 && (
                      <div className="text-center py-8 text-gray-400 flex flex-col items-center">
                         <CheckCircle2 className="w-12 h-12 mb-3 text-emerald-100" />
                         <p className="text-sm">Inbox Zero. All operational tasks clear.</p>
                      </div>
                   )}
                </div>
             </div>
          </div>

          {/* Right Column: Workflow status or quick links */}
          <div className="space-y-6">
            <div className="bg-[#1a1a1a] rounded-2xl p-6 text-white shadow-xl relative overflow-hidden text-center">
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -z-10 mix-blend-screen"></div>
               <h3 className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-4">Contractor Workflow</h3>
               <div className="text-5xl font-light mb-2">3</div>
               <p className="text-sm text-gray-400 font-medium">Draw Requests Processing</p>
               
               <button className="w-full bg-white text-black font-medium text-sm py-3 rounded-lg mt-6 hover:bg-gray-200 transition">
                 Submit New Draw
               </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
               <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Resources</h3>
               <ul className="space-y-3 text-sm text-gray-600">
                 <li><a href="#" className="hover:text-indigo-600 transition flex items-center justify-between">Standard W9 Form <span>&rarr;</span></a></li>
                 <li><a href="#" className="hover:text-indigo-600 transition flex items-center justify-between">Supplier Directory <span>&rarr;</span></a></li>
                 <li><a href="#" className="hover:text-indigo-600 transition flex items-center justify-between">Upload Compliance Doc <span>&rarr;</span></a></li>
               </ul>
            </div>
          </div>

       </div>
    </div>
  );
}
