import { useAuth } from '@/context/AuthContext';
import { Role, Permission, ProjectMember } from '@/types/schema';
import { AuthorizationService } from '@/lib/auth/AuthorizationService';

/* ═══════════════════════════════════════════════════════
   usePermissions Hook — SSA-Grade Access Control
   
   Centralized logic for gating dashboard actions.
   Usage:
   const { can, role } = usePermissions();
   if (can('projects.edit')) { ... }
   ═══════════════════════════════════════════════════════ */

export function usePermissions(projectMember?: ProjectMember) {
  const { profile } = useAuth();
  
  // Default to a safe fallback role if user profile is missing role
  const role: Role = profile?.role || profile?.orgRole || 'Guest';

  const can = (permission: Permission) => {
    return AuthorizationService.can({ user: profile as any, projectMember }, permission);
  };

  const isLead = role === 'Lead Investor' || role === 'Admin' || role === 'Platform Admin';
  const isAdmin = role === 'Admin' || role === 'Platform Admin';
  const isContractor = role === 'General Contractor';
  const isFinanceTeam = isLead || role === 'Accountant';
  const isLender = role === 'Lender';
  
  // Convenience: can the current user edit project content (todos, financials)?
  const canEdit = can('financials.edit') || can('receipts.submit') || can('projects.edit');

  return { 
    can, 
    role, 
    isLead,
    isAdmin,
    isContractor,
    isFinanceTeam,
    isLender,
    canEdit,
  };
}
