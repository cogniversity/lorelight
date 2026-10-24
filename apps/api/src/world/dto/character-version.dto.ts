import { PartialType } from '@nestjs/swagger';
import { StoryAnchorType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
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

const EXTERNAL_ID_REGEX = /^(?:[a-zA-Z0-9_-]{1,64})?$/;

export class CreateCharacterVersionDto {
  @ApiProperty({ description: 'Version label, e.g. Exile or Council Uniform' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description:
      'Version-specific prompt alias. Leave empty to inherit the main character alias. May be shared only within this character.',
  })
  @IsOptional()
  @IsString()
  @Matches(EXTERNAL_ID_REGEX)
  externalId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  // Character-specific
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(200) age?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() ethnicity?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() skinTone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() facialFeatures?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() visualSilhouetteDress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() visualDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() voiceProfile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() voiceDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() costumeDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mannerisms?: string;
  // Location-specific
  @ApiPropertyOptional() @IsOptional() @IsString() architectureNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() moodNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lightingNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() environmentNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() weatherNotes?: string;
  // Artifact-specific
  @ApiPropertyOptional() @IsOptional() @IsString() origin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currentOwner?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() importance?: string;
  // Shared
  @ApiPropertyOptional() @IsOptional() @IsString() imageAssetId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  inheritMainImage?: boolean;

  @ApiPropertyOptional({ enum: StoryAnchorType, default: StoryAnchorType.SERIES })
  @IsOptional()
  @IsEnum(StoryAnchorType)
  startType?: StoryAnchorType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startId?: string;

  @ApiPropertyOptional({ enum: StoryAnchorType })
  @IsOptional()
  @IsEnum(StoryAnchorType)
  endType?: StoryAnchorType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endId?: string;
}

export class UpdateCharacterVersionDto extends PartialType(
  CreateCharacterVersionDto,
) {}

export class GenerateBaseCharacterPromptDto {
  @ApiPropertyOptional() @IsOptional() @IsString() displayName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() externalId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(200) age?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() ethnicity?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() skinTone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() facialFeatures?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() visualSilhouetteDress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() visualDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() voiceProfile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() costumeDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mannerisms?: string;
}
