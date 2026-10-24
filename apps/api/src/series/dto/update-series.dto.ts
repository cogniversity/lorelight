import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class UpdateSeriesDto {
  @ApiPropertyOptional({ example: 'The Hollow Throne: Redux' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  premise?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  posterUrl?: string;
}
