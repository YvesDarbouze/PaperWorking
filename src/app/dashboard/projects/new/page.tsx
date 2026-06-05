"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AcquisitionWizard } from "@/components/acquisition/AcquisitionWizard";

function WizardLoader() {
  const searchParams = useSearchParams();
  const resumeId     = searchParams.get("resume") ?? undefined;
  return <AcquisitionWizard initialProjectId={resumeId} />;
}

/* ═══════════════════════════════════════════════════════════════
   /dashboard/projects/new — Prisma-backed REIL acquisition wizard.
   Pass ?resume=<projectId> to rehydrate an in-progress draft.
   ═══════════════════════════════════════════════════════════════ */
export default function NewProjectPage() {
  return (
    <Suspense fallback={null}>
      <WizardLoader />
    </Suspense>
  );
}
