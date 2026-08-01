'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import {
  Building2,
  TrendingUp,
  Landmark,
  PiggyBank,
  Wrench,
  RefreshCw,
  Unlink,
  Clock,
  CheckCircle2,
  AlertTriangle,
  WifiOff,
  PenLine,
  UploadCloud,
  ShieldCheck,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';
import { PlaidLinkButton } from '@/components/plaid/PlaidLinkButton';
import type { ConnectionPurpose, PlaidSuccessData } from '@/components/plaid/PlaidLinkButton';

/* ─── Types ──────────────────────────────────────────────────── */
type ConnectionStatus = 'NOT_CONNECTED' | 'ACTIVE' | 'PENDING_AUTH' | 'ERROR' | 'DISCONNECTED' | 'EXPIRED';

interface PlaidConnection {
  id: string;
  connectionPurpose: ConnectionPurpose;
  status: ConnectionStatus;
  institutionName: string | null;
  accountName: string | null;
  accountMask: string | null;
  lastSyncAt: string | null;
  lastSuccessfulSyncAt: string | null;
  syncErrorCount: number;
  lastSyncErrorMessage: string | null;
  consentTimestamp: string | null;
  consentedProducts: string[];
}

/* ─── Purpose metadata ───────────────────────────────────────── */
interface PurposeMeta {
  purpose: ConnectionPurpose;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  optional?: boolean;
}

const PURPOSES: PurposeMeta[] = [
  {
    purpose: 'RENT_COLLECTION',
    label: 'Rent Collection',
    description: 'Detects incoming tenant payments and matches them to your leases.',
    icon: TrendingUp,
    color: '#10B981',
    bg: 'rgba(16,185,129,0.10)',
  },
  {
    purpose: 'OPERATING_EXPENSES',
    label: 'Operating Expenses',
    description: 'Auto-categorizes repairs, insurance, taxes, HOA, and management fees.',
    icon: Wrench,
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.10)',
  },
  {
    purpose: 'MORTGAGE_LIABILITY',
    label: 'Mortgage & Loans',
    description: 'Syncs balance, next payment, YTD interest, and escrow every 6 hours.',
    icon: Landmark,
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.10)',
  },
  {
    purpose: 'RESERVE_ACCOUNT',
    label: 'Reserve Account',
    description: 'Monitors your cash reserve balance relative to your portfolio.',
    icon: PiggyBank,
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.10)',
    optional: true,
  },
];

const MANUAL_QUICK_LINKS = [
  { label: 'Record Rent',     href: '/dashboard/inbox?compose=rent',     icon: TrendingUp, color: '#10B981' },
  { label: 'Record Expense',  href: '/dashboard/inbox?compose=expense',  icon: Wrench,     color: '#F59E0B' },
  { label: 'Record Mortgage', href: '/dashboard/inbox?compose=mortgage', icon: Landmark,   color: '#3B82F6' },
  { label: 'Upload CSV',      href: '/dashboard/inbox?compose=csv',      icon: UploadCloud,color: '#8B5CF6' },
];

/* ─── Helpers ────────────────────────────────────────────────── */
function timeAgo(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function statusLabel(s: ConnectionStatus): { text: string; color: string; bg: string; icon: React.ElementType } {
  switch (s) {
    case 'ACTIVE':       return { text: 'Active',        color: '#10B981', bg: 'rgba(16,185,129,0.10)',  icon: CheckCircle2 };
    case 'ERROR':        return { text: 'Error',         color: '#EF4444', bg: 'rgba(239,68,68,0.10)',   icon: AlertTriangle };
    case 'EXPIRED':      return { text: 'Expired',       color: '#F59E0B', bg: 'rgba(245,158,11,0.10)',  icon: AlertTriangle };
    case 'DISCONNECTED': return { text: 'Disconnected',  color: '#6B7280', bg: 'rgba(107,114,128,0.10)', icon: WifiOff };
    case 'PENDING_AUTH': return { text: 'Pending Auth',  color: '#F59E0B', bg: 'rgba(245,158,11,0.10)',  icon: RefreshCw };
    default:             return { text: 'Not Connected', color: '#6B7280', bg: 'rgba(107,114,128,0.08)', icon: WifiOff };
  }
}

async function getIdToken(): Promise<string | null> {
  const user = getAuth().currentUser;
  if (!user) return null;
  return user.getIdToken();
}

/* ─── Connection Card ────────────────────────────────────────── */
function ConnectionCard({
  meta,
  connection,
  projectId,
  onConnectionUpdate,
  onDisconnect,
  onSyncNow,
}: {
  meta: PurposeMeta;
  connection: PlaidConnection | null;
  projectId: string;
  onConnectionUpdate: (data: PlaidSuccessData) => void;
  onDisconnect: (connectionId: string) => void;
  onSyncNow: (connectionId: string) => void;
}) {
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncing, setSyncing]             = useState(false);
  const isConnected   = connection?.status === 'ACTIVE';
  const isError       = connection?.status === 'ERROR' || connection?.status === 'EXPIRED';
  const isDisconnected= connection?.status === 'DISCONNECTED';
  const status        = connection ? statusLabel(connection.status) : statusLabel('NOT_CONNECTED');

  const handleDisconnect = async () => {
    if (!connection || disconnecting) return;
    if (!confirm(`Disconnect ${meta.label} from PaperWorking? Your transaction history will be preserved.`)) return;
    setDisconnecting(true);
    try {
      const token = await getIdToken();
      await fetch(`/api/plaid/connections/${connection.id}/disconnect`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      onDisconnect(connection.id);
    } catch {
      /* handled by parent refresh */
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSyncNow = async () => {
    if (!connection || syncing) return;
    setSyncing(true);
    try {
      onSyncNow(connection.id);
    } finally {
      setTimeout(() => setSyncing(false), 2000);
    }
  };

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4 transition-all duration-200"
      style={{
        background: 'rgba(253,255,252,0.03)',
        border: isConnected
          ? `1px solid ${meta.color}30`
          : isError
          ? '1px solid rgba(239,68,68,0.2)'
          : '1px solid rgba(253,255,252,0.07)',
      }}
    >
      {/* ── Card header ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: meta.bg }}
          >
            <meta.icon size={16} style={{ color: meta.color }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold" style={{ color: '#FDFFFC' }}>{meta.label}</h3>
              {meta.optional && (
                <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(253,255,252,0.06)', color: 'rgba(253,255,252,0.35)' }}>
                  Optional
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(253,255,252,0.45)' }}>
              {meta.description}
            </p>
          </div>
        </div>

        {/* Status badge */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0 text-[10px] font-bold uppercase tracking-wide"
          style={{ background: status.bg, color: status.color }}
        >
          <status.icon size={10} />
          {status.text}
        </div>
      </div>

      {/* ── Connected details ── */}
      {isConnected && connection && (
        <div
          className="rounded-xl px-4 py-3 flex flex-col gap-1.5"
          style={{ background: 'rgba(253,255,252,0.04)', border: '1px solid rgba(253,255,252,0.06)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: '#FDFFFC' }}>
              {connection.institutionName ?? 'Unknown Bank'}
              {connection.accountMask ? ` ···${connection.accountMask}` : ''}
            </span>
            {connection.accountName && (
              <span className="text-[10px]" style={{ color: 'rgba(253,255,252,0.4)' }}>
                {connection.accountName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1" style={{ color: 'rgba(253,255,252,0.4)' }}>
            <Clock size={10} />
            <span className="text-[10px]">Last sync: {timeAgo(connection.lastSuccessfulSyncAt)}</span>
          </div>
        </div>
      )}

      {/* ── Error message ── */}
      {isError && connection?.lastSyncErrorMessage && (
        <div
          className="rounded-xl px-3 py-2.5 text-xs"
          style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)', color: '#EF9090' }}
        >
          <AlertTriangle size={12} className="inline mr-1.5 mb-0.5" />
          {connection.lastSyncErrorMessage}
        </div>
      )}

      {/* ── Actions row ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Not connected → PlaidLinkButton (with pre-screen) */}
        {!connection || isDisconnected ? (
          <PlaidLinkButton
            projectId={projectId}
            connectionPurpose={meta.purpose}
            preScreenEnabled
            onSuccess={onConnectionUpdate}
            variant="primary"
            size="sm"
          />
        ) : isError ? (
          /* Error/expired → reconnect (update mode with pre-screen) */
          <PlaidLinkButton
            projectId={projectId}
            connectionPurpose={meta.purpose}
            existingConnectionId={connection.id}
            buttonText="Reconnect — takes ~20 seconds"
            preScreenEnabled={false}
            onSuccess={onConnectionUpdate}
            variant="primary"
            size="sm"
          />
        ) : isConnected ? (
          /* Active → sync now + disconnect */
          <>
            <button
              onClick={handleSyncNow}
              disabled={syncing}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: 'rgba(253,255,252,0.06)',
                border: '1px solid rgba(253,255,252,0.10)',
                color: 'rgba(253,255,252,0.7)',
                opacity: syncing ? 0.6 : 1,
              }}
              id={`sync-btn-${meta.purpose.toLowerCase()}`}
            >
              <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing…' : 'Sync Now'}
            </button>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: 'rgba(239,68,68,0.07)',
                border: '1px solid rgba(239,68,68,0.15)',
                color: '#EF4444',
                opacity: disconnecting ? 0.6 : 1,
              }}
              id={`disconnect-btn-${meta.purpose.toLowerCase()}`}
            >
              <Unlink size={12} />
              {disconnecting ? 'Disconnecting…' : 'Disconnect'}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

/* ─── Privacy accordion ──────────────────────────────────────── */
function DataPrivacySection({ connections }: { connections: PlaidConnection[] }) {
  const [open, setOpen] = useState(false);
  const activeConns = connections.filter((c) => c.status === 'ACTIVE');

  return (
    <section
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid rgba(253,255,252,0.07)', background: 'rgba(253,255,252,0.02)' }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:bg-white/5"
        id="privacy-section-toggle"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck size={15} style={{ color: '#8B5CF6' }} />
          <span className="text-sm font-bold" style={{ color: '#FDFFFC' }}>Data & Privacy</span>
        </div>
        {open ? <ChevronUp size={15} style={{ color: 'rgba(253,255,252,0.4)' }} />
               : <ChevronDown size={15} style={{ color: 'rgba(253,255,252,0.4)' }} />}
      </button>

      {open && (
        <div className="px-5 pb-5 flex flex-col gap-4" style={{ borderTop: '1px solid rgba(253,255,252,0.06)' }}>
          <div className="pt-4">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(253,255,252,0.35)' }}>
              What data does PaperWorking access?
            </p>
            {[
              { label: 'Transactions', desc: 'Payment history, amounts, merchant names, categories.' },
              { label: 'Account Balances', desc: 'Current and available balance for your connected accounts.' },
              { label: 'Mortgage Liabilities', desc: 'Outstanding balance, interest rate, next payment, escrow.' },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3 py-2"
                style={{ borderBottom: '1px solid rgba(253,255,252,0.05)' }}>
                <CheckCircle2 size={13} className="mt-0.5 shrink-0" style={{ color: '#10B981' }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: '#FDFFFC' }}>{item.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(253,255,252,0.45)' }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {activeConns.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(253,255,252,0.35)' }}>
                When did you consent?
              </p>
              {activeConns.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-1.5 text-xs"
                  style={{ borderBottom: '1px solid rgba(253,255,252,0.04)' }}>
                  <span style={{ color: 'rgba(253,255,252,0.55)' }}>
                    {c.institutionName ?? c.connectionPurpose}
                  </span>
                  <span style={{ color: 'rgba(253,255,252,0.35)' }}>
                    {c.consentTimestamp ? new Date(c.consentTimestamp).toLocaleDateString() : 'Unknown'}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <a
              href="https://my.plaid.com"
              target="_blank"
              rel="noopener noreferrer"
              id="plaid-portal-link"
              className="flex items-center gap-2 text-xs font-medium transition-opacity hover:opacity-80"
              style={{ color: '#3B82F6' }}
            >
              <ExternalLink size={12} />
              Manage all Plaid permissions at my.plaid.com
            </a>
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs font-medium transition-opacity hover:opacity-80"
              style={{ color: 'rgba(253,255,252,0.4)' }}
            >
              <ExternalLink size={12} />
              PaperWorking Privacy Policy
            </a>
          </div>
        </div>
      )}
    </section>
  );
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function FinancialConnectionsPage() {
  const params    = useParams();
  const router    = useRouter();
  const projectId = params?.id as string;

  const [connections, setConnections] = useState<PlaidConnection[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [syncing, setSyncing]         = useState<string | null>(null);

  /* ── Fetch PlaidConnections for this project ── */
  const loadConnections = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      const res = await fetch(
        `/api/plaid/connections?model=v2&projectId=${projectId}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (!res.ok) throw new Error('Failed to load connections');
      const data = await res.json();
      setConnections(data.connections ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load connections');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void loadConnections(); }, [loadConnections]);

  const handleConnectionUpdate = useCallback((_: PlaidSuccessData) => {
    void loadConnections();
  }, [loadConnections]);

  const handleDisconnect = useCallback((_connectionId: string) => {
    void loadConnections();
  }, [loadConnections]);

  const handleSyncNow = useCallback(async (connectionId: string) => {
    setSyncing(connectionId);
    try {
      const token = await getIdToken();
      await fetch('/api/cron/sync-financial-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          // Note: In production the cron runs server-to-server with CRON_SECRET.
          // This manual trigger uses the user's token instead.
        },
        body: JSON.stringify({ connectionId }),
      });
    } catch { /* non-fatal */ }
    setTimeout(() => {
      setSyncing(null);
      void loadConnections();
    }, 2000);
  }, [loadConnections]);

  /* ── Derive connection map keyed by purpose ── */
  const connectionByPurpose = connections.reduce<Record<string, PlaidConnection>>((acc, c) => {
    // Most-recent active wins; fall back to first
    if (!acc[c.connectionPurpose] || c.status === 'ACTIVE') {
      acc[c.connectionPurpose] = c;
    }
    return acc;
  }, {});

  const activeCount = connections.filter((c) => c.status === 'ACTIVE').length;
  const errorCount  = connections.filter((c) => c.status === 'ERROR' || c.status === 'EXPIRED').length;

  /* ── Connection Health row ── */
  const healthConnections = connections.filter((c) => c.status !== 'NOT_CONNECTED');

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 max-w-3xl mx-auto flex flex-col gap-8">

      {/* ── Page Header ── */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 mb-1">
          <Zap size={13} style={{ color: '#10B981' }} />
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#10B981' }}>
            Exit Phase · Automatic Tracking
          </span>
        </div>
        <h1 className="text-2xl font-black" style={{ color: '#FDFFFC' }}>Financial Connections</h1>
        <p className="text-sm leading-relaxed" style={{ color: 'rgba(253,255,252,0.5)' }}>
          Connect your bank accounts to automatically identify transactions and update your investment KPIs.
          All connections are read-only — PaperWorking can never move money.
        </p>

        {/* Health summary chips */}
        {!loading && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {activeCount > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
                style={{ background: 'rgba(16,185,129,0.10)', color: '#10B981' }}>
                <CheckCircle2 size={10} /> {activeCount} active
              </div>
            )}
            {errorCount > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
                style={{ background: 'rgba(239,68,68,0.10)', color: '#EF4444' }}>
                <AlertTriangle size={10} /> {errorCount} need attention
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 rounded-2xl animate-pulse"
              style={{ background: 'rgba(253,255,252,0.04)', border: '1px solid rgba(253,255,252,0.06)' }} />
          ))}
        </div>
      )}

      {/* ── Error loading connections ── */}
      {!loading && error && (
        <div className="rounded-xl px-4 py-3 flex items-start gap-3"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#EF9090' }}>
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Failed to load connections</p>
            <p className="text-xs mt-0.5">{error}</p>
            <button onClick={loadConnections} className="mt-2 text-xs underline hover:opacity-80">Try again</button>
          </div>
        </div>
      )}

      {/* ── Section 1: Connection Cards ── */}
      {!loading && !error && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest mb-4"
            style={{ color: 'rgba(253,255,252,0.35)' }}>Bank Connections</h2>
          <div className="flex flex-col gap-3">
            {PURPOSES.map((meta) => (
              <ConnectionCard
                key={meta.purpose}
                meta={meta}
                connection={connectionByPurpose[meta.purpose] ?? null}
                projectId={projectId}
                onConnectionUpdate={handleConnectionUpdate}
                onDisconnect={handleDisconnect}
                onSyncNow={handleSyncNow}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Section 2: Manual Entry ── */}
      <section
        className="rounded-2xl p-5 flex flex-col gap-4"
        style={{ background: 'rgba(253,255,252,0.03)', border: '1px solid rgba(253,255,252,0.07)' }}
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(139,92,246,0.10)' }}>
            <PenLine size={16} style={{ color: '#8B5CF6' }} />
          </div>
          <div>
            <h2 className="text-sm font-bold" style={{ color: '#FDFFFC' }}>Manual Entry</h2>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(253,255,252,0.45)' }}>
              Prefer to enter transactions yourself? No problem — manual entries are equally valid
              and update all 33 KPIs just like automatic connections.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {MANUAL_QUICK_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              id={`manual-${link.label.replace(/\s+/g, '-').toLowerCase()}`}
              className="flex flex-col items-center gap-2 p-3 rounded-xl text-center transition-colors hover:bg-white/5 active:scale-95"
              style={{ border: '1px solid rgba(253,255,252,0.07)', color: 'rgba(253,255,252,0.65)' }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${link.color}18` }}>
                <link.icon size={15} style={{ color: link.color }} />
              </div>
              <span className="text-[11px] font-semibold leading-tight">{link.label}</span>
            </a>
          ))}
        </div>
      </section>

      {/* ── Section 3: Connection Health ── */}
      {healthConnections.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: 'rgba(253,255,252,0.35)' }}>Connection Health</h2>
          <div className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(253,255,252,0.07)', background: 'rgba(253,255,252,0.02)' }}>
            {healthConnections.map((conn, idx) => {
              const meta = PURPOSES.find((p) => p.purpose === conn.connectionPurpose);
              const st   = statusLabel(conn.status);
              return (
                <div key={conn.id}
                  className="flex items-center justify-between px-5 py-3"
                  style={{ borderBottom: idx < healthConnections.length - 1 ? '1px solid rgba(253,255,252,0.05)' : 'none' }}>
                  <div className="flex items-center gap-3">
                    {meta && (
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: meta.bg }}>
                        <meta.icon size={13} style={{ color: meta.color }} />
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold" style={{ color: '#FDFFFC' }}>
                        {conn.institutionName ?? (meta?.label ?? conn.connectionPurpose)}
                      </p>
                      <p className="text-[10px]" style={{ color: 'rgba(253,255,252,0.4)' }}>
                        Last sync: {timeAgo(conn.lastSuccessfulSyncAt ?? conn.lastSyncAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide"
                      style={{ background: st.bg, color: st.color }}>
                      <st.icon size={9} /> {st.text}
                    </div>
                    {(conn.status === 'ERROR' || conn.status === 'EXPIRED') && (
                      <PlaidLinkButton
                        projectId={projectId}
                        connectionPurpose={conn.connectionPurpose}
                        existingConnectionId={conn.id}
                        buttonText="Reconnect"
                        preScreenEnabled={false}
                        onSuccess={handleConnectionUpdate}
                        variant="danger"
                        size="sm"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Section 4: Data & Privacy ── */}
      <DataPrivacySection connections={connections} />

      {/* ── Back nav ── */}
      <button
        onClick={() => router.back()}
        className="self-start text-xs font-medium transition-opacity hover:opacity-70"
        style={{ color: 'rgba(253,255,252,0.35)' }}
      >
        ← Back to project
      </button>
    </div>
  );
}
