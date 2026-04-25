'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LogOut, Loader2 } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   LogoutButton — Directive 42

   Reusable logout component for Dashboard header/sidebar.
   Calls signOut(auth) → destroys HttpOnly cookie → redirects to /login.
   ═══════════════════════════════════════════════════════ */

interface LogoutButtonProps {
  /** Render as icon-only (for compact sidebars) */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export default function LogoutButton({ compact = false, className = '' }: LogoutButtonProps) {
  const router = useRouter();
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Step 1: Firebase signOut (clears client-side auth state)
      await logout();

      // Step 2: Destroy HttpOnly session cookie on the server
      await fetch('/api/auth/session', { method: 'DELETE' });

      // Step 3: Redirect to login
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
      setIsLoggingOut(false);
    }
  };

  if (compact) {
    return (
      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className={`flex items-center justify-center rounded-lg p-2 text-text-secondary transition-colors hover:bg-bg-primary hover:text-text-primary disabled:opacity-50 ${className}`}
        aria-label="Sign out"
        title="Sign out"
      >
        {isLoggingOut ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LogOut className="h-4 w-4" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-primary hover:text-text-primary disabled:opacity-50 ${className}`}
      aria-label="Sign out"
    >
      {isLoggingOut ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Signing out…
        </>
      ) : (
        <>
          <LogOut className="h-4 w-4" />
          Sign out
        </>
      )}
    </button>
  );
}
