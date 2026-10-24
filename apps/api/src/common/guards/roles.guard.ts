import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SeriesRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';

/** Numeric rank of each role — higher = more privilege. */
const ROLE_RANK: Record<SeriesRole, number> = {
  VIEWER: 0,
  WRITER: 1,
  PRODUCER: 2,
  ADMIN: 3,
  OWNER: 4,
};

/**
 * Guards routes with a minimum SeriesRole.
 * Must be used after JwtAuthGuard so request.user is populated.
 * Site admins (user.isAdmin) bypass membership checks.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const requiredRole = this.reflector.getAllAndOverride<SeriesRole | undefined>(
      ROLES_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!requiredRole) return true; // no role restriction

    const request = ctx.switchToHttp().getRequest();
    const user: { id: string; isAdmin?: boolean } = request.user;
    if (!user) throw new ForbiddenException('Not authenticated');

    // Site-wide admins always pass
    if (user.isAdmin) return true;

    const seriesId: string | undefined = request.params?.seriesId;
    if (!seriesId) throw new ForbiddenException('Missing seriesId');

    const membership = await this.prisma.seriesMembership.findUnique({
      where: { userId_seriesId: { userId: user.id, seriesId } },
      select: { role: true },
    });

    if (!membership) throw new ForbiddenException('You are not a member of this series');

    if (ROLE_RANK[membership.role] < ROLE_RANK[requiredRole]) {
      throw new ForbiddenException(
        `This action requires at least the '${requiredRole}' role`,
      );
    }

    return true;
  }
}
