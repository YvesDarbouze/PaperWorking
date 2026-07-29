"use client";

/* ═══════════════════════════════════════════════════════════════
   /dashboard/projects/new — Prisma-backed REIL acquisition wizard.
   Pass ?resume=<projectId> to rehydrate an in-progress draft.
   DM-9: If a pre-resolved address is present in query parameters
   or sessionStorage, pre-populates the wizard store and cleans URL.
   ═══════════════════════════════════════════════════════════════ */

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AcquisitionWizard } from "@/components/acquisition/AcquisitionWizard";
import { useAcquisitionWizard } from "@/store/acquisitionWizardStore";

function WizardLoader() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const resumeId = searchParams.get("resume") ?? undefined;
  
  const store = useAcquisitionWizard();

  useEffect(() => {
    // If resuming an existing project draft, do not reset/overwrite
    if (resumeId) return;

    // Check query params first, then fallback to sessionStorage (saved by ColdStartSurface)
    const addressParam = searchParams.get("address");
    const placeIdParam = searchParams.get("placeId");
    
    let resolvedAddr: any = null;

    if (addressParam && placeIdParam) {
      resolvedAddr = {
        placeId: placeIdParam,
        formattedAddress: addressParam,
        displayName: searchParams.get("displayName") || addressParam.split(',')[0],
        addressLine: searchParams.get("addressLine") || addressParam.split(',')[0],
        city: searchParams.get("city") || "",
        state: searchParams.get("state") || "",
        zip: searchParams.get("zip") || "",
        lat: parseFloat(searchParams.get("lat") || "0"),
        lng: parseFloat(searchParams.get("lng") || "0"),
      };
      // Clean query parameters from URL to avoid re-consumption on refresh
      router.replace('/dashboard/projects/new');
    } else if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('pw_pending_project_address');
      if (stored) {
        try {
          resolvedAddr = JSON.parse(stored);
          sessionStorage.removeItem('pw_pending_project_address');
        } catch { /* ignore */ }
      }
    }

    if (resolvedAddr) {
      // Initialize fresh store state
      store.reset();
      // Set resolved address directly in store to bypass address input + Place Details API lookup
      store.setAddress(resolvedAddr);
    }
  }, [resumeId, searchParams, store, router]);

  return <AcquisitionWizard initialProjectId={resumeId} />;
}

export default function NewProjectPage() {
  return (
    <Suspense fallback={null}>
      <WizardLoader />
    </Suspense>
  );
}
