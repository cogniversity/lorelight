import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SeriesRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SERIES_ROLE_KEY } from './series-member.decorator';
import { JwtPayload } from './current-user.decorator';

/** Numeric rank for each role – higher = more privileged */
const ROLE_RANK: Record<SeriesRole, number> = {
  [SeriesRole.VIEWER]: 1,
  [SeriesRole.PRODUCER]: 2,
  [SeriesRole.WRITER]: 3,
  [SeriesRole.ADMIN]: 4,
  [SeriesRole.OWNER]: 5,
};

/**
 * Guard that enforces a minimum SeriesRole on series-scoped routes.
 *
 * Reads the required role from the @RequireRole() decorator metadata.
 * Expects the route to have a `seriesId` path parameter and the request
 * to have `user` populated by JwtAuthGuard.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const requiredRole = this.reflector.getAllAndOverride<SeriesRole | undefined>(
      SERIES_ROLE_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );

    // If no role is required, allow through
    if (!requiredRole) return true;

    const request = ctx.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    if (!user?.sub) {
      throw new UnauthorizedException('Not authenticated');
    }

    const seriesId: string | undefined = request.params?.seriesId;

    if (!seriesId) {
      throw new ForbiddenException('Series ID not found in route params');
    }

    const membership = await this.prisma.seriesMembership.findUnique({
      where: { userId_seriesId: { userId: user.sub, seriesId } },
      select: { role: true },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this series');
    }

    const userRank = ROLE_RANK[membership.role];
    const requiredRank = ROLE_RANK[requiredRole];

    if (userRank < requiredRank) {
      throw new ForbiddenException(
        `Requires at least ${requiredRole} role (you have ${membership.role})`,
      );
    }

    // Attach the resolved role to the request for downstream use
    request.seriesRole = membership.role;
    return true;
  }
}
