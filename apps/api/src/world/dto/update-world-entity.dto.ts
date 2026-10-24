import { PartialType } from '@nestjs/swagger';
import { CreateWorldEntityDto } from './create-world-entity.dto';

export class UpdateWorldEntityDto extends PartialType(CreateWorldEntityDto) {}
