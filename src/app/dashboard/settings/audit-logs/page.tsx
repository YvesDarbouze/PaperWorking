'use client';

import { useState, useEffect } from 'react';
import type { AuditLog } from '@/types/schema';

export default function AuditLogsSettingsPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    import('@/actions/team')
      .then(({ getAuditLogs }) => getAuditLogs())
      .then(setAuditLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="w-full space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-pw-black mb-1">Audit Logs</h2>
        <p className="text-sm text-pw-muted">
          A chronological record of all permission changes, member actions, and security events in your workspace.
        </p>
      </div>

      <section className="glass-card rounded-2xl p-8">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-pw-muted">
            <span className="material-symbols-outlined animate-spin text-base select-none">progress_activity</span>
            Loading audit logs…
          </div>
        ) : auditLogs.length === 0 ? (
          <p className="text-xs text-pw-muted font-mono">No audit events recorded yet.</p>
        ) : (
          <div className="relative pl-6 space-y-5 before:content-[''] before:absolute before:left-[3px] before:top-2 before:bottom-2 before:w-[1px] before:bg-pw-border/30">
            {auditLogs.map((log) => {
              const isAlert =
                log.action.toLowerCase().includes('suspend') ||
                log.action.toLowerCase().includes('fail') ||
                log.action.toLowerCase().includes('remove');
              return (
                <div key={log.id} className="relative flex flex-col gap-1">
                  <div className={`absolute left-[-26px] top-1.5 w-2 h-2 rounded-full border ${
                    isAlert
                      ? 'border-error bg-error/20 shadow-[0_0_8px_rgba(255,100,100,0.6)]'
                      : 'border-pw-primary bg-pw-primary/20 shadow-[0_0_8px_rgba(87,241,219,0.6)]'
                  }`} />
                  <p className="text-xs text-pw-black leading-relaxed">
                    <span className="font-bold text-pw-primary">{log.actorName}</span>{' '}
                    performed{' '}
                    <span className="font-semibold text-pw-muted">{log.action}</span>
                  </p>
                  <p className="text-[10px] text-pw-muted font-mono flex flex-wrap gap-x-2">
                    <span>Target: {log.targetEmail || log.targetUid || 'N/A'}</span>
                  </p>
                  {log.metadata && (
                    <pre className="text-[9px] text-pw-muted/65 font-mono bg-pw-glass-bg border border-pw-border/50 rounded p-1.5 mt-1 overflow-x-auto whitespace-pre">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  )}
                  <time className="text-[10px] text-pw-muted/60 font-mono">
                    {new Date(log.createdAt).toLocaleString()}
                  </time>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
