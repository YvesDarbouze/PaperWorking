import { useAuth } from '@/context/AuthContext';
import { getUserRoleTier, UserRoleTier } from '@/lib/auth/roleTiers';

export type SettingsSection = 
  | 'profile'
  | 'notifications'
  | 'security'
  | 'integrations'
  | 'team'
  | 'workspace'
  | 'billing'
  | 'data-privacy';

export function useSettingsAccess() {
  const { profile } = useAuth();
  const userRole = getUserRoleTier(profile?.role);

  const canAccessSection = (section: string): boolean => {
    const s = section.toLowerCase();
    
    // Viewer access
    if (userRole === 'viewer') {
      return s === 'profile' || s === 'notifications' || s === 'security';
    }
    
    // Editor access
    if (userRole === 'editor') {
      return s === 'profile' || s === 'notifications' || s === 'security' || s === 'integrations';
    }
    
    // Admin access
    if (userRole === 'admin') {
      return true;
    }
    
    return false;
  };

  return {
    canAccessSection,
    userRole,
  };
}
