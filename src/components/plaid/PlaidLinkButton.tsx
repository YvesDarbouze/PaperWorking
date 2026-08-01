'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { usePlaidLink, PlaidLinkOnSuccess, PlaidLinkOnExit } from 'react-plaid-link';
import { getAuth } from 'firebase/auth';
import { PlaidPreLinkTrustScreen } from './PlaidPreLinkTrustScreen';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────── */
export type ConnectionPurpose =
  | 'RENT_COLLECTION'
  | 'OPERATING_EXPENSES'
  | 'MORTGAGE_LIABILITY'
  | 'RESERVE_ACCOUNT'
  | 'CAPX_ACCOUNT';

const DEFAULT_BUTTON_TEXT: Record<ConnectionPurpose, string> = {
  RENT_COLLECTION:   'Connect Rent Account',
  OPERATING_EXPENSES:'Connect Operating Account',
  MORTGAGE_LIABILITY:'Connect Mortgage Account',
  RESERVE_ACCOUNT:   'Connect Reserve Account',
  CAPX_ACCOUNT:      'Connect CapEx Account',
};

export interface PlaidSuccessData {
  plaidConnectionId: string;
  institutionName: string | null;
  connectionPurpose: ConnectionPurpose;
}

export interface PlaidLinkButtonProps {
  projectId: string;
  connectionPurpose: ConnectionPurpose;
  buttonText?: string;
  /** Called after exchange-v2 succeeds */
  onSuccess?: (data: PlaidSuccessData) => void;
  /** Called when user exits Plaid Link without completing */
  onExit?: (err: { errorCode?: string; errorMessage?: string } | null) => void;
  /** Show the pre-screen trust modal before opening Plaid Link. Default: true */
  preScreenEnabled?: boolean;
  /**
   * When provided the button enters reconnect / update-mode flow.
   * The server uses this to look up + decrypt the existing access_token
   * and pass it to linkTokenCreate.
   */
  existingConnectionId?: string;
  /** Override button style */
  className?: string;
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  disabled?: boolean;
}

/* ─── State machine ──────────────────────────────────────────── */
type FlowState =
  | 'idle'
  | 'prescreen'
  | 'loading_token'
  | 'link_ready'
  | 'link_open'
  | 'exchanging'
  | 'success'
  | 'error';

/* ─── Plaid error → user message map ─────────────────────────── */
function plaidErrorMessage(errorCode?: string | null): string {
  switch (errorCode) {
    case 'ITEM_LOGIN_REQUIRED':         return 'Your bank session expired. Please reconnect to resume syncing.';
    case 'INSUFFICIENT_CREDENTIALS':    return 'Your bank requires updated credentials. Please reconnect.';
    case 'ADDITIONAL_CONSENT_REQUIRED': return 'Your bank is requesting additional authorization. Please reconnect.';
    case 'USER_SETUP_REQUIRED':         return 'Action required at your bank — please reconnect to continue.';
    case 'MFA_NOT_SUPPORTED':           return "Your bank's MFA method isn't supported. Try a different account.";
    case 'NO_ACCOUNTS':                 return 'No eligible accounts were found at this institution.';
    default:                            return 'Something went wrong. Please try again or enter transactions manually.';
  }
}

/* ─── Async helpers ──────────────────────────────────────────── */
async function getAuthHeader(): Promise<{ Authorization: string }> {
  const user = getAuth().currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

async function fetchLinkToken(params: {
  projectId: string;
  connectionPurpose: ConnectionPurpose;
  connectionId?: string;
}): Promise<string> {
  const headers = await getAuthHeader();
  const res = await fetch('/api/plaid/create-link-token', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId:        params.projectId,
      connectionPurpose:params.connectionPurpose,
      connectionId:     params.connectionId,       // triggers update mode server-side
      products:         ['transactions', 'liabilities'],
      additionalConsentedProducts: ['auth', 'balance'],
    }),
  });
  if (!res.ok) throw new Error('Failed to create link token');
  const data = await res.json();
  if (!data.success) throw new Error(data.error ?? 'Failed to create link token');
  return data.link_token as string;
}

async function exchangeToken(params: {
  publicToken: string;
  projectId: string;
  connectionPurpose: ConnectionPurpose;
  metadata: Record<string, unknown>;
}): Promise<PlaidSuccessData> {
  const headers = await getAuthHeader();
  const res = await fetch('/api/plaid/exchange-v2', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      publicToken:       params.publicToken,
      projectId:         params.projectId,
      connectionPurpose: params.connectionPurpose,
      metadata:          params.metadata,
      // DTM consent from Plaid Link metadata
      consentedProducts: (params.metadata?.accounts as any[])?.map?.((a: any) => a.type) ?? [],
      consentedScopes:   [],
      consentedUseCases: [],
    }),
  });
  if (!res.ok) throw new Error('Failed to exchange Plaid token');
  const data = await res.json();
  if (!data.success) throw new Error(data.error ?? 'Exchange failed');
  return {
    plaidConnectionId: data.plaidConnectionId,
    institutionName:   data.institutionName ?? null,
    connectionPurpose: params.connectionPurpose,
  };
}

/* ─── Variant styles ─────────────────────────────────────────── */
function buttonStyles(variant: 'primary' | 'ghost' | 'danger', size: 'sm' | 'md', disabled: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontWeight: 700,
    letterSpacing: '0.01em',
    borderRadius: 10,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.15s ease',
    fontSize: size === 'sm' ? 12 : 13,
    padding: size === 'sm' ? '7px 14px' : '10px 18px',
    border: 'none',
    outline: 'none',
  };
  if (variant === 'primary')  return { ...base, background: '#10B981', color: '#FDFFFC', boxShadow: '0 4px 16px rgba(16,185,129,0.25)' };
  if (variant === 'danger')   return { ...base, background: 'rgba(239,68,68,0.10)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' };
  return { ...base, background: 'rgba(253,255,252,0.05)', color: 'rgba(253,255,252,0.7)', border: '1px solid rgba(253,255,252,0.10)' };
}

/* ─── Component ──────────────────────────────────────────────── */
export function PlaidLinkButton({
  projectId,
  connectionPurpose,
  buttonText,
  onSuccess,
  onExit,
  preScreenEnabled = true,
  existingConnectionId,
  className = '',
  variant = 'primary',
  size = 'md',
  disabled = false,
}: PlaidLinkButtonProps) {
  const [flow, setFlow]       = useState<FlowState>('idle');
  const [linkToken, setToken] = useState<string | null>(null);
  const [errorMsg, setError]  = useState<string | null>(null);
  const [successData, setSuccessData] = useState<PlaidSuccessData | null>(null);
  const isReconnect = !!existingConnectionId;

  /* ── Plaid Link handlers ── */
  const handlePlaidSuccess = useCallback<PlaidLinkOnSuccess>(
    async (publicToken, metadata) => {
      setFlow('exchanging');
      try {
        const result = await exchangeToken({
          publicToken,
          projectId,
          connectionPurpose,
          metadata: metadata as unknown as Record<string, unknown>,
        });
        setSuccessData(result);
        setFlow('success');
        onSuccess?.(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Exchange failed');
        setFlow('error');
      }
    },
    [projectId, connectionPurpose, onSuccess]
  );

  const handlePlaidExit = useCallback<PlaidLinkOnExit>(
    (err) => {
      if (flow !== 'success') setFlow('idle');
      if (err) {
        onExit?.({ errorCode: err.error_code ?? undefined, errorMessage: err.display_message ?? undefined });
      } else {
        onExit?.(null);
      }
    },
    [flow, onExit]
  );

  /* ── usePlaidLink (token is null until we fetch it) ── */
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: handlePlaidSuccess,
    onExit:    handlePlaidExit,
  });

  /* ── Auto-open once token arrives and Link is ready ── */
  useEffect(() => {
    if (flow === 'link_ready' && ready && linkToken) {
      setFlow('link_open');
      open();
    }
  }, [flow, ready, linkToken, open]);

  /* ── Fetch the link token ── */
  const startLinkFlow = useCallback(async () => {
    setError(null);
    setFlow('loading_token');
    try {
      const token = await fetchLinkToken({
        projectId,
        connectionPurpose,
        connectionId: existingConnectionId,
      });
      setToken(token);
      setFlow('link_ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start connection');
      setFlow('error');
    }
  }, [projectId, connectionPurpose, existingConnectionId]);

  /* ── Primary button click ── */
  const handleButtonClick = useCallback(() => {
    if (disabled || flow !== 'idle') return;
    if (preScreenEnabled && !isReconnect) {
      setFlow('prescreen');
    } else {
      void startLinkFlow();
    }
  }, [disabled, flow, preScreenEnabled, isReconnect, startLinkFlow]);

  /* ── Reconnect click (from error state) ── */
  const handleRetry = useCallback(() => {
    setFlow('idle');
    setError(null);
    setToken(null);
    void startLinkFlow();
  }, [startLinkFlow]);

  /* ─── Render ─────────────────────────────────────────────── */
  const isLoading   = flow === 'loading_token' || flow === 'exchanging' || flow === 'link_ready';
  const buttonLabel = isLoading
    ? (flow === 'exchanging' ? 'Saving connection…' : 'Opening secure connection…')
    : (buttonText ?? (isReconnect ? 'Reconnect' : DEFAULT_BUTTON_TEXT[connectionPurpose]));

  return (
    <>
      {/* ── Pre-screen modal ── */}
      {flow === 'prescreen' && (
        <PlaidPreLinkTrustScreen
          purpose={connectionPurpose}
          onConnect={() => void startLinkFlow()}
          onManualEntry={() => {
            setFlow('idle');
            onExit?.(null);
          }}
          onClose={() => setFlow('idle')}
          loading={false}
          isReconnect={isReconnect}
        />
      )}

      <div className={`flex flex-col gap-2 ${className}`}>
        {/* ── Success state ── */}
        {flow === 'success' && successData && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
            style={{ background: 'rgba(16,185,129,0.10)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}
          >
            <CheckCircle2 size={14} />
            {successData.institutionName
              ? `${successData.institutionName} connected successfully`
              : 'Bank connected successfully'}
          </div>
        )}

        {/* ── Error state ── */}
        {flow === 'error' && errorMsg && (
          <div
            className="flex items-start gap-2 px-3 py-2 rounded-lg text-xs"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.15)' }}
          >
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            <div className="flex-1">
              <p>{plaidErrorMessage(errorMsg)}</p>
              <button
                onClick={handleRetry}
                className="mt-1.5 flex items-center gap-1 font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity"
              >
                <RefreshCw size={11} /> Try again
              </button>
            </div>
          </div>
        )}

        {/* ── Main button ── */}
        {flow !== 'success' && (
          <button
            id={`plaid-link-btn-${connectionPurpose.toLowerCase()}`}
            onClick={handleButtonClick}
            disabled={disabled || isLoading}
            style={buttonStyles(variant, size, disabled || isLoading)}
            aria-busy={isLoading}
          >
            {isLoading && (
              <span
                className="w-3.5 h-3.5 border-2 rounded-full animate-spin shrink-0"
                style={{ borderColor: 'rgba(253,255,252,0.3)', borderTopColor: '#FDFFFC' }}
              />
            )}
            {buttonLabel}
          </button>
        )}
      </div>
    </>
  );
}
