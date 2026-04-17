'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Deep-link redirect: /dashboard/closing-room → /dashboard?lane=closing
 * Preserves bookmarks and external links to the old route.
 */
export default function ClosingRoomRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard?lane=closing'); }, [router]);
  return null;
}
