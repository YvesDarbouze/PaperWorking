'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Download, FileDown, FileSpreadsheet, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface ReportGeneratorProps {
  projectId: string | null;
}

export function ReportGenerator({ projectId }: ReportGeneratorProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDownload = async (
    format: 'pdf' | 'csv',
    scope: 'portfolio' | 'project',
    type?: 'portfolio' | 'transactions'
  ) => {
    if (!user) return;
    setIsOpen(false);
    setIsGenerating(true);

    const toastId = toast.loading('Generating report, please wait...');

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          scope,
          projectId: scope === 'project' ? projectId : undefined,
          format,
          type
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      // Get filename from header or build fallback
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `paperworking_report_${new Date().toISOString().split('T')[0]}.${format}`;
      if (contentDisposition) {
        const matches = /filename="([^"]+)"/.exec(contentDisposition);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('Report downloaded successfully!', { id: toastId });
    } catch (err) {
      console.error('[Report Generator] Error:', err);
      toast.error('Failed to generate report. Try again.', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isGenerating}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-semibold text-xs tracking-wide shadow-sm hover:shadow-md hover:bg-slate-800 dark:hover:bg-slate-100 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5" />
        )}
        Export Report
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl bg-white dark:bg-[#121014] border border-slate-200 dark:border-white/10 shadow-lg ring-1 ring-black/5 focus:outline-none z-50 overflow-hidden divide-y divide-slate-100 dark:divide-white/5 animate-in fade-in slide-in-from-top-2 duration-150">
          
          {/* PDF Section */}
          <div className="py-1.5">
            <span className="block px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              PDF Performance Reports
            </span>
            <button
              onClick={() => handleDownload('pdf', 'portfolio')}
              className="flex items-center gap-2.5 w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors duration-150"
            >
              <FileDown className="w-4 h-4 text-slate-300" />
              Download PDF (Portfolio)
            </button>
            {projectId && (
              <button
                onClick={() => handleDownload('pdf', 'project')}
                className="flex items-center gap-2.5 w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors duration-150"
              >
                <FileDown className="w-4 h-4 text-slate-300" />
                Download PDF (This Project)
              </button>
            )}
          </div>

          {/* CSV Section */}
          <div className="py-1.5">
            <span className="block px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              CSV Spreadsheet Export
            </span>
            <button
              onClick={() => handleDownload('csv', 'portfolio', 'portfolio')}
              className="flex items-center gap-2.5 w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors duration-150"
            >
              <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
              Download CSV (Portfolio KPIs)
            </button>
            <button
              onClick={() => handleDownload('csv', 'portfolio', 'transactions')}
              className="flex items-center gap-2.5 w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors duration-150"
            >
              <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
              Download CSV (Transactions Ledger)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
