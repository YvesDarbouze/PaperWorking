'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export default function DataPrivacyPanel() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletionScheduledAt, setDeletionScheduledAt] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState('Apex Capital Partners LLC');

  // Deletion modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Export state
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const fetchPrivacyState = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/settings/data-privacy');
      if (res.status === 401) {
        router.push('/login?next=/dashboard/settings?section=data-privacy');
        return;
      }
      if (!res.ok) throw new Error(`Failed to load data privacy state (${res.status})`);
      const data = await res.json();
      setDeletionScheduledAt(data.deletionScheduledAt || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading privacy state');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrivacyState();
  }, []);

  const handleExportData = async () => {
    setExporting(true);
    setExportSuccess(false);
    try {
      const res = await fetch('/api/settings/data-privacy?id=export');
      if (res.status === 401) {
        router.push('/login?next=/dashboard/settings?section=data-privacy');
        return;
      }
      // Trigger file download
      window.location.href = '/api/settings/data-privacy?id=export';
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch {
      setError('Failed to initiate data export download.');
    } finally {
      setExporting(false);
    }
  };

  const handleScheduleDeletion = async () => {
    if (confirmName !== workspaceName) {
      setDeleteError(`Please type "${workspaceName}" exactly to confirm.`);
      return;
    }

    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch('/api/settings/data-privacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subAction: 'delete-workspace',
          confirmName,
        }),
      });

      if (res.status === 401) {
        router.push('/login?next=/dashboard/settings?section=data-privacy');
        return;
      }

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to schedule erasure');

      setDeletionScheduledAt(json.deletionScheduledAt);
      setShowDeleteModal(false);
      setConfirmName('');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Error scheduling deletion');
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDeletion = async () => {
    try {
      const res = await fetch('/api/settings/data-privacy', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subAction: 'delete-workspace' }),
      });
      if (res.status === 401) {
        router.push('/login?next=/dashboard/settings?section=data-privacy');
        return;
      }
      setDeletionScheduledAt(null);
    } catch {
      setError('Failed to cancel scheduled deletion.');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center p-8">
        <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
          <span className="material-symbols-outlined animate-spin text-[var(--accent)]">
            progress_activity
          </span>
          Loading privacy controls…
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6" data-testid="data-privacy-panel">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Data &amp; Privacy</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Manage GDPR compliance, data export archives, and workspace retention schedules.
        </p>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-4 text-sm text-[var(--danger)]">
          <span>{error}</span>
          <Button type="button" variant="secondary" size="sm" onClick={fetchPrivacyState}>
            Retry
          </Button>
        </div>
      )}

      {exportSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400">
          <span className="material-symbols-outlined text-base">check_circle</span>
          Data export bundle successfully generated and downloaded.
        </div>
      )}

      {/* GDPR Data Export Section */}
      <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-3 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-2">
          Export Account &amp; Workspace Data
        </h3>
        <p className="text-sm text-[var(--text-secondary)]">
          Download a complete archive of your property underwriting models, financial statements, team rosters, and historical transactions in JSON format.
        </p>
        <div className="pt-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleExportData}
            disabled={exporting}
            data-variant="primary"
            data-testid="data-privacy-export-btn"
          >
            {exporting ? 'Generating Export…' : 'Export Data (JSON)'}
          </Button>
        </div>
      </section>

      {/* Erasure / Danger Zone Section */}
      <section className="rounded-2xl border border-[var(--danger)]/30 bg-[var(--bg-surface)] p-6 space-y-4 shadow-sm">
        <div className="border-b border-[var(--danger)]/20 pb-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--danger)]">
            Workspace Erasure &amp; GDPR Right to be Forgotten
          </h3>
        </div>

        {deletionScheduledAt ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-amber-400">warning</span>
              <div>
                <h4 className="text-sm font-bold text-amber-300">
                  Workspace Erasure Scheduled
                </h4>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  All workspace assets, financial ledgers, and team accounts are scheduled for irreversible scrubbing on{' '}
                  <strong className="text-[var(--text-primary)]">
                    {new Date(deletionScheduledAt).toLocaleString()}
                  </strong>
                  .
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCancelDeletion}
              className="text-xs"
            >
              Cancel Scheduled Erasure
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-[var(--text-secondary)]">
              Scheduling workspace erasure triggers an unrecoverable 48-hour purge of all property models, files, database records, and subscriber credentials across PaperWorking.
            </p>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => setShowDeleteModal(true)}
              data-testid="data-privacy-schedule-erasure-btn"
              className="border-[var(--danger)]/30 text-[var(--danger)] hover:bg-[var(--danger)]/10"
            >
              Schedule Workspace Erasure
            </Button>
          </div>
        )}
      </section>

      {/* Erasure Confirmation Modal */}
      {showDeleteModal && (
        <div data-testid="data-privacy-erasure-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--danger)]/40 bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[var(--danger)]">
              Confirm Workspace Erasure
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              This action cannot be undone after the 48-hour cooling period. To confirm, please type{' '}
              <strong className="text-[var(--text-primary)]">{workspaceName}</strong> below:
            </p>

            {deleteError && (
              <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-2.5 text-xs text-[var(--danger)]">
                {deleteError}
              </div>
            )}

            <input
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={workspaceName}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--danger)]"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                data-testid="data-privacy-modal-cancel-btn"
                onClick={() => {
                  setShowDeleteModal(false);
                  setConfirmName('');
                  setDeleteError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleScheduleDeletion}
                disabled={deleting || confirmName !== workspaceName}
                data-testid="data-privacy-modal-confirm-btn"
                className="border-[var(--danger)]/30 text-[var(--danger)] hover:bg-[var(--danger)]/10"
              >
                {deleting ? 'Scheduling…' : 'Confirm Erasure'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
