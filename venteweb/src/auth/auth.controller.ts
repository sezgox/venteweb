import {
  Body,
  Controller,
  Get,
  HttpException,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthGuard } from 'src/core/guards/auth.guard';
import {
  CustomResponse,
  LoginResponse,
  UserResponse,
} from 'src/core/interfaces/response.interface';
import { AuthService } from './auth.service';
import { UserLoginDto } from './dto/login-user.dto';
import { MobileLoginDto } from './dto/mobile-login.dto';
import { ConfirmActivationDto } from './dto/confirm-activation.dto';
import { RequestActivationEmailDto } from './dto/request-activation-email.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() userLoginDto: UserLoginDto,
    @Res() res: Response<CustomResponse<LoginResponse>>,
  ) {
    try {
      const { userData, access_token, refresh_token } =
        await this.authService.login(userLoginDto);
      const userSummary = {
        username: userData.username,
        email: userData.email,
        id: userData.id,
        name: userData.name,
        permission: userData.permission,
        level: userData.level,
        locale: userData.locale,
        photo: userData.photo,
        active: userData.active,
      };
      res.cookie('refresh_token', refresh_token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
      });

      res.status(201).json({
        results: { access_token, user: userSummary },
        message: 'User logged in',
        success: true,
      });
    } catch (err) {
      const authErr = err as {
        status?: number;
        message?: string;
        activationRequired?: boolean;
        emailSent?: boolean;
        activationEmail?: string;
      };
      res.status(authErr.status ?? 400).json({
        success: false,
        message: authErr.message ?? 'User not logged in',
        metadata: {
          ...userLoginDto,
          password: '[REDACTED]',
          ...(authErr.activationRequired ? { activationRequired: true } : {}),
          ...(typeof authErr.emailSent === 'boolean'
            ? { emailSent: authErr.emailSent }
            : {}),
          ...(typeof authErr.activationEmail === 'string'
            ? { activationEmail: authErr.activationEmail }
            : {}),
        },
      });
    }
  }

  @Post('activation/request-email')
  async requestActivationEmail(
    @Body() dto: RequestActivationEmailDto,
    @Res() res: Response,
  ) {
    try {
      await this.authService.requestActivationEmail(dto);
      return res.status(200).json({
        success: true,
        message: 'Activation email sent. Check your inbox.',
      });
    } catch (err) {
      const status = this.getErrorStatus(err);
      const message =
        err instanceof Error ? err.message : 'Failed to queue activation email';
      return res.status(status).json({
        success: false,
        message,
      });
    }
  }

  @Post('activation/confirm')
  async confirmActivation(
    @Body() dto: ConfirmActivationDto,
    @Res() res: Response,
  ) {
    try {
      await this.authService.confirmActivation(dto);
      return res.status(200).json({
        success: true,
        message: 'Account activated',
      });
    } catch (err) {
      const status = this.getErrorStatus(err);
      const message = err instanceof Error ? err.message : 'Activation failed';
      return res.status(status).json({
        success: false,
        message,
      });
    }
  }

  private getErrorStatus(err: unknown): number {
    if (err instanceof HttpException) {
      return err.getStatus();
    }
    if (
      typeof err === 'object' &&
      err !== null &&
      'status' in err &&
      typeof (err as { status: unknown }).status === 'number'
    ) {
      return (err as { status: number }).status;
    }
    return 500;
  }

  //TODO: Add login with no refresh token logic for mobiles

  @Post('google/mobile')
  async googleMobileLogin(
    @Body() mobileLoginDto: MobileLoginDto,
    @Res() res: Response<CustomResponse<LoginResponse>>,
  ) {
    try {
      const { userData, access_token } =
        await this.authService.loginWithMobileFirebase(mobileLoginDto.tokenId);
      const userSummary = {
        username: userData.username,
        email: userData.email,
        id: userData.id,
        name: userData.name,
        permission: userData.permission,
        level: userData.level,
        locale: userData.locale,
        photo: userData.photo,
        active: userData.active,
      };

      return res.status(201).json({
        results: { access_token, user: userSummary },
        message: 'User logged in with Google from mobile',
        success: true,
      });
    } catch (err) {
      const authErr = err as {
        status?: number;
        message?: string;
        activationRequired?: boolean;
        emailSent?: boolean;
        activationEmail?: string;
      };
      return res.status(authErr.status ?? 401).json({
        success: false,
        message: authErr.message ?? 'Mobile login failed',
        metadata: {
          provider: 'firebase',
          ...(authErr.activationRequired ? { activationRequired: true } : {}),
          ...(typeof authErr.emailSent === 'boolean'
            ? { emailSent: authErr.emailSent }
            : {}),
          ...(typeof authErr.activationEmail === 'string'
            ? { activationEmail: authErr.activationEmail }
            : {}),
        },
      });
    }
  }

  @Post('google')
  async googleLogin(
    @Body('tokenId') tokenId: string,
    @Res() res: Response<CustomResponse<LoginResponse>>,
  ) {
    try {
      const { userData, access_token, refresh_token } =
        await this.authService.loginWithGoogle(tokenId);
      const userSummary = {
        username: userData.username,
        email: userData.email,
        id: userData.id,
        name: userData.name,
        permission: userData.permission,
        level: userData.level,
        locale: userData.locale,
        photo: userData.photo,
        active: userData.active,
      };

      res.cookie('refresh_token', refresh_token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
      });

      res.status(201).json({
        results: { access_token, user: userSummary },
        message: 'User logged in with Google',
        success: true,
      });
    } catch (err) {
      const authErr = err as {
        status?: number;
        message?: string;
        activationRequired?: boolean;
        emailSent?: boolean;
        activationEmail?: string;
      };
      res.status(authErr.status ?? 401).json({
        success: false,
        message: authErr.message ?? 'Google token invalid or login failed',
        metadata: {
          provider: 'google',
          ...(authErr.activationRequired ? { activationRequired: true } : {}),
          ...(typeof authErr.emailSent === 'boolean'
            ? { emailSent: authErr.emailSent }
            : {}),
          ...(typeof authErr.activationEmail === 'string'
            ? { activationEmail: authErr.activationEmail }
            : {}),
        },
      });
    }
  }

  @UseGuards(AuthGuard)
  @Post('logout')
  logout(@Req() req: Request) {
    return this.authService.logout(req['user'].sub);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async me(@Req() req, @Res() res: Response<CustomResponse<UserResponse>>) {
    try {
      const user = await this.authService.getMe(req.user.sub);
      return res.json({
        results: user,
        message: 'User authenticated',
        success: true,
      });
    } catch (error) {
      res.status(error.status ?? 500);
      return res.json({
        success: false,
        message: error.message ?? 'Server error',
      });
    }
  }

  @Post('refresh')
  async refresh(
    @Req() req,
    @Res() res: Response<CustomResponse<LoginResponse>>,
  ) {
    try {
      const refreshToken = req.cookies['refresh_token'];
      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'No refresh token cookie found',
        });
      }
      const { user, access_token, rotatedRefreshToken } =
        await this.authService.refreshToken(refreshToken);
      res.cookie('refresh_token', rotatedRefreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
      });
      return res.json({
        results: { access_token, user },
        message: 'User session refreshed',
        success: true,
      });
    } catch (error) {
      console.error('Error en /auth/refresh:', error);
      return res.status(error.status ?? 500).json({
        success: false,
        message: error.message ?? 'Internal server error',
        metadata: {
          ...(error.activationRequired ? { activationRequired: true } : {}),
        },
      });
    }
  }
}
