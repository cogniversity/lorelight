import { IsString, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateDraftDto {
  @ApiProperty({ description: 'New Markdown content' })
  @IsString()
  content!: string;

  @ApiProperty({ description: 'Current revisionNum — prevents silent overwrites' })
  @IsInt()
  @Min(0)
  expectedRevision!: number;
}

export class RestoreRevisionDto {
  @ApiProperty({ description: 'ManuscriptRevision ID to restore' })
  @IsString()
  revisionId!: string;
}
