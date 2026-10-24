import { PartialType } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SceneStatus } from '@prisma/client';
import {
  IsBoolean,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateSceneDto {
  @ApiProperty({ description: 'Scene number (unique per act)', minimum: 1 })
  @IsInt()
  @Min(1)
  number: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ description: 'Narrative / thematic purpose of this scene' })
  @IsOptional()
  @IsString()
  purpose?: string;

  @ApiPropertyOptional({ description: 'WorldEntity ID of the primary location' })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiPropertyOptional({ example: 'DAY' })
  @IsOptional()
  @IsString()
  timeOfDay?: string;

  @ApiPropertyOptional({ description: 'true = INT, false = EXT', default: true })
  @IsOptional()
  @IsBoolean()
  interior?: boolean;

  @ApiPropertyOptional({ enum: SceneStatus })
  @IsOptional()
  @IsEnum(SceneStatus)
  status?: SceneStatus;

  @ApiPropertyOptional({ example: '3m 20s' })
  @IsOptional()
  @IsString()
  duration?: string;

  @ApiPropertyOptional({ type: [String], description: 'Searchable metadata tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class UpdateSceneDto extends PartialType(CreateSceneDto) {}
