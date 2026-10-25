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
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { SeriesRole, StoryAnchorType, WorldEntityType } from '@prisma/client';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateWorldEntityDto } from './dto/create-world-entity.dto';
import { QueryWorldDto } from './dto/query-world.dto';
import { UpdateWorldEntityDto } from './dto/update-world-entity.dto';
import { WorldService } from './world.service';
import { CurrentUser } from '../common/current-user.decorator';
import { CharacterVersionService } from './character-version.service';
import { AssetsService } from '../assets/assets.service';
import {
  CreateCharacterVersionDto,
  GenerateBaseCharacterPromptDto,
  UpdateCharacterVersionDto,
} from './dto/character-version.dto';

@ApiTags('World')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(SeriesRole.VIEWER) // reads open to any member; mutations override below
@Controller('series/:seriesId/world')
export class WorldController {
  constructor(
    private readonly worldService: WorldService,
    private readonly characterVersions: CharacterVersionService,
    private readonly assetsService: AssetsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List world entities with optional type & text filters (VIEWER+)' })
  @ApiParam({ name: 'seriesId' })
  @ApiQuery({ name: 'type', enum: WorldEntityType, required: false })
  @ApiQuery({ name: 'q', required: false, description: 'Full-text search across name, description, tags' })
  listEntities(
    @Param('seriesId') seriesId: string,
    @Query() query: QueryWorldDto,
  ) {
    return this.worldService.listEntities(seriesId, query);
  }

  @Post()
  @Roles(SeriesRole.WRITER)
  @ApiOperation({ summary: 'Create a world entity (WRITER+)' })
  @ApiParam({ name: 'seriesId' })
  createEntity(
    @Param('seriesId') seriesId: string,
    @Body() dto: CreateWorldEntityDto,
  ) {
    return this.worldService.createEntity(seriesId, dto);
  }

  @Get(':entityId')
  @ApiOperation({ summary: 'Get a single world entity (VIEWER+)' })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'entityId' })
  getEntity(
    @Param('seriesId') seriesId: string,
    @Param('entityId') entityId: string,
  ) {
    return this.worldService.getEntity(seriesId, entityId);
  }

  @Put(':entityId')
  @Roles(SeriesRole.WRITER)
  @ApiOperation({ summary: 'Update a world entity (WRITER+)' })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'entityId' })
  updateEntity(
    @Param('seriesId') seriesId: string,
    @Param('entityId') entityId: string,
    @Body() dto: UpdateWorldEntityDto,
  ) {
    return this.worldService.updateEntity(seriesId, entityId, dto);
  }

  @Post(':entityId/generate-visual-prompt')
  @Roles(SeriesRole.WRITER)
  @ApiOperation({ summary: 'Generate the canonical base-character visual prompt' })
  generateBaseCharacterPrompt(
    @Param('seriesId') seriesId: string,
    @Param('entityId') entityId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: GenerateBaseCharacterPromptDto,
  ) {
    return this.characterVersions.generateBasePrompt(
      seriesId,
      entityId,
      userId,
      dto,
    );
  }

  @Get(':entityId/versions')
  @ApiOperation({ summary: 'List story-applicable versions of a character' })
  listCharacterVersions(
    @Param('seriesId') seriesId: string,
    @Param('entityId') entityId: string,
  ) {
    return this.characterVersions.list(seriesId, entityId);
  }

  @Post(':entityId/versions')
  @Roles(SeriesRole.WRITER)
  @ApiOperation({ summary: 'Create a character version (WRITER+)' })
  createCharacterVersion(
    @Param('seriesId') seriesId: string,
    @Param('entityId') entityId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCharacterVersionDto,
  ) {
    return this.characterVersions.create(seriesId, entityId, userId, dto);
  }

  @Put(':entityId/versions/:versionId')
  @Roles(SeriesRole.WRITER)
  @ApiOperation({ summary: 'Update a character version (WRITER+)' })
  updateCharacterVersion(
    @Param('seriesId') seriesId: string,
    @Param('entityId') entityId: string,
    @Param('versionId') versionId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateCharacterVersionDto,
  ) {
    return this.characterVersions.update(
      seriesId,
      entityId,
      versionId,
      userId,
      dto,
    );
  }

  @Post(':entityId/versions/:versionId/generate-prompt')
  @Roles(SeriesRole.WRITER)
  @ApiOperation({ summary: 'Generate and save a visual prompt for a character version' })
  generateCharacterVersionPrompt(
    @Param('seriesId') seriesId: string,
    @Param('entityId') entityId: string,
    @Param('versionId') versionId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.characterVersions.generatePrompt(
      seriesId,
      entityId,
      versionId,
      userId,
    );
  }

  @Get(':entityId/versions/resolve/at')
  @ApiOperation({ summary: 'Resolve the applicable character version at a story point' })
  resolveCharacterVersion(
    @Param('seriesId') seriesId: string,
    @Param('entityId') entityId: string,
    @Query('type') type: StoryAnchorType,
    @Query('anchorId') anchorId?: string,
  ) {
    return this.characterVersions.resolve(seriesId, entityId, type, anchorId);
  }

  @Delete(':entityId/versions/:versionId')
  @Roles(SeriesRole.WRITER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a character version (WRITER+)' })
  async deleteCharacterVersion(
    @Param('seriesId') seriesId: string,
    @Param('entityId') entityId: string,
    @Param('versionId') versionId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.characterVersions.remove(seriesId, entityId, versionId, userId);
  }

  @Get(':entityId/assignment-history')
  @ApiOperation({ summary: 'Get full media assignment history for an entity (VIEWER+)' })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'entityId' })
  getEntityAssignmentHistory(
    @Param('seriesId') seriesId: string,
    @Param('entityId') entityId: string,
  ) {
    return this.assetsService.getEntityAssetAssignments(seriesId, entityId);
  }

  @Delete(':entityId')
  @Roles(SeriesRole.WRITER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a world entity (WRITER+)' })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'entityId' })
  async deleteEntity(
    @Param('seriesId') seriesId: string,
    @Param('entityId') entityId: string,
  ) {
    await this.worldService.deleteEntity(seriesId, entityId);
  }
}
