import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RedisService } from './redis/redis.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const log = new Logger('Bootstrap');

  // CORS
  const origins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins,
    credentials: true,
    exposedHeaders: ['X-Cache', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'Retry-After'],
  });

  // Global pipes & filters
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      stopAtFirstError: false,
      exceptionFactory: (errors) => {
        const detail = errors.map((e) => ({
          loc: ['body', e.property],
          msg: Object.values(e.constraints || {}).join('; '),
          type: 'value_error',
        }));
        const { HttpException, HttpStatus } = require('@nestjs/common');
        return new HttpException({ detail }, HttpStatus.UNPROCESSABLE_ENTITY);
      },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  // Health endpoint (public, no auth)
  const httpAdapter = app.getHttpAdapter();
  const redis = app.get(RedisService);
  httpAdapter.get('/health', async (_req, res) => {
    res.json({ status: 'ok', redis: await redis.ping() });
  });

  const port = process.env.PORT || 8000;
  await app.listen(port, '0.0.0.0');
  log.log(`Server running on port ${port}`);
  log.log(`CORS origins: ${origins.join(', ')}`);
  log.log(`Redis: ${(await redis.ping()) ? 'connected' : 'unreachable'}`);
}

bootstrap();
