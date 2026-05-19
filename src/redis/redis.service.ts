import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly log = new Logger('Redis');
  private client: Redis;

  constructor(private config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL', 'redis://127.0.0.1:6379/0');
    this.client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 1500,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
    });
    this.client.connect().catch(() => {});
    this.client.on('error', () => {}); // suppress unhandled
  }

  async onModuleDestroy() {
    await this.client.quit().catch(() => {});
  }

  async ping(): Promise<boolean> {
    try {
      return (await this.client.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  async safeGet(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (e) {
      this.log.warn(`get(${key}) failed: ${e.message}`);
      return null;
    }
  }

  async safeSet(key: string, value: string, ex?: number): Promise<boolean> {
    try {
      if (ex) await this.client.set(key, value, 'EX', ex);
      else await this.client.set(key, value);
      return true;
    } catch (e) {
      this.log.warn(`set(${key}) failed: ${e.message}`);
      return false;
    }
  }

  async safeDelete(...keys: string[]): Promise<number> {
    if (!keys.length) return 0;
    try {
      return await this.client.del(...keys);
    } catch (e) {
      this.log.warn(`delete failed: ${e.message}`);
      return 0;
    }
  }

  async safeDeletePattern(pattern: string): Promise<number> {
    try {
      let deleted = 0;
      let cursor = '0';
      do {
        const [next, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 500);
        cursor = next;
        if (keys.length) deleted += await this.client.del(...keys);
      } while (cursor !== '0');
      return deleted;
    } catch (e) {
      this.log.warn(`deletePattern(${pattern}) failed: ${e.message}`);
      return 0;
    }
  }

  async safeIncr(key: string): Promise<number | null> {
    try {
      return await this.client.incr(key);
    } catch (e) {
      this.log.warn(`incr(${key}) failed: ${e.message}`);
      return null;
    }
  }

  async safeExpire(key: string, seconds: number): Promise<boolean> {
    try {
      return (await this.client.expire(key, seconds)) === 1;
    } catch (e) {
      this.log.warn(`expire(${key}) failed: ${e.message}`);
      return false;
    }
  }

  async safeExists(key: string): Promise<boolean> {
    try {
      return (await this.client.exists(key)) === 1;
    } catch (e) {
      this.log.warn(`exists(${key}) failed: ${e.message}`);
      return false;
    }
  }

  async safeTtl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch {
      return -1;
    }
  }
}
