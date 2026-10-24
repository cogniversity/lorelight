import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsArray,
  Min,
} from 'class-validator';
import { AssetType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InitiateUploadDto {
  @ApiProperty({ description: 'Original filename (used in storage key)' })
  @IsString()
  filename: string;

  @ApiProperty({ description: 'MIME type of the file, e.g. image/png' })
  @IsString()
  mimeType: string;

  @ApiProperty({ description: 'File size in bytes' })
  @IsNumber()
  @Min(1)
  sizeBytes: number;

  @ApiProperty({ enum: AssetType, description: 'Asset category' })
  @IsEnum(AssetType)
  type: AssetType;

  @ApiPropertyOptional({ description: 'Human-readable title (defaults to filename)' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Link to a WorldEntity' })
  @IsOptional()
  @IsString()
  linkedEntityId?: string;

  @ApiPropertyOptional({ description: 'Link to a Scene' })
  @IsOptional()
  @IsString()
  linkedSceneId?: string;

  @ApiPropertyOptional({ description: 'Link to a Clip' })
  @IsOptional()
  @IsString()
  linkedClipId?: string;
}
