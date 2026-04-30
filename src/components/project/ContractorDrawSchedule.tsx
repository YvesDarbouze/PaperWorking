import React, { useState } from 'react';
import { DrawScheduleItem } from '@/types/schema';
import { Plus, HandCoins, Trash2, CheckCircle, Clock, Calendar, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface ContractorDrawScheduleProps {
  draws: DrawScheduleItem[];
  totalBudget: number;
  onChange: (draws: DrawScheduleItem[]) => void;
}

export function ContractorDrawSchedule({ draws, totalBudget, onChange }: ContractorDrawScheduleProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newDraw, setNewDraw] = useState<Partial<DrawScheduleItem>>({
    milestone: '',
    completionPercentage: 0,
    amount: 0,
    status: 'Pending',
    requestedAt: new Date(),
  });

  const handleAdd = () => {
    if (!newDraw.milestone || !newDraw.amount) {
      toast.error('Milestone description and amount are required');
      return;
    }

    const draw: DrawScheduleItem = {
      id: crypto.randomUUID(),
      milestone: newDraw.milestone,
      completionPercentage: Number(newDraw.completionPercentage) || 0,
      amount: Number(newDraw.amount),
      status: newDraw.status as 'Pending' | 'Requested' | 'Approved' | 'Paid',
      requestedAt: newDraw.requestedAt || new Date(),
    };

    onChange([...draws, draw]);
    setIsAdding(false);
    setNewDraw({ milestone: '', completionPercentage: 0, amount: 0, status: 'Pending', requestedAt: new Date() });
    toast.success('Payout milestone logged');
  };

  const handleDelete = (id: string) => {
    onChange(draws.filter(d => d.id !== id));
    toast.success('Payout milestone removed');
  };

  const updateStatus = (id: string, status: 'Pending' | 'Requested' | 'Approved' | 'Paid') => {
    onChange(draws.map(d => 
      d.id === id ? { 
        ...d, 
        status, 
        requestedAt: status === 'Requested' ? new Date() : d.requestedAt,
        paidAt: status === 'Paid' ? new Date() : d.paidAt
      } : d
    ));
  };

  // Sort draws by date (if available)
  const sortedDraws = [...draws].sort((a, b) => {
    const dateA = a.paidAt || a.requestedAt || new Date(0);
    const dateB = b.paidAt || b.requestedAt || new Date(0);
    return dateA.getTime() - dateB.getTime();
  });

  const totalDispersed = draws.filter(d => d.status === 'Paid').reduce((sum, d) => sum + d.amount, 0);
  const totalAllocated = draws.reduce((sum, d) => sum + d.amount, 0);
  const remainingCapital = totalBudget - totalDispersed;
  const isOverBudget = totalAllocated > totalBudget;

  const formatDate = (date?: Date) => {
    if (!date) return 'TBD';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="p-6 rounded-lg shadow-sm border bg-white" style={{ borderColor: 'var(--border-ui)' }}>
      {/* Header and Financial Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <HandCoins className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Milestone Payout Tracker</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Log contractor draws and track available capital.</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="p-3 rounded-md border bg-gray-50 flex flex-col items-start min-w-[140px]">
            <span className="text-gray-500 font-medium">Rehab Budget</span>
            <span className="text-lg font-bold text-gray-900">${totalBudget.toLocaleString()}</span>
          </div>
          <div className="p-3 rounded-md border bg-blue-50 border-blue-100 flex flex-col items-start min-w-[140px]">
            <span className="text-blue-600 font-medium">Total Dispersed</span>
            <span className="text-lg font-bold text-blue-900">${totalDispersed.toLocaleString()}</span>
          </div>
          <div className={`p-3 rounded-md border flex flex-col items-start min-w-[140px] ${remainingCapital < 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
            <span className={`font-medium ${remainingCapital < 0 ? 'text-red-600' : 'text-green-600'}`}>Available Capital</span>
            <span className={`text-lg font-bold ${remainingCapital < 0 ? 'text-red-900' : 'text-green-900'}`}>
              ${remainingCapital.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {isOverBudget && (
        <div className="mb-6 p-4 rounded-md bg-red-50 border border-red-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-red-800">Budget Warning</h4>
            <p className="text-sm text-red-700 mt-1">
              Total allocated payouts (${totalAllocated.toLocaleString()}) exceed the rehab budget (${totalBudget.toLocaleString()}).
            </p>
          </div>
        </div>
      )}

      {/* Timeline UI */}
      <div className="relative border-l-2 border-gray-100 ml-4 pl-6 pb-4 space-y-8">
        {sortedDraws.map((draw, index) => {
          const isPaid = draw.status === 'Paid';
          const isPending = draw.status === 'Pending';
          const isApproved = draw.status === 'Approved';
          
          let iconColorClass = 'bg-gray-200 text-gray-500';
          let icon = <Clock className="w-4 h-4" />;
          
          if (isPaid) {
            iconColorClass = 'bg-green-500 text-white border-green-500';
            icon = <CheckCircle className="w-4 h-4" />;
          } else if (isApproved) {
            iconColorClass = 'bg-blue-500 text-white border-blue-500';
          } else if (draw.status === 'Requested') {
            iconColorClass = 'bg-yellow-500 text-white border-yellow-500';
          }

          return (
            <div key={draw.id} className="relative">
              {/* Timeline dot */}
              <div className={`absolute -left-[35px] top-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center ${iconColorClass}`}>
                {icon}
              </div>

              <div className={`p-4 rounded-lg border transition-all ${isPaid ? 'bg-gray-50/50 border-gray-200' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  
                  {/* Left Side: Info */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        isPaid ? 'bg-green-100 text-green-700' : 
                        isApproved ? 'bg-blue-100 text-blue-700' : 
                        isPending ? 'bg-gray-100 text-gray-700' : 
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {draw.status.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(draw.paidAt || draw.requestedAt)}
                      </span>
                    </div>
                    <h3 className={`font-semibold text-lg ${isPaid ? 'text-gray-600 line-through decoration-gray-300' : 'text-gray-900'}`}>
                      {draw.milestone}
                    </h3>
                  </div>

                  {/* Right Side: Amount & Actions */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={`text-xl font-bold ${isPaid ? 'text-gray-500' : 'text-gray-900'}`}>
                        ${draw.amount.toLocaleString()}
                      </div>
                      {draw.completionPercentage > 0 && (
                        <div className="text-xs text-gray-500">{draw.completionPercentage}% of work</div>
                      )}
                    </div>
                    
                    {!isPaid && (
                      <button onClick={() => handleDelete(draw.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Workflow Actions */}
                {!isPaid && (
                  <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                    {draw.status === 'Pending' && (
                      <button 
                        onClick={() => updateStatus(draw.id, 'Requested')}
                        className="px-3 py-1.5 text-xs font-medium bg-white text-gray-700 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors shadow-sm"
                      >
                        Request Funds
                      </button>
                    )}
                    {draw.status === 'Requested' && (
                      <button 
                        onClick={() => updateStatus(draw.id, 'Approved')}
                        className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-md border border-blue-200 hover:bg-blue-100 transition-colors"
                      >
                        Approve Request
                      </button>
                    )}
                    {draw.status === 'Approved' && (
                      <button 
                        onClick={() => updateStatus(draw.id, 'Paid')}
                        className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-md border border-green-700 hover:bg-green-700 transition-colors shadow-sm"
                      >
                        Confirm Payout
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {draws.length === 0 && !isAdding && (
          <div className="text-center py-10 rounded-lg border border-dashed border-gray-200">
            <HandCoins className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No payouts have been logged yet.</p>
          </div>
        )}

        {isAdding && (
          <div className="relative">
            <div className="absolute -left-[35px] top-1 w-6 h-6 rounded-full border-2 border-white bg-blue-100 text-blue-600 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <div className="p-5 rounded-lg border border-blue-200 bg-blue-50 shadow-sm">
              <h4 className="font-semibold text-blue-900 mb-4">Log New Payout Milestone</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-700">Associated Milestone</label>
                  <input
                    type="text"
                    placeholder="e.g., Demolition Completed"
                    value={newDraw.milestone}
                    onChange={e => setNewDraw({...newDraw, milestone: e.target.value})}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-700">Draw Date (Est.)</label>
                  <input
                    type="date"
                    value={newDraw.requestedAt ? new Date(newDraw.requestedAt).toISOString().split('T')[0] : ''}
                    onChange={e => setNewDraw({...newDraw, requestedAt: new Date(e.target.value)})}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-700">Amount Dispersed ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={newDraw.amount || ''}
                    onChange={e => setNewDraw({...newDraw, amount: Number(e.target.value)})}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-700">% of Overall Work (Optional)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="e.g. 25"
                    value={newDraw.completionPercentage || ''}
                    onChange={e => setNewDraw({...newDraw, completionPercentage: Number(e.target.value)})}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-blue-100">
                <button
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm"
                >
                  Add Milestone
                </button>
              </div>
            </div>
          </div>
        )}

        {!isAdding && (
          <div className="relative mt-4">
            <div className="absolute -left-[35px] top-1 w-6 h-6 rounded-full border-2 border-white bg-gray-100 text-gray-400 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <button
              onClick={() => setIsAdding(true)}
              className="w-full py-4 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center gap-2 hover:bg-gray-50 hover:border-gray-300 transition-colors text-gray-500 hover:text-gray-700"
            >
              <Plus className="w-4 h-4" />
              <span className="font-medium text-sm">Add Next Payout Milestone</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
