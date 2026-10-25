import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:5173'],
    credentials: true,
  });

  app.enableVersioning({ type: VersioningType.URI });
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Lorelight API')
    .setDescription('Story Production Operating System')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // ── Startup safety checks ──────────────────────────────────────────────────
  const encKey = process.env.SECRET_ENCRYPTION_KEY ?? '';
  if (encKey.length < 32) {
    console.warn(
      '[SECURITY] SECRET_ENCRYPTION_KEY is shorter than 32 characters. ' +
      'Provider keys cannot be created or updated until this is corrected.',
    );
  }
  if (!process.env.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET.length < 32) {
    console.warn('[SECURITY] JWT_ACCESS_SECRET is missing or weak.');
  }

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Lorelight API running on http://localhost:${port}`);
  console.log(`Swagger: http://localhost:${port}/api/docs`);
}
bootstrap();
