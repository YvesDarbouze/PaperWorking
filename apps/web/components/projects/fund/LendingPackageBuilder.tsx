'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/projects/phase-utils';
import type {
  LendingPackage,
  LendingPackageDocument,
  ProjectDocument,
} from '@/lib/projects/types';

export interface LendingPackageBuilderProps {
  packages?: LendingPackage[];
  projectDocuments?: ProjectDocument[];
  purchasePrice?: number;
  loanAmount?: number;
  lenderName?: string;
  onUpdatePackages: (packages: LendingPackage[]) => void;
  onFinalizeLoanApplication?: (pkg: LendingPackage) => void;
}

const DEFAULT_DOC_CHECKLIST: Array<{
  category: LendingPackageDocument['category'];
  title: string;
  required: boolean;
}> = [
  { category: 'financials', title: 'Personal Financial Statement (PFS / Form 1003/1008)', required: true },
  { category: 'tax_returns', title: 'Last 2 Years Personal & Corporate Tax Returns (1040 / 1120S)', required: true },
  { category: 'bank_statements', title: 'Last 3 Months Operating & Liquidity Bank Statements', required: true },
  { category: 'financials', title: 'Schedule of Real Estate Owned (SREO / Track Record)', required: true },
  { category: 'property', title: 'Executed Purchase & Sale Agreement (PSA) + Addenda', required: true },
  { category: 'property', title: 'Current Rent Roll & Lease Agreements', required: false },
  { category: 'underwriting', title: 'PaperWorking Pro-Forma & Rehab Scope of Work', required: true },
  { category: 'entity', title: 'Vesting Entity Articles of Org & Operating Agreement', required: true },
  { category: 'entity', title: 'Certificate of Good Standing & EIN Confirmation (CP 575)', required: true },
];

export default function LendingPackageBuilder({
  packages: initialPackages,
  projectDocuments = [],
  purchasePrice = 392000,
  loanAmount = 294000,
  lenderName = 'Apex Commercial Capital',
  onUpdatePackages,
  onFinalizeLoanApplication,
}: LendingPackageBuilderProps) {
  // Initialize default packages if none exist
  const defaultInitialPackages: LendingPackage[] = useMemo(() => {
    if (initialPackages && initialPackages.length > 0) return initialPackages;
    return [
      {
        id: 'lending-pkg-1',
        name: 'Senior Acquisition Debt Package',
        targetLender: lenderName,
        loanType: 'Commercial First Mortgage / Bridge',
        requestedAmount: loanAmount,
        status: 'ready',
        documents: DEFAULT_DOC_CHECKLIST.map((item, idx) => ({
          id: `doc-${idx + 1}`,
          title: item.title,
          category: item.category,
          isIncluded: idx < 6, // default pre-checked
          required: item.required,
          fileName: idx < 6 ? `${item.title.split(' ')[0]}_verified.pdf` : undefined,
          fileSize: idx < 6 ? '2.4 MB' : undefined,
          uploadedAt: idx < 6 ? new Date().toISOString() : undefined,
        })),
        notes: 'Senior debt term sheet request for 75% LTC acquisition facility.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }, [initialPackages, lenderName, loanAmount]);

  const [packages, setPackages] = useState<LendingPackage[]>(defaultInitialPackages);
  const [activePackageId, setActivePackageId] = useState<string>(
    defaultInitialPackages[0]?.id || 'lending-pkg-1'
  );

  // New package modal/form state
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newPkgName, setNewPkgName] = useState('');
  const [newPkgLender, setNewPkgLender] = useState('');
  const [newPkgLoanType, setNewPkgLoanType] = useState('Bridge Loan');
  const [newPkgAmount, setNewPkgAmount] = useState<number>(loanAmount);

  // Active package
  const activePkg = useMemo(() => {
    return packages.find((p) => p.id === activePackageId) || packages[0];
  }, [packages, activePackageId]);

  const updateActivePackage = (updated: Partial<LendingPackage>) => {
    if (!activePkg) return;
    const newPkgs = packages.map((p) => {
      if (p.id === activePkg.id) {
        return {
          ...p,
          ...updated,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });
    setPackages(newPkgs);
    onUpdatePackages(newPkgs);
  };

  const handleCreatePackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPkgName.trim()) return;

    const newId = `pkg-${Date.now()}`;
    const newPackage: LendingPackage = {
      id: newId,
      name: newPkgName.trim(),
      targetLender: newPkgLender.trim() || 'Institutional Lender',
      loanType: newPkgLoanType,
      requestedAmount: Number(newPkgAmount) || loanAmount,
      status: 'draft',
      documents: DEFAULT_DOC_CHECKLIST.map((item, idx) => ({
        id: `doc-${newId}-${idx}`,
        title: item.title,
        category: item.category,
        isIncluded: false,
        required: item.required,
      })),
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const nextPkgs = [...packages, newPackage];
    setPackages(nextPkgs);
    setActivePackageId(newId);
    onUpdatePackages(nextPkgs);

    setIsCreatingNew(false);
    setNewPkgName('');
    setNewPkgLender('');
  };

  const toggleDocumentIncluded = (docId: string) => {
    if (!activePkg) return;
    const updatedDocs = activePkg.documents.map((d) => {
      if (d.id === docId) {
        return { ...d, isIncluded: !d.isIncluded };
      }
      return d;
    });
    updateActivePackage({ documents: updatedDocs });
  };

  const handleFinalizeApplication = () => {
    if (!activePkg) return;
    const submittedPkg: LendingPackage = {
      ...activePkg,
      status: 'submitted',
      submissionDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const nextPkgs = packages.map((p) => (p.id === activePkg.id ? submittedPkg : p));
    setPackages(nextPkgs);
    onUpdatePackages(nextPkgs);
    if (onFinalizeLoanApplication) {
      onFinalizeLoanApplication(submittedPkg);
    }
  };

  // Readiness stats
  const includedCount = activePkg?.documents.filter((d) => d.isIncluded).length || 0;
  const totalCount = activePkg?.documents.length || 0;
  const requiredIncluded = activePkg?.documents.filter((d) => d.required && d.isIncluded).length || 0;
  const totalRequired = activePkg?.documents.filter((d) => d.required).length || 0;
  const isReadyToSubmit = requiredIncluded >= totalRequired;

  return (
    <div
      data-testid="lending-package-builder"
      className="w-full rounded-none border border-neutral-800 bg-[#0a0a0a] p-5 font-sans text-neutral-100"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-none border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Mortgage & Financing Securing
            </span>
            <span className="rounded-none border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-[10px] text-neutral-400 font-mono">
              {`${packages.length} ${packages.length === 1 ? 'Package' : 'Packages'} Active`}
            </span>
          </div>
          <h3 className="mt-1 text-base font-bold text-white tracking-tight">
            Institutional Lending Packages & Application
          </h3>
          <p className="mt-0.5 text-xs text-neutral-400">
            Package verified borrower financials, property operating statements, and entity records for multiple lenders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-none min-h-[44px] px-3.5 text-xs"
            onClick={() => setIsCreatingNew(true)}
            data-testid="create-lending-package-btn"
          >
            <span className="material-symbols-outlined text-[16px] mr-1.5">add</span>
            New Lending Package
          </Button>
        </div>
      </div>

      {/* Package Selector Tabs */}
      <div className="mt-4 flex flex-wrap gap-2 border-b border-neutral-800/80 pb-3">
        {packages.map((pkg) => {
          const isActive = pkg.id === activePkg?.id;
          return (
            <button
              key={pkg.id}
              type="button"
              onClick={() => setActivePackageId(pkg.id)}
              data-testid={`package-tab-${pkg.id}`}
              className={`flex items-center gap-2 min-h-[44px] px-3.5 py-2 text-xs font-medium rounded-none border transition ${
                isActive
                  ? 'border-white bg-neutral-900 text-white font-semibold'
                  : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <span>{pkg.name}</span>
              <span
                className={`rounded-none px-1.5 py-0.5 text-[9px] uppercase font-mono font-bold ${
                  pkg.status === 'approved'
                    ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                    : pkg.status === 'submitted'
                    ? 'border border-blue-500/40 bg-blue-500/10 text-blue-400'
                    : pkg.status === 'ready'
                    ? 'border border-amber-500/40 bg-amber-500/10 text-amber-400'
                    : 'border border-neutral-700 bg-neutral-800 text-neutral-400'
                }`}
              >
                {pkg.status.replace('_', ' ')}
              </span>
            </button>
          );
        })}
      </div>

      {/* New Package Modal Form */}
      {isCreatingNew && (
        <form
          onSubmit={handleCreatePackage}
          data-testid="new-package-form"
          className="my-4 rounded-none border border-neutral-700 bg-neutral-900/60 p-4 space-y-3"
        >
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Create Additional Lending Package
            </h4>
            <button
              type="button"
              onClick={() => setIsCreatingNew(false)}
              className="text-neutral-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">Package Name</label>
              <input
                type="text"
                required
                data-testid="pkg-name-input"
                placeholder="e.g. Bridge Facility: Lima One"
                value={newPkgName}
                onChange={(e) => setNewPkgName(e.target.value)}
                className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3 py-2 text-white text-base sm:text-xs focus:border-neutral-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">Target Lender / Institution</label>
              <input
                type="text"
                required
                data-testid="pkg-lender-input"
                placeholder="e.g. Lima One Capital"
                value={newPkgLender}
                onChange={(e) => setNewPkgLender(e.target.value)}
                className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3 py-2 text-white text-base sm:text-xs focus:border-neutral-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">Facility / Loan Type</label>
              <select
                value={newPkgLoanType}
                onChange={(e) => setNewPkgLoanType(e.target.value)}
                className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3 py-2 text-white text-base sm:text-xs focus:border-neutral-400 focus:outline-none"
              >
                <option value="Senior Debt / First Mortgage">Senior Debt / First Mortgage</option>
                <option value="Bridge Loan">Bridge Loan</option>
                <option value="DSCR Term Loan">DSCR Term Loan</option>
                <option value="Hard Money Construction">Hard Money Construction</option>
                <option value="Mezzanine / Preferred Equity">Mezzanine / Preferred Equity</option>
              </select>
            </div>
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">Requested Facility Amount ($)</label>
              <input
                type="number"
                value={newPkgAmount}
                onChange={(e) => setNewPkgAmount(Number(e.target.value))}
                className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3 py-2 text-white text-base sm:text-xs focus:border-neutral-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="tertiary"
              size="sm"
              className="rounded-none min-h-[44px] px-4"
              onClick={() => setIsCreatingNew(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="rounded-none min-h-[44px] px-4"
              data-testid="save-new-package-btn"
            >
              Create Package
            </Button>
          </div>
        </form>
      )}

      {/* Active Package Details & Controls */}
      {activePkg && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded-none border border-neutral-800 bg-neutral-900/40 p-4 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-400">Target Lender</span>
              <p className="font-semibold text-white mt-0.5">{activePkg.targetLender}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-400">Facility Type</span>
              <p className="font-semibold text-white mt-0.5">{activePkg.loanType}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-400">Requested Amount</span>
              <p className="font-semibold text-emerald-400 mt-0.5">
                {formatCurrency(activePkg.requestedAmount)}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-400">Document Bundle Readiness</span>
              <p className="font-semibold text-white mt-0.5">
                {includedCount}/{totalCount} Files Included ({requiredIncluded}/{totalRequired} Required)
              </p>
            </div>
          </div>

          {/* Submission Banner if submitted */}
          {activePkg.status === 'submitted' && (
            <div
              data-testid="package-submitted-banner"
              className="flex items-center justify-between rounded-none border border-blue-500/30 bg-blue-500/10 p-3.5 text-xs text-blue-300"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">mark_email_read</span>
                <span>
                  <strong>{`Loan Application Finalized & Submitted to ${activePkg.targetLender}`}</strong> on{' '}
                  {activePkg.submissionDate ? new Date(activePkg.submissionDate).toLocaleDateString() : 'Today'}.
                </span>
              </div>
              <span className="rounded-none border border-blue-500/40 bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-200 uppercase">
                Under Review
              </span>
            </div>
          )}

          {/* Checklist / Document Bundler Table */}
          <div className="rounded-none border border-neutral-800 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-800 bg-neutral-900/70 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                <tr>
                  <th className="px-4 py-3 w-10">Include</th>
                  <th className="px-4 py-3">Document Title</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Requirement</th>
                  <th className="px-4 py-3">Attached File</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80">
                {activePkg.documents.map((doc) => (
                  <tr
                    key={doc.id}
                    data-testid={`pkg-doc-row-${doc.id}`}
                    className={`hover:bg-neutral-900/30 transition ${
                      doc.isIncluded ? 'bg-neutral-900/20' : 'opacity-70'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={doc.isIncluded}
                        onChange={() => toggleDocumentIncluded(doc.id)}
                        className="h-4 w-4 rounded-none border-neutral-700 bg-neutral-950 text-emerald-500 focus:ring-0"
                        data-testid={`checkbox-doc-${doc.id}`}
                      />
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">
                      {doc.title}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-none border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-[9px] uppercase tracking-wider text-neutral-300 font-mono">
                        {doc.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {doc.required ? (
                        <span className="text-amber-400 font-bold text-[10px]">Mandatory</span>
                      ) : (
                        <span className="text-neutral-500 text-[10px]">Optional</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-400">
                      {doc.fileName ? (
                        <span className="flex items-center gap-1.5 text-neutral-200">
                          <span className="material-symbols-outlined text-[14px] text-emerald-400">
                            check_circle
                          </span>
                          {doc.fileName} ({doc.fileSize || '1.8 MB'})
                        </span>
                      ) : (
                        <span className="text-neutral-500 italic">No file attached</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action Footer: Finalize Loan Application & Export */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-neutral-800 pt-4">
            <div className="text-xs text-neutral-400">
              {isReadyToSubmit ? (
                <span className="text-emerald-400 flex items-center gap-1.5 font-semibold">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  All mandatory files bundled and ready for lender review.
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">warning</span>
                  Missing {totalRequired - requiredIncluded} mandatory documents to complete application.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="primary"
                size="md"
                className="rounded-none min-h-[44px] px-5 text-xs"
                onClick={handleFinalizeApplication}
                disabled={activePkg.status === 'submitted'}
                data-testid="finalize-loan-app-btn"
              >
                <span className="material-symbols-outlined text-[16px] mr-1.5">send</span>
                {activePkg.status === 'submitted'
                  ? 'Application Submitted'
                  : 'Finalize Loan Application & Submit to Lender'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
