import { PartialType } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateSeasonDto {
  @ApiProperty({ description: 'Season number (unique per series)', minimum: 1 })
  @IsInt()
  @Min(1)
  number: number;

  @ApiProperty({ description: 'Season title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Season synopsis / logline' })
  @IsOptional()
  @IsString()
  synopsis?: string;

  @ApiPropertyOptional({ description: 'Render order (0-based)', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class UpdateSeasonDto extends PartialType(CreateSeasonDto) {}
