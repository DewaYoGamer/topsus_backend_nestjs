import { Controller, Post, Get, Body, Req, Res, HttpCode, HttpStatus, HttpException, UseGuards } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CurrentUser, JwtUser, Public } from '../common/decorators';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const ip = this.authService.getClientIp(req);
    const rl = await this.authService.checkRateLimit(ip);
    const limit = this.config.get<number>('LOGIN_RATE_LIMIT', 5);

    res.setHeader('X-RateLimit-Limit', String(limit));
    res.setHeader('X-RateLimit-Remaining', String(rl.remaining));

    if (!rl.allowed) {
      res.setHeader('Retry-After', String(rl.retryAfter));
      throw new HttpException(
        { detail: 'Terlalu banyak percobaan login, coba lagi sebentar.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return this.authService.login(dto.email, dto.password);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentUser() user: JwtUser): Promise<void> {
    await this.authService.logout(user.jti, user.exp);
  }

  @Get('me')
  async me(@CurrentUser() user: JwtUser) {
    let entity: any;
    if (user.user_type === 'dosen') {
      entity = await this.prisma.dosen.findUnique({ where: { id: user.id } });
    } else {
      entity = await this.prisma.mahasiswa.findUnique({ where: { id: user.id } });
    }
    return {
      id: user.id,
      role: user.role,
      user_type: user.user_type,
      nama: entity?.nama,
      email: entity?.email,
    };
  }
}
