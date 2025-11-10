import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { jwtConfig } from 'src/core/consts/jwt-config.const';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private jwtService: JwtService) {}

  async use(req: any, res: any, next: () => void) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      // No hay token, dejamos pasar la request
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) return next();

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: jwtConfig.secret,
      });
      req['user'] = payload; // agregamos user al request
    } catch (err) {
      // Token inválido o expirado -> simplemente ignoramos, no bloqueamos
      console.warn('Invalid token ignored:', err.message);
    }

    next();
  }
}
