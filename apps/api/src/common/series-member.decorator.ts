import { SetMetadata } from '@nestjs/common';
import { SeriesRole } from '@prisma/client';

export const SERIES_ROLE_KEY = 'seriesRole';

/**
 * Method decorator that sets the minimum SeriesRole required for the route.
 * Must be paired with RolesGuard.
 *
 * Usage:
 *   @RequireRole(SeriesRole.WRITER)
 */
export const RequireRole = (role: SeriesRole) =>
  SetMetadata(SERIES_ROLE_KEY, role);
