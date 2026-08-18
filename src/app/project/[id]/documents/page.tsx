'use client';

import React, { use } from 'react';
import DocumentVault from '@/components/storage/DocumentVault';

export default function ProjectDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  return (
    <div data-testid="project-documents-page" className="min-h-screen bg-slate-950 text-white p-6 md:p-10 max-w-7xl mx-auto">
      <DocumentVault projectId={projectId} propertyName="742 Evergreen Terrace" />
    </div>
  );
}
