import { SetMetadata } from '@nestjs/common';
import { SeriesRole } from '@prisma/client';

export const ROLES_KEY = 'requiredRole';

/**
 * Declare one or more minimum roles for a route.
 * The user must hold at least the lowest-ranked role in the list.
 * Used by SeriesMemberGuard.
 *
 * @example  @Roles(SeriesRole.WRITER)
 * @example  @Roles(SeriesRole.PRODUCER, SeriesRole.ADMIN)
 */
export const Roles = (...roles: SeriesRole[]) =>
  SetMetadata(ROLES_KEY, roles);

/**
 * Convenience alias — require a single minimum role.
 * Equivalent to @Roles(role).
 */
export const RequireRole = (role: SeriesRole) => SetMetadata(ROLES_KEY, [role]);
