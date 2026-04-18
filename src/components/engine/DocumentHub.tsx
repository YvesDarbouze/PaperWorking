'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Upload, FileText, FilePen, Building2, X, CheckCircle2,
  Clock, AlertCircle, Download, ExternalLink, Plus, Folder,
} from 'lucide-react';
import {
  collection, query, where, onSnapshot, addDoc, updateDoc,
  doc, serverTimestamp, deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/context/AuthContext';
import { useProjectStore } from '@/store/projectStore';
import toast from 'react-hot-toast';
import type { DealDocument, DealDocumentCategory, ESignStatus } from '@/types/schema';

const CATEGORIES: { key: DealDocumentCategory; label: string; icon: React.ReactNode }[] = [
  { key: 'Offer Letter',       label: 'Offer Letters',      icon: <FilePen className="w-4 h-4" /> },
  { key: 'Signed Deed',        label: 'Signed Deeds',       icon: <FileText className="w-4 h-4" /> },
  { key: 'Lender Form',        label: 'Lender Forms',       icon: <Building2 className="w-4 h-4" /> },
  { key: 'Purchase Agreement', label: 'Purchase Agreements', icon: <FileText className="w-4 h-4" /> },
  { key: 'Inspection Report',  label: 'Inspection Reports', icon: <FileText className="w-4 h-4" /> },
  { key: 'Insurance Binder',   label: 'Insurance',          icon: <FileText className="w-4 h-4" /> },
  { key: 'Other',              label: 'Other',              icon: <Folder className="w-4 h-4" /> },
];

const ESIGN_CONFIG: Record<ESignStatus, { label: string; color: string; icon: React.ReactNode }> = {
  'Not Required':       { label: 'No eSign Required', color: 'text-gray-500 bg-gray-50 border-gray-200',       icon: <FileText className="w-3 h-3" /> },
  'Awaiting Signature': { label: 'Awaiting Signature', color: 'text-amber-700 bg-amber-50 border-amber-200',   icon: <Clock className="w-3 h-3" /> },
  'Signed':             { label: 'Signed',             color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: <CheckCircle2 className="w-3 h-3" /> },
  'Declined':           { label: 'Declined',           color: 'text-red-700 bg-red-50 border-red-200',          icon: <AlertCircle className="w-3 h-3" /> },
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function DocumentHub() {
  const { user, profile } = useAuth();
  const projects = useProjectStore(s => s.projects);
  const currentProject = useProjectStore(s => s.currentProject);
  const setDeal = useProjectStore(s => s.setDeal);

  const [selectedProjectId, setSelectedProjectId] = useState<string>(currentProject?.id || projects[0]?.id || '');
  const [activeCategory, setActiveCategory] = useState<DealDocumentCategory>('Offer Letter');
  const [documents, setDocuments] = useState<DealDocument[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    category: 'Offer Letter' as DealDocumentCategory,
    notes: '',
    eSignStatus: 'Not Required' as ESignStatus,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Sync selectedProjectId with store's currentProject
  useEffect(() => {
    if (currentProject?.id && currentProject.id !== selectedProjectId) {
      setSelectedProjectId(currentProject.id);
    }
  }, [currentProject]);

  // Firestore real-time subscription
  useEffect(() => {
    if (!selectedProjectId) return;
    const q = query(
      collection(db, 'projects', selectedProjectId, 'documents'),
    );
    const unsub = onSnapshot(q, snap => {
      setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() })) as DealDocument[]);
    });
    return unsub;
  }, [selectedProjectId]);

  const filtered = documents.filter(d => d.category === activeCategory);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setPendingFile(file);
      setUploadForm(f => ({ ...f, category: activeCategory }));
      setShowUploadForm(true);
    }
  }, [activeCategory]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingFile(file);
      setUploadForm(f => ({ ...f, category: activeCategory }));
      setShowUploadForm(true);
    }
  };

  const handleUpload = async () => {
    if (!pendingFile || !selectedProjectId || !user) return;
    setUploading(true);
    try {
      // In production: upload to Firebase Storage or S3, get fileUrl
      // For now we store metadata; fileUrl would come from the storage upload
      const docData: Omit<DealDocument, 'id'> = {
        projectId: selectedProjectId,
        category: uploadForm.category,
        fileName: pendingFile.name,
        fileSize: pendingFile.size,
        mimeType: pendingFile.type,
        uploadedByUid: user.uid,
        uploadedByName: user.displayName || user.email || 'User',
        uploadedAt: new Date(),
        eSignStatus: uploadForm.eSignStatus,
        notes: uploadForm.notes,
      };
      await addDoc(collection(db, 'projects', selectedProjectId, 'documents'), {
        ...docData,
        uploadedAt: serverTimestamp(),
      });
      toast.success(`${pendingFile.name} uploaded`);
      setShowUploadForm(false);
      setPendingFile(null);
      setUploadForm({ category: 'Offer Letter', notes: '', eSignStatus: 'Not Required' });
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRequestESign = async (docId: string) => {
    if (!selectedProjectId) return;
    try {
      await updateDoc(doc(db, 'projects', selectedProjectId, 'documents', docId), {
        eSignStatus: 'Awaiting Signature',
        eSignRequestedAt: serverTimestamp(),
      });
      toast.success('eSign request sent');
    } catch {
      toast.error('Failed to request eSign');
    }
  };

  const handleMarkSigned = async (docId: string) => {
    if (!selectedProjectId) return;
    try {
      await updateDoc(doc(db, 'projects', selectedProjectId, 'documents', docId), {
        eSignStatus: 'Signed',
        eSignedAt: serverTimestamp(),
        eSignedByName: user?.displayName || user?.email || 'User',
      });
      toast.success('Document marked as signed');
    } catch {
      toast.error('Failed to update signature status');
    }
  };

  const handleDelete = async (docId: string) => {
    if (!selectedProjectId) return;
    try {
      await deleteDoc(doc(db, 'projects', selectedProjectId, 'documents', docId));
      toast.success('Document removed');
    } catch {
      toast.error('Failed to delete document');
    }
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="space-y-6">
      {/* Header + Deal Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Document Hub</h3>
          <p className="text-sm text-gray-500">Offer letters, deeds, lender forms — with eSign tracking.</p>
        </div>
        <div className="flex items-center gap-3">
          {projects.length > 0 && (
            <select
              className="border border-gray-300 rounded-md text-sm py-2 pl-3 pr-8 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              value={selectedProjectId}
              onChange={e => {
                setSelectedProjectId(e.target.value);
                const p = projects.find(x => x.id === e.target.value);
                if (p) setDeal(p);
              }}
            >
              <option value="" disabled>Select property…</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.propertyName}</option>
              ))}
            </select>
          )}
          {selectedProject?.driveFolders?.parentFolderUrl && (
            <a
              href={selectedProject.driveFolders.parentFolderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 border border-blue-200 rounded-md px-3 py-2 bg-blue-50 hover:bg-blue-100 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Drive Folder
            </a>
          )}
          <button
            onClick={() => { setUploadForm(f => ({ ...f, category: activeCategory })); setShowUploadForm(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition"
          >
            <Plus className="w-4 h-4" />
            Upload
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="-mb-px flex space-x-6 min-w-max">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium transition ${
                activeCategory === cat.key
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {cat.icon}
              {cat.label}
              {documents.filter(d => d.category === cat.key).length > 0 && (
                <span className="ml-1 bg-gray-100 text-gray-600 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                  {documents.filter(d => d.category === cat.key).length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Upload Form Modal */}
      {showUploadForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h4 className="text-base font-semibold text-gray-900">Upload Document</h4>
              <button onClick={() => { setShowUploadForm(false); setPendingFile(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {pendingFile ? (
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-3">
                <FileText className="w-8 h-8 text-gray-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{pendingFile.name}</p>
                  <p className="text-xs text-gray-500">{formatBytes(pendingFile.size)}</p>
                </div>
                <button onClick={() => setPendingFile(null)} className="ml-auto text-gray-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="block mb-4 cursor-pointer">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Click to select a file</p>
                </div>
                <input type="file" className="hidden" onChange={handleFileSelect} />
              </label>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                <select
                  className="w-full border border-gray-300 rounded-md text-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500"
                  value={uploadForm.category}
                  onChange={e => setUploadForm(f => ({ ...f, category: e.target.value as DealDocumentCategory }))}
                >
                  {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">eSignature Required?</label>
                <select
                  className="w-full border border-gray-300 rounded-md text-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500"
                  value={uploadForm.eSignStatus}
                  onChange={e => setUploadForm(f => ({ ...f, eSignStatus: e.target.value as ESignStatus }))}
                >
                  <option value="Not Required">Not Required</option>
                  <option value="Awaiting Signature">Needs Signature</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  rows={2}
                  className="w-full border border-gray-300 rounded-md text-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                  placeholder="Any additional context…"
                  value={uploadForm.notes}
                  onChange={e => setUploadForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowUploadForm(false); setPendingFile(null); }}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!pendingFile || uploading}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 transition disabled:opacity-50"
              >
                {uploading ? 'Uploading…' : 'Save Document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drop Zone + Document List */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative min-h-[300px] rounded-xl border-2 transition-all ${
          isDragging ? 'border-indigo-400 bg-indigo-50' : 'border-dashed border-gray-200 bg-gray-50/50'
        }`}
      >
        {isDragging && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
            <Upload className="w-10 h-10 text-indigo-500 mb-2" />
            <p className="text-sm font-medium text-indigo-600">Drop to upload</p>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
            <FileText className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">No {CATEGORIES.find(c => c.key === activeCategory)?.label} uploaded yet</p>
            <p className="text-xs text-gray-400 mt-1">Drag & drop files here or use the Upload button</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(doc => {
              const sign = ESIGN_CONFIG[doc.eSignStatus];
              return (
                <div key={doc.id} className="flex items-center gap-4 p-4 hover:bg-white transition group">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.fileName}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-400">
                        {doc.uploadedByName} · {doc.uploadedAt ? new Date((doc.uploadedAt as any)?.seconds ? (doc.uploadedAt as any).seconds * 1000 : doc.uploadedAt).toLocaleDateString() : ''}
                      </span>
                      {doc.fileSize && <span className="text-xs text-gray-400">{formatBytes(doc.fileSize)}</span>}
                    </div>
                    {doc.notes && <p className="text-xs text-gray-500 mt-1 truncate">{doc.notes}</p>}
                  </div>

                  {/* eSign Status Badge */}
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${sign.color}`}>
                    {sign.icon}
                    {sign.label}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    {doc.eSignStatus === 'Not Required' && (
                      <button
                        onClick={() => handleRequestESign(doc.id)}
                        title="Request eSignature"
                        className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50 transition"
                      >
                        <FilePen className="w-4 h-4" />
                      </button>
                    )}
                    {doc.eSignStatus === 'Awaiting Signature' && (
                      <button
                        onClick={() => handleMarkSigned(doc.id)}
                        title="Mark as Signed"
                        className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-md hover:bg-emerald-50 transition"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                    {doc.fileUrl && (
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Download"
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => handleDelete(doc.id)}
                      title="Remove"
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* eSign Summary Footer */}
      {documents.length > 0 && (
        <div className="flex items-center gap-6 text-xs text-gray-500 pt-2 border-t border-gray-100">
          <span className="font-medium text-gray-700">{documents.length} total documents</span>
          {(['Awaiting Signature', 'Signed', 'Declined'] as ESignStatus[]).map(s => {
            const count = documents.filter(d => d.eSignStatus === s).length;
            if (!count) return null;
            const cfg = ESIGN_CONFIG[s];
            return (
              <span key={s} className={`inline-flex items-center gap-1 font-medium ${cfg.color.split(' ')[0]}`}>
                {cfg.icon} {count} {s}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
