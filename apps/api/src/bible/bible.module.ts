import { Module } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { BibleController } from './bible.controller';
import { BibleService } from './bible.service';

@Module({
  controllers: [BibleController],
  providers: [BibleService, RolesGuard],
  exports: [BibleService],
})
export class BibleModule {}
