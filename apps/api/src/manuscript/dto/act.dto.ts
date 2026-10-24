import { PartialType } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateActDto {
  @ApiProperty({ description: 'Act number (unique per episode)', minimum: 1 })
  @IsInt()
  @Min(1)
  number: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Brief summary of what happens in this act' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ description: 'Narrative purpose of this act' })
  @IsOptional()
  @IsString()
  purpose?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class UpdateActDto extends PartialType(CreateActDto) {}
