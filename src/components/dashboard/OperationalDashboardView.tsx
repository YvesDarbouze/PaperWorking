'use client';

import { ClipboardList, AlertCircle, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/context/AuthContext';
import { CardSkeleton } from '@/components/ui/skeletons';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

function OperationalSkeleton() {
  return (
    <div className="w-full pb-20" aria-label="Loading field status" aria-busy="true">
      <div className="mb-12 space-y-3">
        <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
        <div className="h-12 w-64 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-80 animate-pulse rounded bg-gray-100" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-10">
        <div className="md:col-span-2 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} className="opacity-60" />
          ))}
        </div>
        <div className="space-y-8">
          <CardSkeleton className="h-[260px] opacity-60" />
          <CardSkeleton className="h-[220px] opacity-60" />
        </div>
      </div>
    </div>
  );
}

function OperationalDashboardContent() {
  const { user } = useAuth();
  const { role } = usePermissions();
  const projects = useProjectStore(state => state.projects);
  const ledgerItems = useProjectStore(state => state.ledgerItems);

  const realTasks = projects.flatMap(deal => {
    const items = ledgerItems[deal.id] || [];
    return items
      .filter(item => item.status === 'Pending' || item.status === 'Flagged')
      .map(item => ({
        projectId: deal.id,
        propertyName: deal.propertyName,
        type: item.category || 'Maintenance',
        desc: item.description,
        urgent: item.status === 'Flagged' || item.amount > 5000,
        amount: item.amount
      }));
  });

  const activeTasks = realTasks.slice(0, 8);

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">

       <div className="mb-12">
          <p className="ag-label opacity-60">Operations</p>
          <h1 className="text-5xl font-light text-pw-black tracking-tighter mt-2">Field Status</h1>
          <p className="text-pw-muted text-sm mt-3 font-normal">Active operational corridor for <strong className="text-pw-black font-medium">{role}</strong> personnel.</p>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-10">

          {/* Action Items */}
          <div className="md:col-span-2 space-y-8">
             <div className="ag-card bg-pw-surface shadow-[0_30px_60px_rgba(0,0,0,0.02)] border border-pw-border/10 p-10">
                <div className="flex items-center justify-between mb-10">
                   <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-pw-bg flex items-center justify-center text-pw-black transition-colors" aria-hidden="true">
                        <ClipboardList className="w-5 h-5" />
                      </div>
                      <h2 className="text-xl font-medium text-pw-black tracking-tight">Active Triage</h2>
                   </div>
                   <span className="bg-pw-black text-pw-white text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest" aria-label={`${activeTasks.length} assignments`}>
                     {activeTasks.length} Assignments
                   </span>
                </div>

                <ul className="space-y-4" aria-label="Task list">
                   {activeTasks.map((task, idx) => (
                      <li key={idx}>
                        <div
                          role="button"
                          tabIndex={0}
                          aria-label={`${task.urgent ? 'Urgent: ' : ''}${task.propertyName} — ${task.type}`}
                          className={`p-6 rounded-[32px] border transition-all duration-300 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-pw-black focus-visible:ring-offset-2 ${task.urgent ? 'border-pw-border/30 bg-pw-bg/50' : 'border-pw-border/10 bg-pw-bg/10 hover:bg-pw-bg/30'}`}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.currentTarget.click(); }}
                        >
                           <div className="flex justify-between items-start">
                              <div className="flex items-start">
                                 <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 mt-0.5 ${task.urgent ? 'bg-pw-black text-white' : 'bg-pw-muted/10 text-pw-muted'}`} aria-hidden="true">
                                    {task.urgent ? <AlertCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                 </div>
                                 <div>
                                    <h3 className="text-base font-medium text-pw-black tracking-tight leading-none mb-1">
                                      {task.propertyName} <span className="mx-2 opacity-20" aria-hidden="true">/</span> <span className="text-pw-muted font-normal text-sm">{task.type}</span>
                                    </h3>
                                    <p className="text-sm text-pw-muted mt-2 leading-relaxed">{task.desc}</p>
                                    {task.amount > 0 && <p className="text-[10px] font-bold text-pw-muted/40 mt-3 uppercase tracking-widest">Value: ${task.amount.toLocaleString()}</p>}
                                 </div>
                              </div>
                              <ArrowRight className="w-5 h-5 text-pw-black opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                           </div>
                        </div>
                      </li>
                   ))}

                   {activeTasks.length === 0 && (
                      <li className="text-center py-20 text-pw-muted flex flex-col items-center">
                         <div className="w-16 h-16 rounded-full bg-pw-bg flex items-center justify-center mb-6" aria-hidden="true">
                            <CheckCircle2 className="w-8 h-8 opacity-20" />
                         </div>
                         <p className="text-base font-medium text-pw-black">Ops Complete</p>
                         <p className="text-xs mt-2 opacity-60">No pending assignments found in corridor.</p>
                      </li>
                   )}
                </ul>
             </div>
          </div>

          {/* Side Module */}
          <div className="space-y-8">
            <div className="ag-card bg-pw-black p-10 text-white shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -z-10 group-hover:bg-white/10 transition-colors duration-700" aria-hidden="true" />
               <p className="ag-label text-white/40 mb-6">Field Submission</p>
               <div className="text-6xl font-light tracking-tighter mb-4" aria-label={`${activeTasks.filter(t => t.urgent).length} high-priority blockages`}>
                 {activeTasks.filter(t => t.urgent).length}
               </div>
               <p className="text-sm text-white/60 font-medium whitespace-nowrap">High-Priority Blockages</p>

               <button className="w-full bg-white text-black font-bold uppercase tracking-widest text-[10px] py-4 rounded-full mt-10 hover:scale-[1.02] transition-transform shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-pw-black">
                 Submit Project Draw
               </button>
            </div>

            <div className="ag-card bg-pw-surface border border-pw-border/10 p-10 shadow-sm">
               <h3 className="text-sm font-bold text-pw-black uppercase tracking-widest mb-8">Member Context</h3>
               <div className="flex items-center space-x-4 mb-10">
                 <div
                   className="w-12 h-12 rounded-full bg-pw-bg border border-pw-border/20 flex items-center justify-center text-pw-black font-medium text-lg"
                   aria-label={`Avatar for ${user?.displayName || 'Active User'}`}
                 >
                    {user?.displayName?.charAt(0) || 'U'}
                 </div>
                 <div>
                    <p className="text-base font-medium text-pw-black tracking-tight">{user?.displayName || 'Active User'}</p>
                    <p className="text-[10px] text-pw-muted font-bold uppercase tracking-widest mt-1 opacity-60">{role}</p>
                 </div>
               </div>
               <ul className="space-y-5 text-sm">
                 <li><a href="#" className="text-pw-muted hover:text-pw-black transition-colors flex items-center justify-between font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-pw-black rounded">Standard W9 Form <ArrowRight className="w-3 h-3 opacity-20" aria-hidden="true" /></a></li>
                 <li><a href="#" className="text-pw-muted hover:text-pw-black transition-colors flex items-center justify-between font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-pw-black rounded">Safety Procedures <ArrowRight className="w-3 h-3 opacity-20" aria-hidden="true" /></a></li>
                 <li><a href="#" className="text-pw-muted hover:text-pw-black transition-colors flex items-center justify-between font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-pw-black rounded">Support Request <ArrowRight className="w-3 h-3 opacity-20" aria-hidden="true" /></a></li>
               </ul>
            </div>
          </div>

       </div>
    </div>
  );
}

export default function OperationalDashboardView() {
  const projects = useProjectStore(state => state.projects);
  const isLoading = projects.length === 0;

  if (isLoading) return <OperationalSkeleton />;

  return (
    <ErrorBoundary name="Operational Dashboard">
      <OperationalDashboardContent />
    </ErrorBoundary>
  );
}
