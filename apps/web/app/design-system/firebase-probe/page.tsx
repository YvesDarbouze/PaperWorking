'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

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
        <div className="mb-8 border-b border-white/8 pb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1 text-xs text-[var(--status-live)] mb-3">
            <span className="h-2 w-2 rounded-full bg-[var(--status-live)] animate-pulse" />
            Standing Data Layer Foundation
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#fdfffc]">
            Firebase Emulator Proof-of-Life
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Dev-only verification test verifying the round-trip pipeline:{' '}
            <code className="text-xs bg-white/[0.06] px-1.5 py-0.5 rounded text-[var(--accent)]">
              Client → API Route → Firebase Admin SDK → Firestore Emulator
            </code>
            . Writes, verifies reads, and deletes test probes with zero permanent data retention.
          </p>
        </div>

        {/* Action Panel */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 mb-8 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-[#fdfffc]">Execute Round-Trip Probe</h2>
              <p className="text-xs text-white/50 mt-1">
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
              <span className="material-symbols-outlined text-[18px]">bolt</span>
              Run Firebase Probe
            </Button>
          </div>
        </div>

        {/* Results Display */}
        {result && (
          <div
            className={`rounded-2xl border p-6 transition-all ${
              result.success
                ? 'border-[var(--accent)]/40 bg-[var(--accent-subtle)]/20'
                : 'border-rose-500/30 bg-rose-500/5'
            }`}
            data-testid="firebase-probe-result"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-2.5">
                <span
                  className={`material-symbols-outlined text-[24px] ${
                    result.success ? 'text-[var(--accent)]' : 'text-rose-400'
                  }`}
                >
                  {result.success ? 'check_circle' : 'error'}
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#fdfffc]">
                    {result.success ? 'Round-Trip Succeeded' : 'Probe Failed'}
                  </h3>
                  <p className="text-xs text-white/60 mt-0.5">
                    {result.message || result.error}
                  </p>
                </div>
              </div>

              {result.roundtripMs !== undefined && (
                <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1 text-right">
                  <span className="text-[10px] uppercase font-bold text-white/40 block">Latency</span>
                  <span className="text-sm font-mono font-bold text-[var(--accent)]">
                    {result.roundtripMs}ms
                  </span>
                </div>
              )}
            </div>

            {result.verifiedSteps && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10 text-xs">
                <div className="flex items-center gap-2 text-white/75">
                  <span className="material-symbols-outlined text-[16px] text-[var(--accent)]">
                    done
                  </span>
                  <span>1. Write Doc</span>
                </div>
                <div className="flex items-center gap-2 text-white/75">
                  <span className="material-symbols-outlined text-[16px] text-[var(--accent)]">
                    done
                  </span>
                  <span>2. Read Back</span>
                </div>
                <div className="flex items-center gap-2 text-white/75">
                  <span className="material-symbols-outlined text-[16px] text-[var(--accent)]">
                    done
                  </span>
                  <span>3. Delete Doc</span>
                </div>
                <div className="flex items-center gap-2 text-white/75">
                  <span className="material-symbols-outlined text-[16px] text-[var(--accent)]">
                    done
                  </span>
                  <span>4. Cleaned Up</span>
                </div>
              </div>
            )}

            {result.probeId && (
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-white/45">
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
