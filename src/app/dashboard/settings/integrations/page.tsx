'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { usePlaidLink } from 'react-plaid-link';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { SettingsErrorBoundary } from '@/components/settings/ErrorBoundary';
import { ConnectedServicesSkeleton } from '@/components/settings/SettingsSkeletons';
import { PlaidTrustScreen } from '@/components/settings/PlaidTrustScreen';
import { ApiUsageCard } from '@/components/settings/ApiUsageCard';
import { MlsIntegrationCard } from '@/components/settings/MlsIntegrationCard';
import {
  X, Check, ShieldAlert, FolderOpen, HardDrive, Mail,
  Landmark, Plus, Trash2, AlertTriangle, RefreshCw, CheckCircle2,
  PauseCircle, PlayCircle, Building2, Tag,
} from 'lucide-react';


const SlackIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" {...props}>
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52-2.523 2.528 2.528 0 0 1 2.522-2.52h2.52v2.52zm1.261 0a2.528 2.528 0 0 1-2.52 2.52h-5.043a2.528 2.528 0 0 1-2.522-2.52V10.12a2.528 2.528 0 0 1 2.522-2.52H8.82a2.528 2.528 0 0 1 2.52 2.52v5.04zm2.52-10.123a2.528 2.528 0 0 1-2.52-2.522A2.528 2.528 0 0 1 8.823 0a2.528 2.528 0 0 1 2.52 2.52v2.522h-2.52zm0 1.261a2.528 2.528 0 0 1 2.52 2.52v5.043a2.528 2.528 0 0 1-2.52 2.52H3.78a2.528 2.528 0 0 1-2.52-2.52V8.823a2.528 2.528 0 0 1 2.52-2.52h5.043zm10.123 2.52a2.528 2.528 0 0 1 2.52-2.522A2.528 2.528 0 0 1 24 8.823a2.528 2.528 0 0 1-2.522 2.52h-2.52v-2.52zm-1.261 0a2.528 2.528 0 0 1-2.52 2.52h-5.043a2.528 2.528 0 0 1-2.522-2.52V3.78a2.528 2.528 0 0 1 2.522-2.52h5.043a2.528 2.528 0 0 1 2.52 2.52v5.043zm-2.52 10.123a2.528 2.528 0 0 1 2.52 2.522a2.528 2.528 0 0 1-2.52 2.522a2.528 2.528 0 0 1-2.52-2.522v-2.522h2.52zm0-1.261a2.528 2.528 0 0 1-2.52-2.52v-5.043a2.528 2.528 0 0 1 2.52-2.52h5.043a2.528 2.528 0 0 1 2.52 2.52v5.043a2.528 2.528 0 0 1-2.52 2.52h-5.043z"/>
  </svg>
);

interface IntegrationApp {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  scopes: string[];
}

const AVAILABLE_APPS: IntegrationApp[] = [
  {
    id: 'slack',
    name: 'Slack',
    icon: <SlackIcon />,
    description: 'Post automated deal updates and team mentions to your channels.',
    scopes: ['View channels and public messages', 'Post notifications to deal feeds', 'Manage bot commands'],
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    icon: <FolderOpen className="w-5 h-5" />,
    description: 'Sync files, spreadsheets, and underwriting folders automatically.',
    scopes: ['Read and write access to deal files', 'Create new templates', 'Manage folder hierarchy'],
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    icon: <HardDrive className="w-5 h-5" />,
    description: 'Read and sync investment documents and check sheets.',
    scopes: ['Access folder structures', 'Upload underwriting files', 'Share links with investors'],
  },
  {
    id: 'microsoft-365',
    name: 'Microsoft 365',
    icon: <Mail className="w-5 h-5" />,
    description: 'Sync emails, calendar alerts, and share OneDrive assets.',
    scopes: ['Access email alerts', 'Sync project deadlines to calendar', 'Share files via OneDrive'],
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface BankAccount {
  id: string;
  plaidAccountId: string;
  name: string;
  mask: string | null;
  officialName: string | null;
  type: string;
  balance: number | null;
}

interface BankConnection {
  id: string;
  status: string;               // 'active' | 'paused' | 'error'
  connectionType: string;       // 'rent_deposits' | 'operating_expenses'
  institutionName: string | null;
  institutionId: string | null;
  accountId: string | null;
  accountName: string | null;
  accountMask: string | null;
  projectId: string | null;
  webhookUrl: string | null;
  lastSyncAt: string | null;
  accounts: BankAccount[];
}


// ─── Bank Connect Panel ───────────────────────────────────────────────────────

function BankConnectPanel() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [pausing, setPausing] = useState<string | null>(null);
  const [showTrustScreen, setShowTrustScreen] = useState(false);

  // ── New-connection form state ──────────────────────────────────────────────
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [connectionType, setConnectionType] = useState<'rent_deposits' | 'operating_expenses'>('rent_deposits');
  const [projects, setProjects] = useState<Array<{ id: string; address: string }>>([]);

  const fetchConnections = useCallback(async () => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/plaid/connections', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (data.success) setConnections(data.connections ?? []);
    } catch (err) {
      console.error('[BankConnectPanel] Failed to fetch connections:', err);
    } finally {
      setLoadingConnections(false);
    }
  }, [user]);

  const fetchProjects = useCallback(async () => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/projects', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (data.success) setProjects(data.projects ?? []);
    } catch {
      /* non-fatal — project selector just stays empty */
    }
  }, [user]);

  useEffect(() => { fetchConnections(); }, [fetchConnections]);
  useEffect(() => { if (showConnectForm) fetchProjects(); }, [showConnectForm, fetchProjects]);

  const generateLinkToken = async () => {
    if (!user || generatingToken) return;
    setGeneratingToken(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/plaid/create-link-token', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Failed to create link token');
      setLinkToken(data.link_token);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to initiate bank connection';
      toast.error(msg);
      setGeneratingToken(false);
    }
  };

  const { open: openPlaidLink, ready } = usePlaidLink({
    token: linkToken ?? '',
    onSuccess: async (publicToken) => {
      if (!user) return;
      const tid = toast.loading('Connecting bank account…');
      try {
        const idToken = await user.getIdToken();
        const res = await fetch('/api/plaid/exchange', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            public_token: publicToken,
            project_id: selectedProjectId || null,
            connection_type: connectionType,
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error ?? 'Exchange failed');
        toast.success('Bank account connected!', { id: tid });
        setLinkToken(null);
        setGeneratingToken(false);
        setShowConnectForm(false);
        setSelectedProjectId('');
        setConnectionType('rent_deposits');
        await fetchConnections();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Connection failed';
        toast.error(msg, { id: tid });
        setLinkToken(null);
        setGeneratingToken(false);
      }
    },
    onExit: () => {
      setLinkToken(null);
      setGeneratingToken(false);
    },
  });

  useEffect(() => {
    if (linkToken && ready) openPlaidLink();
  }, [linkToken, ready, openPlaidLink]);

  const handleDisconnectBank = async (connectionId: string) => {
    if (!user || disconnecting) return;
    setDisconnecting(connectionId);
    const tid = toast.loading('Disconnecting…');
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/plaid/connections/${connectionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error('Disconnect failed');
      toast.success('Bank account disconnected', { id: tid });
      setConnections((prev) => prev.filter((c) => c.id !== connectionId));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to disconnect';
      toast.error(msg, { id: tid });
    } finally {
      setDisconnecting(null);
    }
  };

  const handleTogglePause = async (conn: BankConnection) => {
    if (!user || pausing) return;
    setPausing(conn.id);
    const isPaused = conn.status === 'paused';
    const tid = toast.loading(isPaused ? 'Resuming sync…' : 'Pausing sync…');
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/plaid/connections/${conn.id}/pause`, {
        method: isPaused ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error('Request failed');
      toast.success(isPaused ? 'Sync resumed' : 'Sync paused', { id: tid });
      setConnections((prev) =>
        prev.map((c) =>
          c.id === conn.id ? { ...c, status: isPaused ? 'active' : 'paused' } : c
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed';
      toast.error(msg, { id: tid });
    } finally {
      setPausing(null);
    }
  };

  const connTypeBadge = (type: string) =>
    type === 'operating_expenses'
      ? { label: 'OpEx', cls: 'bg-violet-50 text-violet-700 border-violet-200' }
      : { label: 'Rent', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };

  const statusIcon = (status: string) => {
    if (status === 'error') return <AlertTriangle className="w-4 h-4 text-amber-600" />;
    if (status === 'paused') return <PauseCircle className="w-4 h-4 text-slate-400" />;
    return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
  };

  const statusBg = (status: string) => {
    if (status === 'error') return 'bg-amber-100';
    if (status === 'paused') return 'bg-slate-100';
    return 'bg-emerald-50';
  };

  const cardBorder = (status: string) => {
    if (status === 'error') return 'border-amber-200 bg-amber-50';
    if (status === 'paused') return 'border-slate-200 bg-slate-50/60';
    return 'border-slate-100 bg-slate-50';
  };

  return (
    <section className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <Landmark className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Bank Accounts</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Connect via Plaid to auto-sync transactions into your projects.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowTrustScreen(true)}
          disabled={generatingToken}
          className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-60 border-0"
        >
          {generatingToken ? (
            <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Connecting…</>
          ) : (
            <><Plus className="w-3.5 h-3.5" /> Connect a bank</>
          )}
        </button>
      </div>

      {/* ── Connect form (pre-Plaid Link config) ── */}
      {showConnectForm && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 space-y-4">
          <p className="text-xs font-semibold text-slate-700">Configure this connection</p>

          {/* Project selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
              <Building2 className="w-3 h-3" /> Link to project (optional)
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Portfolio-wide (no specific project)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.address}</option>
              ))}
            </select>
          </div>

          {/* Connection type */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
              <Tag className="w-3 h-3" /> Connection type
            </label>
            <div className="flex gap-2">
              {(['rent_deposits', 'operating_expenses'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setConnectionType(type)}
                  className={`flex-1 h-8 rounded-lg border text-[11px] font-medium transition-all cursor-pointer ${
                    connectionType === type
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
                  }`}
                >
                  {type === 'rent_deposits' ? 'Rent Deposits' : 'Operating Expenses'}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => { setShowConnectForm(false); setSelectedProjectId(''); setConnectionType('rent_deposits'); }}
              className="h-8 px-3 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-100 cursor-pointer transition-all"
            >
              Cancel
            </button>
            <button
              onClick={generateLinkToken}
              disabled={generatingToken}
              className="h-8 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-60 border-0"
            >
              {generatingToken ? <><RefreshCw className="w-3 h-3 animate-spin" /> Opening Plaid…</> : 'Continue to Plaid →'}
            </button>
          </div>
        </div>
      )}

      {/* ── Connection list ── */}
      {loadingConnections ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2].map((i) => <div key={i} className="h-16 bg-slate-100 rounded-lg" />)}
        </div>
      ) : connections.length === 0 ? (
        <div className="py-8 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
          <p className="text-xs text-slate-400">
            No bank accounts connected. Click "Connect a bank" to get started.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {connections.map((conn) => {
            const badge = connTypeBadge(conn.connectionType ?? 'rent_deposits');
            const lastSync = conn.lastSyncAt
              ? new Date(conn.lastSyncAt).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                })
              : 'Never';
            const displayName = conn.institutionName
              ? `${conn.institutionName}${conn.accountMask ? ` (*${conn.accountMask})` : ''}`
              : conn.accounts[0]?.officialName || conn.accounts[0]?.name
                || `Connection (*${conn.accounts[0]?.mask ?? '????'})`;
            const isPaused = conn.status === 'paused';

            return (
              <li
                key={conn.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  cardBorder(conn.status)
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${statusBg(conn.status)}`}>
                    {statusIcon(conn.status)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-slate-800 truncate">{displayName}</p>
                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold border ${badge.cls}`}>
                        {badge.label}
                      </span>
                      {isPaused && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold border bg-slate-100 text-slate-500 border-slate-200">
                          PAUSED
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {conn.status === 'error'
                        ? <span className="text-amber-600 font-medium">Re-link required</span>
                        : isPaused
                          ? <span className="text-slate-400">Sync paused · Last sync: {lastSync}</span>
                          : <>Last sync: {lastSync}{conn.projectId ? ' · Project-scoped' : ''}</>}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 ml-3 shrink-0">
                  {/* Pause / Resume */}
                  <button
                    onClick={() => handleTogglePause(conn)}
                    disabled={pausing === conn.id || conn.status === 'error'}
                    title={isPaused ? 'Resume sync' : 'Pause sync'}
                    className="h-7 w-7 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-all disabled:opacity-40"
                  >
                    {isPaused
                      ? <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
                      : <PauseCircle className="w-3.5 h-3.5" />}
                  </button>

                  {/* Disconnect */}
                  <button
                    onClick={() => handleDisconnectBank(conn.id)}
                    disabled={disconnecting === conn.id}
                    className="h-7 px-2.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                  >
                    <Trash2 className="w-3 h-3" />
                    Disconnect
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-[10px] text-slate-400">
        Secured by{' '}
        <a href="https://plaid.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
          Plaid
        </a>
        . PaperWorking stores only an encrypted access token — your credentials never touch our servers.
      </p>

      {/* Plaid Trust Screen — shown every time user initiates a connection */}
      {showTrustScreen && (
        <PlaidTrustScreen
          onConfirm={async () => {
            setShowTrustScreen(false);
            setShowConnectForm(true);
            await generateLinkToken();
          }}
          onCancel={() => setShowTrustScreen(false)}
          loading={generatingToken}
        />
      )}
    </section>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

function IntegrationsSettingsForm() {

  const { integrations, fetchIntegrations, disconnectIntegration } = useSettingsStore();

  const [authorizingApp, setAuthorizingApp] = useState<IntegrationApp | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'INTEGRATION_SUCCESS') {
        const provider = event.data.provider;
        toast.success(`${provider.toUpperCase()} connected successfully!`);
        fetchIntegrations();
        setConnectingId(null);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fetchIntegrations]);

  const handleConnectRequest = (app: IntegrationApp) => {
    setAuthorizingApp(app);
  };

  const handleConfirmAuthorize = () => {
    if (!authorizingApp) return;
    const appId = authorizingApp.id;
    setConnectingId(appId);
    const appName = authorizingApp.name;
    setAuthorizingApp(null);

    // Calculate center positioning for popup
    const width = 600;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      `/api/integrations/${appId}/authorize`,
      `Authorize ${appName}`,
      `width=${width},height=${height},top=${top},left=${left},scrollbars=yes`
    );

    if (!popup) {
      toast.error('Popup blocker active. Please allow popups to connect integrations.');
      setConnectingId(null);
    }
  };

  const handleDisconnect = async (appId: string) => {
    const tid = toast.loading('Disconnecting service...');
    try {
      await disconnectIntegration(appId);
      toast.success('Service disconnected.', { id: tid });
      fetchIntegrations();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to disconnect.';
      toast.error(message, { id: tid });
    }
  };

  if (integrations.loading && !integrations.data) {
    return (
      <div className="max-w-[720px] mx-auto space-y-6 animate-pulse">
        <ConnectedServicesSkeleton count={4} />
      </div>
    );
  }

  if (integrations.error) {
    return (
      <div className="space-y-8 animate-in fade-in duration-200">
        <section className="bg-white border border-slate-100 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="p-6 text-center space-y-4 bg-red-50/50 border border-dashed border-red-200 rounded-xl">
            <p className="text-sm text-red-650 font-medium">Failed to load integrations.</p>
            <button
              onClick={() => fetchIntegrations()}
              className="h-9 px-4 rounded-lg bg-red-650 hover:bg-red-750 text-white text-xs font-semibold transition-all cursor-pointer border-0"
            >
              Retry
            </button>
          </div>
        </section>
      </div>
    );
  }

  const connectedApps = integrations.data?.connectedApps || [];


  return (
    <div className="space-y-8 animate-in fade-in duration-200">

      {/* ─── Bank Accounts (Plaid) ─── */}
      <BankConnectPanel />

      {/* ─── Third-party app integrations ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {AVAILABLE_APPS.map((app) => {
          const isConnected = connectedApps.includes(app.id);
          const isProcessing = connectingId === app.id;

          return (
            <div
              key={app.id}
              className="flex flex-col justify-between p-5 rounded-xl bg-white border border-slate-100 shadow-sm hover:border-slate-200 transition-colors relative overflow-hidden"
            >
              <div className="flex items-start gap-4 mb-4">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center border shrink-0 ${
                    isConnected
                      ? 'bg-[#6B8E6B]/10 border-[#6B8E6B]/20 text-[#557255]'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  {app.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-850">{app.name}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-normal min-h-[36px]">{app.description}</p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                <span className={`font-semibold ${isConnected ? 'text-[#557255]' : 'text-slate-400'}`}>
                  {isConnected ? 'Connected' : 'Not Connected'}
                </span>

                <div>
                  {isConnected ? (
                    <button
                      onClick={() => handleDisconnect(app.id)}
                      className="h-8 px-3 rounded-lg border border-red-200 text-red-650 hover:bg-red-50 transition-all text-xs font-semibold cursor-pointer"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnectRequest(app)}
                      disabled={isProcessing}
                      className="h-8 px-4 rounded-lg bg-[#6B8E6B] hover:bg-[#557255] text-white text-xs font-semibold cursor-pointer transition-all flex items-center justify-center gap-1"
                    >
                      {isProcessing ? (
                        <>
                          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Connecting
                        </>
                      ) : (
                        'Connect'
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-slate-100 pt-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Active Connections</h3>
        {connectedApps.length === 0 ? (
          <div className="text-center py-8 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
            <p className="text-xs text-slate-400">No connected apps. Connect your first tool above.</p>
          </div>
        ) : (
          <div className="text-xs text-slate-500">
            You have {connectedApps.length} active connection(s) configured.
          </div>
        )}
      </div>

      {/* ─── OAUTH SCOPE AUTHORIZATION OVERLAY MODAL ─── */}
      {authorizingApp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-[480px] rounded-2xl p-6 border border-slate-200 shadow-2xl relative space-y-6 text-left">
            <button
              onClick={() => setAuthorizingApp(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-650"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#6B8E6B]/10 border border-[#6B8E6B]/20 text-[#557255] flex items-center justify-center shrink-0">
                {authorizingApp.icon}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Authorize {authorizingApp.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Clearance permissions request.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-100 text-xs text-slate-500 leading-relaxed">
                <p className="font-semibold text-slate-900 mb-2">Requesting the following clearance scopes:</p>
                <ul className="space-y-2">
                  {authorizingApp.scopes.map((scope, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-[#6B8E6B] shrink-0 mt-0.5" />
                      <span>{scope}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-start gap-2.5 text-[11px] text-slate-400 leading-relaxed">
                <ShieldAlert className="w-4 h-4 text-[#6B8E6B] shrink-0 mt-0.5" />
                <span>
                  By authorizing, you allow PaperWorking to share encrypted workspace metadata as scoped above. You can revoke this connection at any time.
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAuthorizingApp(null)}
                className="flex-1 h-10 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAuthorize}
                className="flex-1 h-10 rounded-lg bg-[#6B8E6B] hover:bg-[#557255] text-white text-xs font-semibold cursor-pointer transition-all"
              >
                Authorize & Connect
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function IntegrationsSettingsPage() {
  return (
    <SettingsErrorBoundary>
      <div className="space-y-6">
        <IntegrationsSettingsForm />
        {/* Relocated from Settings → General (Aug 2026): the only Connected
            Service with a functional, user-facing action and no home here. */}
        <MlsIntegrationCard />
        {/* Relocated from Settings → Billing (Aug 2026 UX hardening): provider
            call volume is an integration concern, not a subscription line item. */}
        <ApiUsageCard />
      </div>
    </SettingsErrorBoundary>
  );
}
