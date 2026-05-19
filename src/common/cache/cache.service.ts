import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';

export const DOSEN_LIST = 'cache:dosen:list';
export const MHS_LIST_ADMIN = 'cache:mhs:list:admin';
export const MHS_LIST_DOSEN_PREFIX = 'cache:mhs:list:dosen:';

@Injectable()
export class CacheService {
  private ttl: number;

  constructor(
    private redis: RedisService,
    private config: ConfigService,
  ) {
    this.ttl = this.config.get<number>('CACHE_TTL_SECONDS', 60);
  }

  async getJson<T = any>(key: string): Promise<T | null> {
    const raw = await this.redis.safeGet(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async setJson(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const payload = JSON.stringify(value);
      return await this.redis.safeSet(key, payload, ttl ?? this.ttl);
    } catch {
      return false;
    }
  }

  async invalidateDosenList(): Promise<void> {
    await this.redis.safeDelete(DOSEN_LIST);
    await this.invalidateMahasiswaAll();
  }

  async invalidateMahasiswaAll(): Promise<void> {
    await this.redis.safeDelete(MHS_LIST_ADMIN);
    await this.redis.safeDeletePattern(`${MHS_LIST_DOSEN_PREFIX}*`);
  }

  mhsListKey(role: string, userId: number): string | null {
    if (role === 'admin') return MHS_LIST_ADMIN;
    if (role === 'dosen') return `${MHS_LIST_DOSEN_PREFIX}${userId}`;
    return null;
  }
}
