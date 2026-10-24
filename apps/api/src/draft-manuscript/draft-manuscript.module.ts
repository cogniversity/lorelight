import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DraftManuscriptService } from './draft-manuscript.service';
import { DraftManuscriptController } from './draft-manuscript.controller';

@Module({
  imports: [PrismaModule],
  controllers: [DraftManuscriptController],
  providers: [DraftManuscriptService],
  exports: [DraftManuscriptService],
})
export class DraftManuscriptModule {}
