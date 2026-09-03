import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthUser } from '../auth/auth.types.js';
import { AuthorizationService } from './authorization.service.js';
import type { Permission } from './permissions.js';
import { PERMISSIONS_KEY } from './require-permissions.decorator.js';

/**
 * Checks @RequirePermissions(...) metadata against the authenticated user.
 * Resource ownership is enforced in AuthorizationService from services.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authz: AuthorizationService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const req = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = req.user;
    if (!user) {
      throw new ForbiddenException({ error: 'Forbidden' });
    }

    for (const permission of required) {
      if (!this.authz.hasPermission(user, permission)) {
        throw new ForbiddenException({
          error: 'Forbidden',
          permission,
        });
      }
    }
    return true;
  }
}
