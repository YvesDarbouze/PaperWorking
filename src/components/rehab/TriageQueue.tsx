import React, { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { Project, PendingReceipt, CostEntry } from '@/types/schema';
import { CheckCircle, XCircle, AlertTriangle, Paperclip, CheckSquare, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { verifyContingencyBuffer } from '@/lib/contingencyEnforcer';
import toast from 'react-hot-toast';
import ESignAction from '@/components/shared/ESignAction';
import TeamChatWidget from '@/components/shared/TeamChatWidget';
import { projectsService } from '@/lib/firebase/projects';

export default function TriageQueue() {
    const projects = useProjectStore(state => state.projects);
    const ledgerItems = useProjectStore(state => state.ledgerItems);

    const handleApproveReceipt = async (deal: Project, item: any) => {
        // Enforce Contingency Buffer
        const validation = verifyContingencyBuffer(deal, item);
        
        if (!validation.canApprove) {
            toast.error(`CONTINGENCY BREACH: This approval forces the budget over the 15% buffer constraint by $${validation.exceedsBy.toLocaleString()}.`, { duration: 6000, icon: '🛑' });
            return;
        }

        try {
            await projectsService.updateLedgerItem(deal.id, item.id, { 
                status: 'Approved',
                updatedAt: new Date()
            });
            toast.success(`Expense Approved & Posted to global ledger.`);
        } catch (error) {
            toast.error('Failed to update ledger item.');
        }
    };

    const handleRejectReceipt = async (projectId: string, itemId: string) => {
        try {
            await projectsService.updateLedgerItem(projectId, itemId, { 
                status: 'Rejected',
                updatedAt: new Date()
            });
            toast('Expense Rejected and purged from Triage.', { icon: '🗑️' });
        } catch (error) {
            toast.error('Failed to reject item.');
        }
    };

    const pendingReceiptsData = projects.flatMap(deal => {
        const items = ledgerItems[deal.id] || [];
        return items
          .filter(item => item.status === 'Pending')
          .map(item => ({ receipt: item, deal }));
    });


    const [isSyncingGcal, setIsSyncingGcal] = useState(false);

    const handleGcalSync = () => {
        setIsSyncingGcal(true);
        toast.loading('Syncing inspection schedule to Google Calendar...', { id: 'gcal' });
        setTimeout(() => {
            toast.success('Synced to Google Calendar!', { id: 'gcal' });
            setIsSyncingGcal(false);
        }, 1500);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
               <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                   <h3 className="text-lg font-medium">Contingency Triage Matrix</h3>
                   <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                       {pendingReceiptsData.length} Action Required
                   </span>
               </div>
               
               <div className="p-0">
                  {pendingReceiptsData.length === 0 ? (
                      <div className="p-12 text-center text-gray-400">
                          <CheckSquare className="w-12 h-12 mx-auto mb-3 text-green-300 opacity-50" />
                          <p>The Triage Queue is clear.</p>
                      </div>
                  ) : (
                      <div className="divide-y divide-gray-100">
                           {pendingReceiptsData.map(({ receipt, deal }) => {
                               const validation = verifyContingencyBuffer(deal, receipt);
                               const isDanger = validation.projectedTotal > validation.rehabBudgetBase; // Passed baseline but under buffer
                               const isBreach = !validation.canApprove;

                               return (
                                   <div key={receipt.id} className={`flex flex-col md:flex-row p-6 gap-6 ${isBreach ? 'bg-red-50/30' : ''}`}>
                                       {/* Image Viewer */}
                                       <div className="md:w-1/3 bg-gray-100 rounded-lg aspect-auto flex items-center justify-center relative overflow-hidden border border-gray-200 min-h-[200px]">
                                            <img src="https://images.unsplash.com/photo-1621217032731-bf55c7075253?auto=format&fit=crop&q=80&w=400" alt="Receipt Mock" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-multiply" />
                                            <div className="z-10 absolute bottom-3 right-3 bg-black/60 backdrop-blur text-white text-xs px-2 py-1 rounded flex items-center">
                                               <Paperclip className="w-3 h-3 mr-1"/> Attached Evidence
                                            </div>
                                       </div>

                                       {/* Data Validation Side */}
                                       <div className="md:w-2/3 flex flex-col pl-4">
                                           <div className="flex justify-between items-start">
                                               <div>
                                                   <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{deal.propertyName}</p>
                                                   <h4 className="text-xl font-bold text-gray-900">${receipt.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h4>
                                                   <p className="text-sm text-gray-600 border border-gray-200 bg-gray-50 px-2 py-0.5 rounded inline-block mt-2">{receipt.description}</p>
                                               </div>
                                               
                                               <div className="text-right">
                                                   <p className="text-xs text-gray-500">Submitted by: <span className="font-medium text-gray-700">General Contractor</span></p>
                                                   <p className="text-xs text-gray-400 mt-1">{new Date(receipt.createdAt).toLocaleString()}</p>
                                               </div>
                                           </div>

                                           {/* Buffer Intelligence */}
                                           <div className="mt-6">
                                               <div className="flex justify-between text-xs mb-1">
                                                   <span className="text-gray-600">Base Budget: ${validation.rehabBudgetBase.toLocaleString()}</span>
                                                   <span className="text-gray-600 flex items-center"><AlertTriangle className="w-3 h-3 mr-1 text-orange-400"/> Max Buffer: ${validation.rehabBudgetBuffered.toLocaleString()}</span>
                                               </div>
                                               <div className="w-full bg-gray-200 rounded-full h-2">
                                                   <div 
                                                       className={`h-2 rounded-full ${isBreach ? 'bg-red-500' : isDanger ? 'bg-orange-400' : 'bg-blue-500'}`} 
                                                       style={{ width: `${Math.min(100, (validation.projectedTotal / validation.rehabBudgetBuffered) * 100)}%` }}></div>
                                               </div>
                                               <p className={`text-xs mt-2 font-medium ${isBreach ? 'text-red-600' : isDanger ? 'text-orange-600' : 'text-gray-500'}`}>
                                                   {isBreach 
                                                       ? `WARNING: Exceeds Contingency Enforcer by $${validation.exceedsBy.toLocaleString()}` 
                                                       : isDanger 
                                                       ? `CAUTION: Tapping into 15% Contingency Escrow (${(((validation.projectedTotal-validation.rehabBudgetBase)/(validation.rehabBudgetBuffered-validation.rehabBudgetBase))*100).toFixed(1)}% utilized)` 
                                                       : 'Safe: Operates within original scope parameters.'}
                                               </p>
                                           </div>

                                           {/* Triage Action Constraints */}
                                           <div className="mt-auto pt-6 flex flex-col gap-3">
                                               <div className="flex gap-3">
                                                    <button onClick={() => handleApproveReceipt(deal, receipt)} disabled={isBreach} className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2 rounded-lg text-sm font-medium transition flex items-center justify-center">
                                                        <CheckCircle className="w-4 h-4 mr-2" /> Approve & Post
                                                    </button>
                                                    <button onClick={() => handleRejectReceipt(deal.id, receipt.id)} className="flex-x bg-white border border-gray-300 hover:bg-red-50 hover:border-red-300 hover:text-red-600 text-gray-700 px-6 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center">
                                                        <XCircle className="w-4 h-4 mr-2" /> Reject
                                                    </button>
                                               </div>
                                               
                                               <div className="flex items-center gap-3 mt-1 pt-3 border-t border-gray-100">
                                                    <ESignAction 
                                                        documentName={`Lien Waiver - ${receipt.description}`}
                                                        signeeRole="General Contractor"
                                                        onSigned={() => {}} 
                                                    />
                                                    <button onClick={handleGcalSync} disabled={isSyncingGcal} className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50">
                                                        {isSyncingGcal ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <CalendarIcon className="w-3.5 h-3.5" />}
                                                        Sync GCal
                                                    </button>
                                               </div>
                                           </div>
                                       </div>
                                   </div>
                               );
                           })}
                      </div>
                  )}
               </div>
            </div>
            </div>
            
            <div className="lg:col-span-1 space-y-6">
                <TeamChatWidget projectId={pendingReceiptsData[0]?.deal?.id || 'triage'} />
            </div>
        </div>
    );
}
