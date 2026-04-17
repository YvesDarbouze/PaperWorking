'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Deep-link redirect: /dashboard/engine-room → /dashboard?lane=engine
 * Preserves bookmarks and external links to the old route.
 */
export default function EngineRoomRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard?lane=engine'); }, [router]);
  return null;
}
