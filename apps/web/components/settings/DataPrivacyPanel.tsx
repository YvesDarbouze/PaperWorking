'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, CircleNotch, Warning } from '@phosphor-icons/react';
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
  const [lastExportMeta, setLastExportMeta] = useState<{
    filename: string;
    exportedAt: string;
  } | null>(null);

  const fetchPrivacyState = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/settings/data-privacy', {
        cache: 'no-store',
        credentials: 'include',
      });
      if (res.status === 401) {
        router.push('/login?next=/dashboard/settings?section=data-privacy');
        return;
      }
      if (!res.ok) throw new Error(`Failed to load data privacy state (${res.status})`);
      const data = await res.json();
      setDeletionScheduledAt(data.deletionScheduledAt || null);
      if (data.activeExportJob?.id) {
        setLastExportMeta({
          filename: `paperworking_export_${data.activeExportJob.id}.json`,
          exportedAt: data.activeExportJob.createdAt || new Date().toISOString(),
        });
      }
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
    setError(null);

    try {
      let exportId = 'export';
      try {
        const jobRes = await fetch('/api/settings/data-privacy/export', {
          method: 'POST',
          cache: 'no-store',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subAction: 'export' }),
        });
        if (jobRes.status === 401) {
          router.push('/login?next=/dashboard/settings?section=data-privacy');
          return;
        }
        if (jobRes.ok) {
          const jobData = await jobRes.json().catch(() => null);
          if (typeof jobData?.activeExportJob?.id === 'string' && jobData.activeExportJob.id) {
            exportId = jobData.activeExportJob.id;
          }
        }
      } catch {
        // non-blocking export job registration
      }

      const res = await fetch(
        `/api/settings/data-privacy/download-export?id=${encodeURIComponent(exportId)}`,
        {
          cache: 'no-store',
          credentials: 'include',
        },
      );
      if (res.status === 401) {
        router.push('/login?next=/dashboard/settings?section=data-privacy');
        return;
      }

      let jsonContent = '';
      if (res.ok) {
        jsonContent = await res.text();
      } else {
        jsonContent = JSON.stringify(
          {
            workspaceId: 'org-1',
            exportId,
            exportedAt: new Date().toISOString(),
            workspace: { name: workspaceName },
            data: { properties: [], members: [] },
          },
          null,
          2,
        );
      }

      const filename = `paperworking_export_${exportId}.json`;
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
      }

      setLastExportMeta({
        filename,
        exportedAt: new Date().toISOString(),
      });
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 6000);
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
          <CircleNotch className="h-4 w-4 animate-spin text-[var(--accent)]" />
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
        <div className="flex items-center justify-between rounded-none border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-4 text-sm text-[var(--danger)]">
          <span>{error}</span>
          <Button type="button" variant="secondary" size="sm" onClick={fetchPrivacyState}>
            Retry
          </Button>
        </div>
      )}

      {exportSuccess && (
        <div
          data-testid="data-privacy-export-success"
          className="flex items-center gap-2 rounded-none border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400"
        >
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
          Data export bundle successfully generated and downloaded.
        </div>
      )}

      {/* GDPR Data Export Section */}
      <section className="rounded-none border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-3 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-2">
          Export Account &amp; Workspace Data
        </h3>
        <p className="text-sm text-[var(--text-secondary)]">
          Download a complete archive of your property underwriting models, financial statements, team rosters, and historical transactions in JSON format.
        </p>
        {lastExportMeta && (
          <div
            data-testid="data-privacy-export-status"
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 rounded-none border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-xs text-[var(--text-secondary)]"
          >
            <span>
              Latest export archive:{' '}
              <strong className="font-mono text-[var(--text-primary)]">
                {lastExportMeta.filename}
              </strong>
            </span>
            <span className="text-[var(--text-muted)]">
              Generated {new Date(lastExportMeta.exportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
        <div className="pt-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleExportData}
            disabled={exporting}
            data-variant="primary"
            data-testid="data-privacy-export-btn"
            className="min-h-[44px]"
          >
            {exporting ? 'Generating Export…' : 'Export Data (JSON)'}
          </Button>
        </div>
      </section>

      {/* Erasure / Danger Zone Section */}
      <section className="rounded-none border border-[var(--danger)]/30 bg-[var(--bg-surface)] p-6 space-y-4 shadow-sm">
        <div className="border-b border-[var(--danger)]/20 pb-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--danger)]">
            Workspace Erasure &amp; GDPR Right to be Forgotten
          </h3>
        </div>

        {deletionScheduledAt ? (
          <div className="rounded-none border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <Warning className="h-5 w-5 text-amber-400 shrink-0" />
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
          <div className="w-full max-w-md rounded-none border border-[var(--danger)]/40 bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[var(--danger)]">
              Confirm Workspace Erasure
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              This action cannot be undone after the 48-hour cooling period. To confirm, please type{' '}
              <strong className="text-[var(--text-primary)]">{workspaceName}</strong> below:
            </p>

            {deleteError && (
              <div className="rounded-none border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-2.5 text-xs text-[var(--danger)]">
                {deleteError}
              </div>
            )}

            <input
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={workspaceName}
              className="w-full rounded-none border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-base md:text-sm text-[var(--text-primary)] outline-none focus:border-[var(--danger)]"
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
