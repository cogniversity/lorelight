import { PartialType } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClipStatus } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateClipDto {
  @ApiProperty({ description: 'Clip number (unique per scene)', minimum: 1 })
  @IsInt()
  @Min(1)
  number: number;

  @ApiProperty({ description: 'Clip title / label' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Story beat this clip captures' })
  @IsOptional()
  @IsString()
  storyBeat?: string;

  @ApiPropertyOptional({ description: 'Action line description' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'Dialogue spoken in this clip' })
  @IsOptional()
  @IsString()
  dialogue?: string;

  @ApiPropertyOptional({ description: 'Emotional tone' })
  @IsOptional()
  @IsString()
  emotion?: string;

  @ApiPropertyOptional({ example: '7s' })
  @IsOptional()
  @IsString()
  duration?: string;

  @ApiPropertyOptional({ description: 'Target duration in seconds', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  targetDurationSec?: number;

  // ── Camera ──────────────────────────────────────────────────────────────────

  @ApiPropertyOptional({ example: 'CLOSE_UP' })
  @IsOptional()
  @IsString()
  cameraShot?: string;

  @ApiPropertyOptional({ example: 'EYE_LEVEL' })
  @IsOptional()
  @IsString()
  cameraAngle?: string;

  @ApiPropertyOptional({ example: 'DOLLY' })
  @IsOptional()
  @IsString()
  cameraMovement?: string;

  @ApiPropertyOptional({ description: 'Framing / composition notes' })
  @IsOptional()
  @IsString()
  composition?: string;

  @ApiPropertyOptional({ example: '35mm' })
  @IsOptional()
  @IsString()
  lens?: string;

  @ApiPropertyOptional({ description: 'Lighting direction' })
  @IsOptional()
  @IsString()
  lighting?: string;

  // ── Audio ───────────────────────────────────────────────────────────────────

  @ApiPropertyOptional() @IsOptional() @IsString() voiceNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ambientAudio?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sfx?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() music?: string;

  // ── Generation prompts ───────────────────────────────────────────────────────

  @ApiPropertyOptional() @IsOptional() @IsString() imagePrompt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() videoPrompt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() voicePrompt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() audioPrompt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() negativePrompt?: string;

  // ── Meta ─────────────────────────────────────────────────────────────────────

  @ApiPropertyOptional({ enum: ClipStatus })
  @IsOptional()
  @IsEnum(ClipStatus)
  status?: ClipStatus;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ description: 'WorldEntity ID of the location override for this clip' })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiPropertyOptional({ type: [String], description: 'Searchable metadata tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateClipDto extends PartialType(CreateClipDto) {}
