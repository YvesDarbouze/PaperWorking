'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  FileText,
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Building2,
  Lock,
  Layers,
} from 'lucide-react';
import Logo from '@/components/brand/Logo';
import type { PackageDefinition } from '@/lib/packages/documentPackagesEngine';

export default function ExternalPackageViewerPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [packageData, setPackageData] = useState<PackageDefinition | null>(null);
  const [canDownload, setCanDownload] = useState(true);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchPackage = async () => {
      try {
        const res = await fetch(`/api/packages/share/${token}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Share link invalid or expired');
          setLoading(false);
          return;
        }

        setPackageData(data.package);
        setCanDownload(data.canDownload);
        setExpiresAt(data.expiresAt);
        setLoading(false);
      } catch (err: any) {
        setError('Network error resolving share link');
        setLoading(false);
      }
    };

    fetchPackage();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0b0e] text-white flex items-center justify-center p-6 font-sans">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-mono text-slate-400">Resolving secure document package...</span>
        </div>
      </div>
    );
  }

  if (error || !packageData) {
    return (
      <div className="min-h-screen bg-[#0d0b0e] text-white flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full p-8 rounded-2xl bg-white/5 border border-white/10 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Access Unavailable</h2>
          <p className="text-xs text-slate-400">{error || 'This package share link is invalid or has expired.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0b0e] text-slate-100 font-sans selection:bg-emerald-500/20" data-testid="external-package-viewer">
      {/* Top Header Bar */}
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Verified {packageData.packageType} Package
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            {expiresAt && (
              <span className="flex items-center gap-1.5 text-amber-400">
                <Clock className="w-3.5 h-3.5" />
                Expires {new Date(expiresAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        {/* Banner Section */}
        <div className="p-8 rounded-2xl bg-gradient-to-br from-slate-900 to-[#16141a] border border-white/10 space-y-4 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
                {packageData.packageType} Document Package Assembly
              </span>
              <h1 className="text-3xl font-extrabold text-white mt-1">{packageData.propertyName}</h1>
            </div>

            <div className="text-right font-mono">
              <div className="text-3xl font-extrabold text-emerald-400">{packageData.completenessPct}%</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mt-0.5">Package Completeness</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10 text-xs font-mono">
            <div>
              <span className="text-slate-400">Total Package Slots:</span>
              <p className="text-sm font-bold text-white mt-0.5">{packageData.totalSlots} Slots</p>
            </div>
            <div>
              <span className="text-slate-400">Fulfilled Slots:</span>
              <p className="text-sm font-bold text-emerald-400 mt-0.5">{packageData.fulfilledSlotsCount} Fulfilled</p>
            </div>
            <div>
              <span className="text-slate-400">Download Access:</span>
              <p className="text-sm font-bold text-white mt-0.5">{canDownload ? 'Enabled' : 'View Only'}</p>
            </div>
          </div>
        </div>

        {/* Itemized Package Checklist */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            Itemized Package Checklist
          </h2>

          <div className="space-y-3">
            {packageData.slots.map((slot) => (
              <div
                key={slot.slotKey}
                className="p-5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-wrap items-center justify-between gap-4 hover:border-white/20 transition-all"
                data-testid="package-slot-item"
              >
                <div className="flex items-start gap-3.5 max-w-xl">
                  {slot.isFulfilled ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h3 className="font-bold text-sm text-white">{slot.slotName}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">
                      {slot.sourceSummary || (slot.isFulfilled ? `${slot.itemCount} document(s) attached` : 'Document required — pending upload')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs">
                  <span
                    className={`px-2.5 py-1 rounded font-bold uppercase tracking-wider text-[10px] ${
                      slot.isFulfilled
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {slot.isFulfilled ? 'Fulfilled' : 'Pending'}
                  </span>

                  {canDownload && slot.isFulfilled && slot.matchedFiles.length > 0 && (
                    <a
                      href={slot.matchedFiles[0].storageUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center gap-1.5 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      View Document
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer Footer */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center text-xs text-slate-400 font-mono">
          Confidential document package generated via PaperWorking. Authorized viewing strictly scoped by token access policy.
        </div>
      </main>
    </div>
  );
}
