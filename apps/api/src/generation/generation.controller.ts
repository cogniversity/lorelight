import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
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
import { ProvidersService } from './providers.service';
import { GenerationService } from './generation.service';
import { CreateLlmProviderDto } from './dto/create-provider.dto';
import { UpdateLlmProviderDto } from './dto/update-provider.dto';
import { GeneratePromptsDto } from './dto/generate-prompts.dto';
import { AcceptPromptsDto } from './dto/accept-prompts.dto';
import { AudioProvidersService } from './audio-providers.service';
import { VoiceSampleService } from './voice-sample.service';
import {
  CreateAudioProviderDto,
  GenerateVoiceSampleDto,
} from './dto/audio-provider.dto';

@ApiTags('Generation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SeriesMemberGuard)
@Controller('series/:seriesId')
export class GenerationController {
  constructor(
    private readonly providersService: ProvidersService,
    private readonly generationService: GenerationService,
    private readonly audioProvidersService: AudioProvidersService,
    private readonly voiceSampleService: VoiceSampleService,
  ) {}

  @Get('audio-providers')
  @Roles(SeriesRole.ADMIN)
  @ApiOperation({ summary: 'List series audio providers (ADMIN+)' })
  listAudioProviders(@Param('seriesId') seriesId: string) {
    return this.audioProvidersService.list(seriesId);
  }

  @Post('audio-providers')
  @Roles(SeriesRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Configure Mage Seed Audio for voice samples only (ADMIN+)',
  })
  createAudioProvider(
    @Param('seriesId') seriesId: string,
    @Body() dto: CreateAudioProviderDto,
  ) {
    return this.audioProvidersService.create(seriesId, dto);
  }

  @Post('audio-providers/:configId/test')
  @Roles(SeriesRole.ADMIN)
  @ApiOperation({ summary: 'Test a Mage audio provider (ADMIN+)' })
  testAudioProvider(
    @Param('seriesId') seriesId: string,
    @Param('configId') configId: string,
  ) {
    return this.audioProvidersService.test(seriesId, configId);
  }

  @Delete('audio-providers/:configId')
  @Roles(SeriesRole.ADMIN)
  @ApiOperation({ summary: 'Delete an audio provider (ADMIN+)' })
  deleteAudioProvider(
    @Param('seriesId') seriesId: string,
    @Param('configId') configId: string,
  ) {
    return this.audioProvidersService.remove(seriesId, configId);
  }

  @Post('world/:entityId/generate-voice-sample')
  @Roles(SeriesRole.WRITER)
  @ApiOperation({
    summary:
      'Generate and store a five-second Mage voice-profile sample (WRITER+)',
  })
  generateVoiceSample(
    @Param('seriesId') seriesId: string,
    @Param('entityId') entityId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: GenerateVoiceSampleDto,
  ) {
    return this.voiceSampleService.generate(seriesId, entityId, userId, dto);
  }

  // ── LLM Provider CRUD (ADMIN+) ───────────────────────────────────────────

  @Get('providers')
  @Roles(SeriesRole.ADMIN)
  @ApiOperation({ summary: 'List LLM provider configs for a series (ADMIN+)' })
  @ApiParam({ name: 'seriesId' })
  listProviders(@Param('seriesId') seriesId: string) {
    return this.providersService.listProviders(seriesId);
  }

  @Post('providers')
  @Roles(SeriesRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a provider config — API key encrypted at rest (ADMIN+)' })
  @ApiParam({ name: 'seriesId' })
  createProvider(
    @Param('seriesId') seriesId: string,
    @Body() dto: CreateLlmProviderDto,
  ) {
    return this.providersService.createProvider(seriesId, dto);
  }

  @Put('providers/:configId')
  @Roles(SeriesRole.ADMIN)
  @ApiOperation({ summary: 'Update an existing provider config (ADMIN+)' })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'configId' })
  updateProvider(
    @Param('seriesId') seriesId: string,
    @Param('configId') configId: string,
    @Body() dto: UpdateLlmProviderDto,
  ) {
    return this.providersService.updateProvider(seriesId, configId, dto);
  }

  @Delete('providers/:configId')
  @Roles(SeriesRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a provider config (ADMIN+)' })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'configId' })
  deleteProvider(
    @Param('seriesId') seriesId: string,
    @Param('configId') configId: string,
  ) {
    return this.providersService.deleteProvider(seriesId, configId);
  }

  @Post('providers/:configId/test')
  @Roles(SeriesRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a trivial test message to verify provider connectivity (ADMIN+)' })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'configId' })
  testProvider(
    @Param('seriesId') seriesId: string,
    @Param('configId') configId: string,
  ) {
    return this.providersService.testProvider(seriesId, configId);
  }

  // ── Prompt Generation ────────────────────────────────────────────────────

  @Post('clips/:clipId/generate-prompts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Generate cinematic production prompts for a clip via the configured LLM',
  })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'clipId' })
  generatePrompts(
    @Param('seriesId') seriesId: string,
    @Param('clipId') clipId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: GeneratePromptsDto,
  ) {
    return this.generationService.generatePrompts(seriesId, clipId, userId, dto);
  }

  @Get('clips/:clipId/generation-runs')
  @ApiOperation({ summary: 'List all GenerationRuns for a clip' })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'clipId' })
  listRuns(
    @Param('seriesId') seriesId: string,
    @Param('clipId') clipId: string,
  ) {
    return this.generationService.listRuns(seriesId, clipId);
  }

  @Post('clips/:clipId/accept-prompts')
  @Roles(SeriesRole.WRITER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Accept a GenerationRun and persist its prompts onto the Clip record (WRITER+)',
  })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'clipId' })
  acceptPrompts(
    @Param('seriesId') seriesId: string,
    @Param('clipId') clipId: string,
    @Body() dto: AcceptPromptsDto,
  ) {
    return this.generationService.acceptPrompts(seriesId, clipId, dto);
  }
}
