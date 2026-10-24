import { Module } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { WorldController } from './world.controller';
import { WorldService } from './world.service';

@Module({
  controllers: [WorldController],
  providers: [WorldService, RolesGuard],
  exports: [WorldService],
})
export class WorldModule {}
