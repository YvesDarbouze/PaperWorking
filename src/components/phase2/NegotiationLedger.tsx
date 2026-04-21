import React, { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { Negotiation } from '@/types/schema';

export const NegotiationLedger: React.FC = () => {
  const currentProject = useProjectStore((s) => s.currentProject);
  const submitOffer = useProjectStore((s) => s.submitOffer);
  const logCounterOffer = useProjectStore((s) => s.logCounterOffer);

  const [offerAmount, setOfferAmount] = useState<number | ''>('');
  const [emd, setEmd] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  if (!currentProject) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerAmount || !emd) return;
    
    submitOffer(currentProject.id, {
      offerAmount: Number(offerAmount),
      earnestMoneyDeposit: Number(emd),
      status: 'Pending',
      notes
    });

    setOfferAmount('');
    setEmd('');
    setNotes('');
  };

  const handleStatusUpdate = (negId: string, status: Negotiation['status'], counterOffer?: number) => {
    logCounterOffer(currentProject.id, negId, counterOffer || 0, status);
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Negotiation Ledger</h2>
      
      <div className="space-y-4 mb-8 max-h-[400px] overflow-y-auto pr-2">
        {currentProject.negotiations?.map((neg) => (
          <div key={neg.id} className="p-4 rounded-lg bg-gray-50 border border-gray-100">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-sm text-gray-500">{new Date(neg.date).toLocaleDateString()}</span>
                <h3 className="font-medium text-gray-900">Offer: ${(neg.offerAmount).toLocaleString()}</h3>
                <p className="text-sm text-gray-600">EMD: ${(neg.earnestMoneyDeposit).toLocaleString()}</p>
                {neg.counterOffer ? <p className="text-sm font-medium text-orange-600 mt-1">Counter: ${(neg.counterOffer).toLocaleString()}</p> : null}
                {neg.notes && <p className="text-sm text-gray-500 mt-2 italic">"{neg.notes}"</p>}
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                neg.status === 'Accepted' ? 'bg-green-100 text-green-800' :
                neg.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {neg.status}
              </span>
            </div>
            
            {neg.status === 'Pending' && (
              <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
                <button
                  onClick={() => handleStatusUpdate(neg.id, 'Accepted')}
                  className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-md text-sm transition-colors cursor-pointer"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleStatusUpdate(neg.id, 'Rejected')}
                  className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-md text-sm transition-colors cursor-pointer"
                >
                  Reject
                </button>
                <button
                  onClick={() => {
                    const counter = prompt('Enter counter offer amount:');
                    if (counter && !isNaN(Number(counter))) {
                      handleStatusUpdate(neg.id, 'Pending', Number(counter));
                    }
                  }}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md text-sm transition-colors cursor-pointer"
                >
                  Log Counter
                </button>
              </div>
            )}
          </div>
        ))}
        {(!currentProject.negotiations || currentProject.negotiations.length === 0) && (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
            No negotiations logged yet.
          </div>
        )}
      </div>

      <div className="pt-6 border-t border-gray-100">
        <h3 className="font-medium text-gray-800 mb-4">Submit New Offer</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Offer Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  required
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(Number(e.target.value) || '')}
                  className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Earnest Money Deposit</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  required
                  value={emd}
                  onChange={(e) => setEmd(Number(e.target.value) || '')}
                  className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
              placeholder="Terms, conditions, target delivery date..."
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 focus:ring-4 focus:ring-gray-200 transition-all font-medium cursor-pointer"
          >
            Log Offer
          </button>
        </form>
      </div>
    </div>
  );
};
