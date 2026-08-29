'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { loadProjectById } from '@/lib/data';
import type { ProjectDocument, ProjectWorkspace } from '@/lib/projects/types';

export default function ProjectDocumentsPanel({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<ProjectWorkspace | null>(null);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setNotFound(false);
      try {
        const data = await loadProjectById(projectId);
        if (cancelled) return;
        if (!data) {
          setNotFound(true);
          setProject(null);
          setDocuments([]);
          return;
        }
        const workspace = data as ProjectWorkspace;
        setProject(workspace);
        setDocuments(Array.isArray(workspace.documents) ? workspace.documents : []);
      } catch (err) {
        if (!cancelled) {
          setProject(null);
          setDocuments([]);
          setError(err instanceof Error ? err.message : 'Failed to load project');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/25 p-8 text-sm text-white/65">
        Loading documents…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-sm text-rose-200">
        Unable to load documents: {error}
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/25 p-8 text-sm text-white/65">
        Project not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
          {project.propertyName || project.address || projectId}
        </p>
        <h2 className="text-2xl font-semibold tracking-[-0.02em]">Document vault</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/65">
          Project workspace documents. Upload pipeline connects via the projects documents API.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.04] text-white/45">
            <tr>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">Added</th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-5 py-8 text-white/45">
                  No documents yet.
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.doc_id} className="border-t border-white/8">
                  <td className="px-5 py-4 font-medium">{doc.name}</td>
                  <td className="px-5 py-4 text-white/65">{doc.type}</td>
                  <td className="px-5 py-4 text-white/65">
                    {doc.generated_at ? new Date(doc.generated_at).toLocaleDateString() : '—'}
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
