import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { ImportService } from './import.service';
import { ImportPreviewRequestDto } from './dto/import-preview.dto';
import { ImportCommitRequestDto } from './dto/import-commit.dto';

@ApiTags('Import')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  /**
   * POST /api/import/preview
   * Parses a lorelight-project-v2 localStorage JSON string and returns
   * entity counts and warnings WITHOUT writing anything to the database.
   */
  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Preview a lorelight-project-v2 export — returns counts and warnings without writing to DB',
  })
  preview(@Body() dto: ImportPreviewRequestDto) {
    return this.importService.preview(dto.localStorageJson);
  }

  /**
   * POST /api/import/commit
   * Imports the project into a new Series (single transaction).
   * Current user becomes OWNER of the new series.
   */
  @Post('commit')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Import a lorelight-project-v2 export into a new Series — caller becomes OWNER',
  })
  commit(
    @Body() dto: ImportCommitRequestDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.importService.commit(dto.localStorageJson, userId);
  }
}
