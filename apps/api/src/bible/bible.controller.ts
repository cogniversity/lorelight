import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { BibleEntryType, SeriesRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { BibleService } from './bible.service';
import { UpsertBibleEntryDto } from './dto/upsert-bible-entry.dto';

@ApiTags('Bible')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(SeriesRole.VIEWER) // any series member may read; mutations override below
@Controller('series/:seriesId/bible')
export class BibleController {
  constructor(private readonly bibleService: BibleService) {}

  @Get()
  @ApiOperation({ summary: 'List all bible entries for a series (VIEWER+)' })
  @ApiParam({ name: 'seriesId', description: 'Series CUID' })
  listEntries(@Param('seriesId') seriesId: string) {
    return this.bibleService.listEntries(seriesId);
  }

  @Put(':type')
  @Roles(SeriesRole.WRITER)
  @ApiOperation({ summary: 'Create or update a bible entry by type (WRITER+)' })
  @ApiParam({ name: 'seriesId', description: 'Series CUID' })
  @ApiParam({ name: 'type', enum: BibleEntryType, description: 'Bible entry type' })
  upsertEntry(
    @Param('seriesId') seriesId: string,
    @Param('type', new ParseEnumPipe(BibleEntryType)) type: BibleEntryType,
    @Body() dto: UpsertBibleEntryDto,
  ) {
    return this.bibleService.upsertEntry(seriesId, type, dto);
  }

  @Delete(':type')
  @Roles(SeriesRole.WRITER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a bible entry by type (WRITER+)' })
  @ApiParam({ name: 'seriesId', description: 'Series CUID' })
  @ApiParam({ name: 'type', enum: BibleEntryType, description: 'Bible entry type' })
  async deleteEntry(
    @Param('seriesId') seriesId: string,
    @Param('type', new ParseEnumPipe(BibleEntryType)) type: BibleEntryType,
  ) {
    await this.bibleService.deleteEntry(seriesId, type);
  }
}
