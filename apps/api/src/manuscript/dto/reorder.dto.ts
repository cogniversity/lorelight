import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class ReorderDto {
  @ApiProperty({
    type: [String],
    description:
      'Ordered array of resource IDs. Each resource\'s position field will be set to its index in this array.',
  })
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
