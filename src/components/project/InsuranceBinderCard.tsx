'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Shield, Upload, FileText, CheckCircle2, Trash2, AlertCircle, Info, DollarSign, Calendar, MapPin } from 'lucide-react';
import type { Project, RoleLinkedDocument } from '@/types/schema';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

interface Props {
  project: Project;
  onSaveProject: (updates: Partial<Project>) => Promise<void>;
  readOnly?: boolean;
}

export function InsuranceBinderCard({ project, onSaveProject, readOnly = false }: Props) {
  const { user } = useAuth();
  const financials = project.financials || {};

  // Form states
  const [annualPremium, setAnnualPremium] = useState<string>('');
  const [effectiveDate, setEffectiveDate] = useState<string>('');
  const [hasFloodRider, setHasFloodRider] = useState<boolean>(false);
  const [hasEarthquakeRider, setHasEarthquakeRider] = useState<boolean>(false);
  const [floodZone, setFloodZone] = useState<string>('');
  const [earthquakeZone, setEarthquakeZone] = useState<string>('');

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state with project data on mount / change
  useEffect(() => {
    setAnnualPremium(financials.insuranceCost ? financials.insuranceCost.toString() : '');
    setEffectiveDate(financials.insuranceBinderEffectiveDate || '');
    setHasFloodRider(!!financials.hasFloodRider);
    setHasEarthquakeRider(!!financials.hasEarthquakeRider);
    setFloodZone(financials.floodZone || '');
    setEarthquakeZone(financials.earthquakeZone || '');
  }, [project.id, financials.insuranceCost, financials.insuranceBinderEffectiveDate, financials.hasFloodRider, financials.hasEarthquakeRider, financials.floodZone, financials.earthquakeZone]);

  // Resolve active Insurance Broker
  const brokerValue = financials.f4InsuranceBrokerVendor;
  const brokerName = !brokerValue
    ? null
    : typeof brokerValue === 'string'
      ? brokerValue
      : brokerValue.name || null;
  const brokerFirm = typeof brokerValue === 'object' && brokerValue?.firm ? brokerValue.firm : null;

  // ── File upload handler ──────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF documents are allowed.');
      return;
    }

    if (!user) {
      toast.error('Must be logged in to upload documents.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    const toastId = toast.loading('Uploading insurance binder...');

    const uploadId = crypto.randomUUID();
    const fileRef = ref(storage, `projects/${project.id}/documents/${uploadId}_${file.name}`);
    const uploadTask = uploadBytesResumable(fileRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setUploadProgress(progress);
      },
      (error) => {
        console.error('Binder upload failed', error);
        toast.error(`Failed to upload ${file.name}`, { id: toastId });
        setUploading(false);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          // Update financials
          const updatedFinancials = {
            ...financials,
            insuranceBinderUrl: downloadURL,
            insuranceBinderName: file.name,
          };

          // Create/update RoleLinkedDocument
          const updatedDocs = [...(project.roleLinkedDocuments || [])];
          const binderDocIndex = updatedDocs.findIndex((d) => d.category === 'Insurance Binder');
          const newDoc: RoleLinkedDocument = {
            id: binderDocIndex >= 0 ? updatedDocs[binderDocIndex].id : uploadId,
            category: 'Insurance Binder',
            fileName: file.name,
            fileUrl: downloadURL,
            linkedRole: 'Closing Agent',
            uploadedByUid: user.uid,
            uploadedByName: user.displayName || user.email || 'Teammate',
            uploadedAt: new Date(),
            verified: false,
            notes: effectiveDate ? `Effective Date: ${effectiveDate}` : '',
          };

          if (binderDocIndex >= 0) {
            updatedDocs[binderDocIndex] = newDoc;
          } else {
            updatedDocs.push(newDoc);
          }

          await onSaveProject({
            financials: updatedFinancials,
            roleLinkedDocuments: updatedDocs,
          });

          toast.success('Insurance binder uploaded successfully.', { id: toastId });
        } catch (err: any) {
          console.error(err);
          toast.error('Failed to link binder document.', { id: toastId });
        } finally {
          setUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }
    );
  };

  // ── Delete document handler ──────────────────────────────────────────────
  const handleDeleteBinder = async () => {
    if (!window.confirm('Are you sure you want to remove the insurance binder?')) return;

    const toastId = toast.loading('Removing binder...');
    try {
      const fileUrl = financials.insuranceBinderUrl;
      if (fileUrl) {
        try {
          const fileRef = ref(storage, fileUrl);
          await deleteObject(fileRef);
        } catch (err) {
          console.error('Failed to delete file from storage:', err);
        }
      }

      // Update financials
      const updatedFinancials = {
        ...financials,
        insuranceBinderUrl: null,
        insuranceBinderName: null,
      };

      // Remove from RoleLinkedDocuments
      const updatedDocs = (project.roleLinkedDocuments || []).filter(
        (d) => d.category !== 'Insurance Binder'
      );

      await onSaveProject({
        financials: updatedFinancials,
        roleLinkedDocuments: updatedDocs,
      });

      toast.success('Insurance binder removed.', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to remove binder.', { id: toastId });
    }
  };

  // ── Save action updates monthly opex premium and annual premium ──────────
  const handleSaveDetails = async () => {
    const premiumVal = parseFloat(annualPremium) || 0;
    const monthlyPremium = Math.round((premiumVal / 12) * 100) / 100;

    const updatedFinancials = {
      ...financials,
      insuranceCost: premiumVal || undefined,
      insurance: premiumVal ? monthlyPremium : undefined,
      holdingCostInsurance: premiumVal ? monthlyPremium : undefined,
      insuranceBinderEffectiveDate: effectiveDate || null,
      hasFloodRider,
      hasEarthquakeRider,
      floodZone: hasFloodRider ? floodZone.trim() || null : null,
      earthquakeZone: hasEarthquakeRider ? earthquakeZone.trim() || null : null,
    };

    // Update notes in RoleLinkedDocument if it exists
    const updatedDocs = [...(project.roleLinkedDocuments || [])];
    const binderDocIndex = updatedDocs.findIndex((d) => d.category === 'Insurance Binder');
    if (binderDocIndex >= 0) {
      updatedDocs[binderDocIndex] = {
        ...updatedDocs[binderDocIndex],
        notes: effectiveDate ? `Effective Date: ${effectiveDate}` : '',
      };
    }

    try {
      await onSaveProject({
        financials: updatedFinancials,
        roleLinkedDocuments: updatedDocs,
      });
      toast.success('Insurance settings and opex premium updated!');
    } catch (err) {
      toast.error('Failed to update insurance details.');
    }
  };

  const binderUploaded = !!financials.insuranceBinderUrl;

  return (
    <div className="glass-card p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-pw-border pb-4">
        <div className="flex items-center gap-2.5">
          <Shield className="w-5 h-5 text-[#7A9EAA]" />
          <div>
            <h3 className="text-sm font-bold text-pw-black uppercase tracking-wider">Insurance Binder &amp; Riders</h3>
            <p className="text-[10px] text-pw-muted font-light mt-0.5">
              Confirm hazard premium, upload binding documents, and track hazard riders.
            </p>
          </div>
        </div>
        <span className="text-[9px] font-bold text-[#9E9DA0] uppercase tracking-wider">
          F4 Closing Checklist
        </span>
      </div>

      {/* Insurance Broker Assignment Slot Banner */}
      <div className="p-3 bg-gray-50/50 border border-pw-border rounded-lg text-xs space-y-1">
        <div className="flex items-center justify-between">
          <span className="font-bold text-pw-black uppercase tracking-wider text-[10px]">
            Insurance Broker Slot
          </span>
          {brokerName ? (
            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-green-50 text-green-700 rounded border border-green-200">
              Assigned
            </span>
          ) : (
            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 rounded border border-amber-200">
              Unassigned
            </span>
          )}
        </div>
        {brokerName ? (
          <p className="text-pw-black text-[11px] font-medium">
            Broker: <span className="font-semibold">{brokerName}</span>
            {brokerFirm && <span className="text-pw-muted font-light"> ({brokerFirm})</span>}
          </p>
        ) : (
          <p className="text-pw-muted text-[11px] font-light">
            No broker assigned. Assign an insurance broker in the Team slot above to coordinate quotes.
          </p>
        )}
      </div>

      {/* Upload Binder File Area */}
      <div className="space-y-3">
        <label className="block text-[10px] font-bold text-pw-muted uppercase tracking-wider">
          Insurance Binder PDF *
        </label>

        {binderUploaded ? (
          <div className="p-4 border border-green-500/20 bg-green-500/5 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600 animate-bounce" />
              <div>
                <a
                  href={financials.insuranceBinderUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-pw-black hover:underline block truncate max-w-xs"
                >
                  {financials.insuranceBinderName || 'insurance_binder.pdf'}
                </a>
                <span className="text-[10px] text-green-600 font-medium">Binder Document Uploaded</span>
              </div>
            </div>
            {!readOnly && (
              <button
                type="button"
                onClick={handleDeleteBinder}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div>
            <input
              type="file"
              accept=".pdf"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              id="insurance-binder-picker"
              disabled={uploading || readOnly}
            />
            <label
              htmlFor="insurance-binder-picker"
              className={`border-2 border-dashed border-pw-border rounded-lg p-5 text-center block cursor-pointer hover:bg-gray-50/50 transition-all ${
                uploading || readOnly ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {uploading ? (
                <div className="space-y-2">
                  <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-[#7A9EAA] animate-spin mx-auto" />
                  <span className="text-xs text-pw-muted font-medium block">
                    Uploading ({uploadProgress}%)…
                  </span>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="w-6 h-6 text-pw-muted mx-auto" />
                  <span className="text-xs text-pw-black font-semibold block">Upload Insurance Binder</span>
                  <span className="text-[10px] text-pw-muted font-light">PDF format only. Required to unlock actual values.</span>
                </div>
              )}
            </label>
          </div>
        )}
      </div>

      {/* Binder Details & Riders Form */}
      <div className="space-y-4 pt-2 border-t border-pw-border">
        {/* Effective Date & Annual Premium inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-pw-muted uppercase tracking-wider mb-1">
              Binder Effective Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-2 h-3.5 w-3.5 text-pw-muted" />
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                disabled={readOnly}
                className="pl-8 pr-3 py-1.5 w-full border border-pw-border rounded text-xs text-pw-black bg-pw-white focus:outline-none focus:ring-1 focus:ring-[#7A9EAA]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-pw-muted uppercase tracking-wider mb-1">
              Annual Premium ($)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-2.5 top-2 h-3.5 w-3.5 text-pw-muted" />
              <input
                type="number"
                value={annualPremium}
                onChange={(e) => setAnnualPremium(e.target.value)}
                placeholder="e.g. 2400"
                disabled={!binderUploaded || readOnly}
                className={`pl-8 pr-3 py-1.5 w-full border border-pw-border rounded text-xs text-pw-black bg-pw-white focus:outline-none focus:ring-1 focus:ring-[#7A9EAA] font-mono ${
                  !binderUploaded ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''
                }`}
              />
            </div>
            {!binderUploaded && (
              <span className="text-[9px] text-amber-600 font-semibold block mt-1 flex items-center gap-0.5">
                <AlertCircle className="w-2.5 h-2.5" /> Upload binder PDF first to unlock annual premium entry
              </span>
            )}
          </div>
        </div>

        {/* Dynamic calculation display disclaiming monthly NOI opex impact */}
        {annualPremium && binderUploaded && (
          <div className="p-3 bg-[#7A9EAA]/5 border border-[#7A9EAA]/20 rounded-lg flex items-start gap-2.5 text-xs text-pw-black">
            <Info className="w-4 h-4 text-[#7A9EAA] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[11px] uppercase tracking-wider text-[#7A9EAA]">
                NOI / Expense Ledger Sync
              </p>
              <p className="text-[11px] text-pw-muted font-light mt-0.5">
                Annual premium of <span className="font-bold font-mono text-pw-black">${parseFloat(annualPremium).toLocaleString()}</span> writes a monthly opex expense of <span className="font-bold font-mono text-pw-black">${Math.round((parseFloat(annualPremium) / 12) * 100) / 100}</span> to the insurance category. Net Operating Income (NOI), Cash Flow, and DSCR are derived directly from this monthly value to prevent ledger drift (BUG-8 vigilance).
              </p>
            </div>
          </div>
        )}

        {/* Hazard Riders & Zone determinations */}
        <div className="space-y-3 pt-2 border-t border-pw-border">
          <span className="block text-[10px] font-bold text-pw-muted uppercase tracking-wider">
            Hazard Riders &amp; Zone Determinations
          </span>

          <div className="space-y-3">
            {/* Flood Rider */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => !readOnly && setHasFloodRider(!hasFloodRider)}
                className={`flex items-center gap-2 text-xs select-none ${
                  readOnly ? 'cursor-default' : 'cursor-pointer text-pw-black hover:text-black'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                    hasFloodRider ? 'bg-[#7A9EAA] border-[#7A9EAA]' : 'border-pw-border'
                  }`}
                >
                  {hasFloodRider && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                </div>
                <span className="font-medium text-pw-black">Property Requires Flood Rider</span>
              </button>

              {hasFloodRider && (
                <div className="pl-6 space-y-1 animate-in slide-in-from-top-1 duration-150">
                  <label className="block text-[9px] font-bold text-pw-muted uppercase tracking-wider">
                    Flood Zone / Designation *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-2.5 top-2 h-3.5 w-3.5 text-pw-muted" />
                    <input
                      type="text"
                      value={floodZone}
                      onChange={(e) => setFloodZone(e.target.value)}
                      placeholder="e.g. Zone AE, Zone A"
                      disabled={readOnly}
                      className="pl-8 pr-3 py-1.5 w-full border border-pw-border rounded text-xs text-pw-black bg-pw-white focus:outline-none focus:ring-1 focus:ring-[#7A9EAA]"
                    />
                  </div>
                  <span className="text-[9px] text-pw-muted font-light italic">
                    Zone determinations come from your lender/insurer.
                  </span>
                </div>
              )}
            </div>

            {/* Earthquake Rider */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => !readOnly && setHasEarthquakeRider(!hasEarthquakeRider)}
                className={`flex items-center gap-2 text-xs select-none ${
                  readOnly ? 'cursor-default' : 'cursor-pointer text-pw-black hover:text-black'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                    hasEarthquakeRider ? 'bg-[#7A9EAA] border-[#7A9EAA]' : 'border-pw-border'
                  }`}
                >
                  {hasEarthquakeRider && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                </div>
                <span className="font-medium text-pw-black">Property Requires Earthquake Rider</span>
              </button>

              {hasEarthquakeRider && (
                <div className="pl-6 space-y-1 animate-in slide-in-from-top-1 duration-150">
                  <label className="block text-[9px] font-bold text-pw-muted uppercase tracking-wider">
                    Earthquake Risk Category / Zone *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-2.5 top-2 h-3.5 w-3.5 text-pw-muted" />
                    <input
                      type="text"
                      value={earthquakeZone}
                      onChange={(e) => setEarthquakeZone(e.target.value)}
                      placeholder="e.g. Zone 4, High Risk Category"
                      disabled={readOnly}
                      className="pl-8 pr-3 py-1.5 w-full border border-pw-border rounded text-xs text-pw-black bg-pw-white focus:outline-none focus:ring-1 focus:ring-[#7A9EAA]"
                    />
                  </div>
                  <span className="text-[9px] text-pw-muted font-light italic">
                    Zone determinations come from your lender/insurer.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Save button */}
        {!readOnly && (
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveDetails}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#7A9EAA] text-white rounded hover:bg-[#688a95] transition-all shadow-sm flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Save Insurance details
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
