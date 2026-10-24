import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SeriesRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';

const context = (role: SeriesRole) =>
  ({
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({
      getRequest: () => ({
        user: { sub: 'user-1' },
        params: { seriesId: 'series-1' },
      }),
    }),
    role,
  }) as any;

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;

  it('allows a role at or above the required rank', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(SeriesRole.WRITER);
    const prisma = {
      seriesMembership: {
        findUnique: jest.fn().mockResolvedValue({ role: SeriesRole.OWNER }),
      },
    };
    const guard = new RolesGuard(reflector, prisma as any);
    await expect(guard.canActivate(context(SeriesRole.OWNER))).resolves.toBe(true);
  });

  it('rejects a viewer from an administrator operation', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(SeriesRole.ADMIN);
    const prisma = {
      seriesMembership: {
        findUnique: jest.fn().mockResolvedValue({ role: SeriesRole.VIEWER }),
      },
    };
    const guard = new RolesGuard(reflector, prisma as any);
    await expect(guard.canActivate(context(SeriesRole.VIEWER))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
