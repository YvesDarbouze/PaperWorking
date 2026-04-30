import React, { useState } from 'react';
import { ContractorBid } from '@/types/schema';
import { Plus, Users, Trash2, CheckCircle, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

interface ContractorBidsProps {
  bids: ContractorBid[];
  baseBudget: number;
  onChange: (bids: ContractorBid[]) => void;
}

export function ContractorBids({ bids, baseBudget, onChange }: ContractorBidsProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newBid, setNewBid] = useState<Partial<ContractorBid>>({
    contractorName: '',
    totalAmount: 0,
    status: 'Pending',
    notes: '',
  });

  const handleAdd = () => {
    if (!newBid.contractorName || !newBid.totalAmount) {
      toast.error('Contractor name and bid amount are required');
      return;
    }

    const bid: ContractorBid = {
      id: crypto.randomUUID(),
      contractorName: newBid.contractorName,
      totalAmount: Number(newBid.totalAmount),
      status: newBid.status as 'Pending' | 'Approved' | 'Rejected',
      notes: newBid.notes || '',
      submittedAt: new Date(),
    };

    onChange([...bids, bid]);
    setIsAdding(false);
    setNewBid({ contractorName: '', totalAmount: 0, status: 'Pending', notes: '' });
    toast.success('Contractor bid added');
  };

  const handleDelete = (id: string) => {
    onChange(bids.filter(b => b.id !== id));
    toast.success('Bid removed');
  };

  const updateStatus = (id: string, status: 'Pending' | 'Approved' | 'Rejected') => {
    // If approving, we might want to reject all others, but we'll leave that to the user for now
    onChange(bids.map(b => b.id === id ? { ...b, status } : b));
  };

  return (
    <div className="p-6 rounded-lg shadow-sm border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Contractor Bids</h2>
        </div>
        <div className="text-right">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Target Budget: <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>${baseBudget.toLocaleString()}</span></p>
        </div>
      </div>

      <div className="space-y-4">
        {bids.map(bid => {
          const variance = bid.totalAmount - baseBudget;
          const variancePercent = baseBudget > 0 ? (variance / baseBudget) * 100 : 0;
          
          return (
            <div key={bid.id} className="p-4 rounded-md border flex flex-col gap-3" style={{ borderColor: 'var(--border-ui)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>{bid.contractorName}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded text-xs border ${
                      bid.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' :
                      bid.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                      'bg-yellow-50 text-yellow-700 border-yellow-200'
                    }`}>
                      {bid.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(bid.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
                      ${bid.totalAmount.toLocaleString()}
                    </div>
                    {baseBudget > 0 && (
                      <div className={`text-xs ${variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {variance > 0 ? '+' : ''}{variance.toLocaleString()} ({variance > 0 ? '+' : ''}{variancePercent.toFixed(1)}%)
                      </div>
                    )}
                  </div>
                  <button onClick={() => handleDelete(bid.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete Bid">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="text-sm text-gray-600">
                  {bid.notes || 'No notes provided.'}
                </div>
                <div className="flex items-center gap-2">
                  {bid.status !== 'Approved' && (
                    <button 
                      onClick={() => updateStatus(bid.id, 'Approved')}
                      className="px-3 py-1 text-xs font-medium bg-green-50 text-green-700 rounded border border-green-200 hover:bg-green-100 transition-colors"
                    >
                      Approve
                    </button>
                  )}
                  {bid.status !== 'Rejected' && (
                    <button 
                      onClick={() => updateStatus(bid.id, 'Rejected')}
                      className="px-3 py-1 text-xs font-medium bg-red-50 text-red-700 rounded border border-red-200 hover:bg-red-100 transition-colors"
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {bids.length === 0 && !isAdding && (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>
            No contractor bids received yet.
          </div>
        )}

        {isAdding && (
          <div className="p-4 rounded-md border border-blue-200 bg-blue-50 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700">Contractor Name</label>
                <input
                  type="text"
                  placeholder="e.g., ABC Renovations"
                  value={newBid.contractorName}
                  onChange={e => setNewBid({...newBid, contractorName: e.target.value})}
                  className="w-full px-3 py-2 rounded-md border bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700">Total Bid Amount ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newBid.totalAmount || ''}
                  onChange={e => setNewBid({...newBid, totalAmount: Number(e.target.value)})}
                  className="w-full px-3 py-2 rounded-md border bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1 text-gray-700">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Includes all materials except fixtures"
                  value={newBid.notes}
                  onChange={e => setNewBid({...newBid, notes: e.target.value})}
                  className="w-full px-3 py-2 rounded-md border bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                Save Bid
              </button>
            </div>
          </div>
        )}

        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full py-3 rounded-md border-2 border-dashed flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
            style={{ borderColor: 'var(--border-ui)', color: 'var(--text-secondary)' }}
          >
            <Plus className="w-4 h-4" />
            <span className="font-medium text-sm">Add Contractor Bid</span>
          </button>
        )}
      </div>
    </div>
  );
}
