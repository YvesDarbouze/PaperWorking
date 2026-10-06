'use client';

import React, { useState } from 'react';
import type {
  ProjectPlaidLedgerState,
  ProjectPlaidConnection,
} from '@/lib/projects/types';
import {
  Bank,
  ArrowsClockwise,
  CheckCircle,
  WarningCircle,
  Lock,
  Plus,
  ArrowSquareOut,
  ShieldCheck,
  CreditCard,
} from '@/components/icons/PhosphorIcons';

export interface ProjectPlaidIntegrationCardProps {
  projectId: string;
  projectName?: string;
  ledger: ProjectPlaidLedgerState;
  onUpdateLedger: (updated: ProjectPlaidLedgerState) => void;
  disabled?: boolean;
}

export function ProjectPlaidIntegrationCard({
  projectId,
  projectName = 'Current Property',
  ledger,
  onUpdateLedger,
  disabled = false,
}: ProjectPlaidIntegrationCardProps) {
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [showConnectModal, setShowConnectModal] = useState<boolean>(false);
  const [selectedInflowAccountId, setSelectedInflowAccountId] = useState<string>(
    ledger.connectedAccounts[0]?.connectionId || ''
  );
  const [selectedOutflowAccountId, setSelectedOutflowAccountId] = useState<string>(
    ledger.connectedAccounts[0]?.connectionId || ''
  );

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);

    try {
      const res = await fetch(`/api/plaid/connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      if (res.status === 503 || !res.ok) {
        setSyncFeedback('Plaid service unconfigured (REQUIRES CREDENTIALS: PLAID_CLIENT_ID, PLAID_SECRET).');
        return;
      }
      const data = await res.json();
      setSyncFeedback(data.message || 'Transactions synchronized successfully.');
    } catch {
      setSyncFeedback('Plaid service connection error. Please verify network or credentials.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConnectNewAccount = async () => {
    try {
      const res = await fetch('/api/plaid/create-link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (!res.ok || data.requiresCredentials || !data.success) {
        setSyncFeedback('Plaid integration is not configured. Missing required credentials: PLAID_CLIENT_ID, PLAID_SECRET (REQUIRES CREDENTIALS).');
        setShowConnectModal(false);
        return;
      }
      setSyncFeedback('Plaid link session initialized.');
    } catch {
      setSyncFeedback('Failed to reach Plaid link service.');
    } finally {
      setShowConnectModal(false);
    }
  };

  return (
    <div className="w-full bg-card border border-border rounded-none p-5 sm:p-6 space-y-6">
      {/* Header & Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-muted border border-border rounded-none text-foreground">
              <Bank size={20} weight="bold" />
            </span>
            <h3 className="text-base sm:text-lg font-semibold text-foreground tracking-tight">
              Plaid Bank Connection & Account Routing
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Connect property bank accounts to automatically ingest, isolate, and categorize rent collections and holding expenses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={disabled || isSyncing || ledger.connectedAccounts.length === 0}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 min-h-[44px] bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs sm:text-sm font-medium border border-border rounded-none transition-colors disabled:opacity-50"
          >
            <ArrowsClockwise size={16} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Syncing /transactions/sync...' : 'Sync Bank Now'}
          </button>

          <button
            type="button"
            onClick={() => setShowConnectModal(true)}
            disabled={disabled}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 min-h-[44px] bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-medium rounded-none transition-colors shadow-sm disabled:opacity-50"
          >
            <Plus size={16} weight="bold" />
            Connect Bank Account
          </button>
        </div>
      </div>

      {syncFeedback && (
        <div className="p-3 bg-muted/60 border border-border rounded-none text-xs sm:text-sm text-foreground flex items-center gap-2">
          <CheckCircle size={16} className="text-foreground shrink-0" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* Connected Accounts Overview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Connected Project Accounts ({ledger.connectedAccounts.length})
          </h4>
          <span className="text-xs text-muted-foreground">
            Daily automated sync active at 04:00 UTC
          </span>
        </div>

        {ledger.connectedAccounts.length === 0 ? (
          <div className="p-8 border border-dashed border-border rounded-none text-center space-y-3">
            <Bank size={32} className="mx-auto text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No bank accounts linked to this project</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Link a checking or escrow account to automate rent collection recording and holding cost tracking.
            </p>
            <button
              type="button"
              onClick={() => setShowConnectModal(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-primary text-primary-foreground text-xs font-medium rounded-none"
            >
              <Plus size={16} />
              Launch Plaid Link
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {ledger.connectedAccounts.map((account) => (
              <div
                key={account.connectionId}
                className="p-4 border border-border bg-muted/20 rounded-none space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <CreditCard size={20} className="text-muted-foreground shrink-0" />
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        {account.institutionName}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {account.accountName} (••••{account.accountMask})
                      </div>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium border border-border bg-background text-foreground rounded-none">
                    <CheckCircle size={12} weight="bold" />
                    {account.syncStatus === 'healthy' ? 'Active Sync' : 'Re-auth Required'}
                  </span>
                </div>

                <div className="pt-2 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck size={14} />
                    <span>
                      {account.isSharedAcrossProjects
                        ? `Shared across ${account.associatedProjectCount} projects (Isolated)`
                        : 'Dedicated to this project'}
                    </span>
                  </div>
                  <span>
                    Last sync: {account.lastSyncedAt ? new Date(account.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account Routing Designation */}
      {ledger.connectedAccounts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Rent / Inflow Deposit Account
            </label>
            <select
              value={selectedInflowAccountId}
              onChange={(e) => setSelectedInflowAccountId(e.target.value)}
              disabled={disabled}
              className="w-full min-h-[44px] px-3 py-2 text-sm bg-background border border-border rounded-none focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
            >
              {ledger.connectedAccounts.map((acc) => (
                <option key={acc.connectionId} value={acc.connectionId}>
                  {acc.institutionName} - {acc.accountName} (••••{acc.accountMask})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">
              Directs incoming tenant rent and lease option credits into this ledger.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Holding Costs / Expense Disbursement Account
            </label>
            <select
              value={selectedOutflowAccountId}
              onChange={(e) => setSelectedOutflowAccountId(e.target.value)}
              disabled={disabled}
              className="w-full min-h-[44px] px-3 py-2 text-sm bg-background border border-border rounded-none focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
            >
              {ledger.connectedAccounts.map((acc) => (
                <option key={acc.connectionId} value={acc.connectionId}>
                  {acc.institutionName} - {acc.accountName} (••••{acc.accountMask})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">
              Directs annual property taxes, debt service ACH, and maintenance debits.
            </p>
          </div>
        </div>
      )}

      {/* Plaid Connect Modal Simulation */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-none p-6 space-y-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Bank size={20} weight="bold" />
                <h4 className="text-base font-semibold text-foreground">
                  Link Bank with Plaid
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowConnectModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              PaperWorking uses Plaid to securely connect your depository accounts via 256-bit encrypted envelopes. Your online banking credentials are never visible or stored.
            </p>

            <div className="space-y-2 border border-border p-3 bg-muted/20 text-xs text-muted-foreground">
              <div className="font-semibold text-foreground">Project Scope Mapped:</div>
              <div>Target Property: {projectName}</div>
              <div>Project ID: <span className="font-mono">{projectId}</span></div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConnectModal(false)}
                className="px-4 py-2 min-h-[44px] bg-secondary text-secondary-foreground text-xs font-medium rounded-none border border-border"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConnectNewAccount}
                className="px-4 py-2 min-h-[44px] bg-primary text-primary-foreground text-xs font-medium rounded-none"
              >
                Authorize with Plaid
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
