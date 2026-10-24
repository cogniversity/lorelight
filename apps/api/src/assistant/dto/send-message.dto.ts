import { IsString, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RouteContextDto {
  @ApiPropertyOptional() @IsOptional() @IsString() page?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() episodeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() seasonId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() actId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sceneId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() clipId?: string;
}

export class SendMessageDto {
  @ApiProperty({ description: 'User message content' })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ type: RouteContextDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => RouteContextDto)
  routeContext?: RouteContextDto;
}
