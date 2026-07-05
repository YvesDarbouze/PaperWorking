'use client';

import React, { useState, useCallback } from 'react';
import { PenTool, CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

/**
 * ESignAction — Real E-Signature Component
 *
 * Calls POST /api/esign/create to create a real envelope via the configured
 * provider (DocuSign in production, MockESignAdapter in dev/keyless).
 *
 * Status flows:
 *   idle          → Request E-Signature button
 *   signing       → Loading spinner while API call is in-flight
 *   awaiting      → Amber "Awaiting Signature" badge (envelope created, signer not yet done)
 *   signed (prop) → Green "Signed" badge
 *   declined      → Red "Declined" badge — never faked as success
 *   error         → Error toast + button re-enabled
 *
 * The onSigned callback is NEVER called from a timer. It is called only when
 * the parent receives a real Firestore update (polling or webhook). Consumers
 * should poll /api/esign/status/[envelopeId] or listen to Firestore directly.
 */

export type ESignLocalStatus = 'idle' | 'signing' | 'awaiting' | 'declined' | 'error';

interface ESignActionProps {
  /** Human-readable document label (e.g. "Final Closing Disclosures") */
  documentName: string;
  /** Display role of the signer (e.g. "General Contractor") */
  signeeRole: string;
  /** Called by the parent after it confirms via Firestore / polling that the envelope is 'completed' */
  onSigned: () => void;
  /** True when the parent knows the document is already signed (eSignStatus === 'Signed') */
  isSigned?: boolean;
  /** True when the parent knows the signer declined */
  isDeclined?: boolean;

  // ── Fields needed for a real envelope ────────────────────────────────────
  /** Firestore project ID — required for the real API call */
  projectId?: string;
  /** Firestore document ID — required for the real API call */
  documentId?: string;
  /** Firebase Storage download URL for the document to sign */
  documentUrl?: string;
  /** Signer email — required for DocuSign adapter */
  signerEmail?: string;
  /** Signer full name */
  signerName?: string;
}

export default function ESignAction({
  documentName,
  signeeRole,
  onSigned,
  isSigned = false,
  isDeclined = false,
  projectId,
  documentId,
  documentUrl,
  signerEmail,
  signerName,
}: ESignActionProps) {
  const [localStatus, setLocalStatus] = useState<ESignLocalStatus>('idle');
  const [envelopeId, setEnvelopeId] = useState<string | null>(null);
  const { user } = useAuth();

  const handleRequestSignature = useCallback(async () => {
    if (localStatus === 'signing' || localStatus === 'awaiting') return;

    // ── Validate required context ────────────────────────────────────────
    if (!projectId || !documentId) {
      toast.error('Document context missing — cannot send signature request.');
      return;
    }

    const resolvedEmail  = signerEmail  ?? user?.email  ?? '';
    const resolvedName   = signerName   ?? user?.displayName ?? signeeRole;
    const resolvedDocUrl = documentUrl  ?? '';

    if (!resolvedEmail) {
      toast.error('Signer email is required to send a signature request.');
      return;
    }

    setLocalStatus('signing');
    const loadingToastId = toast.loading(`Sending signature request for ${documentName}…`);

    try {
      const idToken = await user?.getIdToken();
      if (!idToken) throw new Error('Not authenticated');

      const res = await fetch('/api/esign/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          projectId,
          documentId,
          documentName,
          signerRole:  signeeRole,
          signerEmail: resolvedEmail,
          signerName:  resolvedName,
          documentUrl: resolvedDocUrl,
        }),
      });

      const data: {
        success: boolean;
        envelopeId?: string;
        signingUrl?: string;
        error?: string;
        provider?: string;
      } = await res.json();

      toast.dismiss(loadingToastId);

      if (!res.ok || !data.success) {
        setLocalStatus('error');
        toast.error(data.error ?? 'Failed to send signature request. Please try again.');
        return;
      }

      setEnvelopeId(data.envelopeId ?? null);
      setLocalStatus('awaiting');

      // If the provider returned an embedded signing URL, open it
      if (data.signingUrl) {
        window.open(data.signingUrl, '_blank', 'noopener,noreferrer');
      }

      const providerLabel = data.provider === 'mock' ? 'mock provider (dev mode)' : 'DocuSign';
      toast.success(
        `Signature request sent via ${providerLabel}. The document will update when signed.`,
        { duration: 6000 },
      );
    } catch (err) {
      toast.dismiss(loadingToastId);
      setLocalStatus('error');
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Signature request failed: ${msg}`);
    }
  }, [
    localStatus, projectId, documentId, documentName, signeeRole,
    signerEmail, signerName, documentUrl, user,
  ]);

  // ── Render: already signed (from parent/Firestore) ───────────────────────
  if (isSigned) {
    return (
      <div className="flex items-center text-[#3f7d20] bg-[#3f7d20]/10 border border-[#3f7d20]/20 px-3 py-1.5 rounded-lg text-xs font-semibold">
        <CheckCircle className="w-4 h-4 mr-1.5" /> Signed ({signeeRole})
      </div>
    );
  }

  // ── Render: signer declined ──────────────────────────────────────────────
  if (isDeclined || localStatus === 'declined') {
    return (
      <div className="flex items-center text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-semibold">
        <XCircle className="w-4 h-4 mr-1.5" /> Declined — {signeeRole}
      </div>
    );
  }

  // ── Render: awaiting signature ────────────────────────────────────────────
  if (localStatus === 'awaiting') {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-xs font-semibold">
          <Clock className="w-4 h-4 mr-1.5" /> Awaiting Signature — {signeeRole}
        </div>
        {envelopeId && (
          <p className="text-[10px] text-text-secondary pl-1">
            Envelope: {envelopeId.slice(0, 16)}…
          </p>
        )}
      </div>
    );
  }

  // ── Render: idle / error — show request button ───────────────────────────
  if (!projectId || !documentId) {
    return (
      <button 
        disabled={true}
        title="E-Signature integration (DocuSign/HelloSign) coming soon"
        className="flex items-center gap-1.5 bg-[#454955]/10 border border-[#454955]/20 text-[#454955]/60 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-not-allowed opacity-50"
      >
        <PenTool className="w-3.5 h-3.5" />
        E-Sign Coming Soon
      </button>
    );
  }

  const isSending = localStatus === 'signing';
  return (
    <button
      onClick={handleRequestSignature}
      disabled={isSending}
      className="flex items-center gap-1.5 bg-[#454955]/10 border border-[#454955]/30 text-[#454955] px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#454955]/20 transition disabled:opacity-50"
    >
      {isSending
        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
        : <PenTool className="w-3.5 h-3.5" />
      }
      {localStatus === 'error' ? 'Retry E-Signature' : 'Request E-Signature'}
    </button>
  );
}
