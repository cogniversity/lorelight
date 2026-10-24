import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class UpsertBibleEntryDto {
  @ApiProperty({ description: 'Display title of this bible section' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Full markdown content of the bible entry' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Render order among bible entries (0-based)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
