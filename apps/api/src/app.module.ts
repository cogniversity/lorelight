import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SeriesModule } from './series/series.module';
import { BibleModule } from './bible/bible.module';
import { WorldModule } from './world/world.module';
import { ManuscriptModule } from './manuscript/manuscript.module';
import { AssetsModule } from './assets/assets.module';
import { GenerationModule } from './generation/generation.module';
import { SearchModule } from './search/search.module';
import { ImportModule } from './import/import.module';
import { ActivityModule } from './activity/activity.module';
import { DraftManuscriptModule } from './draft-manuscript/draft-manuscript.module';
import { AssistantModule } from './assistant/assistant.module';
import appConfig from './config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      expandVariables: true,
    }),
    ThrottlerModule.forRoot([{
      ttl: parseInt(process.env.THROTTLE_TTL ?? '60') * 1000,
      limit: parseInt(process.env.THROTTLE_LIMIT ?? '120'),
    }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    SeriesModule,
    BibleModule,
    WorldModule,
    ManuscriptModule,
    AssetsModule,
    GenerationModule,
    SearchModule,
    ImportModule,
    ActivityModule,
    DraftManuscriptModule,
    AssistantModule,
  ],
})
export class AppModule {}
