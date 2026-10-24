import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { SeriesRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { RequireRole } from '../common/series-member.decorator';
import { ActivityService } from './activity.service';

@ApiTags('Activity')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('series/:seriesId/activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  // ── GET /api/series/:seriesId/activity ─────────────────────────────────────

  @Get()
  @RequireRole(SeriesRole.VIEWER)
  @ApiParam({ name: 'seriesId', description: 'Series ID' })
  @ApiOperation({ summary: 'List recent activity events for a series (VIEWER+)' })
  findAll(@Param('seriesId') seriesId: string) {
    return this.activityService.findBySeries(seriesId);
  }
}
