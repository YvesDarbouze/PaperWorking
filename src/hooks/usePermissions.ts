import { useAuth } from '@/context/AuthContext';
import { Role } from '@/types/schema';

/* ═══════════════════════════════════════════════════════
   usePermissions Hook — SSA-Grade Access Control
   
   Centralized logic for gating dashboard actions.
   Usage:
   const { can, role } = usePermissions();
   if (can('EDIT_FINANCIALS')) { ... }
   ═══════════════════════════════════════════════════════ */

export type Permission = 
  | 'ADD_DEAL'
  | 'EDIT_FINANCIALS'
  | 'APPROVE_COSTS'
  | 'SUBMIT_RECEIPTS'
  | 'VERIFY_DOCUMENTS'
  | 'EXECUTE_SALE'
  | 'VIEW_PRIVATE_ROI'
  | 'VIEW_FOLDER';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  'Lead Investor': [
    'ADD_DEAL', 'EDIT_FINANCIALS', 'APPROVE_COSTS', 'SUBMIT_RECEIPTS',
    'VERIFY_DOCUMENTS', 'EXECUTE_SALE', 'VIEW_PRIVATE_ROI', 'VIEW_FOLDER'
  ],
  'Platform Admin': [
    'ADD_DEAL', 'EDIT_FINANCIALS', 'APPROVE_COSTS', 'SUBMIT_RECEIPTS',
    'VERIFY_DOCUMENTS', 'EXECUTE_SALE', 'VIEW_PRIVATE_ROI', 'VIEW_FOLDER'
  ],
  'Admin': [
    'ADD_DEAL', 'EDIT_FINANCIALS', 'APPROVE_COSTS', 'SUBMIT_RECEIPTS',
    'VERIFY_DOCUMENTS', 'EXECUTE_SALE', 'VIEW_PRIVATE_ROI', 'VIEW_FOLDER'
  ],
  'General Contractor': [
    'SUBMIT_RECEIPTS', 'VIEW_FOLDER'
  ],
  'Real Estate Agent': [
    'SUBMIT_RECEIPTS', 'VERIFY_DOCUMENTS', 'VIEW_FOLDER'
  ],
  'Accountant': [
    'VIEW_PRIVATE_ROI', 'VIEW_FOLDER'
  ],
  'Lender': [
    'VIEW_PRIVATE_ROI', 'VIEW_FOLDER'
  ],
  'Vendor': [],
  'Guest': [],
  'Standard': ['VIEW_FOLDER'],
  'Analyst': ['VIEW_FOLDER'],
  'Observer': ['VIEW_FOLDER'],
};

export function usePermissions() {
  const { profile } = useAuth();
  
  // Default to a safe fallback role if user profile is missing role
  // In production, this should come from user documentation in Firestore.
  const role: Role = profile?.role || 'Guest';

  const can = (permission: Permission) => {
    return ROLE_PERMISSIONS[role]?.includes(permission) || false;
  };

  const isLead = role === 'Lead Investor' || role === 'Admin';
  const isAdmin = role === 'Admin' || role === 'Platform Admin';
  const isContractor = role === 'General Contractor';
  const isFinanceTeam = isLead || role === 'Accountant';
  const isLender = role === 'Lender';
  // Convenience: can the current user edit project content (todos, financials)?
  const canEdit = can('EDIT_FINANCIALS') || can('SUBMIT_RECEIPTS');

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
