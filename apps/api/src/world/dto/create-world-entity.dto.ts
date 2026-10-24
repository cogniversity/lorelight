import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorldEntityStatus, WorldEntityType } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** externalId: alphanumeric, hyphens, underscores; max 64 chars (any case — normalised to lowercase on save). */
const EXTERNAL_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

export class CreateWorldEntityDto {
  @ApiProperty({ enum: WorldEntityType, description: 'Entity classification' })
  @IsEnum(WorldEntityType)
  type: WorldEntityType;

  @ApiProperty({ description: 'Human-readable display name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  displayName: string;

  @ApiPropertyOptional({
    description:
      'Stable slug-like identifier, unique per series (alphanumeric / hyphens / underscores, max 64 chars). ' +
      'Normalised to lowercase on save.',
  })
  @IsOptional()
  @IsString()
  @Matches(EXTERNAL_ID_REGEX, {
    message:
      'externalId may only contain alphanumeric characters, hyphens, and underscores (max 64 chars)',
  })
  externalId?: string;

  @ApiPropertyOptional({ description: 'Short subtitle / tagline' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  subtitle?: string;

  @ApiPropertyOptional({ description: 'Long-form description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: WorldEntityStatus })
  @IsOptional()
  @IsEnum(WorldEntityStatus)
  status?: WorldEntityStatus;

  @ApiPropertyOptional({ description: 'Hex or named colour for UI cards' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;

  @ApiPropertyOptional({ type: [String], description: 'Free-form tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  // ── Character fields ────────────────────────────────────────────────────────

  @ApiPropertyOptional({ default: 20 }) @IsOptional() @IsInt() @Min(0) @Max(200) age?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() ethnicity?: string;
  @ApiPropertyOptional({ default: 'Fitzpatrick Type II Pinkish-ivory skin' })
  @IsOptional()
  @IsString()
  skinTone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() visualDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() facialFeatures?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() visualSilhouetteDress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() voiceDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() voiceProfile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() costumeDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mannerisms?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() goals?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() motivations?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fears?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() biography?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() profilePhotoAssetId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() voiceSampleAssetId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceImageAssetId?: string;

  // ── Location fields ─────────────────────────────────────────────────────────

  @ApiPropertyOptional() @IsOptional() @IsString() architectureNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() moodNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lightingNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() environmentNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() weatherNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() imagePrompt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() environmentPrompt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() videoPrompt?: string;

  // ── Artifact fields ─────────────────────────────────────────────────────────

  @ApiPropertyOptional() @IsOptional() @IsString() origin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currentOwner?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() importance?: string;

  // ── Organization fields ─────────────────────────────────────────────────────

  @ApiPropertyOptional() @IsOptional() @IsString() purpose?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() leadership?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() members?: string;
}
