import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { SeriesRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { RequireRole } from '../common/series-member.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import { SeriesService } from './series.service';
import { CreateSeriesDto } from './dto/create-series.dto';
import { UpdateSeriesDto } from './dto/update-series.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

@ApiTags('Series')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('series')
export class SeriesController {
  constructor(private readonly seriesService: SeriesService) {}

  // ── GET /api/series ────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List all series where the current user is a member' })
  findAll(@CurrentUser('sub') userId: string) {
    return this.seriesService.findAllForUser(userId);
  }

  // ── POST /api/series ───────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a new series (creator becomes OWNER)' })
  create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateSeriesDto,
  ) {
    return this.seriesService.create(userId, dto);
  }

  // ── GET /api/series/:seriesId ──────────────────────────────────────────────

  @Get(':seriesId')
  @UseGuards(RolesGuard)
  @RequireRole(SeriesRole.VIEWER)
  @ApiParam({ name: 'seriesId' })
  @ApiOperation({ summary: 'Get a single series with the requesting user\'s role' })
  findOne(
    @CurrentUser('sub') userId: string,
    @Param('seriesId') seriesId: string,
  ) {
    return this.seriesService.findOne(userId, seriesId);
  }

  // ── PUT /api/series/:seriesId ──────────────────────────────────────────────

  @Put(':seriesId')
  @UseGuards(RolesGuard)
  @RequireRole(SeriesRole.ADMIN)
  @ApiParam({ name: 'seriesId' })
  @ApiOperation({ summary: 'Update series details (ADMIN+)' })
  update(
    @CurrentUser('sub') userId: string,
    @Param('seriesId') seriesId: string,
    @Body() dto: UpdateSeriesDto,
  ) {
    return this.seriesService.update(userId, seriesId, dto);
  }

  // ── DELETE /api/series/:seriesId ───────────────────────────────────────────

  @Delete(':seriesId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @RequireRole(SeriesRole.OWNER)
  @ApiParam({ name: 'seriesId' })
  @ApiOperation({ summary: 'Archive a series (OWNER only)' })
  archive(
    @CurrentUser('sub') userId: string,
    @Param('seriesId') seriesId: string,
  ) {
    return this.seriesService.archive(userId, seriesId);
  }

  // ── GET /api/series/:seriesId/members ──────────────────────────────────────

  @Get(':seriesId/members')
  @UseGuards(RolesGuard)
  @RequireRole(SeriesRole.VIEWER)
  @ApiParam({ name: 'seriesId' })
  @ApiOperation({ summary: 'List all members of a series (VIEWER+)' })
  listMembers(@Param('seriesId') seriesId: string) {
    return this.seriesService.listMembers(seriesId);
  }

  // ── POST /api/series/:seriesId/members ─────────────────────────────────────

  @Post(':seriesId/members')
  @UseGuards(RolesGuard)
  @RequireRole(SeriesRole.ADMIN)
  @ApiParam({ name: 'seriesId' })
  @ApiOperation({ summary: 'Add a member by email (ADMIN+)' })
  addMember(
    @CurrentUser('sub') requesterId: string,
    @Param('seriesId') seriesId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.seriesService.addMember(requesterId, seriesId, dto);
  }

  // ── PUT /api/series/:seriesId/members/:userId ──────────────────────────────

  @Put(':seriesId/members/:userId')
  @UseGuards(RolesGuard)
  @RequireRole(SeriesRole.ADMIN)
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'userId' })
  @ApiOperation({ summary: 'Update a member\'s role (ADMIN+)' })
  updateMember(
    @CurrentUser('sub') requesterId: string,
    @Param('seriesId') seriesId: string,
    @Param('userId') targetUserId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.seriesService.updateMember(requesterId, seriesId, targetUserId, dto);
  }

  // ── DELETE /api/series/:seriesId/members/:userId ───────────────────────────

  @Delete(':seriesId/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @RequireRole(SeriesRole.ADMIN)
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'userId' })
  @ApiOperation({ summary: 'Remove a member from a series (OWNER/ADMIN)' })
  async removeMember(
    @CurrentUser('sub') requesterId: string,
    @Param('seriesId') seriesId: string,
    @Param('userId') targetUserId: string,
  ) {
    await this.seriesService.removeMember(requesterId, seriesId, targetUserId);
  }
}
