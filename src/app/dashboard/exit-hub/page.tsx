'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Deep-link redirect: /dashboard/exit-hub → /dashboard?lane=exit
 * Preserves bookmarks and external links to the old route.
 */
export default function ExitHubRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard?lane=exit'); }, [router]);
  return null;
}
