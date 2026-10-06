'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { BankConnectionCard, type BankConnection } from './BankConnectionCard';

declare global {
  interface Window {
    Plaid?: {
      create: (options: {
        token: string;
        onSuccess: (publicToken: string, metadata: Record<string, unknown>) => void;
        onExit?: () => void;
      }) => { open: () => void };
    };
  }
}

function loadPlaidLinkScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('browser only'));
    if (window.Plaid) return resolve();
    const existing = document.querySelector<HTMLScriptElement>('script[data-plaid-link]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Plaid Link')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    script.async = true;
    script.dataset.plaidLink = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Plaid Link'));
    document.head.appendChild(script);
  });
}

export function BankConnectionsPanel() {
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/plaid/connections', { cache: 'no-store' });
      const body = (await res.json().catch(() => ({}))) as {
        connections?: BankConnection[];
        error?: string;
      };
      if (!res.ok) throw new Error(body.error ?? 'Failed to load bank connections');
      setConnections(body.connections ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bank connections');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const disconnect = useCallback(
    async (connectionId: string) => {
      const res = await fetch(`/api/plaid/connections/${connectionId}/disconnect`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to disconnect');
      await refresh();
    },
    [refresh],
  );

  const connect = useCallback(async () => {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch('/api/plaid/create-link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const body = (await res.json().catch(() => ({}))) as {
        link_token?: string;
        error?: string;
        requiresCredentials?: boolean;
      };

      if (!res.ok || !body.link_token) {
        setNotice(
          body.requiresCredentials
            ? 'Bank connections are available once Plaid credentials are configured (REQUIRES CREDENTIALS: PLAID_CLIENT_ID, PLAID_SECRET).'
            : body.error ?? 'Unable to start Plaid Link.',
        );
        return;
      }

      await loadPlaidLinkScript();
      if (!window.Plaid) throw new Error('Plaid Link SDK unavailable');

      const handler = window.Plaid.create({
        token: body.link_token,
        onSuccess: async (publicToken, metadata) => {
          const institution = (metadata.institution ?? {}) as { id?: string; name?: string };
          const exchange = await fetch('/api/plaid/exchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              publicToken,
              institution,
              accounts: (metadata.accounts as unknown[]) ?? [],
            }),
          });
          const exchangeBody = (await exchange.json().catch(() => ({}))) as { error?: string };
          if (!exchange.ok) {
            setError(exchangeBody.error ?? 'Failed to link bank account');
            return;
          }
          setNotice('Bank account connected.');
          await refresh();
        },
      });
      handler.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start Plaid Link');
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Bank connections</h2>
          <p className="text-xs text-muted-foreground">
            Securely connect bank accounts via Plaid. Access tokens are encrypted at rest.
          </p>
        </div>
        <button
          type="button"
          onClick={connect}
          disabled={busy}
          className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
          data-testid="plaid-connect-button"
        >
          {busy ? 'Opening…' : 'Connect bank'}
        </button>
      </div>

      {notice ? (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-100">
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading connections…</p>
      ) : connections.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          No bank connections yet. Use “Connect bank” to link an account via Plaid.
        </div>
      ) : (
        <div className="space-y-3">
          {connections.map((connection) => (
            <BankConnectionCard
              key={connection.id}
              connection={connection}
              onDisconnect={disconnect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default BankConnectionsPanel;
