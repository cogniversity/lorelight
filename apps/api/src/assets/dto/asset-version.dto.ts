import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';

export class InitiateAssetVersionDto {
  @ApiProperty()
  @IsString()
  filename: string;

  @ApiProperty()
  @IsString()
  mimeType: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  sizeBytes: number;
}

export class CompleteAssetVersionDto extends InitiateAssetVersionDto {
  @ApiProperty()
  @IsInt()
  @Min(2)
  version: number;
}
