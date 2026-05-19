import { Module } from '@nestjs/common';
import { MahasiswaController } from './mahasiswa.controller';
import { MahasiswaService } from './mahasiswa.service';
import { CacheService } from '../common/cache/cache.service';

@Module({
  controllers: [MahasiswaController],
  providers: [MahasiswaService, CacheService],
})
export class MahasiswaModule {}
