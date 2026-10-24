import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AcceptPromptsDto {
  @ApiProperty({ description: 'GenerationRun id to accept' })
  @IsString()
  runId: string;

  @ApiPropertyOptional({ description: 'Override imagePrompt before accepting' })
  @IsOptional()
  @IsString()
  imagePrompt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  videoPrompt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  voicePrompt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  audioPrompt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  negativePrompt?: string;
}
