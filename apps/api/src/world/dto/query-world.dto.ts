import { ApiPropertyOptional } from '@nestjs/swagger';
import { WorldEntityType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class QueryWorldDto {
  @ApiPropertyOptional({
    enum: WorldEntityType,
    description: 'Filter by entity type',
  })
  @IsOptional()
  @IsEnum(WorldEntityType)
  type?: WorldEntityType;

  @ApiPropertyOptional({
    description: 'Full-text search across displayName, subtitle, description, and tags',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;
}
