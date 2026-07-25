'use client';

import React, { useState, useRef } from 'react';
import {
  MapPin,
  ScanLine,
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Loader2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { ZoningScanResult, RecognizedEnvironmentalCondition } from '@/types/marketVitals';

// ── Severity config ───────────────────────────────────────────

const SEVERITY_META: Record<
  RecognizedEnvironmentalCondition['severity'],
  { label: string; color: string; bg: string; Icon: typeof AlertTriangle }
> = {
  high: {
    label: 'High',
    color: 'var(--color-error)',
    bg: 'var(--color-error-container)',
    Icon: AlertTriangle,
  },
  medium: {
    label: 'Medium',
    color: 'var(--color-tertiary)',
    bg: 'var(--color-tertiary-container)',
    Icon: Info,
  },
  low: {
    label: 'Low',
    color: 'var(--color-deep-forest)',
    bg: 'var(--color-secondary-container)',
    Icon: CheckCircle2,
  },
};

const REC_TYPE_LABEL: Record<RecognizedEnvironmentalCondition['type'], string> = {
  REC: 'REC',
  CREC: 'CREC',
  HREC: 'HREC',
  'De Minimis': 'De Minimis',
};

// ── REC Row ───────────────────────────────────────────────────

function RECRow({ rec }: { rec: RecognizedEnvironmentalCondition }) {
  const [expanded, setExpanded] = useState(false);
  const { color, bg, Icon } = SEVERITY_META[rec.severity];

  return (
    <div
      className="rounded border overflow-hidden"
      style={{ borderColor: 'var(--pw-border)' }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f9f9f9]"
        style={{ background: 'var(--pw-surface)' }}
      >
        {/* Severity badge */}
        <div
          className="flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-sm)] border shrink-0 text-[9px] font-bold uppercase tracking-wide"
          style={{ color, background: bg, borderColor: color }}
        >
          <Icon className="w-2.5 h-2.5" aria-hidden="true" />
          {rec.severity}
        </div>

        {/* Type badge */}
        <span
          className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0"
          style={{ background: 'var(--bg-canvas)', color: 'var(--pw-muted)' }}
        >
          {REC_TYPE_LABEL[rec.type]}
        </span>

        {/* Description */}
        <p className="text-xs font-medium flex-1" style={{ color: 'var(--text-primary)' }}>
          {rec.description}
        </p>

        {/* Expand toggle */}
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--pw-subtle)' }} />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--pw-subtle)' }} />
        )}
      </button>

      {expanded && (
        <div
          className="px-4 pb-4 pt-2 space-y-2 border-t"
          style={{ borderColor: 'var(--bg-canvas)', background: '#fafafa' }}
        >
          {rec.location && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--pw-muted)' }}>
                Source Context
              </p>
              <p className="text-[10px] leading-relaxed font-mono" style={{ color: 'var(--text-primary)' }}>
                {rec.location}
              </p>
            </div>
          )}
          {rec.recommendation && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--pw-muted)' }}>
                Recommendation
              </p>
              <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                {rec.recommendation}
              </p>
            </div>
          )}
          <p className="text-[8px]" style={{ color: 'var(--pw-border)' }}>
            Source: {rec.source}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Zoning Info Banner ────────────────────────────────────────

function ZoningBanner({ result }: { result: ZoningScanResult }) {
  const isNA = result.zoningCode.startsWith('N/A');

  return (
    <div
      className="rounded-[var(--radius-lg)] p-4 border bg-[var(--pw-glass-bg)] backdrop-blur-xl"
      style={{
        borderColor: 'var(--pw-border)',
      }}
    >
      <div className="flex items-start gap-3">
        <MapPin className="w-4 h-4 mt-0.5 shrink-0" style={{ color: isNA ? 'var(--pw-muted)' : 'var(--pw-ocean)' }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-sm font-bold font-mono"
              style={{ color: isNA ? 'var(--pw-subtle)' : 'var(--pw-black)' }}
            >
              {result.zoningCode}
            </span>
            {result.permittedUnitDensity != null && (
              <span
                className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-[var(--radius-sm)] border border-[var(--pw-border)] bg-[var(--pw-glass-bg)] text-[var(--pw-ocean)]"
              >
                {result.permittedUnitDensity} units/acre
              </span>
            )}
          </div>
          <p className="text-[10px] mt-1 leading-relaxed" style={{ color: 'var(--pw-fg)' }}>
            {result.zoningDescription}
          </p>

          {/* Overlay districts */}
          {result.overlayDistricts && result.overlayDistricts.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {result.overlayDistricts.map((d) => (
                <span
                  key={d}
                  className="text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-[var(--radius-sm)] border border-[var(--pw-border)] bg-[var(--pw-glass-bg)]"
                  style={{ color: 'var(--pw-subtle)' }}
                >
                  {d}
                </span>
              ))}
            </div>
          )}

          {/* Setbacks */}
          {result.setbacks && (
            <div className="flex gap-4 mt-2">
              {result.setbacks.front && (
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: 'var(--pw-border)' }}>
                    Front Setback
                  </p>
                  <p className="text-[10px] font-mono" style={{ color: 'var(--text-primary)' }}>
                    {result.setbacks.front}
                  </p>
                </div>
              )}
              {result.setbacks.rear && (
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: 'var(--pw-border)' }}>
                    Rear Setback
                  </p>
                  <p className="text-[10px] font-mono" style={{ color: 'var(--text-primary)' }}>
                    {result.setbacks.rear}
                  </p>
                </div>
              )}
              {result.setbacks.side && (
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: 'var(--pw-border)' }}>
                    Side Setback
                  </p>
                  <p className="text-[10px] font-mono" style={{ color: 'var(--text-primary)' }}>
                    {result.setbacks.side}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Source link */}
          {result.source && result.source.startsWith('http') && (
            <a
              href={result.source}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-[9px] font-medium hover:underline text-[var(--pw-ocean)]"
            >
              <ExternalLink className="w-2.5 h-2.5" />
              View GIS Portal
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────

export interface ZoningScanPanelProps {
  zip: string;
  address: string;
  projectId?: string;
  className?: string;
}

export default function ZoningScanPanel({
  zip,
  address,
  projectId,
  className = '',
}: ZoningScanPanelProps) {
  const [scanResult, setScanResult] = useState<ZoningScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phaseIText, setPhaseIText] = useState('');
  const [showPhaseIInput, setShowPhaseIInput] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const highCount = scanResult?.recs.filter((r) => r.severity === 'high').length ?? 0;
  const medCount = scanResult?.recs.filter((r) => r.severity === 'medium').length ?? 0;

  // ── Zoning scan ───────────────────────────────────────────

  async function runScan() {
    setIsScanning(true);
    setError(null);
    setScanResult(null);

    try {
      const res = await fetch('/api/zoning-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zip,
          address,
          projectId,
          phaseIReportText: phaseIText || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Zoning scan failed. Please try again.');
        return;
      }
      setScanResult(json.result as ZoningScanResult);
    } catch {
      setError('Network error. Check your connection and retry.');
    } finally {
      setIsScanning(false);
    }
  }

  return (
    <div
      className={`rounded-[var(--radius-lg)] border overflow-hidden ${className}`}
      style={{ borderColor: 'var(--pw-border)', background: 'var(--pw-surface)' }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--bg-canvas)' }}
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--pw-muted)' }}>
            Zoning Scan & Environmental Due Diligence
          </p>
          <p className="text-[9px] mt-0.5" style={{ color: 'var(--pw-border)' }}>
            Pulls zoning data from municipal GIS · Extracts RECs from Phase I ESA text
          </p>
        </div>
        {scanResult && (
          <button
            type="button"
            onClick={() => { setScanResult(null); setError(null); }}
            className="flex items-center gap-1 text-[9px] font-medium"
            style={{ color: 'var(--pw-subtle)' }}
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* ── Manual text input ───────────────────────── */}
        <div>
          <button
            type="button"
            onClick={() => setShowPhaseIInput((v) => !v)}
            className="flex items-center gap-2 text-[10px] font-semibold transition-colors hover:opacity-80"
            style={{ color: 'var(--pw-ocean)' }}
          >
            <FileText className="w-3.5 h-3.5" />
            {showPhaseIInput ? 'Hide Phase I ESA Text' : 'Enter Phase I ESA Text'}
            {showPhaseIInput ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>

          {showPhaseIInput && (
            <div className="mt-3 space-y-2">
              <p className="text-[9px]" style={{ color: 'var(--pw-subtle)' }}>
                Paste the summary, findings, or conclusions section of your Phase I ESA report.
                The scanner will identify RECs, CRECs, HRECs, and De Minimis conditions.
              </p>
              <textarea
                ref={textareaRef}
                value={phaseIText}
                onChange={(e) => setPhaseIText(e.target.value)}
                placeholder="Paste Phase I ESA report text here…"
                rows={6}
                className="w-full text-[10px] rounded border p-3 resize-y leading-relaxed"
                style={{
                  borderColor: 'var(--pw-border)',
                  background: 'var(--bg-canvas)',
                  color: 'var(--text-primary)',
                  fontFamily: 'ui-monospace, monospace',
                  outline: 'none',
                }}
              />
              {phaseIText && (
                <p className="text-[8px]" style={{ color: 'var(--pw-subtle)' }}>
                  {phaseIText.length.toLocaleString()} characters · REC analysis will run on scan
                </p>
              )}
            </div>
          )}
        </div>

        {/* Scan button */}
        <button
          type="button"
          onClick={runScan}
          disabled={isScanning}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-[var(--radius-full)] font-semibold text-xs transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: 'var(--pw-black)',
            color: 'var(--pw-white)',
            letterSpacing: '0.04em',
          }}
        >
          {isScanning ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Scanning GIS &amp; extracting data…
            </>
          ) : (
            <>
              <ScanLine className="w-3.5 h-3.5" />
              Run Zoning Scan{phaseIText ? ' + REC Analysis' : ''}
            </>
          )}
        </button>

        {/* Error state */}
        {error && (
          <div
            className="flex items-start gap-2 rounded-[var(--radius-lg)] p-4 text-xs border bg-[var(--pw-glass-bg)] backdrop-blur-xl"
            style={{
              borderColor: 'var(--color-error, #F06543)',
              color: 'var(--color-error, #F06543)',
            }}
          >
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[var(--color-error)]" />
            <span>{error}</span>
          </div>
        )}

        {/* Results */}
        {scanResult && (
          <div className="space-y-5">
            {/* Zoning info */}
            <ZoningBanner result={scanResult} />

            {/* REC summary badges */}
            {scanResult.recs.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--pw-muted)' }}>
                  Environmental Findings:
                </p>
                {highCount > 0 && (
                  <span
                    className="text-[9px] font-bold px-2 py-0.5 rounded-[var(--radius-sm)] border"
                    style={{ background: 'var(--color-error-container)', color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
                  >
                    {highCount} High
                  </span>
                )}
                {medCount > 0 && (
                  <span
                    className="text-[9px] font-bold px-2 py-0.5 rounded-[var(--radius-sm)] border"
                    style={{ background: 'var(--color-tertiary-container)', color: 'var(--color-tertiary)', borderColor: 'var(--color-tertiary)' }}
                  >
                    {medCount} Medium
                  </span>
                )}
                {scanResult.recs.filter((r) => r.severity === 'low').length > 0 && (
                  <span
                    className="text-[9px] font-bold px-2 py-0.5 rounded-[var(--radius-sm)] border"
                    style={{ background: 'var(--color-secondary-container)', color: 'var(--color-deep-forest)', borderColor: 'var(--color-deep-forest)' }}
                  >
                    {scanResult.recs.filter((r) => r.severity === 'low').length} Low
                  </span>
                )}
                {scanResult.recs.length === 0 && (
                  <span
                    className="text-[9px] font-bold px-2 py-0.5 rounded-[var(--radius-sm)] border"
                    style={{ background: 'var(--color-secondary-container)', color: 'var(--color-deep-forest)', borderColor: 'var(--color-deep-forest)' }}
                  >
                    No RECs identified
                  </span>
                )}
              </div>
            )}

            {/* No RECs clean bill */}
            {scanResult.recs.length === 0 && !phaseIText && (
              <div
                className="flex items-center gap-2 rounded-[var(--radius-lg)] p-4 text-[10px] border bg-[var(--pw-glass-bg)] backdrop-blur-xl"
                style={{
                  borderColor: 'var(--color-secondary-container, #D3E7DF)',
                  color: 'var(--color-deep-forest, #0B3F2D)',
                }}
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[var(--color-deep-forest)]" />
                No RECs extracted — paste Phase I ESA text above for automated environmental analysis.
              </div>
            )}

            {/* REC list */}
            {scanResult.recs.length > 0 && (
              <div className="space-y-2">
                <p className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--pw-muted)' }}>
                  Recognized Environmental Conditions ({scanResult.recs.length})
                </p>
                {scanResult.recs.map((rec) => (
                  <RECRow key={rec.id} rec={rec} />
                ))}
              </div>
            )}

            {/* Scan metadata */}
            <p className="text-[8px]" style={{ color: 'var(--pw-border)' }}>
              Scanned {new Date(scanResult.scanDate).toLocaleString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
              {' · '}Source: {scanResult.source}
              {' · '}
              For full GIS analysis run:&nbsp;
              <code className="font-mono text-[8px]">
                npx ts-node src/scripts/zoning-scraper.ts --address=&quot;{address}&quot; --state=XX
              </code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
