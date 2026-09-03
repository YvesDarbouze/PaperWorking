'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getProjectDocumentAccessFromBff,
  listProjectDocumentsFromBff,
  uploadProjectDocumentFromBff,
  type ProjectDocumentRecord,
} from '@/lib/projects/project-documents-api';

export default function ProjectDocumentsPanel({ projectId }: { projectId: string }) {
  const [documents, setDocuments] = useState<ProjectDocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listProjectDocumentsFromBff(projectId);
      setDocuments(result.documents);
    } catch (err) {
      setDocuments([]);
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      await uploadProjectDocumentFromBff(projectId, file);
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDownload(documentId: string) {
    setAccessError(null);
    try {
      const access = await getProjectDocumentAccessFromBff(projectId, documentId);
      window.open(access.downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setAccessError(err instanceof Error ? err.message : 'Failed to open document');
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/25 p-8 text-sm text-white/65">
        Loading documents…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
            Project {projectId}
          </p>
          <h2 className="text-2xl font-semibold tracking-[-0.02em]">Document vault</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/65">
            Project documents are stored securely. Upload PDF or image files; downloads use
            short-lived signed links.
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleUpload(file);
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#00DD94] px-4 py-2 text-xs font-semibold text-[#0a0a0f] hover:brightness-110 disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : 'Upload document'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}
      {accessError ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          {accessError}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.04] text-white/45">
            <tr>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">Size</th>
              <th className="px-5 py-3 font-medium">Added</th>
              <th className="px-5 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-white/45">
                  No documents yet.
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id} className="border-t border-white/8">
                  <td className="px-5 py-4 font-medium">{doc.name}</td>
                  <td className="px-5 py-4 text-white/65">{doc.mimeType || '—'}</td>
                  <td className="px-5 py-4 text-white/65">
                    {doc.sizeBytes ? `${Math.round(doc.sizeBytes / 1024)} KB` : '—'}
                  </td>
                  <td className="px-5 py-4 text-white/65">
                    {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => void handleDownload(doc.id)}
                      className="text-xs font-medium text-[#00DD94] hover:underline"
                    >
                      Download
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Link href={`/project/${projectId}`} className="text-sm text-white/60 underline-offset-4 hover:underline">
        ← Project overview
      </Link>
    </div>
  );
}
