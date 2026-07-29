'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AccountSettingsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/settings/profile');
  }, [router]);

  return null;
}
