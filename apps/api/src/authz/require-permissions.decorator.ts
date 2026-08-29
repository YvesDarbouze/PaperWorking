import { SetMetadata } from '@nestjs/common';
import type { Permission } from './permissions.js';

export const PERMISSIONS_KEY = 'permissions';

/** Attach required permissions to a handler or controller. */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
