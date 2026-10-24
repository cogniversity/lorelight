import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GeneratePromptsDto {
  @ApiPropertyOptional({ description: 'ID of a specific LlmProviderConfig to use; defaults to the series default' })
  @IsOptional()
  @IsString()
  providerConfigId?: string;

  @ApiPropertyOptional({ description: 'If true, generate even if prompts already exist' })
  @IsOptional()
  @IsBoolean()
  forceRegenerate?: boolean;
}
