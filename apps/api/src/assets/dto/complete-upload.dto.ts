import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompleteUploadDto {
  @ApiProperty({ description: 'The assetId returned by the upload-url endpoint' })
  @IsString()
  assetId: string;
}
