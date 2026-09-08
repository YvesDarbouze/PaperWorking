import React from 'react';
import { Button } from '@/components/ui/Button';

export default function DealNotFound() {
  return (
    <div
      data-testid="deal-not-found"
      className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0f] px-4 text-center"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121014] p-8 text-center shadow-2xl space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
          <span className="material-symbols-outlined text-4xl text-[#9E9DA0]/60">
            search_off
          </span>
        </div>

        <div className="space-y-1.5">
          <h1 className="text-lg font-bold text-white tracking-tight">
            This deal is no longer available
          </h1>
          <p className="text-xs text-[#9E9DA0] leading-relaxed">
            It may have been fully funded, withdrawn, or the link is incorrect.
          </p>
        </div>

        <div className="pt-3">
          <Button
            href="/dashboard/deals"
            variant="secondary"
            size="md"
            className="w-full justify-center"
          >
            Browse Deals Marketplace →
          </Button>
        </div>
      </div>
    </div>
  );
}
