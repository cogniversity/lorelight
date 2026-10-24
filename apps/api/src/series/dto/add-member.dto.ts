import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { SeriesRole } from '@prisma/client';

export class AddMemberDto {
  @ApiProperty({ example: 'writer@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ enum: SeriesRole, default: SeriesRole.VIEWER })
  @IsOptional()
  @IsEnum(SeriesRole)
  role?: SeriesRole;
}
