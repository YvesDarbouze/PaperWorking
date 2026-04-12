'use client';

import React from 'react';
import { useDealStore } from '@/store/dealStore';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { CostEntry } from '@/types/schema';
import { UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';

export default function GCUploadSimulator() {
  const deals = useDealStore(state => state.deals);

  const simulateGCUpload = async () => {
    // Pick the first accessible deal or mock if none
    const targetDeal = deals[0];
    if (!targetDeal) {
      toast.error('No deals available to simulate upload.');
      return;
    }

    const mockCost: CostEntry = {
      id: `cost_${Math.random().toString(36).substr(2, 9)}`,
      category: 'Foundation',
      description: 'Concrete pour and leveling',
      amount: 15200,
      approved: false, // GC cannot approve costs, only PM/LI
      dateAdded: new Date().toISOString()
    };

    const docRef = doc(db, 'deals', targetDeal.id);
    toast.loading('Simulating General Contractor action...', { id: 'gc-sim' });

    try {
      await updateDoc(docRef, {
        'financials.costs': arrayUnion(mockCost)
      });
      toast.success('GC action synced to Firestore!', { id: 'gc-sim' });
    } catch (e: any) {
      toast.error(`Sim failed: ${e.message}`, { id: 'gc-sim' });
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 w-72 animate-in slide-in-from-right-8 fade-in duration-500">
       <div className="flex items-center space-x-2 text-gray-800 mb-2 border-b border-gray-100 pb-2">
         <UploadCloud className="w-4 h-4 text-orange-500"/>
         <span className="text-sm font-bold tracking-tight">Test Harness</span>
       </div>
       <p className="text-xs text-gray-500 mb-4 leading-tight">
         Skip having to open two tabs. Click this to simulate a General Contractor out in the field uploading a $15k receipt.
       </p>
       <button
         onClick={simulateGCUpload}
         className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2 rounded-md transition-colors shadow-sm"
       >
         Simulate GC Receipt Upload
       </button>
    </div>
  );
}
