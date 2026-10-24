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
import { SeriesRole, WorldEntityType } from '@prisma/client';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateWorldEntityDto } from './dto/create-world-entity.dto';
import { QueryWorldDto } from './dto/query-world.dto';
import { UpdateWorldEntityDto } from './dto/update-world-entity.dto';
import { WorldService } from './world.service';

@ApiTags('World')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(SeriesRole.VIEWER) // reads open to any member; mutations override below
@Controller('series/:seriesId/world')
export class WorldController {
  constructor(private readonly worldService: WorldService) {}

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
