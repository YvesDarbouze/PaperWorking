'use client';

import React, { useState, useCallback } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { storage, auth } from '@/lib/firebase/config';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { HardHat, Droplets, Zap, Wrench, Upload, AlertTriangle, CheckCircle, ChevronDown, ChevronRight, Loader2, X, FileCheck2 } from 'lucide-react';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════
   Inspection Upload Module — Phase 2 Module
   Tracks Structural, Plumbing, and Electrical issues
   from third-party inspection reports.
   ═══════════════════════════════════════════════════════ */

type InspectionCategory = 'Structural' | 'Plumbing' | 'Electrical' | 'HVAC' | 'Foundation' | 'Roof';

interface InspectionIssue {
  id: string;
  category: InspectionCategory;
  description: string;
  severity: 'Critical' | 'Major' | 'Minor' | 'Cosmetic';
  estimatedRepairCost: number;
  resolved: boolean;
}

const CATEGORY_ICONS: Record<InspectionCategory, React.ReactNode> = {
  Structural: <HardHat className="w-4 h-4" />,
  Plumbing: <Droplets className="w-4 h-4" />,
  Electrical: <Zap className="w-4 h-4" />,
  HVAC: <Wrench className="w-4 h-4" />,
  Foundation: <HardHat className="w-4 h-4" />,
  Roof: <HardHat className="w-4 h-4" />,
};

const SEVERITY_STYLES: Record<InspectionIssue['severity'], string> = {
  Critical: 'bg-red-50 text-red-700 border-red-200',
  Major: 'bg-orange-50 text-orange-700 border-orange-200',
  Minor: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Cosmetic: 'bg-bg-primary text-text-secondary border-border-accent',
};

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export default function InspectionUploadModule() {
  const currentProject = useProjectStore(state => state.currentProject);
  const [issues, setIssues] = useState<InspectionIssue[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  
  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const toggleResolved = (id: string) => {
    setIssues(issues.map(i => i.id === id ? { ...i, resolved: !i.resolved } : i));
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleFileSelect = useCallback((file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Invalid file type. Please upload a PDF, JPEG, or PNG.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum 10MB.');
      return;
    }
    setUploadFile(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const processOCR = async (fileUrl: string, mimeType: string): Promise<InspectionIssue[]> => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch('/api/ocr/inspection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ fileUrl, mimeType })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `OCR processing failed with status ${res.status}`);
    }

    const { data } = await res.json();
    return data.issues.map((issue: any, index: number) => ({
      id: `issue-${Date.now()}-${index}`,
      category: issue.category,
      description: issue.description,
      severity: issue.severity,
      estimatedRepairCost: issue.estimatedRepairCost,
      resolved: false
    }));
  };

  const handleUpload = async () => {
    if (!currentProject?.id || !uploadFile) {
      toast.error('Project or file not selected.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const storagePath = `projects/${currentProject.id}/inspection_docs/${Date.now()}_${uploadFile.name}`;
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, uploadFile);

      const downloadUrl = await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
          (error) => reject(error),
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          }
        );
      });

      setIsUploading(false);
      setIsProcessing(true);
      toast.loading('Extracting inspection data...', { id: 'ocr-toast' });

      const extractedIssues = await processOCR(downloadUrl, uploadFile.type);

      setIssues(prev => [...prev, ...extractedIssues]);
      
      setIsProcessing(false);
      toast.dismiss('ocr-toast');
      toast.success(`Inspection report parsed. ${extractedIssues.length} issues extracted.`, { icon: '✨' });
      
      setUploadFile(null);
    } catch (error: any) {
      console.error('Upload Error:', error);
      setIsUploading(false);
      setIsProcessing(false);
      toast.dismiss('ocr-toast');
      toast.error(`Upload failed: ${error.message}`);
    }
  };

  // Group by category
  const grouped = issues.reduce((acc, issue) => {
    if (!acc[issue.category]) acc[issue.category] = [];
    acc[issue.category].push(issue);
    return acc;
  }, {} as Record<string, InspectionIssue[]>);

  const totalRepairCost = issues.reduce((s, i) => s + i.estimatedRepairCost, 0);
  const unresolvedCount = issues.filter(i => !i.resolved).length;
  const criticalCount = issues.filter(i => i.severity === 'Critical' && !i.resolved).length;

  return (
    <div className="bg-bg-surface rounded-xl shadow-sm border border-border-accent overflow-hidden">
      <div className="p-6 border-b border-border-accent">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <HardHat className="w-5 h-5 text-text-primary" />
            <h3 className="text-lg font-medium tracking-tight text-text-primary">Inspection Report</h3>
          </div>
          {criticalCount > 0 && (
            <span className="flex items-center gap-1 bg-red-50 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full border border-red-200">
              <AlertTriangle className="w-3 h-3" /> {criticalCount} CRITICAL
            </span>
          )}
        </div>

        {/* Upload Zone */}
        <div className="mb-6">
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className="relative rounded-xl p-8 text-center cursor-pointer transition-all bg-surface-container/30 backdrop-blur-xl border-t border-l border-white/10 shadow-lg min-h-[180px] flex flex-col items-center justify-center overflow-hidden group"
            onClick={() => {
              if (isUploading || isProcessing) return;
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.pdf,.jpg,.jpeg,.png';
              input.onchange = e => {
                const f = (e.target as HTMLInputElement).files?.[0];
                if (f) handleFileSelect(f);
              };
              input.click();
            }}
          >
            {/* Inner Dashed Border Indicator */}
            <div className={`absolute inset-3 border-2 border-dashed rounded-lg transition-all duration-300 pointer-events-none ${
              dragOver 
                ? 'border-primary bg-primary/10' 
                : 'border-outline-variant/40 group-hover:border-primary/40 group-hover:bg-primary/5'
            }`} />

            {uploadFile ? (
              <div className="relative z-10 flex flex-col items-center gap-2">
                <div className="w-14 h-14 mb-1 rounded-full bg-surface-container-highest flex items-center justify-center text-pw-success shadow-lg shadow-pw-success/10">
                  <FileCheck2 className="w-6 h-6" />
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm font-medium text-text-primary">{uploadFile.name}</span>
                  <span className="text-xs text-text-secondary">({(uploadFile.size / 1024).toFixed(0)} KB)</span>
                  {!isUploading && !isProcessing && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}
                      className="ml-2 text-text-secondary hover:text-red-500 transition cursor-pointer active:scale-95 p-1 rounded-full hover:bg-white/10"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative z-10 flex flex-col items-center gap-2">
                <div className="w-14 h-14 mb-1 rounded-full bg-surface-container-highest flex items-center justify-center text-primary shadow-lg shadow-primary/10 group-hover:scale-110 transition-transform duration-300">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-text-primary">Drop inspection report here or click to browse</p>
                <p className="text-xs text-text-secondary">PDF, JPEG, PNG — Auto-extracts issues</p>
              </div>
            )}
          </div>
          
          {uploadFile && (
            <button
              onClick={handleUpload}
              disabled={isUploading || isProcessing}
              className="mt-3 w-full luminous-button py-3 rounded-lg text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading ({uploadProgress.toFixed(0)}%)
                </>
              ) : isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  AI Extracting Data...
                </>
              ) : (
                <>Upload & Scan Report</>
              )}
            </button>
          )}
        </div>

        {/* Summary Bar */}
        {issues.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="p-3 bg-bg-primary rounded-lg text-center">
              <p className="text-xs uppercase tracking-widest text-text-secondary">Open Issues</p>
              <p className="text-xl font-normal text-text-primary">{unresolvedCount}</p>
            </div>
            <div className="p-3 bg-bg-primary rounded-lg text-center">
              <p className="text-xs uppercase tracking-widest text-text-secondary">Est. Repair</p>
              <p className="text-xl font-normal text-text-primary">${totalRepairCost.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-bg-primary rounded-lg text-center">
              <p className="text-xs uppercase tracking-widest text-text-secondary">Categories</p>
              <p className="text-xl font-normal text-text-primary">{Object.keys(grouped).length}</p>
            </div>
          </div>
        )}
      </div>

      {/* Categorized Issue List */}
      {issues.length > 0 && (
        <div className="divide-y divide-gray-100">
          {Object.entries(grouped).map(([category, categoryIssues]) => {
            const catUnresolved = categoryIssues.filter(i => !i.resolved).length;
            const isExpanded = expandedCategories[category] !== false; // default expanded
            return (
              <div key={category}>
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between px-6 py-3 hover:bg-bg-primary transition"
                >
                  <div className="flex items-center space-x-2">
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-text-secondary" /> : <ChevronRight className="w-3.5 h-3.5 text-text-secondary" />}
                    <span className="text-text-secondary flex-shrink-0">{CATEGORY_ICONS[category as InspectionCategory] || <HardHat className="w-4 h-4" />}</span>
                    <span className="text-sm font-medium text-text-primary">{category}</span>
                  </div>
                  <span className="text-xs text-text-secondary">
                    {catUnresolved}/{categoryIssues.length} open
                  </span>
                </button>

                {isExpanded && (
                  <div className="px-6 pb-3 space-y-2">
                    {categoryIssues.map(issue => (
                      <div
                        key={issue.id}
                        className={`flex items-start justify-between p-3 rounded-lg border transition ${
                          issue.resolved ? 'bg-bg-primary border-border-accent opacity-60' : 'border-border-accent'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <button
                            onClick={() => toggleResolved(issue.id)}
                            className={`mt-0.5 flex-shrink-0 ${issue.resolved ? 'text-pw-success' : 'text-gray-300 hover:text-text-secondary'}`}
                          >
                            <CheckCircle className="w-4.5 h-4.5" />
                          </button>
                          <div>
                            <p className={`text-sm ${issue.resolved ? 'line-through text-text-secondary' : 'text-text-primary'}`}>{issue.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded border ${SEVERITY_STYLES[issue.severity] || SEVERITY_STYLES['Minor']}`}>
                                {issue.severity}
                              </span>
                            </div>
                          </div>
                        </div>
                        <span className="text-sm font-mono text-text-secondary flex-shrink-0 ml-3">
                          ${issue.estimatedRepairCost.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
