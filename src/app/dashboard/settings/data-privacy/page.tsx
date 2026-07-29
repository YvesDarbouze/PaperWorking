'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUserRoleTier } from '@/lib/auth/roleTiers';
import { useSettingsStore } from '@/store/settingsStore';
import { SettingsErrorBoundary } from '@/components/settings/ErrorBoundary';
import { FormSkeleton } from '@/components/settings/SettingsSkeletons';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Download, AlertTriangle, Shield, Check, Trash2, X, RefreshCw, Clock } from 'lucide-react';

interface ExportItem {
  id: string;
  date: string;
  downloadUrl: string;
  expiresAt: string;
}

interface ActiveJob {
  id: string;
  status: string;
  createdAt: string;
}

function DataPrivacySettingsForm() {
  const { user, profile } = useAuth();
  const userTier = getUserRoleTier(profile?.role);
  const { workspace, fetchWorkspace, scheduleWorkspaceDeletion, cancelWorkspaceDeletion } = useSettingsStore();

  const [loading, setLoading] = useState(true);
  const [exports, setExports] = useState<ExportItem[]>([]);
  const [activeJob, setActiveJob] = useState<ActiveJob | null>(null);
  const [deletionScheduledAt, setDeletionScheduledAt] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmWorkspaceName, setConfirmWorkspaceName] = useState('');
  const [deletingWorkspace, setDeletingWorkspace] = useState(false);
  const [tick, setTick] = useState(0);

  // Sync deletion date from workspace store
  useEffect(() => {
    const dataObj = workspace.data as any;
    if (dataObj?.deletionDate) {
      setDeletionScheduledAt(dataObj.deletionDate);
    } else {
      setDeletionScheduledAt(null);
    }
  }, [workspace.data]);

  // Load baseline workspace data to verify name
  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  // Countdown timer tick logic
  useEffect(() => {
    if (!deletionScheduledAt) return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [deletionScheduledAt]);

  const loadDataControl = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/data/export/status', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setExports(data.exports || []);
        if (data.status && data.status !== 'Ready for Download' && data.status !== 'none') {
          setActiveJob({
            id: 'active',
            status: data.status,
            createdAt: new Date().toISOString(),
          });
        } else {
          setActiveJob(null);
        }
      }
    } catch (err) {
      console.warn('[data-privacy] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDataControl();
  }, [loadDataControl]);

  // Poll for completion of background export jobs every 5 seconds
  useEffect(() => {
    if (!activeJob) return;
    const interval = setInterval(() => {
      loadDataControl();
    }, 5000);
    return () => clearInterval(interval);
  }, [activeJob, loadDataControl]);

  const triggerExport = async () => {
    if (!user) return;
    setExporting(true);
    const tid = toast.loading('Initiating account history export job...');
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/data/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to trigger data export');
      const data = await res.json();
      setActiveJob({
        id: data.jobId || 'active',
        status: data.status || 'Queued',
        createdAt: new Date().toISOString(),
      });
      toast.success('Data export job queued.', { id: tid });
      loadDataControl();
    } catch (err: any) {
      toast.error(err.message || 'Failed to trigger export.', { id: tid });
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !workspace.data) return;

    if (confirmWorkspaceName !== workspace.data.name) {
      toast.error(`Workspace name does not match. Please type exactly: ${workspace.data.name}`);
      return;
    }

    setDeletingWorkspace(true);
    const tid = toast.loading('Scheduling workspace deletion...');
    try {
      const delDate = await scheduleWorkspaceDeletion(confirmWorkspaceName);
      toast.success('Workspace scheduled for deletion. 48-hour grace period active.', { id: tid });
      setShowDeleteConfirm(false);
      setConfirmWorkspaceName('');
      setDeletionScheduledAt(delDate);
      loadDataControl();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete workspace.', { id: tid });
    } finally {
      setDeletingWorkspace(false);
    }
  };

  const handleCancelDeletion = async () => {
    if (!user) return;
    const tid = toast.loading('Cancelling deletion request...');
    try {
      await cancelWorkspaceDeletion();
      toast.success('Workspace deletion request cancelled successfully.', { id: tid });
      setDeletionScheduledAt(null);
      loadDataControl();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel deletion.', { id: tid });
    }
  };

  if (loading || (workspace.loading && !workspace.data)) {
    return (
      <div className="max-w-[720px] mx-auto space-y-8 animate-pulse">
        <FormSkeleton rows={3} />
        <FormSkeleton rows={2} />
      </div>
    );
  }

  // Gate Data Control to Admin role
  if (userTier !== 'admin') {
    return (
      <div className="max-w-[720px] mx-auto flex items-center justify-center py-20 px-4">
        <div className="glass-card border border-pw-border p-6 max-w-sm text-center space-y-4 rounded-2xl shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-pw-primary/10 border border-pw-primary/20 flex items-center justify-center mx-auto text-[#3279F9]">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-pw-black">Admin Access Required</h2>
          <p className="text-xs text-pw-muted leading-relaxed">
            Data Control settings are restricted to Workspace Administrators.
          </p>
          <Link
            href="/dashboard/settings/profile"
            className="luminous-button h-10 px-5 rounded-lg text-sm font-medium active:scale-98 transition-all flex items-center justify-center gap-2 w-full"
          >
            Back to Account Settings
          </Link>
        </div>
      </div>
    );
  }

  const workspaceName = workspace.data?.name || 'Apex Capital Workspace';

  const getRemainingTime = () => {
    if (!deletionScheduledAt) return '47 hours, 12 minutes';
    const diffMs = new Date(deletionScheduledAt).getTime() - Date.now();
    if (diffMs <= 0) return '0 hours, 0 minutes';
    const totalMins = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hours} hours, ${mins} minutes`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* 1. DATA EXPORT SECTION */}
      <section className="bg-white border border-slate-100 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Data Export</h2>
          <p className="text-xs text-slate-500 mt-1">
            Request a complete archive of your workspace files, underwriting deals, message logs, and account metadata.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50/50 border border-slate-100">
          <div>
            <p className="text-xs font-semibold text-slate-800">Request All Workspace Archives</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Exports are processed in the background.</p>
          </div>
          
          <button
            onClick={triggerExport}
            disabled={exporting || !!activeJob}
            className="h-10 px-4 py-2 rounded-lg bg-[#6B8E6B] hover:bg-[#557255] text-white disabled:opacity-40 disabled:pointer-events-none transition-all text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            {exporting || activeJob ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                {activeJob?.status || 'Processing'}
              </>
            ) : (
              'Export All Data'
            )}
          </button>
        </div>

        {/* Previous Exports List */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Available Downloads</h3>
          {exports.length === 0 ? (
            <p className="text-xs text-slate-400 font-mono italic">No archive data exports found.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {exports.map((exp) => {
                const isExpired = new Date(exp.expiresAt).getTime() < Date.now();
                return (
                  <div key={exp.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <p className="font-semibold text-slate-800">Archive Export ({exp.id.slice(-6)})</p>
                      {isExpired ? (
                        <p className="text-[10px] text-red-650 font-semibold mt-0.5">
                          This export has expired. Generate a new one.
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-400 font-normal">
                          Generated: {new Date(exp.date).toLocaleString()} · Expires: {new Date(exp.expiresAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {isExpired ? (
                      <span className="text-xs text-slate-400 italic font-medium pr-2">Expired</span>
                    ) : (
                      <a
                        href={exp.downloadUrl}
                        className="h-8 px-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-1 cursor-pointer font-semibold"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 2. WORKSPACE DELETION SECTION */}
      <section className="border border-red-200 rounded-xl p-6 sm:p-8 bg-red-50/50 space-y-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-100 border border-red-250 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-red-650">Danger Zone: Delete Workspace</h2>
            <p className="text-xs text-red-600/80 mt-1">
              Permanently delete all workspace deals, pipeline files, and data structures.
            </p>
          </div>
        </div>

        {deletionScheduledAt ? (
          <div className="p-4 rounded-xl bg-red-100/50 border border-red-200 space-y-4">
            <div className="flex items-center gap-2 text-xs text-red-605 font-semibold">
              <Clock className="w-4 h-4 text-red-600" />
              <span>Your workspace will be deleted in {getRemainingTime()}.</span>
            </div>
            <p className="text-xs text-red-600/85">
              Your workspace is currently inside the grace period. All features remain operational. You can cancel this request at any time before expiration.
            </p>
            <button
              onClick={handleCancelDeletion}
              className="h-10 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-all text-xs font-semibold cursor-pointer"
            >
              Cancel Deletion
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-red-50 border border-red-100 rounded-xl">
            <div className="max-w-md">
              <p className="text-xs font-semibold text-slate-800">Delete Workspace: {workspaceName}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Once deleted, all assets are permanently purged. This action is non-reversible.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="h-10 px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-all text-xs font-semibold cursor-pointer shrink-0 uppercase tracking-wider"
            >
              Delete Workspace
            </button>
          </div>
        )}
      </section>

      {/* ─── WORKSPACE DELETION CONFIRMATION OVERLAY MODAL ─── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-[480px] rounded-2xl p-6 border border-slate-200 shadow-2xl relative space-y-6">
            <button
              onClick={() => {
                setShowDeleteConfirm(false);
                setConfirmWorkspaceName('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-650"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-red-600">Delete Corporate Workspace?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                This will permanently delete all properties, deals, documents, and member data. This action cannot be undone.
              </p>
            </div>

            <form onSubmit={handleDeleteWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Type <span className="font-bold text-slate-800 select-all">"{workspaceName}"</span> to confirm:
                </label>
                <input
                  type="text"
                  value={confirmWorkspaceName}
                  onChange={(e) => setConfirmWorkspaceName(e.target.value)}
                  placeholder={workspaceName}
                  className="w-full text-sm px-4 h-10 rounded-lg border border-slate-200 text-slate-900 focus:ring-2 focus:ring-red-650 focus:outline-none transition-all"
                  required
                />
              </div>

              <div className="bg-[#FFF8E1] border border-[#FFE082] text-[#B76E00] rounded-lg p-3 text-[11px] flex items-start gap-2">
                <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                <span>If confirmed, a 48-hour grace period begins before workspace records are permanently purged.</span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setConfirmWorkspaceName('');
                  }}
                  disabled={deletingWorkspace}
                  className="flex-1 h-10 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer transition-all"
                >
                  Keep Workspace
                </button>
                <button
                  type="submit"
                  disabled={deletingWorkspace || confirmWorkspaceName !== workspaceName}
                  className="flex-1 h-10 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-semibold cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  {deletingWorkspace && (
                    <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  )}
                  Delete Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default function DataPrivacySettingsPage() {
  return (
    <SettingsErrorBoundary>
      <DataPrivacySettingsForm />
    </SettingsErrorBoundary>
  );
}
