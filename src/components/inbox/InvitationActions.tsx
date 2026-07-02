'use client';

import React, { useState } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════
   InvitationActions — Inline Accept / Decline buttons
   
   Used within InboxItemCard for invitation-type items.
   Calls the parent's respondToInvitation callback and
   shows loading + success/error state.
   ═══════════════════════════════════════════════════════ */

interface InvitationActionsProps {
  itemId: string;
  actionTaken?: 'accepted' | 'declined' | 'dismissed';
  onRespond: (itemId: string, action: 'accepted' | 'declined') => Promise<void>;
}

export default function InvitationActions({
  itemId,
  actionTaken,
  onRespond,
}: InvitationActionsProps) {
  const [loading, setLoading] = useState<'accept' | 'decline' | null>(null);

  const handleAction = async (action: 'accepted' | 'declined') => {
    setLoading(action === 'accepted' ? 'accept' : 'decline');
    try {
      await onRespond(itemId, action);
      toast.success(
        action === 'accepted'
          ? 'Invitation accepted!'
          : 'Invitation declined.',
        {
          icon: action === 'accepted' ? '✅' : '❌',
          style: { background: '#0d0d0d', color: '#fff' },
        },
      );
    } catch {
      toast.error('Failed to respond. Try again.', {
        style: { background: '#0d0d0d', color: '#fff' },
      });
    } finally {
      setLoading(null);
    }
  };

  // Already responded — show static badge
  if (actionTaken) {
    return (
      <motion.span
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-full"
        style={{
          backgroundColor:
            actionTaken === 'accepted' ? '#f0fdf4' : '#fef2f2',
          color: actionTaken === 'accepted' ? '#16a34a' : '#dc2626',
        }}
      >
        {actionTaken === 'accepted' ? (
          <Check className="w-3 h-3" />
        ) : (
          <X className="w-3 h-3" />
        )}
        {actionTaken === 'accepted' ? 'Accepted' : 'Declined'}
      </motion.span>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <button
        id={`invite-accept-${itemId}`}
        onClick={(e) => {
          e.stopPropagation();
          handleAction('accepted');
        }}
        disabled={loading !== null}
        className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
        style={{ backgroundColor: '#0d0d0d', color: '#ffffff' }}
        onMouseEnter={(e) => {
          if (!loading)
            e.currentTarget.style.backgroundColor = '#333333';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#0d0d0d';
        }}
      >
        {loading === 'accept' ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Check className="w-3 h-3" />
        )}
        Accept
      </button>
      <button
        id={`invite-decline-${itemId}`}
        onClick={(e) => {
          e.stopPropagation();
          handleAction('declined');
        }}
        disabled={loading !== null}
        className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold uppercase tracking-wider border transition-colors disabled:opacity-50"
        style={{
          backgroundColor: 'transparent',
          color: 'var(--text-primary)',
          borderColor: 'var(--border-ui)',
        }}
        onMouseEnter={(e) => {
          if (!loading)
            e.currentTarget.style.backgroundColor = '#F2F2F2';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        {loading === 'decline' ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <X className="w-3 h-3" />
        )}
        Decline
      </button>
    </div>
  );
}
