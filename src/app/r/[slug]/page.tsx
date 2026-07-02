'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function ReferralRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;

  useEffect(() => {
    if (slug) {
      // Store referral code in localStorage
      localStorage.setItem('pw_referral_code', slug);
      console.log('Referral code saved:', slug);
    }
    // Redirect to registration page
    router.replace('/register');
  }, [slug, router]);

  return (
    <div 
      className="flex flex-col items-center justify-center min-h-screen text-on-surface"
      style={{
        background: 'linear-gradient(135deg, #0d0a0b 0%, #0f1922 40%, #0d0a0b 100%)',
      }}
    >
      <Loader2 className="w-8 h-8 animate-spin text-pw-primary mb-4" />
      <p className="text-xs text-pw-muted uppercase tracking-widest font-semibold">Applying Referral Code...</p>
    </div>
  );
}
