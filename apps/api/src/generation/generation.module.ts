import { Module } from '@nestjs/common';
import { GenerationController } from './generation.controller';
import { GenerationService } from './generation.service';
import { ProvidersService } from './providers.service';
import { LlmFactoryService } from './adapters/llm-factory.service';

@Module({
  controllers: [GenerationController],
  providers: [GenerationService, ProvidersService, LlmFactoryService],
  exports: [GenerationService, ProvidersService],
})
export class GenerationModule {}
