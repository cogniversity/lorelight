import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ImportPreviewRequestDto {
  @ApiProperty({
    description: 'Raw JSON string from the lorelight-project-v2 localStorage export',
  })
  @IsString()
  localStorageJson: string;
}

export interface ImportPreviewDto {
  seriesName: string;
  entityCount: number;
  bibleEntryCount: number;
  episodeCount: number;
  sceneCount: number;
  clipCount: number;
  warnings: string[];
}
