import { Module } from '@nestjs/common';
import { DosenController } from './dosen.controller';
import { DosenService } from './dosen.service';
import { CacheService } from '../common/cache/cache.service';

@Module({
  controllers: [DosenController],
  providers: [DosenService, CacheService],
})
export class DosenModule {}
