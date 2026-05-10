'use client';

import React, { useState, useRef } from 'react';
import {
  Building,
  Search,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Upload,
  FileText,
  Loader2,
  ExternalLink,
  MapPin,
  Layers,
  X,
} from 'lucide-react';
import type {
  ZoningScanResult,
  RecognizedEnvironmentalCondition,
} from '@/types/marketVitals';

/* ═══════════════════════════════════════════════════════════════
   ZoningScan — Municipal GIS Portal Integration & Phase I ESA
   
   Two capabilities:
   1. Zoning Lookup: Queries municipal GIS portals via API or 
      browser automation to extract permitted unit density,
      overlay districts, and setback requirements.
   2. Phase I REC Scanner: Accepts uploaded Phase I ESA PDFs,
      extracts Recognized Environmental Conditions using 
      pattern matching against ASTM E1527-21 standard language.
   
   Design: Follows .dashboard-context tokens from globals.css
   ═══════════════════════════════════════════════════════════════ */

interface ZoningScanProps {
  zipCode: string;
  address?: string;
  parcelId?: string;
  phaseColor?: string;
  onScanComplete?: (result: ZoningScanResult) => void;
}

// ── Severity badge colors ────────────────────────────────────

const SEVERITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  high:   { bg: '#FEE2E2', text: '#991B1B', label: 'HIGH' },
  medium: { bg: '#FEF3C7', text: '#92400E', label: 'MEDIUM' },
  low:    { bg: '#DBEAFE', text: '#1E40AF', label: 'LOW' },
};

const REC_TYPE_LABELS: Record<string, string> = {
  'REC':       'Recognized Environmental Condition',
  'CREC':      'Controlled REC',
  'HREC':      'Historical REC',
  'De Minimis': 'De Minimis Condition',
};

// ── REC Card Sub-Component ───────────────────────────────────

function RECCard({ rec }: { rec: RecognizedEnvironmentalCondition }) {
  const sev = SEVERITY_STYLES[rec.severity] || SEVERITY_STYLES.low;

  return (
    <div
      className="p-4 rounded-lg"
      style={{
        background: 'var(--bg-surface)',
        border: `1px solid ${sev.bg}`,
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4" style={{ color: sev.text }} />
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: sev.text }}
          >
            {rec.type} — {REC_TYPE_LABELS[rec.type] || rec.type}
          </span>
        </div>
        <span
          className="text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0"
          style={{ background: sev.bg, color: sev.text }}
        >
          {sev.label}
        </span>
      </div>
      <p
        className="text-xs font-medium leading-relaxed"
        style={{ color: 'var(--text-primary)' }}
      >
        {rec.description}
      </p>
      {rec.location && (
        <p
          className="text-[10px] mt-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          <strong>Location:</strong> {rec.location}
        </p>
      )}
      {rec.recommendation && (
        <div
          className="mt-3 p-3 rounded-md text-[10px] font-medium"
          style={{ background: '#F8FAFC', color: 'var(--text-primary)' }}
        >
          <strong>Recommendation:</strong> {rec.recommendation}
        </div>
      )}
      <p
        className="text-[9px] mt-2 italic"
        style={{ color: 'var(--text-secondary)' }}
      >
        Source: {rec.source}
      </p>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────

export function ZoningScan({
  zipCode,
  address,
  parcelId,
  phaseColor = '#595959',
  onScanComplete,
}: ZoningScanProps) {
  const [scanResult, setScanResult] = useState<ZoningScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [uploadedRECs, setUploadedRECs] = useState<RecognizedEnvironmentalCondition[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Zoning Scan Handler ──────────────────────────────────

  const handleZoningScan = async () => {
    setScanning(true);
    setScanError(null);

    try {
      const res = await fetch('/api/permits/zoning-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zipCode, address, parcelId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Zoning scan failed (${res.status})`);
      }

      const result: ZoningScanResult = await res.json();
      setScanResult(result);
      onScanComplete?.(result);
    } catch (err: any) {
      setScanError(err.message || 'Zoning scan failed');
    } finally {
      setScanning(false);
    }
  };

  // ── Phase I ESA Upload Handler ───────────────────────────

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadFileName(file.name);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('zipCode', zipCode);
      if (address) formData.append('address', address);

      const res = await fetch('/api/permits/phase-i-scan', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Phase I scan failed');
      }

      const { recs } = await res.json();
      setUploadedRECs(recs || []);
    } catch (err: any) {
      setScanError(err.message || 'Phase I report scan failed');
    } finally {
      setUploading(false);
    }
  };

  // Combine scan RECs + uploaded RECs
  const allRECs = [
    ...(scanResult?.recs || []),
    ...uploadedRECs,
  ];

  const highCount = allRECs.filter((r) => r.severity === 'high').length;
  const medCount = allRECs.filter((r) => r.severity === 'medium').length;

  return (
    <section
      className="rounded-lg overflow-hidden shadow-sm"
      style={{
        background: 'var(--bg-surface, #FFFFFF)',
        border: '1px solid var(--border-ui, #A5A5A5)',
      }}
    >
      {/* ── Header ── */}
      <div
        className="px-8 py-5 flex items-center justify-between"
        style={{ background: phaseColor }}
      >
        <div className="flex items-center gap-3">
          <Building className="w-4 h-4 text-white" aria-hidden="true" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-white">
            Zoning & Environmental Scan
          </h2>
        </div>
        {scanResult && (
          <span className="text-[9px] font-medium text-white/70">
            Scanned {new Date(scanResult.scanDate).toLocaleDateString()}
          </span>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* ── Action Buttons Row ── */}
        <div className="flex flex-wrap gap-3">
          {/* Zoning Scan Button */}
          <button
            onClick={handleZoningScan}
            disabled={scanning}
            className="flex items-center gap-2.5 px-5 py-3 rounded-lg text-white text-xs font-bold uppercase tracking-widest transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: phaseColor }}
          >
            {scanning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {scanning ? 'Scanning GIS Portal…' : 'Run Zoning Scan'}
          </button>

          {/* Phase I Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2.5 px-5 py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all hover:opacity-90 disabled:opacity-50"
            style={{
              background: 'transparent',
              border: `1px solid ${phaseColor}`,
              color: phaseColor,
            }}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {uploading ? 'Analyzing Report…' : 'Upload Phase I ESA'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        {/* Upload confirmation */}
        {uploadFileName && (
          <div
            className="flex items-center gap-3 p-3 rounded-lg"
            style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}
          >
            <FileText className="w-4 h-4 text-green-600" />
            <span className="text-xs font-medium text-green-800">
              {uploadFileName}
            </span>
            <button
              onClick={() => {
                setUploadFileName(null);
                setUploadedRECs([]);
              }}
              className="ml-auto p-1 rounded-full hover:bg-green-100 transition-colors"
            >
              <X className="w-3 h-3 text-green-600" />
            </button>
          </div>
        )}

        {/* ── Error State ── */}
        {scanError && (
          <div
            className="flex items-center gap-3 p-4 rounded-lg"
            style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}
          >
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-800">{scanError}</p>
              <p className="text-[10px] text-red-600 mt-1">
                The municipal GIS portal may be unavailable. Try again or check manually.
              </p>
            </div>
          </div>
        )}

        {/* ── Zoning Results ── */}
        {scanResult && (
          <div className="space-y-4">
            <h3
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: 'var(--text-secondary)' }}
            >
              Zoning Classification
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Zoning Code */}
              <div
                className="p-4 rounded-lg"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-ui)',
                }}
              >
                <p
                  className="text-[9px] font-bold uppercase tracking-widest mb-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Zoning Code
                </p>
                <p
                  className="text-xl font-bold tracking-tight"
                  style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
                >
                  {scanResult.zoningCode}
                </p>
                <p
                  className="text-[10px] font-medium mt-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {scanResult.zoningDescription}
                </p>
              </div>

              {/* Permitted Density */}
              {scanResult.permittedUnitDensity != null && (
                <div
                  className="p-4 rounded-lg"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-ui)',
                  }}
                >
                  <p
                    className="text-[9px] font-bold uppercase tracking-widest mb-1"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Permitted Density
                  </p>
                  <p
                    className="text-xl font-bold tabular-nums"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {scanResult.permittedUnitDensity}
                    <span
                      className="text-xs font-medium ml-1"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      units/acre
                    </span>
                  </p>
                </div>
              )}

              {/* Max Height */}
              {scanResult.maxBuildingHeight && (
                <div
                  className="p-4 rounded-lg"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-ui)',
                  }}
                >
                  <p
                    className="text-[9px] font-bold uppercase tracking-widest mb-1"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Max Building Height
                  </p>
                  <p
                    className="text-xl font-bold tabular-nums"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {scanResult.maxBuildingHeight}
                  </p>
                </div>
              )}

              {/* Lot Coverage */}
              {scanResult.lotCoverage && (
                <div
                  className="p-4 rounded-lg"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-ui)',
                  }}
                >
                  <p
                    className="text-[9px] font-bold uppercase tracking-widest mb-1"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Lot Coverage
                  </p>
                  <p
                    className="text-xl font-bold tabular-nums"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {scanResult.lotCoverage}
                  </p>
                </div>
              )}

              {/* Setbacks */}
              {scanResult.setbacks && (
                <div
                  className="p-4 rounded-lg sm:col-span-2"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-ui)',
                  }}
                >
                  <p
                    className="text-[9px] font-bold uppercase tracking-widest mb-3"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Required Setbacks
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    {scanResult.setbacks.front && (
                      <div>
                        <p className="text-[9px] uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-secondary)' }}>Front</p>
                        <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{scanResult.setbacks.front}</p>
                      </div>
                    )}
                    {scanResult.setbacks.rear && (
                      <div>
                        <p className="text-[9px] uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-secondary)' }}>Rear</p>
                        <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{scanResult.setbacks.rear}</p>
                      </div>
                    )}
                    {scanResult.setbacks.side && (
                      <div>
                        <p className="text-[9px] uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-secondary)' }}>Side</p>
                        <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{scanResult.setbacks.side}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Overlay Districts */}
            {scanResult.overlayDistricts && scanResult.overlayDistricts.length > 0 && (
              <div className="mt-4">
                <p
                  className="text-[9px] font-bold uppercase tracking-widest mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Overlay Districts
                </p>
                <div className="flex flex-wrap gap-2">
                  {scanResult.overlayDistricts.map((district, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
                      style={{
                        background: '#EFF6FF',
                        color: '#1E40AF',
                        border: '1px solid #BFDBFE',
                      }}
                    >
                      <Layers className="w-3 h-3 inline mr-1" />
                      {district}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Source link */}
            {scanResult.source && (
              <a
                href={scanResult.source}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest mt-2 transition-opacity hover:opacity-70"
                style={{ color: 'var(--pw-accent, #1a73e8)' }}
              >
                <ExternalLink className="w-3 h-3" />
                View Full GIS Portal Record
              </a>
            )}
          </div>
        )}

        {/* ── Environmental Conditions (RECs) ── */}
        {allRECs.length > 0 && (
          <div
            className="space-y-4 pt-5"
            style={{ borderTop: '1px solid var(--border-ui)' }}
          >
            <div className="flex items-center justify-between">
              <h3
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: 'var(--text-secondary)' }}
              >
                Recognized Environmental Conditions
              </h3>
              <div className="flex items-center gap-2">
                {highCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[8px] font-bold" style={SEVERITY_STYLES.high}>
                    {highCount} HIGH
                  </span>
                )}
                {medCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[8px] font-bold" style={SEVERITY_STYLES.medium}>
                    {medCount} MED
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {allRECs.map((rec) => (
                <RECCard key={rec.id} rec={rec} />
              ))}
            </div>
          </div>
        )}

        {/* Clean scan confirmation */}
        {scanResult && allRECs.length === 0 && (
          <div
            className="flex items-center gap-3 p-4 rounded-lg"
            style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}
          >
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-bold text-green-800">
                No Recognized Environmental Conditions found
              </p>
              <p className="text-[10px] text-green-600 mt-0.5">
                This does not replace a professional Phase I ESA. Upload a report for comprehensive screening.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
