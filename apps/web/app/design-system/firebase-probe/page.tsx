'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Lightning, CheckCircle, XCircle, Check } from '@phosphor-icons/react';

interface ProbeResult {
  success: boolean;
  probeId?: string;
  roundtripMs?: number;
  verifiedSteps?: {
    write: boolean;
    read: boolean;
    delete: boolean;
    cleanedUp: boolean;
  };
  timestamp?: string;
  message?: string;
  error?: string;
}

export default function FirebaseProbePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProbeResult | null>(null);

  async function handleRunProbe() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/dev/firebase-probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({
        success: false,
        error: err?.message || 'Network request failed',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] px-6 py-12 md:px-12">
      <div className="mx-auto max-w-3xl">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-xs text-white/40">
          <Link href="/design-system/buttons" className="hover:text-white transition-colors">
            Design System
          </Link>
          <span>/</span>
          <span className="text-[var(--accent)] font-medium">Firebase Probe (Dev Only)</span>
        </div>

        {/* Header */}
        <div className="mb-8 border-b border-border pb-6">
          <div className="inline-flex items-center gap-2 rounded-none border border-border bg-muted/30 px-3 py-1 text-xs text-foreground mb-3">
            <span className="h-2 w-2 rounded-none bg-emerald-500 animate-pulse" />
            Standing Data Layer Foundation
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Firebase Emulator Proof-of-Life
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Dev-only verification test verifying the round-trip pipeline:{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded-none text-foreground font-mono">
              Client → API Route → Firebase Admin SDK → Firestore Emulator
            </code>
            . Writes, verifies reads, and deletes test probes with zero permanent data retention.
          </p>
        </div>

        {/* Action Panel */}
        <div className="rounded-none border border-border bg-card p-6 mb-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Execute Round-Trip Probe</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Triggers an atomic write → read → delete sequence on the local Firestore emulator.
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              size="md"
              loading={loading}
              onClick={handleRunProbe}
              data-testid="run-firebase-probe-btn"
            >
              <Lightning className="h-4 w-4" weight="bold" />
              Run Firebase Probe
            </Button>
          </div>
        </div>

        {/* Results Display */}
        {result && (
          <div
            className={`rounded-none border p-6 transition-all ${
              result.success
                ? 'border-emerald-500/40 bg-emerald-500/10'
                : 'border-destructive/30 bg-destructive/10'
            }`}
            data-testid="firebase-probe-result"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-2.5">
                {result.success ? (
                  <CheckCircle className="h-6 w-6 text-emerald-500" weight="bold" />
                ) : (
                  <XCircle className="h-6 w-6 text-destructive" weight="bold" />
                )}
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {result.success ? 'Round-Trip Succeeded' : 'Probe Failed'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {result.message || result.error}
                  </p>
                </div>
              </div>

              {result.roundtripMs !== undefined && (
                <div className="rounded-none border border-border bg-muted/40 px-3 py-1 text-right">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Latency</span>
                  <span className="text-sm font-mono font-bold text-foreground">
                    {result.roundtripMs}ms
                  </span>
                </div>
              )}
            </div>

            {result.verifiedSteps && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border text-xs">
                <div className="flex items-center gap-2 text-foreground">
                  <Check className="h-4 w-4 text-emerald-500" weight="bold" />
                  <span>1. Write Doc</span>
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <Check className="h-4 w-4 text-emerald-500" weight="bold" />
                  <span>2. Read Back</span>
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <Check className="h-4 w-4 text-emerald-500" weight="bold" />
                  <span>3. Delete Doc</span>
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <Check className="h-4 w-4 text-emerald-500" weight="bold" />
                  <span>4. Cleaned Up</span>
                </div>
              </div>
            )}

            {result.probeId && (
              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span>Probe ID: {result.probeId}</span>
                <span>{result.timestamp}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
