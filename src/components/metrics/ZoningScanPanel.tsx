'use client';

import React, { useState, useRef, useCallback } from 'react';
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
  Upload,
  FileCheck2,
} from 'lucide-react';
import { storage, auth } from '@/lib/firebase/config';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';
import type { ZoningScanResult, RecognizedEnvironmentalCondition } from '@/types/marketVitals';

// ── Severity config ───────────────────────────────────────────

const SEVERITY_META: Record<
  RecognizedEnvironmentalCondition['severity'],
  { label: string; color: string; bg: string; Icon: typeof AlertTriangle }
> = {
  high: {
    label: 'High',
    color: '#dc2626',
    bg: '#fef2f2',
    Icon: AlertTriangle,
  },
  medium: {
    label: 'Medium',
    color: '#d97706',
    bg: '#fffbeb',
    Icon: Info,
  },
  low: {
    label: 'Low',
    color: '#16a34a',
    bg: '#f0fdf4',
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
          className="flex items-center gap-1 px-2 py-0.5 rounded shrink-0 text-[9px] font-bold uppercase tracking-wide"
          style={{ color, background: bg }}
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
      className="rounded-lg p-4 border"
      style={{
        borderColor: isNA ? 'var(--pw-border)' : '#d4d4d4',
        background: isNA ? 'var(--bg-canvas)' : 'var(--pw-surface)',
      }}
    >
      <div className="flex items-start gap-3">
        <MapPin className="w-4 h-4 mt-0.5 shrink-0" style={{ color: isNA ? 'var(--pw-muted)' : '#1a73e8' }} />
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
                className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
                style={{ background: '#eff6ff', color: '#1a73e8' }}
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
                  className="text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
                  style={{ background: 'var(--bg-canvas)', color: 'var(--pw-subtle)' }}
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
              className="inline-flex items-center gap-1 mt-2 text-[9px] font-medium hover:underline"
              style={{ color: '#1a73e8' }}
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

  // ── PDF Upload State ──────────────────────────────────────
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isExtracting, setIsExtracting] = useState(false);

  const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

  const highCount = scanResult?.recs.filter((r) => r.severity === 'high').length ?? 0;
  const medCount = scanResult?.recs.filter((r) => r.severity === 'medium').length ?? 0;

  // ── File handling ─────────────────────────────────────────

  const handleFileSelect = useCallback((file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Invalid file type. Upload a PDF, JPEG, or PNG.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File too large. Maximum 20 MB for Phase I reports.');
      return;
    }
    setUploadFile(file);
    setError(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  // ── OCR extraction ────────────────────────────────────────

  async function processPhaseIOCR() {
    if (!uploadFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // 1. Upload to Firebase Storage
      const storagePath = `projects/${projectId || 'shared'}/phase-i-esa/${Date.now()}_${uploadFile.name}`;
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, uploadFile);

      const downloadUrl = await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
          (uploadError) => reject(uploadError),
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          },
        );
      });

      setIsUploading(false);
      setIsExtracting(true);
      toast.loading('Extracting Phase I ESA text…', { id: 'phase-i-ocr' });

      // 2. Call OCR API
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/ocr/phase-i', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fileUrl: downloadUrl, mimeType: uploadFile.type }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `OCR failed (${res.status})`);
      }

      const { data } = await res.json();
      const extractedText = data.extractedText as string;

      // 3. Populate the text field
      setPhaseIText(extractedText);
      setShowPhaseIInput(true);
      setUploadFile(null);

      toast.success(
        `Extracted ${extractedText.length.toLocaleString()} chars from ${data.pageCount} page(s)`,
        { id: 'phase-i-ocr', icon: '✨' },
      );
    } catch (err: any) {
      console.error('Phase I OCR error:', err);
      toast.dismiss('phase-i-ocr');
      setError(`PDF extraction failed: ${err.message}`);
    } finally {
      setIsUploading(false);
      setIsExtracting(false);
    }
  }

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
      className={`rounded-lg border overflow-hidden ${className}`}
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
        {/* ── PDF Upload Dropzone ─────────────────────────── */}
        <div>
          <p
            className="text-[9px] font-bold uppercase tracking-[0.15em] mb-2"
            style={{ color: 'var(--pw-muted)' }}
          >
            Phase I ESA Report
          </p>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className="border-2 border-dashed rounded-lg p-5 text-center transition-colors cursor-pointer"
            style={{
              borderColor: dragOver ? '#1a73e8' : 'var(--pw-border)',
              background: dragOver ? 'rgba(26, 115, 232, 0.04)' : 'var(--bg-canvas)',
            }}
            onClick={() => {
              if (isUploading || isExtracting) return;
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.pdf,.jpg,.jpeg,.png,.webp';
              input.onchange = (e) => {
                const f = (e.target as HTMLInputElement).files?.[0];
                if (f) handleFileSelect(f);
              };
              input.click();
            }}
          >
            {uploadFile ? (
              <div className="flex items-center justify-center gap-2">
                <FileCheck2 className="w-4 h-4 shrink-0" style={{ color: '#16a34a' }} />
                <span className="text-[10px] font-medium" style={{ color: 'var(--text-primary)' }}>
                  {uploadFile.name}
                </span>
                <span className="text-[9px]" style={{ color: 'var(--pw-subtle)' }}>
                  ({(uploadFile.size / 1024).toFixed(0)} KB)
                </span>
                {!isUploading && !isExtracting && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}
                    className="ml-1 transition-colors hover:opacity-70"
                    style={{ color: 'var(--pw-subtle)' }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ) : (
              <div>
                <Upload className="w-5 h-5 mx-auto mb-1.5" style={{ color: 'var(--pw-subtle)' }} />
                <p className="text-[10px]" style={{ color: 'var(--pw-subtle)' }}>
                  Drop Phase I ESA report here or click to browse
                </p>
                <p className="text-[8px] mt-0.5" style={{ color: 'var(--pw-border)' }}>
                  PDF, JPEG, PNG — AI extracts text for REC analysis
                </p>
              </div>
            )}
          </div>

          {/* Upload + Extract button */}
          {uploadFile && (
            <button
              type="button"
              onClick={processPhaseIOCR}
              disabled={isUploading || isExtracting}
              className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded text-[10px] font-semibold transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: '#1a73e8',
                color: '#ffffff',
                letterSpacing: '0.04em',
              }}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Uploading ({uploadProgress.toFixed(0)}%)
                </>
              ) : isExtracting ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  AI Extracting Text…
                </>
              ) : (
                <>
                  <FileText className="w-3 h-3" />
                  Extract Report Text
                </>
              )}
            </button>
          )}
        </div>

        {/* ── Or: Manual text paste ───────────────────────── */}
        <div>
          <button
            type="button"
            onClick={() => setShowPhaseIInput((v) => !v)}
            className="flex items-center gap-2 text-[10px] font-semibold transition-colors hover:opacity-80"
            style={{ color: '#1a73e8' }}
          >
            <FileText className="w-3.5 h-3.5" />
            {showPhaseIInput ? 'Hide manual text input' : 'Or paste Phase I ESA text manually'}
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
          disabled={isScanning || isUploading || isExtracting}
          className="flex items-center justify-center gap-2 w-full py-3 rounded font-semibold text-xs transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: 'var(--pw-black)',
            color: '#ffffff',
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
            className="flex items-start gap-2 rounded p-3 text-xs"
            style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
          >
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
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
                    className="text-[9px] font-bold px-2 py-0.5 rounded"
                    style={{ background: '#fef2f2', color: '#dc2626' }}
                  >
                    {highCount} High
                  </span>
                )}
                {medCount > 0 && (
                  <span
                    className="text-[9px] font-bold px-2 py-0.5 rounded"
                    style={{ background: '#fffbeb', color: '#d97706' }}
                  >
                    {medCount} Medium
                  </span>
                )}
                {scanResult.recs.filter((r) => r.severity === 'low').length > 0 && (
                  <span
                    className="text-[9px] font-bold px-2 py-0.5 rounded"
                    style={{ background: '#f0fdf4', color: '#16a34a' }}
                  >
                    {scanResult.recs.filter((r) => r.severity === 'low').length} Low
                  </span>
                )}
                {scanResult.recs.length === 0 && (
                  <span
                    className="text-[9px] font-bold px-2 py-0.5 rounded"
                    style={{ background: '#f0fdf4', color: '#16a34a' }}
                  >
                    No RECs identified
                  </span>
                )}
              </div>
            )}

            {/* No RECs clean bill */}
            {scanResult.recs.length === 0 && !phaseIText && (
              <div
                className="flex items-center gap-2 rounded p-3 text-[10px]"
                style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
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
