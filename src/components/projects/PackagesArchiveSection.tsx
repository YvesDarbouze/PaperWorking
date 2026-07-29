'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Share2,
  Lock,
  Layers,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Clock,
  Building2,
  Copy,
  Plus,
  ShieldAlert,
} from 'lucide-react';
import { ProjectFile } from '@/types/documents';
import {
  assembleLenderPackage,
  assembleInvestorPackage,
  canCreateShareLink,
  canAssemblePackage,
  type PackageDefinition,
  type PackageType,
  type PackageSlotStatus,
} from '@/lib/packages/documentPackagesEngine';
import toast from 'react-hot-toast';

export interface PackagesArchiveSectionProps {
  projects: any[];
  projectFiles?: ProjectFile[];
  userRole?: string; // LeadInvestor, Investor, Team Member, Vendor
}

export function PackagesArchiveSection({
  projects,
  projectFiles = [],
  userRole = 'Lead Investor',
}: PackagesArchiveSectionProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [packageType, setPackageType] = useState<PackageType>('Lender');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  React.useEffect(() => {
    if ((!selectedProjectId || selectedProjectId === 'ALL') && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [expiryDays, setExpiryDays] = useState(30);
  const [canDownloadToggle, setCanDownloadToggle] = useState(true);
  const [generatedShareUrl, setGeneratedShareUrl] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  const selectedProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId) || projects[0];
  }, [projects, selectedProjectId]);

  const activeFiles = useMemo(() => {
    if (selectedProjectId === 'ALL') return projectFiles;
    return projectFiles.filter((f) => f.projectId === selectedProjectId);
  }, [projectFiles, selectedProjectId]);

  const filteredFiles = useMemo(() => {
    return activeFiles.filter((f) => {
      const matchSearch = (f.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = categoryFilter === 'ALL' || (f.category || '') === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [activeFiles, searchQuery, categoryFilter]);

  const lenderPkg: PackageDefinition | null = useMemo(() => {
    if (!selectedProject) return null;
    return assembleLenderPackage(selectedProject, activeFiles);
  }, [selectedProject, activeFiles]);

  const investorPkg: PackageDefinition | null = useMemo(() => {
    if (!selectedProject) return null;
    return assembleInvestorPackage(selectedProject, activeFiles);
  }, [selectedProject, activeFiles]);

  const activePackage = packageType === 'Lender' ? lenderPkg : investorPkg;

  const userCanShare = canCreateShareLink(userRole);
  const userCanAssemble = canAssemblePackage(userRole);

  const handleCreateShareLink = async () => {
    if (!userCanShare) {
      toast.error(`Role '${userRole}' is not authorized to create share links.`);
      return;
    }

    setIsGeneratingLink(true);
    try {
      const res = await fetch('/api/packages/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject?.id,
          packageType,
          expiryDays,
          canDownload: canDownloadToggle,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to create share link');
        setIsGeneratingLink(false);
        return;
      }

      setGeneratedShareUrl(`${window.location.origin}${data.shareUrl}`);
      toast.success('Share link generated successfully');
    } catch (e) {
      toast.error('Network error generating share link');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedShareUrl) {
      navigator.clipboard.writeText(generatedShareUrl);
      toast.success('Share link copied to clipboard');
    }
  };

  return (
    <div className="space-y-8" data-testid="packages-archive-section">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-[#16141a] border border-slate-200 dark:border-white/10 shadow-sm">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            Document Packages & Archive
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            Pre-Compiled Bank & Investor Packages
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Documents are referenced from Phase Files and pre-assembled into complete lender/investor packages.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Project Selector */}
          <select
            data-testid="packages-project-select"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg py-2 px-3 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Portfolio Files (Archive View)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.propertyName || p.name || 'Unnamed Property'}
              </option>
            ))}
          </select>

          {/* Package Type Selector */}
          <div className="flex rounded-lg overflow-hidden bg-slate-100 dark:bg-white/5 p-0.5 border border-slate-200 dark:border-white/10">
            <button
              type="button"
              data-testid="package-type-lender-btn"
              onClick={() => setPackageType('Lender')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                packageType === 'Lender'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Lender Package
            </button>
            <button
              type="button"
              data-testid="package-type-investor-btn"
              onClick={() => setPackageType('Investor')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                packageType === 'Investor'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Investor Package
            </button>
          </div>

          {/* Share Link CTA Button (Governance Enforced) */}
          <button
            type="button"
            data-testid="generate-share-link-btn"
            disabled={!userCanShare}
            onClick={() => setShareModalOpen(true)}
            title={!userCanShare ? 'Team Members assemble packages but cannot share' : 'Generate secure tokenized share link'}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-all ${
              userCanShare
                ? 'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900'
                : 'bg-slate-200 dark:bg-white/5 text-slate-400 cursor-not-allowed border border-slate-300 dark:border-white/10'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Generate Share Link</span>
          </button>
        </div>
      </div>

      {/* Package Completeness Overview Card */}
      {activePackage && selectedProjectId !== 'ALL' && (
        <div className="p-6 rounded-2xl bg-slate-900 text-white border border-white/10 space-y-6 shadow-xl" data-testid="package-completeness-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
                {activePackage.packageType} Package Completeness
              </span>
              <h3 className="text-2xl font-extrabold text-white mt-1">{activePackage.propertyName}</h3>
            </div>

            <div className="text-right font-mono">
              <div className="text-3xl font-extrabold text-emerald-400">{activePackage.completenessPct}%</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mt-0.5">
                {activePackage.fulfilledSlotsCount} of {activePackage.totalSlots} Slots Fulfilled
              </div>
            </div>
          </div>

          {/* Completeness Progress Bar */}
          <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${activePackage.completenessPct}%` }}
            />
          </div>

          {/* Itemized Slot Checklist */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-white/10 pb-2">
              Package Required Slots & Phase Deep Links
            </h4>

            <div className="grid grid-cols-1 gap-3">
              {activePackage.slots.map((slot: PackageSlotStatus) => (
                <div
                  key={slot.slotKey}
                  className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-wrap items-center justify-between gap-3 hover:border-white/20 transition-all"
                  data-testid="package-slot-row"
                >
                  <div className="flex items-start gap-3">
                    {slot.isFulfilled ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h5 className="font-bold text-sm text-white">{slot.slotName}</h5>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        {slot.sourceSummary || (slot.isFulfilled ? `${slot.itemCount} document(s) attached` : 'Document pending — upload required')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        slot.isFulfilled
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {slot.isFulfilled ? 'Fulfilled' : 'Pending'}
                    </span>

                    {/* Deep Link to Phase Upload Card */}
                    <a
                      href={slot.deepLinkPath}
                      className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1 transition-all"
                      title={`Navigate to ${slot.targetPhaseName} upload card`}
                      data-testid="slot-phase-deep-link"
                    >
                      <span>Upload on {slot.targetPhaseName}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* File Archive List Section */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-500" />
            Project File Archive ({filteredFiles.length} files)
          </h3>

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg py-1.5 px-3 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-slate-100 dark:bg-white/5 uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
              <tr>
                <th className="p-3">File Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Phase Source</th>
                <th className="p-3">Verified</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredFiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400 font-mono">
                    No files found in archive for selected filters.
                  </td>
                </tr>
              ) : (
                filteredFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                    <td className="p-3 font-semibold text-slate-900 dark:text-white font-mono">{file.name}</td>
                    <td className="p-3 text-slate-500">{file.category || 'Document'}</td>
                    <td className="p-3 font-mono text-slate-400 uppercase">{file.phase || 'Phase 1'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${file.isVerified ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-400'}`}>
                        {file.isVerified ? 'Verified' : 'Unverified'}
                      </span>
                    </td>
                    <td className="p-3">
                      <a
                        href={file.storageUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-500 hover:underline font-bold flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        View
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Share Link Generation Modal */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md" data-testid="share-link-modal">
          <div className="relative w-full max-w-md p-6 rounded-2xl bg-white dark:bg-[#16141a] border border-slate-200 dark:border-white/10 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Share2 className="w-5 h-5 text-emerald-500" />
              Generate Tokenized Share Link
            </h3>

            {!generatedShareUrl ? (
              <div className="space-y-4 text-xs font-sans">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Expiration Period (Max 30 Days)</label>
                  <select
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(Number(e.target.value))}
                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-2 font-mono text-slate-900 dark:text-white"
                  >
                    <option value={7}>7 Days Expiry</option>
                    <option value={14}>14 Days Expiry</option>
                    <option value={30}>30 Days Expiry (Max)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Allow File Download CTA</span>
                  <input
                    type="checkbox"
                    checked={canDownloadToggle}
                    onChange={(e) => setCanDownloadToggle(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShareModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateShareLink}
                    disabled={isGeneratingLink}
                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-sm"
                  >
                    {isGeneratingLink ? 'Generating...' : 'Create Share Link'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs font-sans" data-testid="generated-share-url-container">
                <p className="text-slate-400">
                  Share link generated! Scoped strictly to this package.
                </p>
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 font-mono text-slate-900 dark:text-white break-all flex items-center justify-between gap-2">
                  <span>{generatedShareUrl}</span>
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className="p-1.5 rounded-md bg-emerald-500 text-white hover:bg-emerald-600 shrink-0"
                    title="Copy URL"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShareModalOpen(false);
                      setGeneratedShareUrl(null);
                    }}
                    className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
