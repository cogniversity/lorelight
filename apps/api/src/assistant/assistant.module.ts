import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GenerationModule } from '../generation/generation.module';
import { ActivityModule } from '../activity/activity.module';
import { AssistantService } from './assistant.service';
import { AssistantController } from './assistant.controller';
import { ProposalExecutorService } from './handlers/proposal-executor.service';

@Module({
  imports: [PrismaModule, GenerationModule, ActivityModule],
  controllers: [AssistantController],
  providers: [AssistantService, ProposalExecutorService],
  exports: [AssistantService],
})
export class AssistantModule {}
