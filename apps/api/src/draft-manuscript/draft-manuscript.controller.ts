import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { SeriesRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SeriesMemberGuard } from '../common/guards/series-member.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import { DraftManuscriptService } from './draft-manuscript.service';
import { UpdateDraftDto, RestoreRevisionDto } from './dto/update-draft.dto';

@ApiTags('Draft Manuscript')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SeriesMemberGuard)
@Controller('series/:seriesId/draft-manuscript')
export class DraftManuscriptController {
  constructor(private readonly svc: DraftManuscriptService) {}

  @Get()
  @Roles(SeriesRole.VIEWER)
  @ApiOperation({ summary: 'Get the current draft manuscript (created on first access)' })
  @ApiParam({ name: 'seriesId' })
  get(@Param('seriesId') seriesId: string) {
    return this.svc.getOrCreate(seriesId);
  }

  @Put()
  @Roles(SeriesRole.WRITER)
  @ApiOperation({
    summary: 'Save the draft manuscript with optimistic concurrency check (WRITER+)',
  })
  @ApiParam({ name: 'seriesId' })
  update(
    @Param('seriesId') seriesId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateDraftDto,
  ) {
    return this.svc.update(seriesId, userId, dto);
  }

  @Get('revisions')
  @Roles(SeriesRole.VIEWER)
  @ApiOperation({ summary: 'List the last 50 revisions (VIEWER+)' })
  @ApiParam({ name: 'seriesId' })
  listRevisions(@Param('seriesId') seriesId: string) {
    return this.svc.listRevisions(seriesId);
  }

  @Get('revisions/:revisionId')
  @Roles(SeriesRole.VIEWER)
  @ApiOperation({ summary: 'Get a single revision with full content (VIEWER+)' })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'revisionId' })
  getRevision(
    @Param('seriesId') seriesId: string,
    @Param('revisionId') revisionId: string,
  ) {
    return this.svc.getRevision(seriesId, revisionId);
  }

  @Post('revisions/restore')
  @Roles(SeriesRole.WRITER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a previous revision as the current draft (WRITER+)' })
  @ApiParam({ name: 'seriesId' })
  restore(
    @Param('seriesId') seriesId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: RestoreRevisionDto,
  ) {
    return this.svc.restoreRevision(seriesId, userId, dto.revisionId);
  }
}
