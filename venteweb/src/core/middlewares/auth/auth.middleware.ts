import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from 'src/auth/auth.service';
import { jwtVerificationSecrets } from 'src/core/consts/jwt-config.const';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private jwtService: JwtService,
    private authService: AuthService,
  ) {}

  private async verifyAccessToken(token: string) {
    let verificationError: any;

    for (const secret of jwtVerificationSecrets) {
      try {
        return await this.jwtService.verifyAsync(token, {
          secret,
          ignoreExpiration: true,
        });
      } catch (error) {
        verificationError = error;
      }
    }

    throw verificationError;
  }

  async use(req: any, res: any, next: () => void) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      // No hay token, dejamos pasar la request
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) return next();
    try {
      const payload = await this.verifyAccessToken(token);
      console.log('Route:', req.route.path + ' User: ' + payload.username);
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        const refreshToken = req.cookies['refresh_token'];
        const { user, access_token, rotatedRefreshToken } =
          await this.authService.refreshToken(refreshToken);
        res.cookie('refresh_token', rotatedRefreshToken, {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/',
        });
        res.setHeader('x-access-token', access_token);
      } else {
        req['user'] = payload;
      }
    } catch (err) {
      // Check if the error is a jwt expired error
      console.warn('Invalid token ignored:', err.message);
    }

    next();
  }
}
