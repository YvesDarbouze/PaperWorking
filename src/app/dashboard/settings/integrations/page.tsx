'use client';

import React, { useEffect, useState } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import toast from 'react-hot-toast';
import { SettingsErrorBoundary } from '@/components/settings/ErrorBoundary';
import { ConnectedServicesSkeleton } from '@/components/settings/SettingsSkeletons';
import { X, Check, ShieldAlert, FolderOpen, HardDrive, Mail } from 'lucide-react';

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
      <IntegrationsSettingsForm />
    </SettingsErrorBoundary>
  );
}
