'use client';

import React, { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Download, CheckCircle2, Clock, Users, ArrowLeft } from 'lucide-react';

export default function ProjectReportsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const router = useRouter();

  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/tax/1040-es', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, taxYear: 2026 }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Project_${projectId}_Tax_Report.pdf`;
        a.click();
      }
    } catch {
      alert('Failed to export PDF report');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div data-testid="project-reports-page" className="min-h-screen bg-slate-950 text-white p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/project/${projectId}`)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Project Financial & Tax Report</h1>
            <p className="text-xs text-slate-400">Scoped report for Project ID: {projectId}</p>
          </div>
        </div>

        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          data-testid="export-project-pdf-btn"
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span>{isExporting ? 'Generating PDF...' : 'Download Project Report PDF'}</span>
        </button>
      </div>

      {/* Timeline Visualization */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-white/10 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
          <Clock className="w-4 h-4" /> REI Lifecycle Timeline
        </h2>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40">
            <span className="text-xs font-bold text-emerald-300 block uppercase">1. Acquisition</span>
            <span className="text-[10px] text-slate-400">Offer Accepted</span>
          </div>
          <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/40">
            <span className="text-xs font-bold text-blue-300 block uppercase">2. Purchase</span>
            <span className="text-[10px] text-slate-400">Loan & Title Closed</span>
          </div>
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40">
            <span className="text-xs font-bold text-amber-300 block uppercase">3. Hold</span>
            <span className="text-[10px] text-slate-400">Rehab & Lease Active</span>
          </div>
          <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/40">
            <span className="text-xs font-bold text-purple-300 block uppercase">4. Exit</span>
            <span className="text-[10px] text-slate-400">Sale Completed</span>
          </div>
        </div>
      </div>

      {/* Document Checklist & Team Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900 border border-white/10 space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Document Vault Checklist Status
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between p-2 rounded bg-white/5">
              <span>Proof of Funds Letter</span>
              <span className="text-emerald-400 font-semibold">Verified</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-white/5">
              <span>Purchase & Sale Agreement (PSA)</span>
              <span className="text-emerald-400 font-semibold">Verified</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-white/5">
              <span>Closing Disclosure (CD)</span>
              <span className="text-emerald-400 font-semibold">Verified</span>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-white/10 space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" /> Team Performance & Task Assignments
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between p-2 rounded bg-white/5">
              <span>Real Estate Attorney</span>
              <span className="text-slate-300 font-semibold">Closing Docs Review (Done)</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-white/5">
              <span>Loan Processor</span>
              <span className="text-slate-300 font-semibold">Underwriting Approval (Done)</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-white/5">
              <span>General Contractor</span>
              <span className="text-slate-300 font-semibold">Permit Verification (In Progress)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
