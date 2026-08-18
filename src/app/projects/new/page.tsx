'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProjectWizardModal from '@/components/project-wizard/ProjectWizardModal';

export default function NewProjectWizardPage() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <ProjectWizardModal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          router.push('/dashboard/command-center');
        }}
        onSuccess={(projectId) => {
          router.push(`/project/${projectId}`);
        }}
      />
    </div>
  );
}
