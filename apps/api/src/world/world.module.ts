import { Module } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { WorldController } from './world.controller';
import { WorldService } from './world.service';
import { CharacterVersionService } from './character-version.service';
import { GenerationModule } from '../generation/generation.module';
import { ActivityModule } from '../activity/activity.module';
import { AssetsModule } from '../assets/assets.module';

@Module({
  imports: [GenerationModule, ActivityModule, AssetsModule],
  controllers: [WorldController],
  providers: [WorldService, CharacterVersionService, RolesGuard],
  exports: [WorldService, CharacterVersionService],
})
export class WorldModule {}
