import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { MinioService } from './minio.service';

@Module({
  controllers: [AssetsController],
  providers: [AssetsService, MinioService],
  exports: [MinioService, AssetsService],
})
export class AssetsModule {}
