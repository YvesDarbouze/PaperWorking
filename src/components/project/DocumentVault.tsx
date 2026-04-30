import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, File as FileIcon, Trash2, Loader2, Download, Folder } from 'lucide-react';
import { RoleLinkedDocument, DocumentCategory } from '@/types/schema';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

interface DocumentVaultProps {
  projectId: string;
  documents?: RoleLinkedDocument[];
  onChange?: (documents: RoleLinkedDocument[]) => void;
  categories?: DocumentCategory[];
  title?: string;
  description?: string;
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
                className={`flex-1 relative flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed transition-all cursor-pointer min-h-[200px] mb-4 ${
                  isDragging ? 'bg-blue-50/50 border-blue-500' : 'bg-bg-default border-border-accent hover:border-gray-400'
                }`}
                onDragOver={(e) => handleDragOver(e, category)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, category)}
                onClick={() => openFileDialog(category)}
              >
                <div className={`p-4 rounded-full mb-4 transition-colors ${isDragging ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-text-secondary'}`}>
                  {isDragging ? <UploadCloud className="w-8 h-8" /> : <Folder className="w-8 h-8" />}
                </div>
                <h3 className="text-sm font-semibold text-center text-text-primary mb-1">
                  {category}
                </h3>
                <p className="text-xs text-center text-text-secondary">
                  Drop files here or click to browse
                </p>
              </div>

              {/* Uploads and Files List */}
              <div className="space-y-2">
                {categoryUploads.map((upload) => (
                  <div 
                    key={upload.id}
                    className="flex flex-col p-3 rounded-md border bg-bg-default border-border-ui shadow-sm"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-1.5 rounded-md bg-white border border-border-ui">
                        <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
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
                    <div className="w-full bg-gray-200 rounded-full h-1 overflow-hidden">
                      <div 
                        className="bg-blue-600 h-1 rounded-full transition-all duration-300" 
                        style={{ width: `${upload.progress}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
                
                {categoryDocs.map((doc) => (
                  <div 
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-md border bg-bg-default border-border-ui shadow-sm group"
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
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
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
                ))}
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
