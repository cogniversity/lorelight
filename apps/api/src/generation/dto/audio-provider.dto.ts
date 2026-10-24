import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAudioProviderDto {
  @ApiProperty({ description: 'Mage server-side API key (mage_sk_...)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(500)
  apiKey: string;

  @ApiPropertyOptional({ default: 'Mage Seed Audio' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class GenerateVoiceSampleDto {
  @ApiPropertyOptional({
    description: 'Short phrase spoken in the five-second voice profile sample',
  })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  sampleText?: string;

  @ApiPropertyOptional({
    description: 'Current voice profile text from the character editor',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  voiceProfile?: string;
}
