import { ApplicationUser, Permission, ProjectMember } from '@/types/schema';
import { getPermissionsForRole } from './RoleDefinitions';

export interface AuthContext {
  user: ApplicationUser;
  // If the action is within the context of a project, the member record goes here
  projectMember?: ProjectMember;
}

export class AuthorizationService {
  /**
   * Evaluates if a user has a specific permission.
   * Checks the project-level permissions first (if provided),
   * then falls back to the organization-level permissions.
   * 
   * @param context The current user and optional project member context
   * @param permission The atomic permission string to check
   * @returns boolean indicating if the user has the permission
   */
  static can(context: AuthContext, permission: Permission): boolean {
    if (!context.user) return false;

    // 1. Check Project-level permissions first (if in a project context)
    if (context.projectMember) {
      if (context.projectMember.projectPermissions?.includes(permission)) {
        return true;
      }
      
      // Fallback to evaluating the legacy role string if permissions array is missing
      if (!context.projectMember.projectPermissions && context.projectMember.role) {
        const legacyPerms = getPermissionsForRole(context.projectMember.role);
        if (legacyPerms.includes(permission)) return true;
      }
    }

    // 2. Check Organization-level permissions
    if (context.user.orgPermissions?.includes(permission)) {
      return true;
    }

    // Fallback to evaluating the legacy orgRole string if permissions array is missing
    if (!context.user.orgPermissions && context.user.orgRole) {
      const legacyPerms = getPermissionsForRole(context.user.orgRole);
      if (legacyPerms.includes(permission)) return true;
    }

    return false;
  }

  /**
   * Enforces a permission check, throwing an error if unauthorized.
   * Ideal for Server Actions and API routes.
   * 
   * @param context The current user and optional project member context
   * @param permission The atomic permission string to check
   * @throws Error if the user lacks the permission
   */
  static enforce(context: AuthContext, permission: Permission): void {
    if (!this.can(context, permission)) {
      throw new Error(`Unauthorized: Missing required permission '${permission}'`);
    }
  }
}
