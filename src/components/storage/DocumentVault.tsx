'use client';

import React, { useState } from 'react';
import {
  Folder,
  FileText,
  UploadCloud,
  Download,
  Trash2,
  Lock,
  Link,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
} from 'lucide-react';
import { DOCUMENT_CATEGORIES, DocumentCategory } from '@/lib/storage/categories';
import { validateTaxDocumentDeletion } from '@/lib/storage/quota';
import { getReceiptLinkStatus, ProjectExpense } from '@/lib/storage/receipts';

interface VaultFile {
  id: string;
  name: string;
  category: DocumentCategory;
  size: number;
  uploadedAt: string;
  url: string;
  linkedExpenseId?: string;
  linkedExpenseName?: string;
}

interface DocumentVaultProps {
  projectId: string;
  propertyName: string;
}

export default function DocumentVault({ projectId, propertyName }: DocumentVaultProps) {
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'all'>('all');
  const [files, setFiles] = useState<VaultFile[]>([
    {
      id: 'doc_1',
      name: 'Proof_of_Funds_Letter.pdf',
      category: 'acquisition',
      size: 1420000,
      uploadedAt: '2026-02-10T10:00:00Z',
      url: '#',
    },
    {
      id: 'doc_2',
      name: 'Closing_Disclosure_CD.pdf',
      category: 'purchase',
      size: 2850000,
      uploadedAt: '2026-03-15T14:30:00Z',
      url: '#',
    },
    {
      id: 'doc_3',
      name: 'Contractor_Rehab_Receipt_Electrical.pdf',
      category: 'hold',
      size: 890000,
      uploadedAt: '2026-05-20T09:15:00Z',
      url: '#',
      linkedExpenseId: 'exp_1',
      linkedExpenseName: 'Apex Electrical Rehab ($4,500)',
    },
    {
      id: 'doc_5',
      name: 'Plumbing_Repair_Invoice_Unlinked.pdf',
      category: 'hold',
      size: 620000,
      uploadedAt: '2026-06-10T11:00:00Z',
      url: '#',
    },
    {
      id: 'doc_4',
      name: 'IRS_Form_1040-ES_2026.pdf',
      category: 'tax',
      size: 450000,
      uploadedAt: '2026-06-01T11:00:00Z',
      url: '#',
    },
  ]);

  const [expenses] = useState<ProjectExpense[]>([
    { expenseId: 'exp_1', projectId, description: 'Apex Electrical Rehab', amount: 4500, date: '2026-05-20', category: 'rehab' },
    { expenseId: 'exp_2', projectId, description: 'Plumbing Repairs', amount: 1200, date: '2026-06-10', category: 'repairs' },
  ]);

  const [receiptToLink, setReceiptToLink] = useState<VaultFile | null>(null);
  const [selectedExpenseId, setSelectedExpenseId] = useState('exp_2');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDelete = (file: VaultFile) => {
    setErrorMessage(null);
    const retentionCheck = validateTaxDocumentDeletion(file.category, file.uploadedAt);

    if (!retentionCheck.canDelete) {
      setErrorMessage(retentionCheck.reason || 'Cannot delete tax document under 3-year lock.');
      return;
    }

    setFiles(files.filter(f => f.id !== file.id));
  };

  const handleLinkReceipt = (fileId: string, expId: string) => {
    const targetExp = expenses.find(e => e.expenseId === expId);
    if (!targetExp) return;

    setFiles(
      files.map(f => {
        if (f.id === fileId) {
          return {
            ...f,
            linkedExpenseId: targetExp.expenseId,
            linkedExpenseName: `${targetExp.description} ($${targetExp.amount})`,
          };
        }
        return f;
      })
    );
    setReceiptToLink(null);
  };

  const filteredFiles = selectedCategory === 'all' ? files : files.filter(f => f.category === selectedCategory);
  const totalUsedBytes = files.reduce((acc, f) => acc + f.size, 0);
  const usedMB = (totalUsedBytes / (1024 * 1024)).toFixed(2);

  return (
    <div data-testid="document-vault-component" className="space-y-6 text-white">
      {/* Vault Header & Quota */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-black/30 border border-white/10 backdrop-blur-sm">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Folder className="w-5 h-5 text-emerald-400" />
            Project Document Vault & Receipt Manager
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Organized files for {propertyName}</p>
        </div>

        <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
          <HardDrive className="w-4 h-4 text-emerald-400" />
          <div className="text-xs">
            <span className="text-slate-300 font-semibold">{usedMB} MB used</span>
            <span className="text-slate-400 block text-[10px]">Quota: 178 MB (0.5 GB / 3 projects)</span>
          </div>
        </div>
      </div>

      {/* Deletion Error Alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <Lock className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
            selectedCategory === 'all' ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-white/5 text-slate-300 hover:bg-white/10'
          }`}
        >
          All Categories ({files.length})
        </button>
        {(Object.keys(DOCUMENT_CATEGORIES) as DocumentCategory[]).map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition ${
              selectedCategory === cat ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            {cat} ({files.filter(f => f.category === cat).length})
          </button>
        ))}
      </div>

      {/* File List View */}
      <div className="p-5 rounded-2xl bg-black/30 border border-white/10 space-y-3 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300" data-testid="file-list-table">
            <thead className="bg-black/50 text-slate-400 font-semibold border-b border-white/10 uppercase tracking-wider">
              <tr>
                <th className="p-3">Document Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Size</th>
                <th className="p-3">Receipt Link Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredFiles.map(file => {
                const linkStatus = getReceiptLinkStatus(file.id, file.category, file.linkedExpenseId ? ({ description: file.linkedExpenseName, amount: 4500 } as any) : undefined);
                const isTaxDoc = file.category === 'tax';

                return (
                  <tr key={file.id} data-testid={`file-row-${file.id}`} className="hover:bg-white/5 transition">
                    <td className="p-3 font-medium text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      <span>{file.name}</span>
                    </td>
                    <td className="p-3 capitalize font-mono text-[11px] text-slate-400">{file.category}</td>
                    <td className="p-3 text-slate-400 font-mono">{(file.size / (1024 * 1024)).toFixed(2)} MB</td>
                    <td className="p-3">
                      {file.linkedExpenseName ? (
                        <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> {file.linkedExpenseName}
                        </span>
                      ) : linkStatus.isReceipt ? (
                        <button
                          onClick={() => setReceiptToLink(file)}
                          data-testid={`link-receipt-btn-${file.id}`}
                          className="text-[11px] font-semibold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30 hover:bg-amber-500/20 inline-flex items-center gap-1"
                        >
                          <AlertTriangle className="w-3 h-3" /> Link to Expense
                        </button>
                      ) : (
                        <span className="text-slate-500 text-[11px]">N/A</span>
                      )}
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <a href={file.url} download className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-slate-200 inline-block">
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => handleDelete(file)}
                        data-testid={`delete-file-btn-${file.id}`}
                        className={`p-1.5 rounded inline-block ${
                          isTaxDoc ? 'text-slate-500 bg-white/5 cursor-not-allowed' : 'text-rose-400 bg-rose-500/10 hover:bg-rose-500/20'
                        }`}
                      >
                        {isTaxDoc ? <Lock className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Link Receipt Modal */}
      {receiptToLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/20 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Link className="w-4 h-4 text-emerald-400" />
              Link Receipt to Expense
            </h3>
            <p className="text-xs text-slate-300">
              Receipt: <strong>{receiptToLink.name}</strong>
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Select Unlinked Project Expense</label>
              <select
                value={selectedExpenseId}
                onChange={e => setSelectedExpenseId(e.target.value)}
                className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-400"
              >
                {expenses.map(e => (
                  <option key={e.expenseId} value={e.expenseId}>
                    {e.description} — ${e.amount} ({e.date})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReceiptToLink(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleLinkReceipt(receiptToLink.id, selectedExpenseId)}
                data-testid="confirm-link-receipt-btn"
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
              >
                Confirm Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
