'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Deep-link redirect: /dashboard/evaluation → /dashboard?lane=evaluation
 * Preserves bookmarks and external links to the old route.
 */
export default function EvaluationRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard?lane=evaluation'); }, [router]);
  return null;
}
