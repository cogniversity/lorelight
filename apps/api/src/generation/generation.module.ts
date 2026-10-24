import { Module } from '@nestjs/common';
import { GenerationController } from './generation.controller';
import { GenerationService } from './generation.service';
import { ProvidersService } from './providers.service';
import { LlmFactoryService } from './adapters/llm-factory.service';
import { AudioProvidersService } from './audio-providers.service';
import { VoiceSampleService } from './voice-sample.service';
import { AssetsModule } from '../assets/assets.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [AssetsModule, ActivityModule],
  controllers: [GenerationController],
  providers: [
    GenerationService,
    ProvidersService,
    LlmFactoryService,
    AudioProvidersService,
    VoiceSampleService,
  ],
  exports: [
    GenerationService,
    ProvidersService,
    LlmFactoryService,
    AudioProvidersService,
    VoiceSampleService,
  ],
})
export class GenerationModule {}
