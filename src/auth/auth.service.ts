import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class AuthService {
  private expMinutes: number;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private redis: RedisService,
    private config: ConfigService,
  ) {
    this.expMinutes = this.config.get<number>('ACCESS_TOKEN_EXPIRE_MINUTES', 480);
  }

  async login(email: string, password: string) {
    // Check dosen first
    const dosen = await this.prisma.dosen.findUnique({ where: { email } });
    if (dosen && (await bcrypt.compare(password, dosen.password))) {
      const token = this.createToken(dosen.id, dosen.role, 'dosen');
      return { access_token: token, token_type: 'bearer', role: dosen.role, id: dosen.id, nama: dosen.nama };
    }

    // Then mahasiswa
    const mhs = await this.prisma.mahasiswa.findUnique({ where: { email } });
    if (mhs && (await bcrypt.compare(password, mhs.password))) {
      const token = this.createToken(mhs.id, mhs.role, 'mahasiswa');
      return { access_token: token, token_type: 'bearer', role: mhs.role, id: mhs.id, nama: mhs.nama };
    }

    throw new HttpException({ detail: 'Email atau password salah' }, HttpStatus.UNAUTHORIZED);
  }

  async logout(jti: string, exp: number): Promise<void> {
    const ttl = Math.max(Math.floor(exp - Date.now() / 1000), 1);
    await this.redis.safeSet(`blacklist:jwt:${jti}`, '1', ttl);
  }

  private createToken(uid: number, role: string, type: string): string {
    const jti = uuidv4().replace(/-/g, '');
    const payload = { sub: `${type}:${uid}`, uid, role, type, jti };
    return this.jwt.sign(payload, { expiresIn: `${this.expMinutes}m` });
  }

  async checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number; retryAfter: number }> {
    const limit = this.config.get<number>('LOGIN_RATE_LIMIT', 5);
    const window = this.config.get<number>('LOGIN_RATE_WINDOW_SECONDS', 60);
    const key = `rl:login:${ip}`;

    const count = await this.redis.safeIncr(key);
    if (count === null) {
      // Redis down → fail open
      return { allowed: true, remaining: limit, retryAfter: 0 };
    }

    if (count === 1) {
      await this.redis.safeExpire(key, window);
    }

    const ttl = await this.redis.safeTtl(key);
    const retryAfter = Math.max(ttl, 1);

    if (count > limit) {
      return { allowed: false, remaining: 0, retryAfter };
    }
    return { allowed: true, remaining: Math.max(limit - count, 0), retryAfter };
  }

  getClientIp(req: any): string {
    const xff = req.headers['x-forwarded-for'];
    if (xff) return String(xff).split(',')[0].trim();
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }
}
