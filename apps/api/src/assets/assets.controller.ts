import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { SeriesRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SeriesMemberGuard } from '../common/guards/series-member.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import { AssetsService } from './assets.service';
import { InitiateUploadDto } from './dto/initiate-upload.dto';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssetQueryDto } from './dto/asset-query.dto';
import {
  CompleteAssetVersionDto,
  InitiateAssetVersionDto,
} from './dto/asset-version.dto';

@ApiTags('Assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SeriesMemberGuard)
@Controller('series/:seriesId/assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  /**
   * POST /api/series/:seriesId/assets/upload-url
   * Creates an Asset record (PENDING) and returns a presigned PUT URL valid for 15 minutes.
   */
  @Post('upload-url')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Initiate a direct-to-MinIO upload — returns presigned PUT URL (15 min)' })
  @ApiParam({ name: 'seriesId' })
  initiateUpload(
    @Param('seriesId') seriesId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: InitiateUploadDto,
  ) {
    return this.assetsService.initiateUpload(seriesId, userId, dto);
  }

  /**
   * POST /api/series/:seriesId/assets/complete
   * Verifies the object exists in MinIO, transitions status → UPLOADED.
   */
  @Post('complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark upload complete after client PUT to MinIO' })
  @ApiParam({ name: 'seriesId' })
  completeUpload(
    @Param('seriesId') seriesId: string,
    @Body() dto: CompleteUploadDto,
  ) {
    return this.assetsService.completeUpload(seriesId, dto);
  }

  /**
   * GET /api/series/:seriesId/assets
   * Lists assets with optional ?type= ?status= ?q= filters.
   */
  @Get()
  @ApiOperation({ summary: 'List assets with optional type/status/q filters (paginated)' })
  @ApiParam({ name: 'seriesId' })
  listAssets(
    @Param('seriesId') seriesId: string,
    @Query() query: AssetQueryDto,
  ) {
    return this.assetsService.listAssets(seriesId, query);
  }

  @Post(':assetId/version-upload-url')
  @Roles(SeriesRole.PRODUCER)
  @ApiOperation({ summary: 'Initiate upload of a new asset version (PRODUCER+)' })
  initiateVersion(
    @Param('seriesId') seriesId: string,
    @Param('assetId') assetId: string,
    @Body() dto: InitiateAssetVersionDto,
  ) {
    return this.assetsService.initiateVersion(seriesId, assetId, dto);
  }

  @Post(':assetId/version-complete')
  @Roles(SeriesRole.PRODUCER)
  @ApiOperation({ summary: 'Complete upload of a new asset version (PRODUCER+)' })
  completeVersion(
    @Param('seriesId') seriesId: string,
    @Param('assetId') assetId: string,
    @Body() dto: CompleteAssetVersionDto,
  ) {
    return this.assetsService.completeVersion(seriesId, assetId, dto);
  }

  /**
   * GET /api/series/:seriesId/assets/:assetId
   * Returns the asset with a 1-hour presigned download URL.
   */
  @Get(':assetId')
  @ApiOperation({ summary: 'Get a single asset with a 1-hour presigned download URL' })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'assetId' })
  getAsset(
    @Param('seriesId') seriesId: string,
    @Param('assetId') assetId: string,
  ) {
    return this.assetsService.getAsset(seriesId, assetId);
  }

  /**
   * PUT /api/series/:seriesId/assets/:assetId
   * Update metadata — requires PRODUCER+ role.
   */
  @Put(':assetId')
  @Roles(SeriesRole.PRODUCER)
  @ApiOperation({ summary: 'Update asset metadata (PRODUCER+)' })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'assetId' })
  updateAsset(
    @Param('seriesId') seriesId: string,
    @Param('assetId') assetId: string,
    @Body() dto: UpdateAssetDto,
  ) {
    return this.assetsService.updateAsset(seriesId, assetId, dto);
  }

  /**
   * DELETE /api/series/:seriesId/assets/:assetId
   * Deletes from MinIO and DB — requires PRODUCER+ role.
   */
  @Delete(':assetId')
  @Roles(SeriesRole.PRODUCER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete asset from MinIO and DB (PRODUCER+)' })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'assetId' })
  deleteAsset(
    @Param('seriesId') seriesId: string,
    @Param('assetId') assetId: string,
  ) {
    return this.assetsService.deleteAsset(seriesId, assetId);
  }
}
