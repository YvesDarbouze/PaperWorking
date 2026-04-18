'use client';

import React from 'react';
import { Lock, CreditCard } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   SubscriptionGate — Blurred Preview + Subscribe CTA

   Wraps content for invited non-subscribers. Shows a
   blurred preview of deal data with a CTA to subscribe.
   ═══════════════════════════════════════════════════════ */

interface Props {
  children: React.ReactNode;
  projectId?: string;
  dealName?: string;
}

export default function SubscriptionGate({ children, projectId, dealName }: Props) {
  const checkoutUrl = projectId
    ? `/api/stripe/checkout?deal=${projectId}`
    : '/pricing';

  return (
    <div className="relative rounded-xl overflow-hidden">
      {/* Blurred Content */}
      <div className="blur-md select-none pointer-events-none opacity-60">
        {children}
      </div>

      {/* Gate Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm z-10">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 max-w-sm text-center">
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-indigo-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Subscription Required</h3>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            {dealName
              ? `You've been invited to view "${dealName}". Subscribe to PaperWorking to access the full listing and accept equity offers.`
              : 'A PaperWorking subscription is required to access this content.'}
          </p>
          <a
            href={checkoutUrl}
            className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition shadow-sm"
          >
            <CreditCard className="w-4 h-4" />
            Subscribe to View
          </a>
          <p className="text-xs text-gray-400 mt-3">Starting at $29/month</p>
        </div>
      </div>
    </div>
  );
}
