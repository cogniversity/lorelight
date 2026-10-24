import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SeriesRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';

/** Numeric weight used for role comparisons. Higher = more privileged. */
const ROLE_WEIGHT: Record<SeriesRole, number> = {
  [SeriesRole.VIEWER]: 0,
  [SeriesRole.PRODUCER]: 1,
  [SeriesRole.WRITER]: 2,
  [SeriesRole.ADMIN]: 3,
  [SeriesRole.OWNER]: 4,
};

/**
 * Verifies the authenticated user is a member of the series identified by
 * the :seriesId route parameter, and (if @Roles() is applied) that their
 * role meets the minimum required weight.
 *
 * Must run AFTER JwtAuthGuard (so request.user is populated).
 */
@Injectable()
export class SeriesMemberGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user: { id: string };
      params: Record<string, string>;
      membership?: { role: SeriesRole };
    }>();

    const { user, params } = request;

    if (!user?.id) throw new ForbiddenException('Not authenticated');

    const seriesId = params.seriesId;
    if (!seriesId) return true; // Non-series route – no check needed.

    const membership = await this.prisma.seriesMembership.findUnique({
      where: { userId_seriesId: { userId: user.id, seriesId } },
    });

    if (!membership) {
      throw new NotFoundException('Series not found or access denied');
    }

    // Expose membership on the request so controllers can read it if needed.
    request.membership = membership;

    const requiredRoles = this.reflector.getAllAndOverride<SeriesRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const userWeight = ROLE_WEIGHT[membership.role];
    const minRequired = Math.min(...requiredRoles.map((r) => ROLE_WEIGHT[r]));

    if (userWeight < minRequired) {
      throw new ForbiddenException('Insufficient permissions for this action');
    }

    return true;
  }
}
