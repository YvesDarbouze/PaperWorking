'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

/* ═══════════════════════════════════════════════════════
   CheckoutSuccessHandler — Legacy Redirect

   Previously this component handled inline checkout
   confirmation inside the dashboard layout. The checkout
   success flow now lives at /checkout/success (a standalone
   page that works for both guests and authenticated users).

   This component remains mounted in the dashboard layout
   purely to handle legacy URLs:
     /dashboard?checkout=success&session_id=cs_xxx

   It redirects to:
     /checkout/success?session_id=cs_xxx
   ═══════════════════════════════════════════════════════ */

export default function CheckoutSuccessHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const hasRedirected = useRef(false);

  const checkoutStatus = searchParams.get('checkout');
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (checkoutStatus !== 'success' || !sessionId || hasRedirected.current) return;
    hasRedirected.current = true;
    router.replace(`/checkout/success?session_id=${sessionId}`);
  }, [checkoutStatus, sessionId, router]);

  // This component renders nothing — it's purely a redirect hook.
  return null;
}
