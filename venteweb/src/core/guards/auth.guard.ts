import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    console.log('Guard')
    const request = context.switchToHttp().getRequest();
    if (!request.user) {
      throw new UnauthorizedException('Token expired or invalid');
    }
    return true;
  }
}
