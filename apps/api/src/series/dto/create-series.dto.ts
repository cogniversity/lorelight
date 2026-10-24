import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class CreateSeriesDto {
  @ApiProperty({ example: 'The Hollow Throne' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ example: 'A young queen reclaims her kingdom...' })
  @IsOptional()
  @IsString()
  premise?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/poster.jpg' })
  @IsOptional()
  @IsUrl()
  posterUrl?: string;
}
