import { PartialType, OmitType } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScriptBlockType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateScriptBlockDto {
  @ApiProperty({ enum: ScriptBlockType, description: 'Screenplay block type' })
  @IsEnum(ScriptBlockType)
  type: ScriptBlockType;

  @ApiProperty({ description: 'Block text content' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'WorldEntity ID for DIALOGUE blocks (the speaker)' })
  @IsOptional()
  @IsString()
  characterId?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class UpdateScriptBlockDto extends PartialType(
  OmitType(CreateScriptBlockDto, ['type'] as const),
) {}
