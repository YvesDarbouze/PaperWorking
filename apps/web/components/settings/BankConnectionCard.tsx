'use client';

import React, { useState } from 'react';
import { PlaidStalenessBadge } from '../shared/PlaidStalenessBadge';
import { Button } from '@/components/ui/Button';
import { PlaidConsentModal } from '../plaid/PlaidConsentModal';

export interface BankConnection {
  id: string;
  itemId: string;
  institutionName: string;
  status: string;
  syncedAt: string | null;
  lastSyncAt: string | null;
  staleness?: {
    isStale: boolean;
    state: string;
    displayText: string;
  };
}

export interface BankConnectionCardProps {
  connection: BankConnection;
  onDisconnect?: (connectionId: string) => Promise<void>;
  onReconnect?: (connectionId: string) => Promise<void>;
}

export function BankConnectionCard({
  connection,
  onDisconnect,
  onReconnect,
}: BankConnectionCardProps) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [disconnected, setDisconnected] = useState(connection.status === 'disconnected');
  const [showConsentModal, setShowConsentModal] = useState(false);

  const handleDisconnect = async () => {
    if (!confirmDisconnect) {
      setConfirmDisconnect(true);
      return;
    }

    setIsDisconnecting(true);
    try {
      if (onDisconnect) {
        await onDisconnect(connection.id || connection.itemId);
      } else {
        const res = await fetch(`/api/plaid/connections/${connection.id || connection.itemId}/disconnect`, {
          method: 'POST',
        });
        if (!res.ok) throw new Error('Failed to disconnect');
      }
      setDisconnected(true);
      setConfirmDisconnect(false);
    } catch (err: unknown) {
      console.error('Disconnect error:', err);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const executeReconnect = async () => {
    if (onReconnect) {
      await onReconnect(connection.id || connection.itemId);
      return;
    }

    try {
      const res = await fetch('/api/plaid/create-link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: connection.itemId,
          updateMode: true,
        }),
      });
      const data = await res.json();
      if (data.link_token) {
        console.log('[BankConnectionCard] Update Link token generated:', data.link_token);
      }
    } catch (err: unknown) {
      console.error('Reconnect error:', err);
    }
  };

  const handleReconnect = () => {
    setShowConsentModal(true);
  };

  if (disconnected) {
    return (
      <div
        className="p-4 rounded-lg border border-border bg-muted/40 text-muted-foreground flex items-center justify-between"
        data-testid={`bank-card-disconnected-${connection.itemId}`}
      >
        <div>
          <h4 className="text-sm font-semibold">{connection.institutionName}</h4>
          <p className="text-xs text-muted-foreground">Credentials purged and disconnected</p>
        </div>
        <PlaidStalenessBadge syncedAt={connection.syncedAt} status="disconnected" />
      </div>
    );
  }

  return (
    <div
      className="p-4 rounded-lg border border-border bg-card shadow-xs flex flex-col gap-3"
      data-testid={`bank-card-${connection.itemId}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-semibold text-foreground">{connection.institutionName}</h4>
          <p className="text-xs text-muted-foreground">ID: {connection.itemId}</p>
        </div>
        <PlaidStalenessBadge
          syncedAt={connection.syncedAt}
          status={connection.status}
          onReconnect={handleReconnect}
        />
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border/60">
        <div className="text-xs text-muted-foreground">
          {connection.syncedAt ? `Last synced: ${new Date(connection.syncedAt).toLocaleDateString()}` : 'Never synced'}
        </div>

        <div className="flex items-center gap-2">
          {confirmDisconnect ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-destructive font-medium">Delete credentials?</span>
              <Button
                size="sm"
                variant="danger"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                data-testid="confirm-disconnect-btn"
              >
                {isDisconnecting ? 'Purging...' : 'Confirm'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setConfirmDisconnect(false)}
                disabled={isDisconnecting}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <>
              {(connection.status === 'login_repair_required' || connection.staleness?.isStale) && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleReconnect}
                  data-testid="reconnect-bank-btn"
                >
                  Reconnect
                </Button>
              )}
              <Button
                size="sm"
                variant="tertiary"
                className="text-destructive hover:bg-destructive/10"
                onClick={handleDisconnect}
                data-testid="disconnect-bank-btn"
              >
                Disconnect
              </Button>
            </>
          )}
        </div>
      </div>

      <PlaidConsentModal
        isOpen={showConsentModal}
        onClose={() => setShowConsentModal(false)}
        onConsentConfirmed={executeReconnect}
        institutionName={connection.institutionName}
        isUpdateMode={true}
      />
    </div>
  );
}
