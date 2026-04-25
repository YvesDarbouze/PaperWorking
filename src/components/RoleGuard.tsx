import React from 'react';
import { Role } from '@/types/schema';
import { ShieldAlert } from 'lucide-react';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: Role[];
  // If not provided, we fall back to a mock for UI development
  currentRole?: Role; 
  fallback?: React.ReactNode;
}

/**
 * RoleGuard securely isolates components and UI segments based on the current user's role.
 * In a real-world scenario, the `currentRole` should be derived from an Auth/Session Context.
 */
export function RoleGuard({ 
  children, 
  allowedRoles, 
  currentRole = 'Lead Investor', // Default mock role for now
  fallback 
}: RoleGuardProps) {

  const isAuthorized = allowedRoles.includes(currentRole);

  if (isAuthorized) {
    return <>{children}</>;
  }

  // If a custom fallback is provided, use that
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default unauthorized block
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-bg-primary rounded-lg border border-border-accent">
      <ShieldAlert className="w-12 h-12 text-red-500 mb-4" />
      <h3 className="text-xl font-bold text-text-primary">Access Restricted</h3>
      <p className="text-text-secondary mt-2 max-w-sm">
        Your current role ({currentRole}) does not have permission to view or interact with this component.
      </p>
    </div>
  );
}
