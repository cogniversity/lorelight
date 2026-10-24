import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record an activity event for a series.
   * Failures are silently swallowed so they never break primary operations.
   */
  async log(
    seriesId: string,
    userId: string,
    action: string,
    entityType?: string,
    entityId?: string,
    detail?: string,
  ): Promise<void> {
    try {
      await this.prisma.activityEvent.create({
        data: { seriesId, userId, action, entityType, entityId, detail },
      });
    } catch (err) {
      this.logger.error(`Failed to log activity [${action}]: ${err}`);
    }
  }

  /**
   * List the 50 most recent activity events for a series.
   */
  async findBySeries(seriesId: string, limit = 50) {
    return this.prisma.activityEvent.findMany({
      where: { seriesId },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
