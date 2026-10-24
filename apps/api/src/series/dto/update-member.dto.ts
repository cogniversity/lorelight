import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { SeriesRole } from '@prisma/client';

export class UpdateMemberDto {
  @ApiProperty({ enum: SeriesRole })
  @IsEnum(SeriesRole)
  role: SeriesRole;
}
