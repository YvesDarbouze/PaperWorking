'use client';

import React, { useState, useEffect } from 'react';
import { Check, X, Search, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { Notification } from '@/types/notification';

interface UnattributedTransactionCardProps {
  item: Notification;
  onAssignComplete: () => Promise<void>;
}

export default function UnattributedTransactionCard({
  item,
  onAssignComplete,
}: UnattributedTransactionCardProps) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [ignoring, setIgnoring] = useState<boolean>(false);
  const [searching, setSearching] = useState<boolean>(false);

  const metadata = item.objectReference?.metadata || {};
  const plaidId = metadata.plaidId as string;
  const txName = metadata.name as string || item.title || 'Unknown Transaction';
  const txAmount = Number(metadata.amount || 0);
  const txDate = metadata.date ? new Date(metadata.date as string) : new Date();
  const suggestedCategory = metadata.reiCategory as string || 'unknown';

  // Format amount
  const formattedAmount = (txAmount / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  // Fetch projects on mount
  useEffect(() => {
    async function fetchProjects() {
      try {
        const idToken = await user?.getIdToken();
        const res = await fetch('/api/projects', {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });
        const data = await res.json();
        if (data.success) {
          setProjects(data.projects || []);
        } else {
          console.error('[UnattributedTransactionCard] Failed to fetch projects:', data.error);
        }
      } catch (err) {
        console.error('[UnattributedTransactionCard] Error fetching projects:', err);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchProjects();
    }
  }, [user]);

  // Handle manual assign
  const handleAssign = async () => {
    if (!selectedProjectId) {
      toast.error('Please select a project');
      return;
    }

    setSubmitting(true);
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch(`/api/transactions/${plaidId}/attribution`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ projectId: selectedProjectId }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Transaction attributed successfully!', {
          style: { background: '#0d0d0d', color: '#fff' },
        });
        await onAssignComplete();
      } else {
        toast.error(data.error || 'Failed to attribute transaction');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error attributing transaction');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle ignore
  const handleIgnore = async () => {
    setIgnoring(true);
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch(`/api/transactions/${plaidId}/attribution`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ projectId: null, ignore: true }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Transaction ignored', {
          style: { background: '#0d0d0d', color: '#fff' },
        });
        await onAssignComplete();
      } else {
        toast.error(data.error || 'Failed to ignore transaction');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error ignoring transaction');
    } finally {
      setIgnoring(false);
    }
  };

  // Handle search again (re-runs matching engine)
  const handleSearchAgain = async () => {
    setSearching(true);
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch(`/api/transactions/${plaidId}/attribution/search`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const data = await res.json();
      if (data.success && data.projectId) {
        setSelectedProjectId(data.projectId);
        toast.success(`Suggested project: ${data.projectName || data.projectId}`, {
          style: { background: '#0d0d0d', color: '#fff' },
        });
      } else {
        toast.error('No project match found. Choose manually.', {
          style: { background: '#0d0d0d', color: '#fff' },
        });
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to run matching search');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="mt-4 p-5 rounded-2xl bg-white/5 border border-white/10 text-white space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-white/5">
        <div>
          <h4 className="text-sm font-bold tracking-wide">{txName}</h4>
          <p className="text-[10px] text-gray-400">
            Suggested Category: <span className="text-primary font-semibold">{suggestedCategory}</span>
          </p>
        </div>
        <div className="text-right">
          <span className="text-sm font-black text-white">{formattedAmount}</span>
          <p className="text-[10px] text-gray-400">{txDate.toLocaleDateString('en-US')}</p>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            Loading candidate projects...
          </div>
        ) : (
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
              ASSIGN TO PROJECT
            </label>
            <select
              id={`select-project-${plaidId}`}
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-4 py-3 bg-[#121014] border border-white/10 rounded-full text-white text-xs font-bold tracking-widest focus:outline-none focus:border-primary transition-all"
            >
              <option value="">Select a project...</option>
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id} className="bg-[#121014]">
                  {proj.propertyName || proj.address || proj.id}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2.5 pt-2">
          <button
            id={`btn-assign-${plaidId}`}
            onClick={handleAssign}
            disabled={submitting || ignoring || searching || !selectedProjectId}
            className="flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider bg-white text-black hover:bg-white/90 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            Assign to Project
          </button>

          <button
            id={`btn-search-again-${plaidId}`}
            onClick={handleSearchAgain}
            disabled={submitting || ignoring || searching}
            className="flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider bg-white/10 hover:bg-white/25 text-white disabled:opacity-50 transition-colors border border-white/10 cursor-pointer"
          >
            {searching ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            Search Again
          </button>

          <button
            id={`btn-ignore-${plaidId}`}
            onClick={handleIgnore}
            disabled={submitting || ignoring || searching}
            className="flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider bg-red-600/20 hover:bg-red-600/35 text-red-400 disabled:opacity-50 transition-colors border border-red-500/20 cursor-pointer"
          >
            {ignoring ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <X className="w-3.5 h-3.5" />
            )}
            Ignore
          </button>
        </div>
      </div>
    </div>
  );
}
