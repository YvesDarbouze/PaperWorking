'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, Loader2, FileCheck2, AlertTriangle, FileText } from 'lucide-react';
import { uploadFile, UploadFileResult } from '@/lib/storage/uploadService';

interface FileDropzoneProps {
  projectId: string;
  path: string; // Storage subdirectory (e.g., 'closing_docs', 'photography')
  accept?: string[]; // Allowed mime types
  maxSize?: number; // Maximum file size in bytes
  label?: string; // Prompt label
  onUploadComplete: (result: UploadFileResult) => void;
  onUploadStart?: () => void;
  onUploadError?: (errorMsg: string) => void;
}

export default function FileDropzone({
  projectId,
  path,
  accept = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
  maxSize = 25 * 1024 * 1024, // Default 25 MB
  label = 'Drag file here or click to browse',
  onUploadComplete,
  onUploadStart,
  onUploadError,
}: FileDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndUpload = useCallback(async (selectedFile: File) => {
    setErrorMsg(null);

    // 1. Validate MIME type
    if (accept.length > 0 && !accept.includes(selectedFile.type)) {
      const formattedAccept = accept.map(t => t.split('/')[1] || t).join(', ').toUpperCase();
      const err = `Invalid file type. Allowed formats: ${formattedAccept}`;
      setErrorMsg(err);
      onUploadError?.(err);
      return;
    }

    // 2. Validate File Size
    if (selectedFile.size > maxSize) {
      const formattedSize = (maxSize / (1024 * 1024)).toFixed(0);
      const err = `File too large. Maximum size is ${formattedSize}MB.`;
      setErrorMsg(err);
      onUploadError?.(err);
      return;
    }

    setFile(selectedFile);
    setIsUploading(true);
    setProgress(0);
    onUploadStart?.();

    try {
      const result = await uploadFile({
        file: selectedFile,
        path,
        projectId,
        onProgress: (p) => setProgress(p),
      });

      setIsUploading(false);
      setFile(null);
      setProgress(0);
      onUploadComplete(result);
    } catch (err: any) {
      console.error('[FileDropzone] Upload error:', err);
      const msg = err.message || 'Upload failed. Please try again.';
      setErrorMsg(msg);
      setIsUploading(false);
      onUploadError?.(msg);
    }
  }, [projectId, path, accept, maxSize, onUploadComplete, onUploadStart, onUploadError]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!isUploading) {
      setDragOver(true);
    }
  }, [isUploading]);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (isUploading) return;

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndUpload(droppedFile);
    }
  }, [isUploading, validateAndUpload]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndUpload(selectedFile);
    }
    e.target.value = '';
  }, [validateAndUpload]);

  const triggerBrowse = useCallback(() => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  }, [isUploading]);

  const cancelUpload = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    setErrorMsg(null);
  }, []);

  return (
    <div className="w-full space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerBrowse}
        className={`relative rounded-xl p-6 text-center cursor-pointer transition-all duration-200 bg-surface-container/30 backdrop-blur-xl border-t border-l border-white/10 shadow-lg min-h-[140px] flex flex-col items-center justify-center overflow-hidden group ${
          dragOver ? 'border-primary' : 'border-border-accent'
        }`}
      >
        {/* Inner Dashed Border Indicator */}
        <div
          className={`absolute inset-2.5 border-2 border-dashed rounded-lg transition-all duration-300 pointer-events-none ${
            dragOver
              ? 'border-primary bg-primary/10'
              : 'border-outline-variant/40 group-hover:border-primary/40 group-hover:bg-primary/5'
          }`}
        />

        {isUploading && file ? (
          <div className="relative z-10 flex flex-col items-center gap-2 w-full max-w-[280px]">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-xs font-semibold text-text-primary truncate max-w-full">
              Uploading {file.name}
            </p>
            <div className="w-full bg-bg-primary h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-primary transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[10px] font-mono text-text-secondary">{progress.toFixed(0)}% complete</p>
          </div>
        ) : (
          <div className="relative z-10 flex flex-col items-center gap-1.5 p-2">
            <Upload className="w-5 h-5 text-text-secondary group-hover:text-text-primary transition-colors duration-200" />
            <p className="text-xs font-semibold text-text-primary">{label}</p>
            <p className="text-[10px] text-text-secondary">
              Max size: {(maxSize / (1024 * 1024)).toFixed(0)}MB
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={accept.join(',')}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-red-500 text-xs animate-in fade-in duration-200">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Upload Failed</p>
            <p className="opacity-90">{errorMsg}</p>
          </div>
          <button
            onClick={cancelUpload}
            className="text-red-500 hover:text-red-400 p-0.5 rounded-full hover:bg-red-500/10 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
