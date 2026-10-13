'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { CheckCircle, XCircle, PauseCircle, Compass, Warning, Info } from '@phosphor-icons/react';
import type { MapsProbeExecutionResult, StepCheckResult, MapsErrorType } from '@/lib/maps/probe';

export default function MapsProbePage() {
  const [loading, setLoading] = useState(false);
  const [overrideKey, setOverrideKey] = useState('');
  const [probeResult, setProbeResult] = useState<MapsProbeExecutionResult | null>(null);
  const [clientOrigin, setClientOrigin] = useState('');

  // Read client-side environment variable
  const clientEnvKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const isEnvKeyConfigured = Boolean(clientEnvKey.trim());
  const maskedEnvKey = isEnvKeyConfigured
    ? `${clientEnvKey.slice(0, 6)}…${clientEnvKey.slice(-4)}`
    : null;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setClientOrigin(window.location.origin);
    }
  }, []);

  async function handleRunProbe() {
    setLoading(true);
    setProbeResult(null);

    try {
      const res = await fetch('/api/dev/maps-probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: overrideKey.trim() || undefined,
        }),
      });

      const data = (await res.json()) as MapsProbeExecutionResult;
      setProbeResult(data);
    } catch (err: any) {
      console.error('[MapsProbe] Client fetch failed:', err);
      setProbeResult({
        success: false,
        timestamp: new Date().toISOString(),
        keyConfigured: false,
        maskedKey: null,
        overallError: err?.message || 'Network fetch failure to /api/dev/maps-probe',
        errorClassification: 'NETWORK_ERROR',
        steps: {
          scriptLoad: { step: 1, name: 'Maps JS Script & API Key Validation', status: 'failed', latencyMs: 0, errorMessage: 'Probe endpoint unreachable' },
          placesAutocomplete: { step: 2, name: 'Places AutocompleteService', status: 'skipped', latencyMs: 0 },
          geocoding: { step: 3, name: 'Geocoding API', status: 'skipped', latencyMs: 0 },
          streetViewAndStaticMaps: { step: 4, name: 'Street View Metadata & Static Maps', status: 'skipped', latencyMs: 0 },
        },
      });
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status: StepCheckResult['status']) {
    if (status === 'passed') {
      return (
        <span className="inline-flex items-center gap-1 rounded-none border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
          <CheckCircle className="h-3.5 w-3.5" weight="bold" />
          PASSED
        </span>
      );
    }
    if (status === 'failed') {
      return (
        <span className="inline-flex items-center gap-1 rounded-none border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-400">
          <XCircle className="h-3.5 w-3.5" weight="bold" />
          FAILED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-none border border-border bg-muted/40 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
        <PauseCircle className="h-3.5 w-3.5" weight="bold" />
        SKIPPED
      </span>
    );
  }

  function getErrorTaxonomyDetails(errorType?: MapsErrorType) {
    switch (errorType) {
      case 'MissingKeyMapError':
        return {
          title: 'MissingKeyMapError',
          summary: 'Google Maps API key is missing or blank.',
          fix: 'Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in apps/web/.env.local or root .env.local.',
        };
      case 'RefererNotAllowedMapError':
        return {
          title: 'RefererNotAllowedMapError',
          summary: `The current origin (${clientOrigin}) is not authorized in Google Cloud Console API key restrictions.`,
          fix: 'In GCP Console > Credentials > Key Restrictions > Websites, add: http://localhost:3000/* and http://localhost:3005/*.',
        };
      case 'REQUEST_DENIED':
        return {
          title: 'REQUEST_DENIED',
          summary: 'Request was rejected by Google. Key may be invalid, billing not enabled, or the specific API is disabled.',
          fix: 'Ensure Billing is linked to the GCP project and APIs (Places API New, Maps JS, Geocoding) are enabled.',
        };
      case 'OVER_QUERY_LIMIT':
        return {
          title: 'OVER_QUERY_LIMIT',
          summary: 'Quota or rate limit exceeded for this API key.',
          fix: 'Check quota limits or increase billing budget in Google Cloud Console.',
        };
      case 'STATIC_MAP_403':
        return {
          title: 'Maps Static / Street View HTTP 403 Forbidden',
          summary: 'Static Maps API or Street View Static API is not enabled on this GCP project, or digital signature is required.',
          fix: 'Enable "Maps Static API" and "Street View Static API" in Google Cloud Console.',
        };
      case 'STATIC_MAP_404':
        return {
          title: 'HTTP 404 / ZERO_RESULTS',
          summary: 'No imagery or panorama available for the requested coordinates.',
          fix: 'Location has no street view coverage. App must fall back gracefully to a roadmap static tile or asset-class icon.',
        };
      default:
        return {
          title: errorType || 'General Error',
          summary: 'Diagnostic failure occurred during Google Maps service validation.',
          fix: 'Inspect raw JSON response and server logs below.',
        };
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] px-6 py-12 md:px-12">
      <div className="mx-auto max-w-4xl">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-xs text-white/40">
          <Link href="/design-system/buttons" className="hover:text-white transition-colors">
            Design System
          </Link>
          <span>/</span>
          <span className="text-[var(--accent)] font-medium">Maps & Places Diagnostics Probe</span>
        </div>

        {/* Header */}
        <div className="mb-8 border-b border-border pb-6">
          <div className="inline-flex items-center gap-2 rounded-none border border-border bg-muted/30 px-3 py-1 text-xs text-foreground mb-3">
            <span className="h-2 w-2 rounded-none bg-emerald-500 animate-pulse" />
            Diagnostic Proof-of-Life Harness
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Google Maps & Places Diagnostics Probe
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Isolated diagnostic harness verifying all 4 integration stages: (1) JS API Script Loader & Key validation, (2) Places AutocompleteService, (3) Geocoding API resolution, and (4) Street View & Static Maps availability.
          </p>
        </div>

        {/* Environment & Configuration Status */}
        <div className="rounded-none border border-border bg-card p-6 mb-8 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4">
            Current Environment Configuration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="rounded-none border border-border bg-muted/20 p-4">
              <span className="text-muted-foreground block mb-1">Client Env Key</span>
              <span className="font-mono text-sm font-semibold text-foreground">
                {maskedEnvKey || (
                  <span className="text-amber-400 font-sans text-xs">Not Configured</span>
                )}
              </span>
              <span className="block mt-1 text-[10px] text-muted-foreground">
                NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
              </span>
            </div>

            <div className="rounded-none border border-border bg-muted/20 p-4">
              <span className="text-muted-foreground block mb-1">Current Origin</span>
              <span className="font-mono text-sm font-semibold text-foreground truncate block">
                {clientOrigin || 'http://localhost:3000'}
              </span>
              <span className="block mt-1 text-[10px] text-muted-foreground">
                Must match GCP HTTP Referrer whitelist
              </span>
            </div>

            <div className="rounded-none border border-border bg-muted/20 p-4">
              <span className="text-muted-foreground block mb-1">Target Address</span>
              <span className="font-mono text-sm font-semibold text-foreground">
                1247 Elm St, Austin TX
              </span>
              <span className="block mt-1 text-[10px] text-muted-foreground">
                Standard diagnostic test address
              </span>
            </div>
          </div>

          {/* Key Override & Run Action */}
          <div className="mt-6 pt-6 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex-1 max-w-md">
              <label htmlFor="key-override" className="block text-xs font-medium text-foreground mb-1.5">
                API Key Override (Optional session test)
              </label>
              <input
                id="key-override"
                type="password"
                placeholder="AIzaSy... (leave blank to test current env)"
                value={overrideKey}
                onChange={(e) => setOverrideKey(e.target.value)}
                className="w-full rounded-none border border-border bg-background px-3.5 py-2 text-xs font-mono text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
              />
            </div>

            <div className="flex items-end">
              <Button
                type="button"
                variant="primary"
                size="md"
                loading={loading}
                onClick={handleRunProbe}
                data-testid="run-maps-probe-btn"
                className="w-full sm:w-auto"
              >
                <Compass className="h-4 w-4" weight="bold" />
                Run Maps Diagnostics Probe
              </Button>
            </div>
          </div>
        </div>

        {/* Results Card */}
        {probeResult && (
          <div
            className={`rounded-none border p-6 mb-8 transition-all ${
              probeResult.success
                ? 'border-emerald-500/40 bg-emerald-500/10'
                : 'border-amber-500/30 bg-card'
            }`}
            data-testid="maps-probe-result"
          >
            {/* Top Banner */}
            <div className="flex items-start justify-between gap-4 mb-6 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                {probeResult.success ? (
                  <CheckCircle className="h-7 w-7 text-emerald-400" weight="bold" />
                ) : (
                  <Warning className="h-7 w-7 text-amber-400" weight="bold" />
                )}
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    {probeResult.success
                      ? 'All 4 Maps Integration Checks Passed'
                      : 'Maps Diagnostic Issues Detected'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {probeResult.overallError || 'Full integration verified end-to-end.'}
                  </p>
                </div>
              </div>

              {probeResult.errorClassification && (
                <span className="rounded-none border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-mono font-bold text-amber-300">
                  {probeResult.errorClassification}
                </span>
              )}
            </div>

            {/* 4 Isolated Steps Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Step 1 */}
              <div
                className="rounded-none border border-border bg-muted/20 p-4 flex flex-col justify-between"
                data-testid="step-script-load"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-none bg-muted text-xs font-bold text-foreground">
                      1
                    </span>
                    <span className="text-sm font-semibold text-foreground">Maps JS & Key</span>
                  </div>
                  {getStatusBadge(probeResult.steps.scriptLoad.status)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {probeResult.steps.scriptLoad.errorMessage ||
                    `Valid key detected: ${probeResult.maskedKey || 'Configured'}`}
                </p>
                <div className="mt-3 pt-2 border-t border-border/50 text-[11px] font-mono text-muted-foreground flex justify-between">
                  <span>Latency: {probeResult.steps.scriptLoad.latencyMs}ms</span>
                </div>
              </div>

              {/* Step 2 */}
              <div
                className="rounded-none border border-border bg-muted/20 p-4 flex flex-col justify-between"
                data-testid="step-places-autocomplete"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-none bg-muted text-xs font-bold text-foreground">
                      2
                    </span>
                    <span className="text-sm font-semibold text-foreground">Places Autocomplete</span>
                  </div>
                  {getStatusBadge(probeResult.steps.placesAutocomplete.status)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {probeResult.steps.placesAutocomplete.errorMessage ||
                    `Top Match: ${String((probeResult.steps.placesAutocomplete.details as any)?.topMatch || 'Predictions returned')}`}
                </p>
                <div className="mt-3 pt-2 border-t border-border/50 text-[11px] font-mono text-muted-foreground flex justify-between">
                  <span>Latency: {probeResult.steps.placesAutocomplete.latencyMs}ms</span>
                </div>
              </div>

              {/* Step 3 */}
              <div
                className="rounded-none border border-border bg-muted/20 p-4 flex flex-col justify-between"
                data-testid="step-geocoding"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-none bg-muted text-xs font-bold text-foreground">
                      3
                    </span>
                    <span className="text-sm font-semibold text-foreground">Geocoding API</span>
                  </div>
                  {getStatusBadge(probeResult.steps.geocoding.status)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {probeResult.steps.geocoding.errorMessage ||
                    `Coords: ${JSON.stringify((probeResult.steps.geocoding.details as any)?.coordinates || {})}`}
                </p>
                <div className="mt-3 pt-2 border-t border-border/50 text-[11px] font-mono text-muted-foreground flex justify-between">
                  <span>Latency: {probeResult.steps.geocoding.latencyMs}ms</span>
                </div>
              </div>

              {/* Step 4 */}
              <div
                className="rounded-none border border-border bg-muted/20 p-4 flex flex-col justify-between"
                data-testid="step-streetview-static"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-none bg-muted text-xs font-bold text-foreground">
                      4
                    </span>
                    <span className="text-sm font-semibold text-foreground">Street View & Static Maps</span>
                  </div>
                  {getStatusBadge(probeResult.steps.streetViewAndStaticMaps.status)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {probeResult.steps.streetViewAndStaticMaps.errorMessage ||
                    `Static Maps HTTP ${String((probeResult.steps.streetViewAndStaticMaps.details as any)?.staticMapsHttpStatus || 200)}`}
                </p>
                <div className="mt-3 pt-2 border-t border-border/50 text-[11px] font-mono text-muted-foreground flex justify-between">
                  <span>Latency: {probeResult.steps.streetViewAndStaticMaps.latencyMs}ms</span>
                </div>
              </div>
            </div>

            {/* Error Taxonomy Guide if failed */}
            {!probeResult.success && probeResult.errorClassification && (
              <div className="mt-6 rounded-none border border-amber-500/20 bg-amber-500/5 p-4 text-xs">
                <div className="flex items-center gap-2 text-amber-300 font-semibold mb-1">
                  <Info className="h-4 w-4" weight="bold" />
                  <span>Remediation Guide: {getErrorTaxonomyDetails(probeResult.errorClassification).title}</span>
                </div>
                <p className="text-foreground/80 mt-1">
                  {getErrorTaxonomyDetails(probeResult.errorClassification).summary}
                </p>
                <p className="text-amber-300 font-mono mt-2 bg-muted/40 p-2 rounded-none border border-border">
                  Fix: {getErrorTaxonomyDetails(probeResult.errorClassification).fix}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Google Cloud Console Pre-Flight Checklist */}
        <div className="rounded-none border border-border bg-card p-6 shadow-sm">
          <h2 className="text-base font-semibold text-foreground mb-3">
            Google Cloud Console Configuration Checklist
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Verify the following requirements in the GCP Project hosting PaperWorking:
          </p>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-3 p-3 rounded-none border border-border bg-muted/20">
              <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" weight="bold" />
              <div>
                <strong className="text-foreground">1. Enabled Google Maps APIs</strong>
                <p className="text-muted-foreground mt-0.5">
                  Maps JavaScript API, Places API (New), Geocoding API, Street View Static API, Maps Static API.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-none border border-border bg-muted/20">
              <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" weight="bold" />
              <div>
                <strong className="text-foreground">2. Active Billing Account</strong>
                <p className="text-muted-foreground mt-0.5">
                  GCP requires a valid billing account linked to the project to return Places predictions and Static tiles (even within the monthly $200 free credit).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-none border border-border bg-muted/20">
              <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" weight="bold" />
              <div>
                <strong className="text-foreground">3. API Key Website / HTTP Referrer Restrictions</strong>
                <p className="text-muted-foreground mt-0.5">
                  Allowed HTTP referrers must include: <code className="text-primary font-mono">http://localhost:3000/*</code>, <code className="text-primary font-mono">http://localhost:3005/*</code>, <code className="text-primary font-mono">https://paperworking.co/*</code>, <code className="text-primary font-mono">https://*.paperworking.co/*</code>.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-none border border-border bg-muted/20">
              <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" weight="bold" />
              <div>
                <strong className="text-foreground">4. Environment Variable Harmonization</strong>
                <p className="text-muted-foreground mt-0.5">
                  Client: <code className="text-primary font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>. Backend/Proxy: <code className="text-primary font-mono">GOOGLE_MAPS_API_KEY</code> (fallback to <code className="text-primary font-mono">GOOGLE_PLACES_API_KEY</code>).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
