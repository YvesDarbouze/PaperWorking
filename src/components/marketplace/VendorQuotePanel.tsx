'use client';

import React, { useEffect, useState } from 'react';
import { VendorRequest } from '@/types/schema';
import { projectsService } from '@/lib/firebase/deals';
import { acceptVendorQuote } from '@/lib/services/dealStateMachine';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { Loader2, CheckCircle, Clock } from 'lucide-react';

interface VendorQuotePanelProps {
  projectId: string;
}

export function VendorQuotePanel({ projectId }: VendorQuotePanelProps) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<VendorRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    // Listen to real-time updates for vendor requests on this project
    const unsubscribe = projectsService.subscribeToVendorRequests(projectId, (data) => {
      setRequests(data as VendorRequest[]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [projectId]);

  const handleAcceptQuote = async (request: VendorRequest) => {
    if (!user?.uid) {
      toast.error('Authentication required to accept quotes.');
      return;
    }

    setProcessingId(request.id);
    try {
      await acceptVendorQuote(projectId, request, user.uid);
      toast.success(`Successfully accepted quote from ${request.vendorUid}`);
    } catch (error) {
      // The error thrown from acceptVendorQuote is already human-readable
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error(message);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 bg-bg-surface border border-border-accent">
        <Loader2 className="w-6 h-6 animate-spin text-text-secondary" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="p-8 bg-bg-surface border border-border-accent text-center">
        <p className="text-xs font-black uppercase tracking-widest text-text-secondary">
          No Vendor Quotes Found
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-black uppercase tracking-[0.2em] text-text-primary mb-4">
        Marketplace Quotes
      </h3>
      <div className="border border-border-accent bg-pw-border space-y-px">
        {requests.map((req) => (
          <div key={req.id} className="bg-bg-surface p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors hover:bg-pw-dashboard/50">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${
                  req.status === 'ACCEPTED' ? 'bg-pw-black text-white' : 
                  req.status === 'QUOTED' ? 'bg-pw-phase-3 text-white' : 
                  'bg-pw-phase-1 text-text-primary'
                }`}>
                  {req.status}
                </span>
                <span className="text-[10px] text-text-secondary font-black uppercase tracking-widest">
                  Vendor: {req.vendorUid}
                </span>
              </div>
              <p className="text-sm text-text-secondary font-bold max-w-xl">
                {req.message || 'No additional details provided by the vendor.'}
              </p>
            </div>

            <div className="flex items-center gap-6 w-full md:w-auto">
              <div>
                <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1">Fee</p>
                <p className="text-lg font-black text-text-primary tracking-tight">
                  {req.quotedFee ? `$${req.quotedFee.toLocaleString()}` : '--'}
                </p>
              </div>

              <div className="ml-auto md:ml-0 flex items-center">
                {req.status === 'QUOTED' && (
                  <button
                    onClick={() => handleAcceptQuote(req)}
                    disabled={processingId === req.id || !req.quotedFee}
                    className="px-6 py-2.5 bg-pw-black text-white font-black text-[10px] uppercase tracking-widest hover:bg-pw-fg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[140px] justify-center"
                  >
                    {processingId === req.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Processing
                      </>
                    ) : (
                      'Accept Quote'
                    )}
                  </button>
                )}
                {req.status === 'ACCEPTED' && (
                  <div className="flex items-center gap-2 text-pw-black px-6 py-2.5 border border-pw-black">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-black text-[10px] uppercase tracking-widest">Accepted</span>
                  </div>
                )}
                {req.status === 'PENDING' && (
                  <div className="flex items-center gap-2 text-text-secondary px-6 py-2.5">
                    <Clock className="w-4 h-4" />
                    <span className="font-black text-[10px] uppercase tracking-widest">Waiting</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
