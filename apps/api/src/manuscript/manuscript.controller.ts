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
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateActDto, UpdateActDto } from './dto/act.dto';
import { CreateClipDto, UpdateClipDto } from './dto/clip.dto';
import { CreateEpisodeDto, UpdateEpisodeDto } from './dto/episode.dto';
import { ReorderDto } from './dto/reorder.dto';
import { CreateSceneDto, UpdateSceneDto } from './dto/scene.dto';
import { CreateScriptBlockDto, UpdateScriptBlockDto } from './dto/script-block.dto';
import { CreateSeasonDto, UpdateSeasonDto } from './dto/season.dto';
import { ManuscriptService } from './manuscript.service';

@ApiTags('Manuscript')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(SeriesRole.VIEWER) // reads open to any series member; write endpoints override below
@Controller('series/:seriesId')
export class ManuscriptController {
  constructor(private readonly manuscriptService: ManuscriptService) {}

  // ─── Full Manuscript Tree ─────────────────────────────────────────────────

  @Get('manuscript')
  @ApiOperation({
    summary:
      'Full manuscript tree: Seasons → Episodes → Acts → Scenes → Clips (lightweight, VIEWER+)',
  })
  @ApiParam({ name: 'seriesId' })
  getManuscriptTree(@Param('seriesId') seriesId: string) {
    return this.manuscriptService.getManuscriptTree(seriesId);
  }

  // ─── Seasons ──────────────────────────────────────────────────────────────

  @Get('seasons')
  @ApiOperation({ summary: 'List all seasons for a series (VIEWER+)' })
  @ApiParam({ name: 'seriesId' })
  listSeasons(@Param('seriesId') seriesId: string) {
    return this.manuscriptService.listSeasons(seriesId);
  }

  @Post('seasons')
  @Roles(SeriesRole.WRITER)
  @ApiOperation({ summary: 'Create a season (WRITER+)' })
  @ApiParam({ name: 'seriesId' })
  createSeason(
    @Param('seriesId') seriesId: string,
    @Body() dto: CreateSeasonDto,
  ) {
    return this.manuscriptService.createSeason(seriesId, dto);
  }

  @Get('seasons/:seasonId')
  @ApiOperation({ summary: 'Get a single season (VIEWER+)' })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'seasonId' })
  getSeason(
    @Param('seriesId') seriesId: string,
    @Param('seasonId') seasonId: string,
  ) {
    return this.manuscriptService.getSeason(seriesId, seasonId);
  }

  @Put('seasons/:seasonId')
  @Roles(SeriesRole.WRITER)
  @ApiOperation({ summary: 'Update a season (WRITER+)' })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'seasonId' })
  updateSeason(
    @Param('seriesId') seriesId: string,
    @Param('seasonId') seasonId: string,
    @Body() dto: UpdateSeasonDto,
  ) {
    return this.manuscriptService.updateSeason(seriesId, seasonId, dto);
  }

  @Delete('seasons/:seasonId')
  @Roles(SeriesRole.WRITER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a season and all its nested content (WRITER+)' })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'seasonId' })
  async deleteSeason(
    @Param('seriesId') seriesId: string,
    @Param('seasonId') seasonId: string,
  ) {
    await this.manuscriptService.deleteSeason(seriesId, seasonId);
  }

  // ─── Episodes ─────────────────────────────────────────────────────────────

  @Post('seasons/:seasonId/episodes')
  @Roles(SeriesRole.WRITER)
  @ApiOperation({ summary: 'Create an episode under a season (WRITER+)' })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'seasonId' })
  createEpisode(
    @Param('seriesId') seriesId: string,
    @Param('seasonId') seasonId: string,
    @Body() dto: CreateEpisodeDto,
  ) {
    return this.manuscriptService.createEpisode(seriesId, seasonId, dto);
  }

  @Get('episodes/:episodeId')
  @ApiOperation({ summary: 'Get an episode (VIEWER+)' })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'episodeId' })
  getEpisode(
    @Param('seriesId') seriesId: string,
    @Param('episodeId') episodeId: string,
  ) {
    return this.manuscriptService.getEpisode(seriesId, episodeId);
  }

  @Put('episodes/:episodeId')
  @Roles(SeriesRole.WRITER)
  @ApiOperation({ summary: 'Update an episode (WRITER+)' })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'episodeId' })
  updateEpisode(
    @Param('seriesId') seriesId: string,
    @Param('episodeId') episodeId: string,
    @Body() dto: UpdateEpisodeDto,
  ) {
    return this.manuscriptService.updateEpisode(seriesId, episodeId, dto);
  }

  @Delete('episodes/:episodeId')
  @Roles(SeriesRole.WRITER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an episode (WRITER+)' })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'episodeId' })
  async deleteEpisode(
    @Param('seriesId') seriesId: string,
    @Param('episodeId') episodeId: string,
  ) {
    await this.manuscriptService.deleteEpisode(seriesId, episodeId);
  }

  // ─── Acts ─────────────────────────────────────────────────────────────────

  @Post('episodes/:episodeId/acts')
  @Roles(SeriesRole.WRITER)
  @ApiOperation({ summary: 'Create an act under an episode (WRITER+)' })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'episodeId' })
  createAct(
    @Param('seriesId') seriesId: string,
    @Param('episodeId') episodeId: string,
    @Body() dto: CreateActDto,
  ) {
    return this.manuscriptService.createAct(seriesId, episodeId, dto);
  }

  @Get('acts/:actId')
  @ApiOperation({ summary: 'Get an act (VIEWER+)' })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'actId' })
  getAct(
    @Param('seriesId') seriesId: string,
    @Param('actId') actId: string,
  ) {
    return this.manuscriptService.getAct(seriesId, actId);
  }

  @Put('acts/:actId')
  @Roles(SeriesRole.WRITER)
  @ApiOperation({ summary: 'Update an act (WRITER+)' })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'actId' })
  updateAct(
    @Param('seriesId') seriesId: string,
    @Param('actId') actId: string,
    @Body() dto: UpdateActDto,
  ) {
    return this.manuscriptService.updateAct(seriesId, actId, dto);
  }

  @Delete('acts/:actId')
  @Roles(SeriesRole.WRITER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an act (WRITER+)' })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'actId' })
  async deleteAct(
    @Param('seriesId') seriesId: string,
    @Param('actId') actId: string,
  ) {
    await this.manuscriptService.deleteAct(seriesId, actId);
  }

  // ─── Scenes ───────────────────────────────────────────────────────────────

  @Post('acts/:actId/scenes')
  @Roles(SeriesRole.WRITER)
  @ApiOperation({ summary: 'Create a scene under an act (WRITER+)' })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'actId' })
  createScene(
    @Param('seriesId') seriesId: string,
    @Param('actId') actId: string,
    @Body() dto: CreateSceneDto,
  ) {
    return this.manuscriptService.createScene(seriesId, actId, dto);
  }

  @Get('scenes/:sceneId')
  @ApiOperation({ summary: 'Get a scene with its script blocks and clips (VIEWER+)' })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'sceneId' })
  getScene(
    @Param('seriesId') seriesId: string,
    @Param('sceneId') sceneId: string,
  ) {
    return this.manuscriptService.getScene(seriesId, sceneId);
  }

  @Put('scenes/:sceneId')
  @Roles(SeriesRole.WRITER)
  @ApiOperation({ summary: 'Update a scene (WRITER+)' })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'sceneId' })
  updateScene(
    @Param('seriesId') seriesId: string,
    @Param('sceneId') sceneId: string,
    @Body() dto: UpdateSceneDto,
  ) {
    return this.manuscriptService.updateScene(seriesId, sceneId, dto);
  }

  @Delete('scenes/:sceneId')
  @Roles(SeriesRole.WRITER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a scene (WRITER+)' })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'sceneId' })
  async deleteScene(
    @Param('seriesId') seriesId: string,
    @Param('sceneId') sceneId: string,
  ) {
    await this.manuscriptService.deleteScene(seriesId, sceneId);
  }

  // ─── Script Blocks ────────────────────────────────────────────────────────

  @Get('scenes/:sceneId/script-blocks')
  @ApiOperation({ summary: 'List script blocks for a scene ordered by position (VIEWER+)' })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'sceneId' })
  listScriptBlocks(
    @Param('seriesId') seriesId: string,
    @Param('sceneId') sceneId: string,
  ) {
    return this.manuscriptService.listScriptBlocks(seriesId, sceneId);
  }

  @Post('scenes/:sceneId/script-blocks')
  @Roles(SeriesRole.WRITER)
  @ApiOperation({ summary: 'Append a script block to a scene (WRITER+)' })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'sceneId' })
  createScriptBlock(
    @Param('seriesId') seriesId: string,
    @Param('sceneId') sceneId: string,
    @Body() dto: CreateScriptBlockDto,
  ) {
    return this.manuscriptService.createScriptBlock(seriesId, sceneId, dto);
  }

  @Put('script-blocks/:blockId')
  @Roles(SeriesRole.WRITER)
  @ApiOperation({ summary: 'Update a script block (WRITER+)' })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'blockId' })
  updateScriptBlock(
    @Param('seriesId') seriesId: string,
    @Param('blockId') blockId: string,
    @Body() dto: UpdateScriptBlockDto,
  ) {
    return this.manuscriptService.updateScriptBlock(seriesId, blockId, dto);
  }

  @Delete('script-blocks/:blockId')
  @Roles(SeriesRole.WRITER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a script block (WRITER+)' })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'blockId' })
  async deleteScriptBlock(
    @Param('seriesId') seriesId: string,
    @Param('blockId') blockId: string,
  ) {
    await this.manuscriptService.deleteScriptBlock(seriesId, blockId);
  }

  // ─── Clips ────────────────────────────────────────────────────────────────

  @Post('scenes/:sceneId/clips')
  @Roles(SeriesRole.WRITER)
  @ApiOperation({ summary: 'Create a clip under a scene (WRITER+)' })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'sceneId' })
  createClip(
    @Param('seriesId') seriesId: string,
    @Param('sceneId') sceneId: string,
    @Body() dto: CreateClipDto,
  ) {
    return this.manuscriptService.createClip(seriesId, sceneId, dto);
  }

  /**
   * IMPORTANT: The literal 'reorder' segment MUST be declared before ':clipId'
   * so NestJS/Express resolves it correctly.
   */
  @Put('scenes/:sceneId/clips/reorder')
  @Roles(SeriesRole.WRITER)
  @ApiOperation({
    summary: 'Reorder clips within a scene (WRITER+)',
    description:
      'Supply an ordered array of clip IDs. Each clip\'s `position` is set to its index in the array.',
  })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'sceneId' })
  reorderClips(
    @Param('seriesId') seriesId: string,
    @Param('sceneId') sceneId: string,
    @Body() dto: ReorderDto,
  ) {
    return this.manuscriptService.reorderClips(seriesId, sceneId, dto);
  }

  @Get('clips/:clipId')
  @ApiOperation({
    summary: 'Get a clip with full detail: linked entities, assets, generation runs (VIEWER+)',
  })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'clipId' })
  getClip(
    @Param('seriesId') seriesId: string,
    @Param('clipId') clipId: string,
  ) {
    return this.manuscriptService.getClip(seriesId, clipId);
  }

  @Put('clips/:clipId')
  @Roles(SeriesRole.WRITER)
  @ApiOperation({ summary: 'Update a clip (WRITER+)' })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'clipId' })
  updateClip(
    @Param('seriesId') seriesId: string,
    @Param('clipId') clipId: string,
    @Body() dto: UpdateClipDto,
  ) {
    return this.manuscriptService.updateClip(seriesId, clipId, dto);
  }

  @Delete('clips/:clipId')
  @Roles(SeriesRole.WRITER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a clip (WRITER+)' })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'clipId' })
  async deleteClip(
    @Param('seriesId') seriesId: string,
    @Param('clipId') clipId: string,
  ) {
    await this.manuscriptService.deleteClip(seriesId, clipId);
  }
}
