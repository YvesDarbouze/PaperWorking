'use client';

import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Download, Trash2, AlertTriangle } from 'lucide-react';

export default function DataPrivacySettingsPage() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDownload = async () => {
    if (!user) return;
    setLoading(true);
    const downloadToast = toast.loading('Compiling data pack and files...');
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/account/data/download', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to generate export');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PaperWorking_GDPR_Export_${user.uid}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Your data pack is ready!', { id: downloadToast });
    } catch (e) {
      console.error(e);
      toast.error(`Export failed: ${e instanceof Error ? e.message : 'Unknown error'}`, { id: downloadToast });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchedule = async () => {
    if (!user) return;
    const confirm = window.confirm(
      'WARNING: Are you sure you want to delete your account? This will schedule a permanent deletion of your profile, projects, and storage files. You will have a 24-hour grace period to cancel.'
    );
    if (!confirm) return;

    setDeleting(true);
    const deleteToast = toast.loading('Scheduling account deletion...');
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/account/data/delete', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to schedule deletion');
      }

      toast.success('Account deletion scheduled. 24-hour grace period active.', { id: deleteToast });
    } catch (e) {
      console.error(e);
      toast.error(`Failed: ${e instanceof Error ? e.message : 'Unknown error'}`, { id: deleteToast });
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = async () => {
    if (!user) return;
    setDeleting(true);
    const cancelToast = toast.loading('Cancelling deletion request...');
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/account/data/delete', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to cancel deletion');
      }

      toast.success('Account deletion request successfully cancelled.', { id: cancelToast });
    } catch (e) {
      console.error(e);
      toast.error(`Failed: ${e instanceof Error ? e.message : 'Unknown error'}`, { id: cancelToast });
    } finally {
      setDeleting(false);
    }
  };

  const deletionScheduledAt = profile?.deletionScheduledAt;
  let deletionDate: Date | null = null;
  if (deletionScheduledAt) {
    if (
      typeof deletionScheduledAt === 'object' &&
      deletionScheduledAt !== null &&
      'toDate' in deletionScheduledAt &&
      typeof (deletionScheduledAt as { toDate: () => unknown }).toDate === 'function'
    ) {
      deletionDate = (deletionScheduledAt as { toDate: () => Date }).toDate();
    } else {
      deletionDate = new Date(deletionScheduledAt as string | number);
    }
  }

  const isDeletionPending = !!deletionDate;

  return (
    <div className="w-full space-y-8">
      <div className="grid grid-cols-12 gap-8">
        
        {/* ─── Deletion Grace Status Banner ─── */}
        {isDeletionPending && (
          <section className="col-span-12 p-6 rounded-2xl bg-amber-950/40 border border-amber-800/30 text-amber-200 flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <h3 className="text-base font-semibold text-amber-300">Account Deletion Scheduled</h3>
              <p className="text-sm text-amber-300/80 leading-relaxed">
                Your account is scheduled for permanent purge on{' '}
                <span className="font-semibold text-white">
                  {deletionDate?.toLocaleString() || '24 hours'}
                </span>
                . During this 24-hour grace window, all features remain active, and you can cancel this request at any time.
              </p>
              <button
                onClick={handleCancelDelete}
                disabled={deleting}
                className="h-10 px-5 rounded-lg bg-amber-500 text-black hover:bg-amber-400 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none text-sm font-medium"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Cancel Deletion Request
              </button>
            </div>
          </section>
        )}

        {/* ─── Portability Panel ─── */}
        <section className="col-span-12 md:col-span-6 glass-card rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between transition-all duration-200 hover:shadow-md">
          <div className="absolute top-0 right-0 w-32 h-32 bg-pw-primary/5 rounded-full blur-[50px] -z-10 pointer-events-none translate-x-1/2 -translate-y-1/2" />
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <Download className="w-5 h-5 text-pw-primary" />
              <h2 className="text-base font-semibold text-pw-black">Download My Data</h2>
            </div>
            
            <p className="text-sm text-pw-muted leading-relaxed">
              Export all your personal profile details, configured projects, transaction ledger items, and uploaded documents. We will package your portfolio assets into a structured, portable ZIP archive.
            </p>
          </div>

          <div className="mt-8">
            <button
              onClick={handleDownload}
              disabled={loading || isDeletionPending}
              className="w-full h-10 px-5 rounded-lg bg-pw-primary/20 border border-pw-primary/30 text-pw-primary text-sm font-medium hover:bg-pw-primary/30 active:scale-98 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Download ZIP Pack
            </button>
          </div>
        </section>

        {/* ─── Deletion Panel ─── */}
        <section className="col-span-12 md:col-span-6 glass-card rounded-2xl p-6 border border-red-500/20 relative overflow-hidden flex flex-col justify-between transition-all duration-200 hover:shadow-md">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-[50px] -z-10 pointer-events-none translate-x-1/2 -translate-y-1/2" />
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <Trash2 className="w-5 h-5 text-red-400" />
              <h2 className="text-base font-semibold text-pw-black">Delete My Account</h2>
            </div>
            
            <p className="text-sm text-pw-muted leading-relaxed">
              Initiating this request schedules the permanent deletion of your PaperWorking profile and assets. We will initiate a 24-hour grace window, after which all database files and Auth profiles are permanently purged. Legal audit logs are kept for 7 years for compliance.
            </p>
          </div>

          <div className="mt-8">
            <button
              onClick={handleDeleteSchedule}
              disabled={deleting || isDeletionPending}
              className="w-full h-10 px-5 rounded-lg bg-error/10 border border-error/30 text-error text-sm font-medium hover:bg-error/20 active:scale-98 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Delete My Account
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}
