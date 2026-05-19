import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { JwtUser } from '../common/decorators';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
    private redis: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'dev-secret'),
    });
  }

  async validate(payload: any): Promise<JwtUser> {
    const { uid, role, type, jti, exp } = payload;
    if (!uid || !role || !type || !jti || !exp) {
      throw new UnauthorizedException({ detail: 'Invalid or expired credentials' });
    }

    // Check blacklist
    if (await this.redis.safeExists(`blacklist:jwt:${jti}`)) {
      throw new UnauthorizedException({ detail: 'Invalid or expired credentials' });
    }

    // Verify user still exists and refresh role from DB
    let entity: any;
    if (type === 'dosen') {
      entity = await this.prisma.dosen.findUnique({ where: { id: uid } });
    } else if (type === 'mahasiswa') {
      entity = await this.prisma.mahasiswa.findUnique({ where: { id: uid } });
    }
    if (!entity) {
      throw new UnauthorizedException({ detail: 'Invalid or expired credentials' });
    }

    return { id: entity.id, role: entity.role, user_type: type, jti, exp };
  }
}
