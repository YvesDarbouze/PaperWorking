'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { MagnifyingGlass } from '@phosphor-icons/react/dist/ssr';

export default function DealNotFound() {
  return (
    <div
      data-testid="deal-not-found"
      className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center"
    >
      <div className="w-full max-w-md rounded-none border border-border bg-card p-8 text-center shadow-2xl space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-none border border-border bg-muted/40">
          <MagnifyingGlass className="h-8 w-8 text-muted-foreground" weight="bold" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-lg font-bold text-foreground tracking-tight">
            This deal is no longer available
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            It may have been fully funded, withdrawn, or the link is incorrect.
          </p>
        </div>

        <div className="pt-3">
          <Button
            href="/dashboard/deals"
            variant="secondary"
            size="md"
            className="w-full justify-center rounded-none"
          >
            Browse Deals Marketplace →
          </Button>
        </div>
      </div>
    </div>
  );
}
