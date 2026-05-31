import React, { useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, File as FileIcon, Trash2, Loader2, Download, Folder, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { RoleLinkedDocument, DocumentCategory } from '@/types/schema';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, auth as firebaseAuth } from '@/lib/firebase/config';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { OCRReviewPanel } from '@/components/documents/OCRReviewPanel';
import type { ExtractedFields } from '@/lib/ocr/types';

interface DocumentVaultProps {
  projectId: string;
  documents?: RoleLinkedDocument[];
  onChange?: (documents: RoleLinkedDocument[]) => void;
  categories?: DocumentCategory[];
  title?: string;
  description?: string;
}

/** OCR status for a specific document */
interface DocOcrState {
  status: 'pending' | 'processing' | 'complete' | 'failed';
  extractedFields: ExtractedFields;
  overallConfidence: number;
}

interface UploadProgress {
  id: string;
  fileName: string;
  progress: number;
  category: DocumentCategory;
}

const VAULT_CATEGORIES: DocumentCategory[] = [
  'Loan Processing Documents',
  'Real Estate Attorney Documents',
  'General Sale Disclosures'
];

export function DocumentVault({ 
  projectId, 
  documents = [], 
  onChange,
  categories = VAULT_CATEGORIES,
  title = "Phase 2 Vault",
  description = "Organize and upload documentation directly into strict categories."
}: DocumentVaultProps) {
  const [dragActiveCategory, setDragActiveCategory] = useState<DocumentCategory | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<UploadProgress[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | null>(null);
  const { user } = useAuth();
  const [ocrStates, setOcrStates] = useState<Record<string, DocOcrState>>({});
  const [expandedOcr, setExpandedOcr] = useState<string | null>(null);

  // ── OCR trigger after upload ─────────────────────────
  const triggerOcr = useCallback(async (docId: string, projectIdParam: string) => {
    setOcrStates(prev => ({
      ...prev,
      [docId]: { status: 'processing', extractedFields: {}, overallConfidence: 0 },
    }));

    try {
      const token = await firebaseAuth.currentUser?.getIdToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(`/api/projects/${projectIdParam}/documents/${docId}/ocr`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (data.ocrStatus === 'complete') {
        setOcrStates(prev => ({
          ...prev,
          [docId]: {
            status: 'complete',
            extractedFields: data.extractedFields || {},
            overallConfidence: data.overallConfidence || 0,
          },
        }));
        setExpandedOcr(docId);
      } else {
        setOcrStates(prev => ({
          ...prev,
          [docId]: { status: 'failed', extractedFields: {}, overallConfidence: 0 },
        }));
      }
    } catch (err: any) {
      console.error('[DocumentVault] OCR trigger failed:', err?.message);
      setOcrStates(prev => ({
        ...prev,
        [docId]: { status: 'failed', extractedFields: {}, overallConfidence: 0 },
      }));
    }
  }, []);

  const handleOcrFieldConfirm = useCallback(async (docId: string, fieldName: string, value: any) => {
    try {
      const token = await firebaseAuth.currentUser?.getIdToken();
      if (!token) return;

      await fetch(`/api/projects/${projectId}/documents/${docId}/confirm`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirmedFields: { [fieldName]: value },
          targetPath: 'financials',
        }),
      });
    } catch (err: any) {
      toast.error(`Failed to confirm field: ${err.message}`);
    }
  }, [projectId]);

  const handleOcrBulkConfirm = useCallback(async (docId: string, fields: Record<string, any>) => {
    try {
      const token = await firebaseAuth.currentUser?.getIdToken();
      if (!token) return;

      await fetch(`/api/projects/${projectId}/documents/${docId}/confirm`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirmedFields: fields,
          targetPath: 'financials',
        }),
      });
    } catch (err: any) {
      toast.error(`Failed to bulk confirm: ${err.message}`);
    }
  }, [projectId]);

  const handleOcrReprocess = useCallback((docId: string) => {
    // The reprocess call is handled inside OCRReviewPanel.
    // After it completes, we re-trigger OCR to get updated fields.
    triggerOcr(docId, projectId);
  }, [projectId, triggerOcr]);

  const handleDragOver = (e: DragEvent<HTMLDivElement>, category: DocumentCategory) => {
    e.preventDefault();
    setDragActiveCategory(category);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActiveCategory(null);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, category: DocumentCategory) => {
    e.preventDefault();
    setDragActiveCategory(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files), category);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && selectedCategory) {
      handleFiles(Array.from(e.target.files), selectedCategory);
    }
    setSelectedCategory(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openFileDialog = (category: DocumentCategory) => {
    setSelectedCategory(category);
    fileInputRef.current?.click();
  };

  const handleFiles = async (files: File[], category: DocumentCategory) => {
    if (!user) {
      toast.error('You must be logged in to upload documents');
      return;
    }

    const newDocs: RoleLinkedDocument[] = [];
    const newUploads = files.map(f => ({ id: crypto.randomUUID(), fileName: f.name, progress: 0, category }));
    setUploadingFiles(prev => [...prev, ...newUploads]);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const uploadId = newUploads[i].id;
      
      const fileRef = ref(storage, `projects/${projectId}/documents/${uploadId}_${file.name}`);
      const uploadTask = uploadBytesResumable(fileRef, file);

      try {
        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadingFiles(prev => prev.map(u => u.id === uploadId ? { ...u, progress } : u));
            },
            (error) => {
              console.error('Upload failed', error);
              toast.error(`Failed to upload ${file.name}`);
              setUploadingFiles(prev => prev.filter(u => u.id !== uploadId));
              reject(error);
            },
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                const doc: RoleLinkedDocument = {
                  id: uploadId,
                  category,
                  fileName: file.name,
                  fileUrl: downloadURL,
                  linkedRole: 'Loan Officer/Broker', // Defaulting as we don't map specific roles here
                  uploadedByUid: user.uid,
                  uploadedByName: user.displayName || user.email || 'Unknown User',
                  uploadedAt: new Date(),
                  verified: false,
                  notes: ''
                };
                newDocs.push(doc);
                setUploadingFiles(prev => prev.filter(u => u.id !== uploadId));
                resolve();
              } catch (err) {
                reject(err);
              }
            }
          );
        });
      } catch (err) {
        // Error handled in callback
      }
    }

    if (newDocs.length > 0 && onChange) {
      onChange([...documents, ...newDocs]);
      toast.success('Documents uploaded successfully');

      // Auto-trigger OCR for each uploaded document
      for (const doc of newDocs) {
        triggerOcr(doc.id, projectId);
      }

      try {
        import('@/store/uiStore').then(({ useUIStore }) => {
          useUIStore.getState().triggerSuccessfulAction('document_uploaded');
        });
      } catch (err) {
        console.error('Failed to trigger document_uploaded successful action:', err);
      }
    }
  };

  const removeDocument = async (id: string, fileUrl?: string) => {
    if (fileUrl) {
      try {
        const fileRef = ref(storage, fileUrl);
        await deleteObject(fileRef);
      } catch (err) {
        console.error('Failed to delete file from storage:', err);
      }
    }
    if (onChange) {
      onChange(documents.filter(doc => doc.id !== id));
    }
  };

  return (
    <div className="p-6 rounded-lg shadow-sm border bg-bg-surface border-border-ui">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        <p className="text-sm mt-1 text-text-secondary">
          {description}
        </p>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInput}
        className="hidden"
        multiple
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {categories.map((category) => {
          const categoryDocs = documents.filter(doc => doc.category === category);
          const categoryUploads = uploadingFiles.filter(u => u.category === category);
          const isDragging = dragActiveCategory === category;

          return (
            <div key={category} className="flex flex-col h-full">
              {/* Dropzone Card */}
              <div
                className="relative flex flex-col items-center justify-center p-6 rounded-xl transition-all cursor-pointer min-h-[200px] mb-4 bg-surface-container/30 backdrop-blur-xl border-t border-l border-white/10 shadow-lg overflow-hidden group"
                onDragOver={(e) => handleDragOver(e, category)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, category)}
                onClick={() => openFileDialog(category)}
              >
                {/* Inner Dashed Border Indicator */}
                <div className={`absolute inset-3 border-2 border-dashed rounded-lg transition-all duration-300 pointer-events-none ${
                  isDragging 
                    ? 'border-primary bg-primary/10' 
                    : 'border-outline-variant/40 group-hover:border-primary/40 group-hover:bg-primary/5'
                }`} />

                <div className="relative z-10 flex flex-col items-center justify-center">
                  <div className={`w-14 h-14 mb-3 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                    isDragging 
                      ? 'bg-surface-container-highest text-primary shadow-primary/15 scale-110' 
                      : 'bg-surface-container-highest text-text-secondary shadow-black/5 group-hover:scale-110'
                  }`}>
                    {isDragging ? <UploadCloud className="w-6 h-6" /> : <Folder className="w-6 h-6" />}
                  </div>
                  <h3 className="text-sm font-semibold text-center text-text-primary mb-1">
                    {category}
                  </h3>
                  <p className="text-xs text-center text-text-secondary">
                    Drop files here or click to browse
                  </p>
                </div>
              </div>

              {/* Uploads and Files List */}
              <div className="space-y-2">
                {categoryUploads.map((upload) => (
                  <div 
                    key={upload.id}
                    className="flex flex-col p-3 rounded-lg border-t border-l border-white/10 bg-surface-container/20 backdrop-blur-md shadow-sm"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-1.5 rounded-md bg-surface-container/40 border border-white/5">
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-text-primary truncate">
                          {upload.fileName}
                        </p>
                        <p className="text-[10px] text-text-secondary">
                          {Math.round(upload.progress)}%
                        </p>
                      </div>
                    </div>
                    <div className="w-full bg-surface-container-highest rounded-full h-1 overflow-hidden">
                      <div 
                        className="bg-primary h-1 rounded-full transition-all duration-300" 
                        style={{ width: `${upload.progress}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
                
                {categoryDocs.map((doc) => {
                  const ocrState = ocrStates[doc.id];
                  return (
                    <div key={doc.id}>
                      <div 
                        className="flex items-center justify-between p-3 rounded-md border bg-bg-default border-border-ui shadow-sm group cursor-pointer"
                        onClick={() => ocrState?.status === 'complete' && setExpandedOcr(expandedOcr === doc.id ? null : doc.id)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-1.5 rounded-md bg-white border border-border-ui flex-shrink-0">
                            <FileIcon className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-text-primary truncate" title={doc.fileName}>
                              {doc.fileName}
                            </p>
                            <p className="text-[10px] text-text-secondary">
                              {doc.uploadedAt ? (doc.uploadedAt instanceof Date ? doc.uploadedAt : (doc.uploadedAt as any).toDate()).toLocaleDateString() : 'Unknown date'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* OCR Status Badge */}
                          {ocrState?.status === 'processing' && (
                            <span className="p-1 rounded-full" title="OCR processing">
                              <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                            </span>
                          )}
                          {ocrState?.status === 'complete' && (
                            <span className="p-1 rounded-full" title="OCR complete — click to review">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                            </span>
                          )}
                          {ocrState?.status === 'failed' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); triggerOcr(doc.id, projectId); }}
                              className="p-1 rounded-full hover:bg-red-50 transition" 
                              title="OCR failed — click to retry"
                            >
                              <XCircle className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          )}
                          {!ocrState && (
                            <button
                              onClick={(e) => { e.stopPropagation(); triggerOcr(doc.id, projectId); }}
                              className="p-1 rounded-full hover:bg-blue-50 transition opacity-0 group-hover:opacity-100"
                              title="Run OCR"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-text-secondary" />
                            </button>
                          )}
                          
                          {/* File actions */}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {doc.fileUrl && (
                              <a
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors"
                                aria-label="Download"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); removeDocument(doc.id, doc.fileUrl); }}
                              className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                              aria-label="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* OCR Review Panel (expandable) */}
                      {ocrState?.status === 'complete' && expandedOcr === doc.id && (
                        <OCRReviewPanel
                          docId={doc.id}
                          projectId={projectId}
                          documentName={doc.fileName}
                          extractedFields={ocrState.extractedFields}
                          overallConfidence={ocrState.overallConfidence}
                          ocrStatus={ocrState.status}
                          onFieldConfirm={handleOcrFieldConfirm}
                          onReprocess={handleOcrReprocess}
                          onBulkConfirm={handleOcrBulkConfirm}
                        />
                      )}
                    </div>
                  );
                })}
                {categoryDocs.length === 0 && categoryUploads.length === 0 && (
                  <div className="p-4 border border-dashed border-border-accent rounded-md flex justify-center items-center h-full">
                    <p className="text-xs text-text-secondary italic">No documents uploaded.</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
