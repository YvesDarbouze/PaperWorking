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
  | 'VIEW_PRIVATE_ROI';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  'Lead Investor': [
    'ADD_DEAL', 'EDIT_FINANCIALS', 'APPROVE_COSTS', 'SUBMIT_RECEIPTS',
    'VERIFY_DOCUMENTS', 'EXECUTE_SALE', 'VIEW_PRIVATE_ROI'
  ],
  'Platform Admin': [
    'ADD_DEAL', 'EDIT_FINANCIALS', 'APPROVE_COSTS', 'SUBMIT_RECEIPTS',
    'VERIFY_DOCUMENTS', 'EXECUTE_SALE', 'VIEW_PRIVATE_ROI'
  ],
  'Admin': [
    'ADD_DEAL', 'EDIT_FINANCIALS', 'APPROVE_COSTS', 'SUBMIT_RECEIPTS',
    'VERIFY_DOCUMENTS', 'EXECUTE_SALE', 'VIEW_PRIVATE_ROI'
  ],
  'General Contractor': [
    'SUBMIT_RECEIPTS'
  ],
  'Real Estate Agent': [
    'SUBMIT_RECEIPTS', 'VERIFY_DOCUMENTS'
  ],
  'Accountant': [
    'VIEW_PRIVATE_ROI'
  ],
  'Lender': [
    'VIEW_PRIVATE_ROI'
  ],
  'Vendor': [],
};

export function usePermissions() {
  const { profile } = useAuth();
  
  // Default to a safe fallback role if user profile is missing role
  // In production, this should come from user documentation in Firestore.
  const role: Role = profile?.role || 'Accountant';

  const can = (permission: Permission) => {
    return ROLE_PERMISSIONS[role]?.includes(permission) || false;
  };

  return { can, role, isLead: role === 'Lead Investor' || role === 'Admin' };
}
