import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { LlmProvider } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLlmProviderDto {
  @ApiProperty({ enum: LlmProvider })
  @IsEnum(LlmProvider)
  provider: LlmProvider;

  @ApiProperty({ example: 'GPT-4o Production' })
  @IsString()
  displayName: string;

  @ApiPropertyOptional({ example: 'http://localhost:11434', description: 'Required for OLLAMA / LLAMACPP' })
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @ApiProperty({ example: 'gpt-4o' })
  @IsString()
  model: string;

  @ApiPropertyOptional({ description: 'Plain-text API key — will be encrypted at rest' })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 4096 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxTokens?: number;

  @ApiPropertyOptional({ default: 0.7 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;
}
