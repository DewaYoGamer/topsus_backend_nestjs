import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!roles || !roles.length) return true;

    const { user } = ctx.switchToHttp().getRequest();
    if (!user || !roles.includes(user.role)) {
      throw new HttpException(
        { detail: `Requires role in ${JSON.stringify(roles.sort())}` },
        HttpStatus.FORBIDDEN,
      );
    }
    return true;
  }
}
