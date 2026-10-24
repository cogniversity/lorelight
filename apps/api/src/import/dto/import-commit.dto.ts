import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ImportCommitRequestDto {
  @ApiProperty({
    description: 'Raw JSON string from the lorelight-project-v2 localStorage export',
  })
  @IsString()
  localStorageJson: string;
}

export interface ImportCommitResultDto {
  seriesId: string;
  seriesName: string;
  importedCount: number;
  warnings: string[];
}
