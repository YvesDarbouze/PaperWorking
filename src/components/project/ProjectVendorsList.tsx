'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { updateAssignmentStatus } from '@/actions/vendorAssignment';
import { Loader2, Calendar, FileText, CheckCircle2, Clock, XCircle, AlertTriangle, ArrowUpRight } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface VendorAssignment {
  id: string;
  projectId: string;
  vendorId: string;
  vendorName: string;
  serviceType: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED' | 'CANCELLED';
  message?: string;
  quotedFee?: number;
  createdAt: any;
  updatedAt: any;
}

interface ProjectVendorsListProps {
  projectId: string;
}

const STATUS_BADGES: Record<string, { bg: string; text: string; icon: any }> = {
  PENDING: { bg: 'rgba(234, 179, 8, 0.1)', text: '#EAB308', icon: Clock },
  ACCEPTED: { bg: 'rgba(34, 197, 94, 0.1)', text: '#3f7d20', icon: CheckCircle2 },
  DECLINED: { bg: 'rgba(239, 68, 68, 0.1)', text: '#F06543', icon: XCircle },
  COMPLETED: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3B82F6', icon: CheckCircle2 },
  CANCELLED: { bg: 'rgba(107, 114, 128, 0.1)', text: '#6B7280', icon: XCircle },
};

export function ProjectVendorsList({ projectId }: ProjectVendorsListProps) {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<VendorAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const q = query(
      collection(db, 'projects', projectId, 'vendorAssignments'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as VendorAssignment[];
        setAssignments(list);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to vendor assignments:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [projectId]);

  const handleUpdateStatus = async (assignmentId: string, newStatus: 'CANCELLED' | 'COMPLETED') => {
    if (!user) return;
    setUpdatingId(assignmentId);
    try {
      const idToken = await user.getIdToken();
      const res = await updateAssignmentStatus(idToken, projectId, assignmentId, newStatus);
      if (res.success) {
        toast.success(`Assignment marked as ${newStatus.toLowerCase()}.`);
      } else {
        toast.error(res.error || 'Failed to update status.');
      }
    } catch (err: any) {
      console.error('Failed to update status:', err);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 border rounded-lg" style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-surface)' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-secondary)' }} />
      </div>
    );
  }

  return (
    <div className="rounded-lg border shadow-sm" style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-surface)' }}>
      <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-surface)' }}>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Marketplace Vendor Requests</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Track active requests and assigned service providers from the Vendor Marketplace.
          </p>
        </div>
        <Link 
          href="/dashboard/marketplace"
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors"
          style={{ borderColor: 'var(--border-ui)', color: 'var(--text-primary)' }}
        >
          Marketplace
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="p-6">
        {assignments.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded-xl" style={{ borderColor: 'var(--border-ui)' }}>
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-500" />
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>No active requests yet</p>
            <p className="text-xs mt-1 mb-4" style={{ color: 'var(--text-secondary)' }}>
              Find title attorneys, inspectors, contractors, and appraisers in the marketplace.
            </p>
            <Link
              href="/dashboard/marketplace"
              className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold uppercase tracking-wider bg-teal-500 hover:bg-teal-400 text-black rounded transition-all"
            >
              Browse Vendors
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map((asg) => {
              const Badge = STATUS_BADGES[asg.status] || STATUS_BADGES.PENDING;
              const StatusIcon = Badge.icon;
              return (
                <div 
                  key={asg.id} 
                  className="rounded-xl p-5 border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all"
                  style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-surface)' }}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span 
                        className="px-2 py-0.5 text-[10px] font-bold rounded flex items-center gap-1 border"
                        style={{ backgroundColor: Badge.bg, borderColor: `${Badge.text}20`, color: Badge.text }}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {asg.status}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded border border-white/5 bg-white/5" style={{ color: 'var(--text-secondary)' }}>
                        {asg.serviceType}
                      </span>
                    </div>
                    <h3 className="font-semibold text-base pt-1" style={{ color: 'var(--text-primary)' }}>
                      {asg.vendorName}
                    </h3>
                    {asg.message && (
                      <p className="text-xs italic leading-relaxed pt-1" style={{ color: 'var(--text-secondary)' }}>
                        "{asg.message}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-6 w-full md:w-auto shrink-0 justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0" style={{ borderColor: 'var(--border-ui)' }}>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-secondary)' }}>Quote / Fee</p>
                      <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                        {asg.quotedFee ? `$${asg.quotedFee.toLocaleString()}` : '—'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {asg.status === 'PENDING' && (
                        <button
                          onClick={() => handleUpdateStatus(asg.id, 'CANCELLED')}
                          disabled={updatingId === asg.id}
                          className="px-4 py-2 border rounded text-xs font-semibold hover:bg-red-500/10 hover:text-red-500 transition-colors"
                          style={{ borderColor: 'var(--border-ui)', color: 'var(--text-secondary)' }}
                        >
                          {updatingId === asg.id ? '...' : 'Cancel'}
                        </button>
                      )}
                      {asg.status === 'ACCEPTED' && (
                        <button
                          onClick={() => handleUpdateStatus(asg.id, 'COMPLETED')}
                          disabled={updatingId === asg.id}
                          className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-black font-semibold rounded text-xs transition-colors"
                        >
                          {updatingId === asg.id ? '...' : 'Complete Work'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
