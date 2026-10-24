import { Module } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { ManuscriptController } from './manuscript.controller';
import { ManuscriptService } from './manuscript.service';

@Module({
  controllers: [ManuscriptController],
  providers: [ManuscriptService, RolesGuard],
  exports: [ManuscriptService],
})
export class ManuscriptModule {}
