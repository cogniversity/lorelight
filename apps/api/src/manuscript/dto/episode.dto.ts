import { PartialType } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EpisodeStatus } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateEpisodeDto {
  @ApiProperty({ description: 'Episode number (unique per season)', minimum: 1 })
  @IsInt()
  @Min(1)
  number: number;

  @ApiProperty({ description: 'Episode title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  synopsis?: string;

  @ApiPropertyOptional({ enum: EpisodeStatus })
  @IsOptional()
  @IsEnum(EpisodeStatus)
  status?: EpisodeStatus;

  @ApiPropertyOptional({ description: 'Estimated runtime string, e.g. "45m"' })
  @IsOptional()
  @IsString()
  estimatedRuntime?: string;

  @ApiPropertyOptional({ description: 'Completion percentage 0-100', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class UpdateEpisodeDto extends PartialType(CreateEpisodeDto) {}
