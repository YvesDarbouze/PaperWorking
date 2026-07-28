'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Download, FileDown, FileSpreadsheet, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '@/lib/utils/ThemeProvider';
import { reportsTokens, panelStyle } from '@/components/reports/reportsTheme';

interface ReportGeneratorProps {
  projectId: string | null;
}

export function ReportGenerator({ projectId }: ReportGeneratorProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const t = reportsTokens(isDark);
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const menuItemStyle = {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 10,
    width: '100%',
    textAlign: 'left' as const,
    padding: '8px 12px',
    fontSize: 12,
    fontWeight: 600,
    color: t.heading,
    background: 'transparent',
    border: 'none',
    borderRadius: 2,
    cursor: 'pointer',
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isGenerating}
        className="pw-interactive-custom flex items-center gap-2 text-xs font-semibold tracking-wide transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: t.ctaBg,
          color: t.ctaFg,
          border: 'none',
          borderRadius: 2,
          padding: '8px 14px',
          boxShadow: t.shadow,
        }}
      >
        {isGenerating ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5" />
        )}
        Export report
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-64 origin-top-right z-50 overflow-hidden divide-y"
          style={{
            ...panelStyle(t),
            boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.45)' : '0 8px 24px rgba(20,22,28,0.12)',
            borderColor: t.border,
          }}
        >
          <div className="py-1.5" style={{ borderColor: t.divider }}>
            <span
              className="block px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: t.muted }}
            >
              PDF performance
            </span>
            <button
              type="button"
              className="pw-interactive-custom"
              onClick={() => handleDownload('pdf', 'portfolio')}
              style={menuItemStyle}
              onMouseEnter={(e) => { e.currentTarget.style.background = t.hover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <FileDown className="w-4 h-4 flex-shrink-0" style={{ color: t.accent }} />
              Portfolio PDF
            </button>
            {projectId && (
              <button
                type="button"
                className="pw-interactive-custom"
                onClick={() => handleDownload('pdf', 'project')}
                style={menuItemStyle}
                onMouseEnter={(e) => { e.currentTarget.style.background = t.hover; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <FileDown className="w-4 h-4 flex-shrink-0" style={{ color: t.accent }} />
                This project PDF
              </button>
            )}
          </div>

          <div className="py-1.5" style={{ borderColor: t.divider }}>
            <span
              className="block px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: t.muted }}
            >
              CSV spreadsheet
            </span>
            <button
              type="button"
              className="pw-interactive-custom"
              onClick={() => handleDownload('csv', 'portfolio', 'portfolio')}
              style={menuItemStyle}
              onMouseEnter={(e) => { e.currentTarget.style.background = t.hover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <FileSpreadsheet className="w-4 h-4 flex-shrink-0" style={{ color: t.success }} />
              Portfolio KPIs
            </button>
            <button
              type="button"
              className="pw-interactive-custom"
              onClick={() => handleDownload('csv', 'portfolio', 'transactions')}
              style={menuItemStyle}
              onMouseEnter={(e) => { e.currentTarget.style.background = t.hover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <FileSpreadsheet className="w-4 h-4 flex-shrink-0" style={{ color: t.success }} />
              Transactions ledger
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
