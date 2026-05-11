'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * /dashboard/profile → /dashboard/settings/profile
 * 
 * Redirect to the canonical profile settings page.
 * Preserves bookmarks and external links to the legacy route.
 */
export default function ProfileRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/settings/profile'); }, [router]);
  return null;
}
