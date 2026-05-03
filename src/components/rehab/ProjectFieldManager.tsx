import React, { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { CheckCircle, UploadCloud, ClipboardList, Camera, AlertCircle, X, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import DealProgressTracker from '@/components/shared/DealProgressTracker';
import TeamChatWidget from '@/components/shared/TeamChatWidget';

interface ProjectFieldManagerProps {
  projectId: string;
  onClose: () => void;
}

export default function ProjectFieldManager({ projectId, onClose }: ProjectFieldManagerProps) {
  const projects = useProjectStore(state => state.projects);
  const updateProjectFinancials = useProjectStore(state => state.updateProjectFinancials);

  const currentProject = projects.find(d => d.id === projectId);

  const [receiptAmount, setReceiptAmount] = useState('');
  const [receiptCategory, setReceiptCategory] = useState<any>('Plumbing');
  const [isUploading, setIsUploading] = useState(false);

  if (!currentProject) return null;

  const rehabTasks = currentProject.financials?.rehabTasks || [];

  const handleReceiptUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptAmount || isNaN(Number(receiptAmount))) {
      toast.error('Please enter a valid numeric amount.');
      return;
    }

    setIsUploading(true);
    const mockCostEntry = {
      id: `cost_${Date.now()}`,
      description: `Field Receipt - ${receiptCategory}`,
      amount: Number(receiptAmount),
      approved: false,
      addedBy: 'General Contractor',
      createdAt: new Date(),
      category: receiptCategory,
      receiptUrl: undefined,
      status: 'Pending Triage' as any,
      propertyName: currentProject.propertyName
    };

    const currentCosts = currentProject.financials.costs || [];
    updateProjectFinancials(currentProject.id, {
      costs: [...currentCosts, mockCostEntry]
    });

    setReceiptAmount('');
    setIsUploading(false);
    toast.success('Receipt transmitted to Engine Room Triage!');
  };

  const handleTaskCompletion = (taskId: string) => {
    const updatedTasks = rehabTasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          status: 'Complete' as any,
          afterPhotoUrl: undefined,
          escrowDrawRequested: true
        };
      }
      return t;
    });

    updateProjectFinancials(currentProject.id, { rehabTasks: updatedTasks });
    toast.success('Task finished! After-photo attached. Escrow Draw Request sent to Lender.', { duration: 4000, icon: '🏦' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-bg-primary rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto flex flex-col">
        
        {/* Global Tracker */}
        <DealProgressTracker currentPhase="Rehab" />

        {/* Header */}
        <div className="bg-bg-surface border-b border-border-accent p-5 flex justify-between items-center sticky top-[72px] z-10">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text-primary">Field Manager</h1>
            <p className="text-xs text-text-secondary font-medium truncate sm:w-auto w-[200px]">{currentProject.address}</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-bg-primary rounded-full transition"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
          
          {/* Receipt Upload Zone */}
          <div className="bg-bg-surface rounded-2xl shadow-sm border border-border-accent p-5">
            <div className="flex items-center space-x-2 mb-4">
              <UploadCloud className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-text-primary">Scan Receipt</h2>
            </div>
            
            <form onSubmit={handleReceiptUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1 border-b pb-1">Budget Category</label>
                  <select 
                    value={receiptCategory}
                    onChange={(e) => setReceiptCategory(e.target.value)}
                    className="w-full bg-bg-primary border border-border-accent rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Plumbing">Plumbing</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Framing">Framing</option>
                    <option value="HVAC">HVAC</option>
                    <option value="Foundation">Foundation</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1 border-b pb-1">Total Amount ($)</label>
                  <input 
                    type="number" 
                    required
                    placeholder="e.g. 542.50"
                    value={receiptAmount}
                    onChange={(e) => setReceiptAmount(e.target.value)}
                    className="w-full bg-bg-primary border border-border-accent rounded-lg p-2 text-lg font-mono placeholder-gray-300 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-4">
                <div className="border-2 border-dashed border-border-accent rounded-lg p-4 flex-1 flex flex-col items-center justify-center bg-bg-primary text-text-secondary cursor-pointer hover:bg-bg-primary transition min-h-[120px]">
                  <Camera className="w-6 h-6 mb-2" />
                  <span className="text-xs font-medium text-center">Tap to snap photo<br/>or select PDF</span>
                </div>

                <button 
                  type="submit"
                  disabled={isUploading}
                  className={`w-full py-2.5 rounded-xl text-white font-bold text-sm shadow-md transition flex items-center justify-center space-x-2 ${isUploading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}`}
                >
                  <Send className="w-4 h-4" />
                  <span>{isUploading ? 'Transmitting...' : 'Submit to Triage'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Linear Gantt/Task View */}
          <div className="bg-bg-surface rounded-2xl shadow-sm border border-border-accent p-5 mt-6">
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center space-x-2">
                 <ClipboardList className="w-5 h-5 text-text-primary" />
                 <h2 className="text-lg font-semibold text-text-primary">Rehab Timeline</h2>
               </div>
               {rehabTasks.some((t: any) => t.escrowDrawRequested) && (
                 <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full border border-green-200 hidden sm:block">
                   ACTIVE ESCROW DRAWS
                 </span>
               )}
            </div>
            
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-300 before:to-transparent">
              {rehabTasks.map((task: any, idx: number) => (
                <div key={task.id} className="relative flex items-center justify-between z-10 p-3 bg-bg-surface border rounded-xl shadow-sm hover:shadow-md transition">
                   <div className="flex items-center space-x-3">
                     {task.status === 'Complete' ? (
                       <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 bg-bg-surface" />
                     ) : task.status === 'In Progress' ? (
                       <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-blue-200 animate-spin flex-shrink-0 bg-bg-surface"></div>
                     ) : (
                       <div className="w-6 h-6 rounded-full border-[3px] border-border-accent flex-shrink-0 bg-bg-surface"></div>
                     )}
                     
                     <div>
                       <p className={`text-sm font-semibold ${task.status === 'Complete' ? 'text-text-secondary line-through' : 'text-text-primary'}`}>{task.title}</p>
                       <p className="text-xs uppercase tracking-wider text-text-secondary font-mono">${task.estimatedCost.toLocaleString()} • {task.category}</p>
                     </div>
                   </div>

                   {task.status !== 'Complete' && (
                      <button 
                        onClick={() => handleTaskCompletion(task.id)}
                        className="ml-2 text-xs px-3 py-1.5 bg-gray-900 text-white font-bold rounded hover:bg-gray-800 transition active:scale-95 shadow-sm"
                      >
                        MARK DONE
                      </button>
                   )}
                </div>
              ))}
            </div>

            <div className="mt-5 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-yellow-800 leading-relaxed">
                Marking a task "Done" requires an "After" photo. This automatically pings the Lead Investor to organize an Escrow Draw Request for your milestone payment.
              </p>
            </div>

          </div>
          </div>
          
          {/* Right Column: Chat integration */}
          <div className="space-y-6 mt-6 lg:mt-0">
             <TeamChatWidget projectId={projectId} />
          </div>
        </div>
      </div>
    </div>
  );
}
