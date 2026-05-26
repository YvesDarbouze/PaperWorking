'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { storage, auth } from '@/lib/firebase/config';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  FileText, Upload, X, Loader2, CheckCircle, AlertTriangle,
  ChevronDown, ChevronRight, DollarSign, User, Phone, Mail,
  Hash, CalendarDays, FileCheck2, Building2, ClipboardList,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { GCBidExtraction, GCBidLineItem } from '@/app/api/ocr/gc-bid/route';
import type { ContractorBid } from '@/types/schema';

/* ═══════════════════════════════════════════════════════
   GC Bid Uploader
   Accepts PDF/image GC bids, extracts structured data via
   Gemini Vision OCR, and saves ContractorBid records to
   Firestore for PM review and approval.
   ═══════════════════════════════════════════════════════ */

const ACCEPTED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const CATEGORY_COLORS: Record<string, string> = {
  Demolition: 'bg-red-50 text-red-700 border-red-200',
  Foundation: 'bg-amber-50 text-amber-700 border-amber-200',
  Framing: 'bg-orange-50 text-orange-700 border-orange-200',
  Roofing: 'bg-blue-50 text-blue-700 border-blue-200',
  Plumbing: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  Electrical: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  HVAC: 'bg-purple-50 text-purple-700 border-purple-200',
  Insulation: 'bg-lime-50 text-lime-700 border-lime-200',
  Drywall: 'bg-stone-50 text-stone-700 border-stone-200',
  Flooring: 'bg-teal-50 text-teal-700 border-teal-200',
  'Cabinets & Counters': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Paint & Finish': 'bg-pink-50 text-pink-700 border-pink-200',
  'Windows & Doors': 'bg-sky-50 text-sky-700 border-sky-200',
  Landscaping: 'bg-green-50 text-green-700 border-green-200',
  'Permit Fees': 'bg-rose-50 text-rose-700 border-rose-200',
  Labor: 'bg-violet-50 text-violet-700 border-violet-200',
  Materials: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Other: 'bg-bg-primary text-text-secondary border-border-accent',
};

const CONFIDENCE_META = {
  high: { label: 'High Confidence', cls: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  medium: { label: 'Medium Confidence', cls: 'text-amber-600 bg-amber-50 border-amber-200' },
  low: { label: 'Low Confidence — Review carefully', cls: 'text-red-600 bg-red-50 border-red-200' },
};

interface SavedBid {
  id: string;
  contractorName: string;
  totalAmount: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  fileUrl: string;
  submittedAt: Date;
  lineItemCount: number;
}

interface Props {
  projectId: string;
  onBidSaved?: (bid: ContractorBid) => void;
}

export default function GCBidUploader({ projectId, onBidSaved }: Props) {
  const projects = useProjectStore(state => state.projects);
  const updateRehabModule = useProjectStore(state => state.updateRehabModule);
  const deal = projects.find(d => d.id === projectId);

  // Upload state
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Extraction review state
  const [extraction, setExtraction] = useState<GCBidExtraction | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>('');
  const [editedExtraction, setEditedExtraction] = useState<GCBidExtraction | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ lineItems: true });

  // Saved bids list
  const [savedBids, setSavedBids] = useState<SavedBid[]>(
    (deal?.rehab?.contractorBids ?? []).map(b => ({
      id: b.id,
      contractorName: b.contractorName,
      totalAmount: b.totalAmount,
      status: b.status,
      fileUrl: b.fileUrl ?? '',
      submittedAt: b.submittedAt instanceof Date ? b.submittedAt : new Date(b.submittedAt),
      lineItemCount: 0,
    }))
  );

  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!deal) return null;

  // ── File selection ───────────────────────────────────────

  const handleFileSelect = useCallback((file: File) => {
    if (!ACCEPTED_MIME.includes(file.type)) {
      toast.error('Please upload a PDF, JPEG, PNG, or WebP file.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error('File exceeds 10 MB. Please compress or split the document.');
      return;
    }
    setSelectedFile(file);
    setExtraction(null);
    setEditedExtraction(null);
    setUploadedFileUrl('');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  // ── Upload + OCR ─────────────────────────────────────────

  const handleUploadAndParse = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    let downloadUrl = '';
    try {
      const storagePath = `projects/${projectId}/gc_bids/${Date.now()}_${selectedFile.name}`;
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, selectedFile);

      downloadUrl = await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          snapshot => {
            setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          },
          reject,
          async () => {
            resolve(await getDownloadURL(uploadTask.snapshot.ref));
          }
        );
      });
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
      setIsUploading(false);
      return;
    }

    setIsUploading(false);
    setUploadedFileUrl(downloadUrl);
    setIsProcessing(true);
    toast.loading('Parsing GC bid with AI...', { id: 'gc-ocr' });

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/ocr/gc-bid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ fileUrl: downloadUrl, mimeType: selectedFile.type }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `OCR failed (${res.status})`);
      }

      const { data }: { data: GCBidExtraction } = await res.json();
      setExtraction(data);
      setEditedExtraction(structuredClone(data));
      toast.success('Bid parsed successfully. Review and confirm below.', { id: 'gc-ocr', icon: '✨' });
    } catch (err: any) {
      toast.error(`Parsing failed: ${err.message}`, { id: 'gc-ocr' });
      setIsProcessing(false);
      return;
    }

    setIsProcessing(false);
    setSelectedFile(null);
  };

  // ── Inline edit helpers ──────────────────────────────────

  const updateField = <K extends keyof GCBidExtraction>(key: K, value: GCBidExtraction[K]) => {
    setEditedExtraction(prev => prev ? { ...prev, [key]: value } : prev);
  };

  const updateLineItem = (index: number, field: keyof GCBidLineItem, value: string | number) => {
    setEditedExtraction(prev => {
      if (!prev) return prev;
      const items = [...prev.lineItems];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, lineItems: items };
    });
  };

  const removeLineItem = (index: number) => {
    setEditedExtraction(prev => {
      if (!prev) return prev;
      const items = prev.lineItems.filter((_, i) => i !== index);
      const newTotal = items.reduce((s, i) => s + i.amount, 0);
      return { ...prev, lineItems: items, totalAmount: newTotal };
    });
  };

  const addLineItem = () => {
    setEditedExtraction(prev => {
      if (!prev) return prev;
      const blank: GCBidLineItem = { description: '', category: 'Other', amount: 0 };
      return { ...prev, lineItems: [...prev.lineItems, blank] };
    });
  };

  // ── Save to Firestore ────────────────────────────────────

  const handleSaveBid = async () => {
    if (!editedExtraction) return;
    setIsSaving(true);

    try {
      const newBid: ContractorBid = {
        id: `bid_${Date.now()}`,
        contractorName: editedExtraction.contractorName || 'Unknown Contractor',
        totalAmount: editedExtraction.totalAmount,
        status: 'Pending',
        submittedAt: new Date(),
        notes: [
          editedExtraction.notes,
          editedExtraction.paymentTerms ? `Payment terms: ${editedExtraction.paymentTerms}` : '',
          editedExtraction.contractorLicense ? `License: ${editedExtraction.contractorLicense}` : '',
        ].filter(Boolean).join(' | ') || undefined,
        fileUrl: uploadedFileUrl,
      };

      // Write ContractorBid to Firestore under the project document
      const projectRef = doc(db, 'projects', projectId);
      await updateDoc(projectRef, {
        'rehab.contractorBids': arrayUnion(newBid),
      });

      // Mirror to local store so the UI reflects it immediately
      const existing = deal?.rehab?.contractorBids ?? [];
      updateRehabModule(projectId, { contractorBids: [...existing, newBid] });

      // Notify parent so its local contractorBids state stays in sync
      onBidSaved?.(newBid);

      setSavedBids(prev => [...prev, {
        id: newBid.id,
        contractorName: newBid.contractorName,
        totalAmount: newBid.totalAmount,
        status: 'Pending',
        fileUrl: uploadedFileUrl,
        submittedAt: new Date(),
        lineItemCount: editedExtraction.lineItems.length,
      }]);

      setExtraction(null);
      setEditedExtraction(null);
      setUploadedFileUrl('');
      toast.success(`Bid from ${newBid.contractorName} saved for PM review.`);
    } catch (err: any) {
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const lineItemTotal = editedExtraction?.lineItems.reduce((s, i) => s + i.amount, 0) ?? 0;

  // ── Render ───────────────────────────────────────────────

  return (
    <div className="bg-bg-surface rounded-xl border border-border-accent shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border-accent flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-text-primary" />
          <h3 className="text-base font-semibold text-text-primary tracking-tight">GC Bid Upload</h3>
        </div>
        {savedBids.length > 0 && (
          <span className="text-xs font-medium bg-bg-primary text-text-secondary px-2.5 py-1 rounded-full border border-border-accent">
            {savedBids.length} bid{savedBids.length !== 1 ? 's' : ''} on file
          </span>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Upload Zone — only shown when no extraction is pending review */}
        {!extraction && (
          <div>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !isUploading && !isProcessing && fileInputRef.current?.click()}
              className="relative rounded-xl p-8 text-center cursor-pointer transition-all bg-surface-container/30 backdrop-blur-xl border-t border-l border-white/10 shadow-lg min-h-[180px] flex flex-col items-center justify-center overflow-hidden group"
            >
              {/* Inner Dashed Border Indicator */}
              <div className={`absolute inset-3 border-2 border-dashed rounded-lg transition-all duration-300 pointer-events-none ${
                dragOver 
                  ? 'border-primary bg-primary/10' 
                  : 'border-outline-variant/40 group-hover:border-primary/40 group-hover:bg-primary/5'
              }`} />

              {selectedFile ? (
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <div className="w-14 h-14 mb-1 rounded-full bg-surface-container-highest flex items-center justify-center text-emerald-500 shadow-lg shadow-emerald-500/10">
                    <FileCheck2 className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-text-primary">{selectedFile.name}</p>
                  <p className="text-xs text-text-secondary">{(selectedFile.size / 1024).toFixed(0)} KB</p>
                  {!isUploading && !isProcessing && (
                    <button
                      onClick={e => { e.stopPropagation(); setSelectedFile(null); }}
                      className="mt-1 text-text-secondary hover:text-red-500 transition cursor-pointer active:scale-95 p-1 rounded-full hover:bg-white/10"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <div className="w-14 h-14 mb-1 rounded-full bg-surface-container-highest flex items-center justify-center text-primary shadow-lg shadow-primary/10 group-hover:scale-110 transition-transform duration-300">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-text-primary">Drop GC bid here or click to browse</p>
                  <p className="text-xs text-text-secondary">PDF, JPEG, PNG, WebP — AI extracts line items automatically</p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
                e.target.value = '';
              }}
            />

            {selectedFile && (
              <button
                onClick={handleUploadAndParse}
                disabled={isUploading || isProcessing}
                className="mt-3 w-full flex items-center justify-center gap-2 luminous-button py-3 rounded-lg text-sm font-semibold disabled:opacity-40"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading {uploadProgress.toFixed(0)}%
                  </>
                ) : isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    AI Extracting Bid Data...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Upload & Parse Bid
                  </>
                )}
              </button>
            )}

            {isUploading && (
              <div className="mt-2 h-1.5 bg-bg-primary rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Extraction Review */}
        {editedExtraction && (
          <div className="space-y-4">
            {/* Confidence badge */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${CONFIDENCE_META[editedExtraction.confidence].cls}`}>
              {editedExtraction.confidence === 'high'
                ? <CheckCircle className="w-3.5 h-3.5" />
                : <AlertTriangle className="w-3.5 h-3.5" />}
              {CONFIDENCE_META[editedExtraction.confidence].label} — Review and correct any fields before saving.
            </div>

            {/* Contractor Details */}
            <div>
              <button
                onClick={() => toggleSection('details')}
                className="w-full flex items-center justify-between py-2 text-sm font-medium text-text-primary"
              >
                <div className="flex items-center gap-1.5">
                  {expandedSections.details ? <ChevronDown className="w-4 h-4 text-text-secondary" /> : <ChevronRight className="w-4 h-4 text-text-secondary" />}
                  Contractor Details
                </div>
              </button>

              {expandedSections.details !== false && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  <Field
                    icon={<User className="w-3.5 h-3.5" />}
                    label="Contractor Name"
                    value={editedExtraction.contractorName}
                    onChange={v => updateField('contractorName', v)}
                  />
                  <Field
                    icon={<Phone className="w-3.5 h-3.5" />}
                    label="Phone"
                    value={editedExtraction.contractorPhone ?? ''}
                    onChange={v => updateField('contractorPhone', v)}
                  />
                  <Field
                    icon={<Mail className="w-3.5 h-3.5" />}
                    label="Email"
                    value={editedExtraction.contractorEmail ?? ''}
                    onChange={v => updateField('contractorEmail', v)}
                  />
                  <Field
                    icon={<Hash className="w-3.5 h-3.5" />}
                    label="License #"
                    value={editedExtraction.contractorLicense ?? ''}
                    onChange={v => updateField('contractorLicense', v)}
                  />
                  <Field
                    icon={<CalendarDays className="w-3.5 h-3.5" />}
                    label="Bid Date"
                    value={editedExtraction.bidDate ?? ''}
                    onChange={v => updateField('bidDate', v)}
                    placeholder="YYYY-MM-DD"
                  />
                  <Field
                    icon={<CalendarDays className="w-3.5 h-3.5" />}
                    label="Valid Until"
                    value={editedExtraction.validUntil ?? ''}
                    onChange={v => updateField('validUntil', v)}
                    placeholder="YYYY-MM-DD"
                  />
                </div>
              )}
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-3 gap-3">
              <SummaryCard
                label="Total Bid"
                value={editedExtraction.totalAmount}
                editable
                onChange={v => updateField('totalAmount', Number(v))}
                highlight
              />
              <SummaryCard
                label="Labor"
                value={editedExtraction.laborCost}
                editable
                onChange={v => updateField('laborCost', Number(v))}
              />
              <SummaryCard
                label="Materials"
                value={editedExtraction.materialsCost}
                editable
                onChange={v => updateField('materialsCost', Number(v))}
              />
            </div>

            {lineItemTotal > 0 && Math.abs(lineItemTotal - editedExtraction.totalAmount) > 1 && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                Line items sum to ${lineItemTotal.toLocaleString()} — total bid is ${editedExtraction.totalAmount.toLocaleString()}. Verify before saving.
              </p>
            )}

            {/* Line Items */}
            <div>
              <button
                onClick={() => toggleSection('lineItems')}
                className="w-full flex items-center justify-between py-2 text-sm font-medium text-text-primary"
              >
                <div className="flex items-center gap-1.5">
                  {expandedSections.lineItems ? <ChevronDown className="w-4 h-4 text-text-secondary" /> : <ChevronRight className="w-4 h-4 text-text-secondary" />}
                  <ClipboardList className="w-4 h-4 text-text-secondary" />
                  Line Items ({editedExtraction.lineItems.length})
                </div>
                <span className="text-xs font-mono text-text-secondary">
                  ${lineItemTotal.toLocaleString()}
                </span>
              </button>

              {expandedSections.lineItems && (
                <div className="space-y-2 mt-2">
                  {editedExtraction.lineItems.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-3 bg-bg-primary rounded-lg border border-border-accent group">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
                        <input
                          className="text-sm text-text-primary bg-transparent border-b border-transparent focus:border-border-accent outline-none transition w-full"
                          value={item.description}
                          onChange={e => updateLineItem(idx, 'description', e.target.value)}
                          placeholder="Description"
                        />
                        <select
                          className="text-xs border border-border-accent rounded px-1.5 py-1 bg-bg-surface text-text-primary focus:outline-none"
                          value={item.category}
                          onChange={e => updateLineItem(idx, 'category', e.target.value)}
                        >
                          {Object.keys(CATEGORY_COLORS).map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-text-secondary">$</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            className="text-sm font-mono text-text-primary bg-transparent border-b border-transparent focus:border-border-accent outline-none w-24 transition"
                            value={item.amount || ''}
                            onChange={e => updateLineItem(idx, 'amount', Number(e.target.value))}
                          />
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded border flex-shrink-0 ${CATEGORY_COLORS[item.category] || CATEGORY_COLORS['Other']}`}>
                        {item.category}
                      </span>
                      <button
                        onClick={() => removeLineItem(idx)}
                        className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-red-500 transition flex-shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={addLineItem}
                    className="w-full py-2 text-xs text-text-secondary border border-dashed border-border-accent rounded-lg hover:border-gray-400 hover:text-text-primary transition"
                  >
                    + Add line item
                  </button>
                </div>
              )}
            </div>

            {/* Notes */}
            {(editedExtraction.notes || editedExtraction.paymentTerms) && (
              <div className="space-y-2">
                {editedExtraction.notes && (
                  <div>
                    <label className="text-xs text-text-secondary uppercase tracking-wider">Notes / Exclusions</label>
                    <textarea
                      rows={2}
                      className="mt-1 w-full text-xs text-text-primary bg-bg-primary border border-border-accent rounded-lg px-3 py-2 focus:outline-none focus:border-gray-400 resize-none"
                      value={editedExtraction.notes}
                      onChange={e => updateField('notes', e.target.value)}
                    />
                  </div>
                )}
                {editedExtraction.paymentTerms && (
                  <div>
                    <label className="text-xs text-text-secondary uppercase tracking-wider">Payment Terms</label>
                    <input
                      className="mt-1 w-full text-xs text-text-primary bg-bg-primary border border-border-accent rounded-lg px-3 py-2 focus:outline-none focus:border-gray-400"
                      value={editedExtraction.paymentTerms}
                      onChange={e => updateField('paymentTerms', e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { setExtraction(null); setEditedExtraction(null); setUploadedFileUrl(''); }}
                className="flex-1 py-2.5 rounded-lg border border-border-accent text-sm text-text-secondary hover:text-text-primary hover:border-gray-400 transition"
              >
                Discard
              </button>
              <button
                onClick={handleSaveBid}
                disabled={isSaving || !editedExtraction.contractorName || editedExtraction.totalAmount <= 0}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition disabled:opacity-40 active:scale-[0.99]"
              >
                {isSaving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                ) : (
                  <><CheckCircle className="w-4 h-4" /> Confirm & Save Bid</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Saved Bids List */}
        {savedBids.length > 0 && !extraction && (
          <div>
            <button
              onClick={() => toggleSection('saved')}
              className="w-full flex items-center justify-between py-2 text-sm font-medium text-text-primary border-t border-border-accent pt-4"
            >
              <div className="flex items-center gap-1.5">
                {expandedSections.saved ? <ChevronDown className="w-4 h-4 text-text-secondary" /> : <ChevronRight className="w-4 h-4 text-text-secondary" />}
                Submitted Bids
              </div>
            </button>

            {expandedSections.saved !== false && (
              <div className="space-y-2 mt-2">
                {savedBids.map(bid => (
                  <div key={bid.id} className="flex items-center justify-between px-4 py-3 bg-bg-primary rounded-lg border border-border-accent">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{bid.contractorName}</p>
                      <p className="text-xs text-text-secondary">
                        {bid.submittedAt.toLocaleDateString()} · {bid.lineItemCount > 0 ? `${bid.lineItemCount} line items` : 'Summary bid'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono font-medium text-text-primary">
                        ${bid.totalAmount.toLocaleString()}
                      </span>
                      <StatusBadge status={bid.status} />
                      {bid.fileUrl && (
                        <a
                          href={bid.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-text-secondary hover:text-text-primary transition"
                          title="View document"
                        >
                          <FileText className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────

function Field({
  icon, label, value, onChange, placeholder,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="flex items-center gap-1 text-xs text-text-secondary uppercase tracking-wider mb-1">
        {icon} {label}
      </label>
      <input
        className="w-full text-sm text-text-primary bg-bg-primary border border-border-accent rounded-lg px-3 py-2 focus:outline-none focus:border-gray-400 transition"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? label}
      />
    </div>
  );
}

function SummaryCard({
  label, value, editable, onChange, highlight,
}: {
  label: string;
  value: number;
  editable?: boolean;
  onChange?: (v: string) => void;
  highlight?: boolean;
}) {
  return (
    <div className={`p-3 rounded-lg border text-center ${highlight ? 'border-gray-300 bg-bg-primary' : 'border-border-accent bg-bg-primary'}`}>
      <p className="text-xs uppercase tracking-widest text-text-secondary mb-1">{label}</p>
      <div className="flex items-center justify-center gap-0.5">
        <DollarSign className="w-3.5 h-3.5 text-text-secondary" />
        {editable && onChange ? (
          <input
            type="number"
            min="0"
            className={`w-full text-center font-mono bg-transparent outline-none ${highlight ? 'text-lg font-semibold text-text-primary' : 'text-base text-text-primary'}`}
            value={value || ''}
            onChange={e => onChange(e.target.value)}
          />
        ) : (
          <span className={`font-mono ${highlight ? 'text-lg font-semibold text-text-primary' : 'text-base text-text-primary'}`}>
            {value.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: 'Pending' | 'Approved' | 'Rejected' }) {
  const styles = {
    Pending: 'bg-amber-50 text-amber-700 border-amber-200',
    Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Rejected: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${styles[status]}`}>
      {status}
    </span>
  );
}
